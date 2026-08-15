/* ============================================================
 * vendor 脚本：把 espeak-ng 的 Emscripten 产物复制到 public/vendor/
 * （构建/开发前运行；产物不提交仓库，见 .gitignore）
 * ============================================================ */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'espeak-ng', 'dist');
const dest = join(root, 'public', 'vendor', 'espeak-ng');

if (!existsSync(src)) {
  console.error('[vendor] espeak-ng 未安装，请先执行 npm install');
  process.exit(1);
}

mkdirSync(dest, { recursive: true });
for (const f of ['espeak-ng.js', 'espeak-ng.wasm']) {
  copyFileSync(join(src, f), join(dest, f));
  console.log('[vendor] espeak-ng/' + f);
}
