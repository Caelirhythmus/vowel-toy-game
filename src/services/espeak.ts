/* ============================================================
 * services：espeak-ng WASM 适配器（离线合成，GPL-3.0-or-later）
 * - 懒加载：首次使用时动态 import public/vendor/espeak-ng/espeak-ng.js
 * - 每次合成创建一个实例（callMain 未导出）；wasm ~18.5MB 浏览器缓存
 * ============================================================ */
import { symbolToPhonemeInput, wordToPhonemeInput } from '@/core/espeak';
import type { Word } from '@/core';

interface ESpeakModule {
  FS: {
    readFile(path: string): Uint8Array | number[];
  };
}

type ESpeakFactory = (opts: { arguments: string[] }) => Promise<ESpeakModule>;

let factoryPromise: Promise<ESpeakFactory> | null = null;

function loadFactory(): Promise<ESpeakFactory> {
  if (!factoryPromise) {
    factoryPromise = import(
      /* @vite-ignore */ `${import.meta.env.BASE_URL}vendor/espeak-ng/espeak-ng.js`
    ).then((m) => m.default as ESpeakFactory);
  }
  return factoryPromise;
}

async function synthToWav(args: string[]): Promise<Uint8Array | null> {
  try {
    const factory = await loadFactory();
    const espeak = await factory({ arguments: args });
    const data = espeak.FS.readFile('/out.wav');
    return data instanceof Uint8Array ? data : new Uint8Array(data);
  } catch {
    return null;
  }
}

/** 按音素输入串合成 WAV 字节 */
export async function synthPhonemeInput(input: string): Promise<Uint8Array | null> {
  return synthToWav(['-w', 'out.wav', '-v', 'en-us', input]);
}

/** 合成一个词形（伪词） */
export async function synthWord(word: Word): Promise<Uint8Array | null> {
  const input = wordToPhonemeInput(word);
  if (!input) return null;
  return synthPhonemeInput(input);
}

/** 合成单个单元音符号（录音缺失时的兜底） */
export async function synthSymbol(symbol: string): Promise<Uint8Array | null> {
  const input = symbolToPhonemeInput(symbol);
  if (!input) return null;
  return synthPhonemeInput(input);
}
