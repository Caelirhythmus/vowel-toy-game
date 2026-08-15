/* ============================================================
 * 内容配置：元音库（可配置化 —— 音系内容与引擎解耦）
 * ============================================================ */
import type { DiphthongDef, VowelFeatures } from '@/core/types';

/** 基础单元音（IPA） */
export const MONOPHTHONGS: Record<string, VowelFeatures> = {
  i: { symbol: 'i', height: 4, back: 0, round: false },
  y: { symbol: 'y', height: 4, back: 0, round: true },
  e: { symbol: 'e', height: 3, back: 0, round: false },
  ø: { symbol: 'ø', height: 3, back: 0, round: true },
  ɛ: { symbol: 'ɛ', height: 2, back: 0, round: false },
  œ: { symbol: 'œ', height: 2, back: 0, round: true },
  æ: { symbol: 'æ', height: 1, back: 0, round: false },
  a: { symbol: 'a', height: 0, back: 0, round: false },
  ɑ: { symbol: 'ɑ', height: 0, back: 2, round: false },
  ɔ: { symbol: 'ɔ', height: 2, back: 2, round: true },
  o: { symbol: 'o', height: 3, back: 2, round: true },
  u: { symbol: 'u', height: 4, back: 2, round: true },
  ə: { symbol: 'ə', height: 2.5, back: 1, round: false }
};

/** 复元音（词内可出现的输入/输出；labelOffset 错开同起点标签） */
export const DIPHTHONGS: Record<string, DiphthongDef> = {
  aɪ: { symbol: 'aɪ', start: 'a', labelOffset: { dx: 0.05, dy: -0.06 } },
  aʊ: { symbol: 'aʊ', start: 'a', labelOffset: { dx: 0.07, dy: 0.02 } },
  eɪ: { symbol: 'eɪ', start: 'e', labelOffset: { dx: 0.06, dy: -0.05 } },
  əʊ: { symbol: 'əʊ', start: 'ə', labelOffset: { dx: -0.05, dy: 0.03 } }
};

/** 词生成元音池（含权重：常见前不圆唇元音权重高） */
export interface VowelPoolEntry {
  s: string;
  w: number;
  diph?: boolean;
}

export const VOWEL_POOL: VowelPoolEntry[] = [
  { s: 'i', w: 3 }, { s: 'e', w: 3 }, { s: 'ɛ', w: 2.5 }, { s: 'æ', w: 1.5 },
  { s: 'a', w: 3 }, { s: 'ɑ', w: 1 }, { s: 'ɔ', w: 1 }, { s: 'o', w: 1.5 },
  { s: 'u', w: 2 }, { s: 'y', w: 1 }, { s: 'ø', w: 0.6 }, { s: 'œ', w: 0.4 },
  { s: 'ə', w: 0.7 },
  { s: 'aɪ', w: 0.8, diph: true }, { s: 'aʊ', w: 0.5, diph: true },
  { s: 'eɪ', w: 0.5, diph: true }, { s: 'əʊ', w: 0.4, diph: true }
];

/** 长元音概率 */
export const LONG_PROB = 0.35;

/** 辅音（词生成用） */
export const CONSONANTS = ['b', 'p', 'm', 'd', 't', 'n', 'h', 'g', 'k'] as const;
