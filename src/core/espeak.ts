/* ============================================================
 * core：espeak-ng 音素输入映射（纯函数，Node 可测）
 * espeak-ng 无 Unicode IPA 输入，使用 [[助记符]] 语法；
 * 本模块把我们的词形/音标符号翻译成助记符串。
 * ============================================================ */
import { DIPHTHONG_MNEMONICS, ESPEAK_CONSONANTS, ESPEAK_MNEMONICS } from '@/config/audio';
import type { Word, WordVowel } from './types';

/** 词内元音 → 助记符（复元音取组件序列；无映射返回 null） */
export function vowelMnemonic(v: WordVowel): string | null {
  if (v.diph) return DIPHTHONG_MNEMONICS[v.s] ?? null;
  return ESPEAK_MNEMONICS[v.s + (v.long ? 'ː' : '')] ?? ESPEAK_MNEMONICS[v.s] ?? null;
}

/**
 * 词 → espeak-ng 音素输入串（[[...]] 语法，主重音 ' 置于重读元音前）。
 * 例：ˈbata → [[b'ata]]；baˈte → [[bat'e]]。
 */
export function wordToPhonemeInput(word: Word): string | null {
  let inner = '';
  for (let i = 0; i < 2; i++) {
    const m = vowelMnemonic(word.v[i]);
    const c = ESPEAK_CONSONANTS[word.c[i]];
    if (!m || !c) return null;
    inner += word.stress === i ? c + "'" + m : c + m;
  }
  return '[[' + inner + ']]';
}

/** 单个单元音符号（可含长音 ː）→ 音素输入串；复元音/未知返回 null */
export function symbolToPhonemeInput(symbol: string): string | null {
  const m = ESPEAK_MNEMONICS[symbol];
  return m ? '[[' + m + ']]' : null;
}
