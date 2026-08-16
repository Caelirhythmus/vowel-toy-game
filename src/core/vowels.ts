/* ============================================================
 * core：元音工具（特征解析 / 构造 / 显示）
 * ============================================================ */
import type { VowelFeatures, WordVowel } from './types';
import { MONOPHTHONGS, DIPHTHONGS, VOWEL_POOL, LONG_PROB } from '@/config/vowels';
import type { VowelPoolEntry } from '@/config/vowels';

/** 按权重从元音池构造一个词内元音（pool 缺省 = 泛语系全池） */
export function mkVowel(pool: VowelPoolEntry[] = VOWEL_POOL, longProb: number = LONG_PROB): WordVowel {
  const total = pool.reduce((s, e) => s + e.w, 0);
  let r = Math.random() * total;
  let entry = pool[0];
  for (const e of pool) {
    r -= e.w;
    if (r <= 0) {
      entry = e;
      break;
    }
  }
  const long = !entry.diph && Math.random() < longProb;
  return { s: entry.s, long, diph: !!entry.diph };
}

/** 词内元音 → 基础特征（复元音取起点） */
export function resolveVowel(v: WordVowel): VowelFeatures | null {
  if (v.diph) {
    const d = DIPHTHONGS[v.s];
    return d ? (MONOPHTHONGS[d.start] ?? null) : null;
  }
  return MONOPHTHONGS[v.s] ?? null;
}

/** 完整显示串（含长音标记） */
export function vowelText(v: WordVowel): string {
  return v.s + (v.long && !v.diph ? 'ː' : '');
}

/** 按特征查目标元音（不存在则返回 null） */
export function byFeatures(
  height: number,
  back: number,
  round: boolean,
  long: boolean
): WordVowel | null {
  for (const key of Object.keys(MONOPHTHONGS)) {
    const m = MONOPHTHONGS[key];
    if (m.height === height && m.back === back && m.round === round) {
      return { s: m.symbol, long, diph: false };
    }
  }
  return null;
}
