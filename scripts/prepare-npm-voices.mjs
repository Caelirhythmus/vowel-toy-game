/* ============================================================
 * 语音包发布准备：生成可发布的 npm 包目录（.npm-voices/）
 * 浏览器从 registry.npmjs.org 下载 tarball 并解压（fflate），
 * npmjs 直连带 CORS 且国内实测 2.6MB/s（比 jsDelivr 快约一倍）。
 *
 * 用法：
 *   npm run voices:prepare
 *   cd .npm-voices/vowel-lab-voices-float && npm publish
 *   cd .npm-voices/vowel-lab-voices-int8  && npm publish
 * （首次需 npm login，账号 caelirhythmus）
 * ============================================================ */
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const piper = join(root, 'public', 'vendor', 'piper');
const out = join(root, '.npm-voices');

const packages = [
  {
    name: 'vowel-lab-voices-float',
    version: '0.1.0',
    file: 'float.onnx',
    src: 'en_US-joe-medium.onnx',
    desc: 'Vowel Change Lab — Piper voice model (float, en_US-joe-medium, CC0, 22.05kHz)'
  },
  {
    name: 'vowel-lab-voices-int8',
    version: '0.1.0',
    file: 'int8.onnx',
    src: 'en_US-joe-medium.int8.onnx',
    desc: 'Vowel Change Lab — Piper voice model (int8 QDQ, en_US-joe-medium, CC0, 22.05kHz)'
  }
];

for (const p of packages) {
  const dir = join(out, p.name);
  mkdirSync(dir, { recursive: true });
  copyFileSync(join(piper, p.src), join(dir, p.file));
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name: p.name,
        version: p.version,
        description: p.desc,
        license: 'CC0-1.0',
        files: [p.file],
        repository: 'https://github.com/Caelirhythmus/vowel-toy-game',
        publishConfig: { access: 'public' }
      },
      null,
      2
    ) + '\n'
  );
  console.log(`[voices] 已生成 ${p.name} v${p.version}（${p.file}）`);
}

console.log('\n发布命令（需先 npm login，账号 caelirhythmus）：');
console.log(`  cd ${join('.npm-voices', 'vowel-lab-voices-float')} && npm publish`);
console.log(`  cd ${join('.npm-voices', 'vowel-lab-voices-int8')} && npm publish`);
console.log('发布后确认版本号与 src/config/audio.ts 中 tarball URL 一致（默认 0.1.0）。');
