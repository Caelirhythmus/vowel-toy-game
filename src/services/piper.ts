/* ============================================================
 * services：Piper 神经 TTS 适配器（主引擎，onnxruntime-web WASM）
 * - 懒加载：首次合成时动态 import public/vendor/onnxruntime-web/esm/ort.min.js
 * - 音色：en_US-joe-medium（CC0，22.05kHz；int8 量化 ~18MB 随仓库提交，
 *   float ~60MB 由 vendor 脚本预置作回退）
 * - 输入：显式音素 id 序列（core/piper.ts 组装 BOS+音素+pad+EOS），
 *   不依赖任何文本 G2P，保证伪词里的每个元音精确可控
 * - 健壮性：下载带超时与进度；int8 失败自动试 float；会话创建关闭
 *   图优化（WASM 单线程下图优化可能卡数十秒）；全程失败才降级 espeak
 * - 输出：Float32 PCM → 峰值归一化 → WAV 字节
 * ============================================================ */
import { wordToPiperIds } from '@/core/piper';
import type { Word } from '@/core';
import { PIPER_VOICE } from '@/config/audio';
import { encodeWav16 } from './wav';

/* ---------- onnxruntime-web 最小类型面 ---------- */
interface OrtTensor {
  data: Float32Array | BigInt64Array;
  dims: number[];
}
interface OrtSession {
  inputNames: string[];
  run(feeds: Record<string, OrtTensor>): Promise<Record<string, OrtTensor>>;
}
interface OrtApi {
  env: { wasm: { wasmPaths?: string; numThreads?: number } };
  InferenceSession: {
    create(
      model: Uint8Array,
      opts: { executionProviders: string[]; graphOptimizationLevel: 'disable' }
    ): Promise<OrtSession>;
  };
  Tensor: new (type: string, data: Float32Array | BigInt64Array, dims: number[]) => OrtTensor;
}

interface PiperConfig {
  audio: { sample_rate: number };
  inference: { noise_scale: number; length_scale: number; noise_w: number };
  phoneme_id_map: Record<string, number[]>;
}

/** 以页面根（document.baseURI）归一化 vendor 资源 URL（与 espeak 同理，防 base='./' 相对解析错位） */
function vendorUrl(relPath: string): string {
  return new URL(`${import.meta.env.BASE_URL}${relPath}`, document.baseURI).href;
}

/** 带超时与进度回调的下载（content-length 缺失时 progress 为 null） */
async function fetchWithProgress(
  url: string,
  timeoutMs: number,
  onProgress: ((pct: number | null) => void) | null
): Promise<Uint8Array> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status}（${url}）`);
  const total = Number(res.headers.get('content-length') ?? 0);
  if (!res.body) return new Uint8Array(await res.arrayBuffer());
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      onProgress?.(total > 0 ? Math.round((received / total) * 100) : null);
    }
  }
  const out = new Uint8Array(received);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

let ortPromise: Promise<OrtApi> | null = null;

function loadOrt(): Promise<OrtApi> {
  if (!ortPromise) {
    ortPromise = import(/* @vite-ignore */ vendorUrl(`${PIPER_VOICE.ortPath}/esm/ort.min.js`)).then(
      (m) => {
        const ort = m.default ?? m;
        // 显式指向 wasm 目录（含非线程 SIMD + 通用回退；GH Pages 无 COOP/COEP，
        // 不可用线程版，ort 会自动降级到非线程构建）
        ort.env.wasm.wasmPaths = vendorUrl(`${PIPER_VOICE.ortPath}/`);
        ort.env.wasm.numThreads = 1;
        return ort as OrtApi;
      }
    );
  }
  return ortPromise;
}

interface LoadedSession {
  ort: OrtApi;
  session: OrtSession;
  config: PiperConfig;
}

/* ---------- 加载状态（供 UI 提示“首次加载语音模型…”） ---------- */
export type PiperStatus = 'idle' | 'loading' | 'ready' | 'error';

let piperStatus: PiperStatus = 'idle';
const statusListeners = new Set<(s: PiperStatus, progress?: number | null) => void>();

export function getPiperStatus(): PiperStatus {
  return piperStatus;
}

/** 订阅加载状态（progress 仅 loading 阶段推送：0-100 或 null=未知）；返回取消订阅函数 */
export function onPiperStatus(cb: (s: PiperStatus, progress?: number | null) => void): () => void {
  statusListeners.add(cb);
  return () => {
    statusListeners.delete(cb);
  };
}

function setStatus(s: PiperStatus, progress?: number | null) {
  piperStatus = s;
  for (const cb of statusListeners) cb(s, progress);
}

let sessionPromise: Promise<LoadedSession | null> | null = null;

/** 依次尝试模型路径（int8 主 → float 回退），任一成功即返回会话 */
async function createSession(
  ort: OrtApi
): Promise<{ session: OrtSession; config: PiperConfig }> {
  const cfgBytes = await fetchWithProgress(vendorUrl(PIPER_VOICE.configPath), 15_000, null);
  const config = JSON.parse(new TextDecoder().decode(cfgBytes)) as PiperConfig;
  // int8 是主路径（小、快）；float 仅在 int8 缺失/失败时尝试（慢网络下
  // 120s 超时即放弃，降级 espeak，避免无限等待）
  for (const [path, label, timeoutMs] of [
    [PIPER_VOICE.modelPath, 'int8 量化', 90_000],
    [PIPER_VOICE.modelPathFloat, 'float 原版', 120_000]
  ] as const) {
    try {
      const modelBytes = await fetchWithProgress(vendorUrl(path), timeoutMs, (pct) =>
        setStatus('loading', pct)
      );
      // WASM 单线程下默认图优化（'all'）可能耗时数十秒；关掉以尽快可用
      const session = await ort.InferenceSession.create(modelBytes, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'disable'
      });
      console.info(`[piper] 语音模型就绪：${PIPER_VOICE.id}（${label}，${config.audio.sample_rate}Hz）`);
      return { session, config };
    } catch (e) {
      console.warn(`[piper] ${label} 模型不可用（${(e as Error).message}），尝试下一个…`);
    }
  }
  throw new Error('int8 与 float 模型均加载失败');
}

function loadSession(): Promise<LoadedSession | null> {
  if (!sessionPromise) {
    setStatus('loading', null);
    sessionPromise = (async () => {
      try {
        const ort = await loadOrt();
        const loaded = await createSession(ort);
        setStatus('ready');
        return { ort, ...loaded };
      } catch (e) {
        // 主引擎失败不静默：上层回退 espeak
        setStatus('error');
        console.warn('[piper] 加载失败，将回退 espeak-ng 合成：', e);
        return null;
      }
    })();
  }
  return sessionPromise;
}

/** 预热：后台加载 onnxruntime + 语音模型（页面挂载后调用，首次点发音即可用） */
export async function warmupPiper(): Promise<boolean> {
  // 测试环境不发起网络/动态导入
  if (import.meta.env.MODE === 'test') return false;
  const loaded = await loadSession();
  return loaded !== null;
}

/** 音素 id 序列 → 归一化 PCM（[-1,1]） */
async function synthIds(loaded: LoadedSession, ids: number[]): Promise<Float32Array | null> {
  const { ort, session, config } = loaded;
  try {
    const feeds: Record<string, OrtTensor> = {
      input: new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
      input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
      scales: new ort.Tensor(
        'float32',
        Float32Array.from([
          config.inference.noise_scale,
          config.inference.length_scale,
          config.inference.noise_w
        ]),
        [3]
      )
    };
    if (session.inputNames.includes('sid')) {
      feeds.sid = new ort.Tensor('int64', BigInt64Array.from([BigInt(0)]), [1]);
    }
    const res = await session.run(feeds);
    const out = res.output ?? res[Object.keys(res)[0]];
    if (!out || !(out.data instanceof Float32Array)) return null;
    const pcm = Float32Array.from(out.data);
    // 峰值归一化（piper 原始输出偏小，约 0.1-0.4）
    let peak = 0;
    for (const v of pcm) peak = Math.max(peak, Math.abs(v));
    if (peak < 1e-6) return null;
    const gain = 0.9 / peak;
    for (let i = 0; i < pcm.length; i++) pcm[i] *= gain;
    return pcm;
  } catch (e) {
    console.warn('[piper] 推理失败，将回退 espeak-ng 合成：', e);
    return null;
  }
}

/** 合成一个词形（伪词）→ WAV 字节；任何失败返回 null */
export async function synthPiperWord(word: Word): Promise<Uint8Array | null> {
  if (import.meta.env.MODE === 'test') return null;
  const loaded = await loadSession();
  if (!loaded) return null;
  const ids = wordToPiperIds(word, loaded.config.phoneme_id_map);
  if (!ids) return null;
  const pcm = await synthIds(loaded, ids);
  if (!pcm) return null;
  return encodeWav16(pcm, loaded.config.audio.sample_rate);
}
