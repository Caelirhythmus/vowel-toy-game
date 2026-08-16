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

/* ============================================================
 * TTS 兜底：浏览器 speechSynthesis 不读 IPA（ˈ/iː/ɛ 等会被读成
 * 字母名或乱读），因此兜底时用英文近似拼写代替 IPA 原文。
 * 音节核近似：ee/oo/ah/aw/eh/ay/oh/uh/ai/ow/er
 * ============================================================ */

/** IPA 元音（含长音/复元音）→ 英文近似拼写（TTS 可读） */
const TTS_VOWEL_APPROX: Record<string, string> = {
  i: 'ee', 'iː': 'ee',
  y: 'ee', 'yː': 'ee',
  e: 'ay', 'eː': 'ay',
  ø: 'er', 'øː': 'er',
  ɛ: 'eh', 'ɛː': 'eh',
  œ: 'er', 'œː': 'er',
  æ: 'a', 'æː': 'a',
  a: 'ah', 'aː': 'ah',
  ɑ: 'ah', 'ɑː': 'ah',
  ɔ: 'aw', 'ɔː': 'aw',
  o: 'oh', 'oː': 'oh',
  u: 'oo', 'uː': 'oo',
  ə: 'uh',
  aɪ: 'ai',
  aʊ: 'ow',
  eɪ: 'ay',
  əʊ: 'oh',
  oʊ: 'oh',
  jɛ: 'yeh',
  wɔ: 'wah'
};

/** 单个元音符号（含长音 ː / 复元音）→ TTS 近似拼写；未知返回 null */
export function symbolToTtsText(symbol: string): string | null {
  return TTS_VOWEL_APPROX[symbol] ?? null;
}

/**
 * 词 → TTS 近似拼写（不含重音标记，辅音保留原字母）。
 * 例：{p,u,b,i} → "poobee"（TTS 读 /puːbiː/，近似 [pubi]）。
 * 任一音节无法近似时返回 null。
 */
export function wordToTtsText(word: Word): string | null {
  let out = '';
  for (let i = 0; i < 2; i++) {
    const v = word.v[i];
    const m = TTS_VOWEL_APPROX[v.s + (v.long ? 'ː' : '')] ?? TTS_VOWEL_APPROX[v.s];
    if (!m) return null;
    out += word.c[i] + m;
  }
  return out;
}
