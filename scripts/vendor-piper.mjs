/* ============================================================
 * vendor 脚本：Piper 神经 TTS 资源预置
 * 1) 复制 onnxruntime-web（esm 入口 + 非线程 SIMD/通用 wasm）→ public/vendor/onnxruntime-web
 * 2) 下载 piper 音色 en_US-joe-medium（CC0，~60MB）→ public/vendor/piper/
 *    源：hf-mirror.com（国内镜像，先试）；回退 huggingface.co
 * 产物不提交仓库（.gitignore 已含 public/vendor/）
 * ============================================================ */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  try {
    await download(`${PIPER_BASE}/${file}`, destPath, `piper/${file}`);
  } catch (e) {
    console.warn(`[vendor-piper] hf-mirror 失败（${e.message}），尝试 huggingface.co…`);
    await download(`${PIPER_BASE_FALLBACK}/${file}`, destPath, `piper/${file}`);
  }
}

console.log('[vendor-piper] 完成');
