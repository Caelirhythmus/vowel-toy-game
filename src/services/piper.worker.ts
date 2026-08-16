/* ============================================================
 * Piper 会话 Worker：onnxruntime-web 的会话创建与推理在独立线程执行。
 * 背景：主线程同步执行 InferenceSession.create（16MB 模型在手机上
 * 可能阻塞主线程数十秒，连超时定时器都无法触发 → UI 卡死 100%）。
 * Worker 内 create/run 只阻塞 Worker 线程，主线程可正常更新进度、
 * 响应超时；模型字节/音频经 postMessage transfer（零拷贝）。
 * ============================================================ */
import type { PiperConfig } from './piper';

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
      opts: { executionProviders: string[]; graphOptimizationLevel: 'disabled' }
    ): Promise<OrtSession>;
  };
  Tensor: new (type: string, data: Float32Array | BigInt64Array, dims: number[]) => OrtTensor;
}

type WorkerMessage =
  | { type: 'init'; ortUrl: string; wasmDir: string; modelBytes: Uint8Array; config: PiperConfig }
  | { type: 'synth'; ids: number[]; requestId: number };

type WorkerReply =
  | { type: 'ready' }
  | { type: 'error'; message: string }
  | { type: 'audio'; requestId: number; pcm: ArrayBuffer };

// worker 全局 postMessage 签名（避免 lib.dom 的 Window 重载干扰）
const scope = self as unknown as {
  onmessage: ((e: MessageEvent<WorkerMessage>) => void) | null;
  postMessage(msg: WorkerReply, transfer?: Transferable[]): void;
};

let ort: OrtApi | null = null;
let session: OrtSession | null = null;
let config: PiperConfig | null = null;

scope.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;
  try {
    if (msg.type === 'init') {
      const mod = await import(/* @vite-ignore */ msg.ortUrl);
      ort = (mod.default ?? mod) as OrtApi;
      ort.env.wasm.wasmPaths = msg.wasmDir;
      ort.env.wasm.numThreads = 1;
      config = msg.config;
      session = await ort.InferenceSession.create(msg.modelBytes, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'disabled'
      });
      scope.postMessage({ type: 'ready' });
    } else if (msg.type === 'synth' && ort && session && config) {
      const feeds: Record<string, OrtTensor> = {
        input: new ort.Tensor('int64', BigInt64Array.from(msg.ids.map(BigInt)), [1, msg.ids.length]),
        input_lengths: new ort.Tensor('int64', BigInt64Array.from([BigInt(msg.ids.length)]), [1]),
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
      if (!out || !(out.data instanceof Float32Array)) throw new Error('推理输出异常');
      const pcm = Float32Array.from(out.data);
      // 峰值归一化（与主线程路径一致）
      let peak = 0;
      for (const v of pcm) peak = Math.max(peak, Math.abs(v));
      if (peak < 1e-6) throw new Error('推理输出近静音');
      const gain = 0.9 / peak;
      for (let i = 0; i < pcm.length; i++) pcm[i] *= gain;
      scope.postMessage({ type: 'audio', requestId: msg.requestId, pcm: pcm.buffer }, [pcm.buffer]);
    }
  } catch (err) {
    scope.postMessage({ type: 'error', message: String((err as Error)?.message ?? err) });
  }
};
