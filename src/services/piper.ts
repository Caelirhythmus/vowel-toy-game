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
import { gunzipSync } from 'fflate';
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
      opts: { executionProviders: string[]; graphOptimizationLevel: 'disabled' | 'basic' | 'extended' | 'all' }
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

/** 带超时与进度回调的下载；进度基于已知模型字节数（content-length 可能
 *  因服务器 gzip 压缩/分块传输而失真——GH Pages 对 .onnx 动态 gzip 时
 *  content-length 是压缩后大小，而流读到的字节是解压后大小，比例会超 100%） */
async function fetchWithProgress(
  url: string,
  knownBytes: number,
  timeoutMs: number,
  onProgress: ((pct: number | null) => void) | null
): Promise<Uint8Array> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status}（${url}）`);
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
      onProgress?.(knownBytes > 0 ? Math.min(100, Math.round((received / knownBytes) * 100)) : null);
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
let lastError: string | null = null;
const statusListeners = new Set<(s: PiperStatus, progress?: number | null) => void>();

export function getPiperStatus(): PiperStatus {
  return piperStatus;
}

/** 最近一次加载失败的原因（供 UI/诊断） */
export function getPiperError(): string | null {
  return lastError;
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

/** 并行下载多个分片并拼接（jsDelivr 单文件 ≤20MB，float 模型切成 4 片） */
async function fetchParts(
  urls: readonly string[],
  totalBytes: number,
  timeoutMs: number,
  onProgress: ((pct: number | null) => void) | null
): Promise<Uint8Array> {
  const partBytes = Math.ceil(totalBytes / urls.length);
  // 每个分片独立记录“已读字节”，聚合时求和——避免各分片进度互相覆盖
  // 导致数字来回跳动；完成时用精确字节数覆盖。
  const perPart = new Array<number>(urls.length).fill(0);
  let lastPct = -1;
  const emit = () => {
    if (!onProgress) return;
    const pct = Math.min(
      100,
      Math.round((perPart.reduce((a, b) => a + b, 0) / totalBytes) * 100)
    );
    if (pct !== lastPct) {
      lastPct = pct;
      onProgress(pct);
    }
  };
  const chunks = await Promise.all(
    urls.map((url, i) =>
      fetchWithProgress(url, partBytes, timeoutMs, (pct) => {
        perPart[i] = ((pct ?? 0) / 100) * partBytes;
        emit();
      }).then((bytes) => {
        perPart[i] = bytes.length;
        emit();
        return bytes;
      })
    )
  );
  const total = chunks.reduce((s, b) => s + b.length, 0);
  if (total !== totalBytes) throw new Error(`分片字节数不符：${total} != ${totalBytes}`);
  const out = new Uint8Array(total);
  let off = 0;
  for (const b of chunks) {
    out.set(b, off);
    off += b.length;
  }
  return out;
}

/** 移动端检测：手机上 60MB float 分片下载慢、大模型 wasm 会话创建易超时，
 *  直接用小模型 int8（16MB）——小米 14 等实测 100% 卡住即由此 */
function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/** 候选 URL 解析：绝对 URL（CDN 镜像）原样使用，相对路径按站点根归一化 */
function resolveCandidateUrl(u: string): string {
  return /^https?:/i.test(u) ? u : vendorUrl(u);
}

/** 国内 IP 检测。
 *  国际视角优先：ipinfo.io 经代理能看到真实出口 IP（实测：挂代理返回 JP；
 *  国内直连返回 CN）。注意 myip.ipip.net 会走 IPv6 直连绕过代理（实测挂代理
 *  仍返回中国 IP），因此只能作为 ipinfo 失败时的国内视角兜底，不能参与“任一
 *  命中即国内”的裁决。3s 超时；全部失败按浏览器语言兜底。结果模块级缓存。 */
let chinaRegion: boolean | null = null;

const CN_APIS = {
  /** 国际视角（最可信）：country == "CN" 即国内 */
  intl: 'https://ipinfo.io/json',
  /** 国内视角兜底：文本含“中国/省”即国内（可能被 IPv6 直连绕过代理） */
  domestic: [
    { url: 'https://whois.pconline.com.cn/ipJson.jsp?json=true', encoding: 'gbk' },
    { url: 'https://myip.ipip.net', encoding: 'utf-8' }
  ] as { url: string; encoding: string }[]
} as const;

async function isChinaIp(): Promise<boolean> {
  if (chinaRegion !== null) return chinaRegion;
  try {
    const intl = await fetch(CN_APIS.intl, { signal: AbortSignal.timeout(3000) })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    if (intl && typeof intl.country === 'string') {
      chinaRegion = intl.country === 'CN';
    } else {
      // ipinfo 不可用 → 国内视角兜底
      const results = await Promise.allSettled(
        CN_APIS.domestic.map(({ url, encoding }) =>
          fetch(url, { signal: AbortSignal.timeout(3000) })
            .then((r) => (r.ok ? r.arrayBuffer() : null))
            .then((buf) => (buf ? new TextDecoder(encoding ?? 'utf-8').decode(buf) : ''))
        )
      );
      chinaRegion = results.some(
        (r) => r.status === 'fulfilled' && /中国|\u7701/.test(r.value)
      );
    }
  } catch {
    // 检测失败：按浏览器语言兜底（本项目用户以中文为主）
    chinaRegion = /^zh/i.test(navigator.language);
  }
  console.info(`[piper] 国内 IP 检测：${chinaRegion ? '是（Gitee 镜像优先）' : '否（跳过 Gitee）'}`);
  return chinaRegion;
}

/** 会话创建超时：wasm 初始化大模型在弱网/弱设备上可能极慢或挂起，超时降级下一候选 */
const CREATE_TIMEOUT_MS = 30_000;

/** 简易 tar（UStar）解析：fflate 无 tar 支持，tar 格式简单（512B 头 + 对齐数据） */
function untar(tar: Uint8Array): { name: string; data: Uint8Array }[] {
  const files: { name: string; data: Uint8Array }[] = [];
  const decoder = new TextDecoder();
  let off = 0;
  while (off + 512 <= tar.length) {
    const header = tar.subarray(off, off + 512);
    if (header.every((b) => b === 0)) break; // 结尾零块
    const name = decoder.decode(header.subarray(0, 100)).replace(/\0.*$/, '');
    const sizeStr = decoder.decode(header.subarray(124, 136)).replace(/[^0-7]/g, '');
    const size = sizeStr ? parseInt(sizeStr, 8) : 0;
    const type = String.fromCharCode(header[156] ?? 0);
    off += 512;
    if (type === '0' || type === '\0' || type === '') {
      files.push({ name, data: tar.slice(off, off + size) });
    }
    off += Math.ceil(size / 512) * 512;
  }
  return files;
}

/** 下载 npm 包 tarball 并解压出指定文件（tgz = gzip(tar)，fflate gunzip + 手写 tar） */
async function fetchTgzFile(
  url: string,
  knownBytes: number,
  timeoutMs: number,
  fileInPackage: string,
  onProgress: ((pct: number | null) => void) | null
): Promise<Uint8Array> {
  const tgz = await fetchWithProgress(url, knownBytes, timeoutMs, onProgress);
  const tar = gunzipSync(tgz);
  const files = untar(tar);
  const entry = files.find((f) => f.name === fileInPackage);
  if (!entry) {
    throw new Error(`npm 包内未找到 ${fileInPackage}`);
  }
  return entry.data;
}

/** 依次尝试模型源（候选来自 PIPER_VOICE，按桌面/移动 + 国内/国外过滤），任一成功即返回会话 */
async function createSession(
  ort: OrtApi
): Promise<{ session: OrtSession; config: PiperConfig }> {
  const cfgBytes = await fetchWithProgress(vendorUrl(PIPER_VOICE.configPath), 0, 15_000, null);
  const config = JSON.parse(new TextDecoder().decode(cfgBytes)) as PiperConfig;
  const mobile = isMobileDevice();
  // IP 检测（3s 上限）与模型下载串行开始；检测失败默认走非国内候选
  const china = await isChinaIp();
  const all = mobile ? PIPER_VOICE.modelCandidatesMobile : PIPER_VOICE.modelCandidatesDesktop;
  const candidates = china ? all : all.filter((c) => !c.chinaOnly);
  if (mobile) {
    console.info('[piper] 移动端设备：使用 int8 小模型候选（float 60MB 在手机端下载慢、会话创建易超时）');
  }
  let lastErr: unknown = null;
  for (const [i, cand] of candidates.entries()) {
    try {
      const modelBytes = cand.tgz
        ? await fetchTgzFile(
            resolveCandidateUrl(cand.tgz),
            cand.knownBytes!,
            cand.timeoutMs,
            cand.tgzFile!,
            (pct) => setStatus('loading', pct)
          )
        : cand.parts
          ? await fetchParts(
              cand.parts.map((p) => resolveCandidateUrl(p)),
              cand.totalBytes!,
              cand.timeoutMs,
              (pct) => setStatus('loading', pct)
            )
          : await fetchWithProgress(resolveCandidateUrl(cand.url!), cand.knownBytes!, cand.timeoutMs, (pct) =>
              setStatus('loading', pct)
            );
      // WASM 单线程下默认图优化（'all'）可能耗时数十秒；关掉以尽快可用。
      // 注意：onnxruntime-web 1.18 的合法枚举是 'disabled'（不是 'disable'，
      // 传错会在 create 时直接抛 "unsupported graph optimization level"）
      const session = await Promise.race([
        ort.InferenceSession.create(modelBytes, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'disabled'
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`会话创建超时（${cand.label}，${CREATE_TIMEOUT_MS / 1000}s）`)),
            CREATE_TIMEOUT_MS
          )
        )
      ]);
      console.info(`[piper] 语音模型就绪：${PIPER_VOICE.id}（${cand.label}，${config.audio.sample_rate}Hz）`);
      return { session, config };
    } catch (e) {
      lastErr = e;
      if (i < candidates.length - 1) {
        console.warn(`[piper] ${cand.label} 不可用（${(e as Error).message}），尝试下一个…`);
      }
    }
  }
  throw new Error(`语音模型全部加载失败：${(lastErr as Error)?.message ?? lastErr}`);
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
        lastError = (e as Error).message;
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
