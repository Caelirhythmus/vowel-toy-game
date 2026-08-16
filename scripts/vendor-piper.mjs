/* ============================================================
 * vendor 脚本：Piper 神经 TTS 资源预置
 * 1) 复制 onnxruntime-web（esm 入口 + 非线程 SIMD/通用 wasm）→ public/vendor/onnxruntime-web
 * 2) 下载 piper 音色 en_US-joe-medium（CC0，~60MB）→ public/vendor/piper/
 *    源：hf-mirror.com（国内镜像，先试）；回退 huggingface.co
 * 3) int8 动态量化（60MB → ~18MB）：有 python3 + onnxruntime 则自动执行，
 *    否则保留 float（运行时会自动回退到 float 模型）
 * 产物不提交仓库（.gitignore 已含 public/vendor/）
 * ============================================================ */
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ortSrc = join(root, 'node_modules', 'onnxruntime-web', 'dist');
const ortDest = join(root, 'public', 'vendor', 'onnxruntime-web');
const piperDest = join(root, 'public', 'vendor', 'piper');

if (!existsSync(ortSrc)) {
  console.error('[vendor-piper] onnxruntime-web 未安装，请先执行 npm install');
  process.exit(1);
}

/* ---------- 1) onnxruntime-web（1.19+ 布局：根目录 ESM 入口 + 线程版 wasm 及 glue） ----------
 * 1.20 实测：esm/ 子目录已不存在；ESM 入口为根目录 ort.min.mjs；
 * wasm 仅发布线程版 ort-wasm-simd-threaded.wasm（~10.7MB）+ 同目录
 * glue ort-wasm-simd-threaded.mjs（ort 按此文件名硬编码加载 glue）。
 * 非线程构建已移除；非隔离环境（GH Pages/Vercel 无 COOP/COEP）由
 * ort 运行时降级单线程（wasmBinary 注入后无网络请求）。
 */
mkdirSync(ortDest, { recursive: true });
/* 清理 1.18 时代的旧布局产物（esm/ 子目录、非线程 wasm）——1.19+ 不再使用，
 * 避免陈旧文件残留（~20MB）与误导 */
for (const stale of ['esm', 'ort-wasm-simd.wasm', 'ort-wasm.wasm']) {
  const p = join(ortDest, stale);
  if (existsSync(p)) {
    rmSync(p, { recursive: true, force: true });
    console.log('[vendor-piper] 清理旧布局产物：onnxruntime-web/' + stale);
  }
}
const ortFiles = [
  ['ort.min.mjs', 'ort.min.mjs'],
  ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.mjs'],
  ['ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.wasm']
];
for (const [rel, out] of ortFiles) {
  copyFileSync(join(ortSrc, rel), join(ortDest, out));
  console.log('[vendor-piper] onnxruntime-web/' + out);
}

/* ---------- 2) piper 音色（已存在则跳过，断点续传友好） ---------- */
const VOICE = 'en_US-joe-medium';
const PIPER_BASE = 'https://hf-mirror.com/rhasspy/piper-voices/resolve/main/en/en_US/joe/medium';
const PIPER_BASE_FALLBACK = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/joe/medium';
// float 模型仅是 int8 的运行时回退，且 int8 已随仓库提交——
// 默认不下载（构建不依赖外部网络）；需要时设 PIPER_DOWNLOAD_FLOAT=1
const DOWNLOAD_FLOAT = process.env.PIPER_DOWNLOAD_FLOAT === '1';

mkdirSync(piperDest, { recursive: true });

async function download(url, destPath, label) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15 * 60 * 1000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} (${url})`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(destPath, buf);
  console.log(`[vendor-piper] ${label} ${(buf.length / 1048576).toFixed(1)}MB`);
}

for (const [file, label] of [
  [`${VOICE}.onnx.json`, '配置'],
  [`${VOICE}.onnx`, '音色模型']
]) {
  const destPath = join(piperDest, file);
  if (existsSync(destPath)) {
    console.log(`[vendor-piper] 已存在，跳过：piper/${file}`);
    continue;
  }
  if (file === `${VOICE}.onnx` && !DOWNLOAD_FLOAT) {
    console.log(`[vendor-piper] 跳过 float 模型下载（int8 已随仓库提交；需要时设 PIPER_DOWNLOAD_FLOAT=1）`);
    continue;
  }
  try {
    try {
      await download(`${PIPER_BASE}/${file}`, destPath, `piper/${file}`);
    } catch (e) {
      console.warn(`[vendor-piper] hf-mirror 失败（${e.message}），尝试 huggingface.co…`);
      await download(`${PIPER_BASE_FALLBACK}/${file}`, destPath, `piper/${file}`);
    }
  } catch (e) {
    console.warn(`[vendor-piper] 下载失败（${e.message}），跳过：piper/${file}（回退链：int8 → float 缺失时直接 espeak）`);
  }
}

/* ---------- 3) weight-only QDQ 量化（60MB → ~16MB，首次加载快 70%） ---------- */
// 需要 python3 + onnx + numpy；不可用时保留 float（服务端会自动回退）
// 注意：用 scripts/quantize-wo.py 而非 onnxruntime.quantization（ConvInteger 兼容问题）
const floatPath = join(piperDest, `${VOICE}.onnx`);
const int8Path = join(piperDest, `${VOICE}.int8.onnx`);

async function findPython() {
  for (const py of ['python3', 'python']) {
    try {
      await execFileAsync(py, ['--version'], { timeout: 10000 });
      return py;
    } catch {
      /* 尝试下一个 */
    }
  }
  return null;
}

async function quantizeToInt8(py) {
  if (existsSync(int8Path)) {
    console.log('[vendor-piper] 已存在，跳过：int8 量化模型');
    return;
  }
  try {
    await execFileAsync(py, ['-c', 'import onnx, numpy'], { timeout: 15000 });
  } catch {
    console.log('[vendor-piper] 安装量化依赖（onnx + numpy）…');
    try {
      await execFileAsync(py, ['-m', 'pip', 'install', '--quiet', 'onnx', 'numpy'], {
        timeout: 10 * 60 * 1000
      });
    } catch (e) {
      console.warn('[vendor-piper] 依赖安装失败，跳过量化（保留 float 模型）：', e.message);
      return;
    }
  }
  // weight-only QDQ：Conv/MatMul/ConvTranspose 权重 int8 对称量化 + DequantizeLinear
  // （不用 onnxruntime.quantization——它会把 QDQ 融合成 ConvInteger，wasm 无实现）
  try {
    await execFileAsync(py, [join(root, 'scripts', 'quantize-wo.py'), floatPath, int8Path], {
      timeout: 15 * 60 * 1000
    });
    const { size } = await import('node:fs/promises').then((m) => m.stat(int8Path));
    console.log(`[vendor-piper] int8 量化完成：piper/${VOICE}.int8.onnx（${(size / 1048576).toFixed(1)}MB）`);
  } catch (e) {
    console.warn('[vendor-piper] 量化失败，保留 float 模型：', e.message);
  }
}

const py = await findPython();
if (py) {
  await quantizeToInt8(py);
} else {
  console.warn('[vendor-piper] 未找到 python3/python，跳过 int8 量化（保留 float 模型）');
}

console.log('[vendor-piper] 完成');
