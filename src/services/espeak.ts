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
    // 路径说明：vite base='./' 时 import.meta.env.BASE_URL 构建后是相对路径 './'，
    // 而动态 import 的相对路径以“当前模块(bundle)所在目录”为基准解析——
    // bundle 位于 assets/，会错误解析成 assets/vendor/... 导致 404。
    // 因此必须以 document.baseURI（页面根）为基准归一化，确保 dev（'/'）与
    // 生产构建（'./'，含 GitHub Pages 子路径）都指向 dist 根下的 vendor/。
    const vendorUrl = new URL(
      `${import.meta.env.BASE_URL}vendor/espeak-ng/espeak-ng.js`,
      document.baseURI
    ).href;
    factoryPromise = import(/* @vite-ignore */ vendorUrl).then((m) => m.default as ESpeakFactory);
  }
  return factoryPromise;
}

/** espeak 加载/合成总超时：慢网络下避免点击后长时间无声（超时即走 TTS 兜底） */
const ESPEAK_TIMEOUT_MS = 45_000;

async function synthToWav(args: string[]): Promise<Uint8Array | null> {
  // 超时竞速：espeak wasm 首次加载可达 18MB，网络慢时不应让用户无限等待；
  // 超时后本次回退 TTS，后台加载仍在继续，下次点击即可用
  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), ESPEAK_TIMEOUT_MS);
  });
  try {
    const work = (async () => {
      const factory = await loadFactory();
      const espeak = await factory({ arguments: args });
      const data = espeak.FS.readFile('/out.wav');
      return data instanceof Uint8Array ? data : new Uint8Array(data);
    })();
    return await Promise.race([work, timeout]);
  } catch (e) {
    // 失败不静默：与 TTS 兜底联动排查（曾因构建路径 404 导致全部回退 TTS）
    console.warn('[espeak] 合成失败，将回退到浏览器 TTS 近似朗读：', e);
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
