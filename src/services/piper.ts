/* ============================================================
 * services：Piper 神经 TTS 适配器（主引擎，onnxruntime-web WASM）
 * - 懒加载：首次合成时动态 import public/vendor/onnxruntime-web/esm/ort.min.js
 * - 音色：en_US-joe-medium（CC0，22.05kHz，~60MB，由 vendor 脚本预置）
 * - 输入：显式音素 id 序列（core/piper.ts 组装 BOS+音素+pad+EOS），
 *   不依赖任何文本 G2P，保证伪词里的每个元音精确可控
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
      opts: { executionProviders: string[] }
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

let sessionPromise: Promise<LoadedSession | null> | null = null;

/** 依次尝试模型路径（int8 主 → float 回退），任一成功即返回会话 */
async function createSession(
  ort: OrtApi
): Promise<{ session: OrtSession; config: PiperConfig }> {
  const cfgRes = await fetch(vendorUrl(PIPER_VOICE.configPath));
  if (!cfgRes.ok) throw new Error(`配置加载失败 HTTP ${cfgRes.status}`);
  const config = (await cfgRes.json()) as PiperConfig;
  for (const [path, label] of [
    [PIPER_VOICE.modelPath, 'int8 量化'],
    [PIPER_VOICE.modelPathFloat, 'float 原版']
  ] as const) {
    try {
      const modelRes = await fetch(vendorUrl(path));
      if (!modelRes.ok) throw new Error(`模型加载失败 HTTP ${modelRes.status}`);
      const session = await ort.InferenceSession.create(
        new Uint8Array(await modelRes.arrayBuffer()),
        { executionProviders: ['wasm'] }
      );
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
    sessionPromise = (async () => {
      try {
        const ort = await loadOrt();
        const loaded = await createSession(ort);
        return { ort, ...loaded };
      } catch (e) {
        // 主引擎失败不静默：上层回退 espeak
        console.warn('[piper] 加载失败，将回退 espeak-ng 合成：', e);
        return null;
      }
    })();
  }
  return sessionPromise;
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
  const loaded = await loadSession();
  if (!loaded) return null;
  const ids = wordToPiperIds(word, loaded.config.phoneme_id_map);
  if (!ids) return null;
  const pcm = await synthIds(loaded, ids);
  if (!pcm) return null;
  return encodeWav16(pcm, loaded.config.audio.sample_rate);
}
