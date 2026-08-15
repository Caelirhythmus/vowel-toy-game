/* ============================================================
 * vendor 脚本：Piper 神经 TTS 资源预置
 * 1) 复制 onnxruntime-web（esm 入口 + 非线程 SIMD/通用 wasm）→ public/vendor/onnxruntime-web
 * 2) 下载 piper 音色 en_US-joe-medium（CC0，~60MB）→ public/vendor/piper/
 *    源：hf-mirror.com（国内镜像，先试）；回退 huggingface.co
 * 3) int8 动态量化（60MB → ~18MB）：有 python3 + onnxruntime 则自动执行，
 *    否则保留 float（运行时会自动回退到 float 模型）
 * 产物不提交仓库（.gitignore 已含 public/vendor/）
 * ============================================================ */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
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

/* ---------- 1) onnxruntime-web（保留 esm/ 子目录 + wasm 在父目录的包结构） ---------- */
mkdirSync(join(ortDest, 'esm'), { recursive: true });
const ortFiles = [
  ['esm/ort.min.js', 'esm/ort.min.js'],
  ['esm/ort.wasm.min.js', 'esm/ort.wasm.min.js'],
  // 非线程 SIMD + 无 SIMD 通用回退（线程版需要 COOP/COEP，GH Pages 不可用，不复制）
  ['ort-wasm-simd.wasm', 'ort-wasm-simd.wasm'],
  ['ort-wasm.wasm', 'ort-wasm.wasm']
];
for (const [rel, out] of ortFiles) {
  copyFileSync(join(ortSrc, rel), join(ortDest, out));
  console.log('[vendor-piper] onnxruntime-web/' + out);
}

/* ---------- 2) piper 音色（已存在则跳过，断点续传友好） ---------- */
const VOICE = 'en_US-joe-medium';
const PIPER_BASE = 'https://hf-mirror.com/rhasspy/piper-voices/resolve/main/en/en_US/joe/medium';
const PIPER_BASE_FALLBACK = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/joe/medium';

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
  // float 模型仅是 int8 的运行时回退（int8 已随仓库提交），下载失败不阻断构建
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

/* ---------- 3) int8 动态量化（60MB → 18MB，首次加载快 70%） ---------- */
// 需要 python3/python + onnxruntime + onnx；不可用时保留 float（服务端会自动回退）
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
    await execFileAsync(py, ['-c', 'import onnxruntime, onnx'], { timeout: 15000 });
  } catch {
    console.log('[vendor-piper] 安装量化依赖（onnxruntime + onnx）…');
    try {
      await execFileAsync(py, ['-m', 'pip', 'install', '--quiet', 'onnxruntime', 'onnx'], {
        timeout: 10 * 60 * 1000
      });
    } catch (e) {
      console.warn('[vendor-piper] 依赖安装失败，跳过量化（保留 float 模型）：', e.message);
      return;
    }
  }
  const script = [
    'from onnxruntime.quantization import quantize_dynamic, QuantType',
    `quantize_dynamic(${JSON.stringify(floatPath)}, ${JSON.stringify(int8Path)}, weight_type=QuantType.QInt8)`,
    'print("quantized ok")'
  ].join('\n');
  try {
    await execFileAsync(py, ['-c', script], { timeout: 15 * 60 * 1000 });
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
