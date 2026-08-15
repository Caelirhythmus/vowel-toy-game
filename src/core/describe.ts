/* ============================================================
 * core：元音特征描述（悬停卡 / 读屏 aria-label 用，纯函数可测）
 * ============================================================ */
import type { Lang, VowelFeatures, WordVowel } from './types';
import { resolveVowel } from './vowels';

const HEIGHT: Record<number, { zh: string; en: string }> = {
  0: { zh: '开', en: 'open' },
  1: { zh: '次开', en: 'near-open' },
  2: { zh: '半开', en: 'open-mid' },
  2.5: { zh: '中', en: 'mid' },
  3: { zh: '半闭', en: 'close-mid' },
  4: { zh: '闭', en: 'close' }
};

const BACK: Record<number, { zh: string; en: string }> = {
  0: { zh: '前', en: 'front' },
  1: { zh: '央', en: 'central' },
  2: { zh: '后', en: 'back' }
};

const ROUND = {
  zh: { true: '圆唇', false: '不圆唇' },
  en: { true: 'rounded', false: 'unrounded' }
} as const;

/** 特征描述：zh「前高不圆唇元音」/ en「close front unrounded vowel」 */
export function describeVowel(v: WordVowel | VowelFeatures, lang: Lang): string {
  const f = 'symbol' in v ? v : resolveVowel(v);
  if (!f) return 'symbol' in v ? v.symbol : v.s;
  const h = HEIGHT[f.height] ?? { zh: '', en: '' };
  const b = BACK[f.back] ?? { zh: '', en: '' };
  const r = ROUND[lang][f.round ? 'true' : 'false'];
  if (lang === 'zh') {
    return `${b.zh}${h.zh}${r}元音`;
  }
  return `${h.en} ${b.en} ${r} vowel`;
}

/** 复元音描述 */
export function describeDiphthong(symbol: string, start: string, lang: Lang): string {
  if (lang === 'zh') return `${symbol}（复元音，起点 ${start}）`;
  return `${symbol} (diphthong, from ${start})`;
}
