/* ============================================================
 * 内容配置：发音资源（可配置化 —— 符号 → 录音文件 / espeak 助记符）
 *
 * 单元音：Wikimedia Commons 权威录音（CC BY-SA 3.0，
 * 见 public/audio/ATTRIBUTIONS.txt），已转码为通用 WAV 自托管。
 * 复元音：无权威录音，按用户决定不提供发音（仅保留图上标注）。
 * 词形/兜底：espeak-ng（GPL-3.0-or-later，见 THIRD_PARTY_NOTICES.md）
 * 离线合成，输入用其音素助记符（[[...]] 语法）。
 * ============================================================ */

/** 单元音 → 录音文件键（public/audio/vowel-{key}.wav） */
export const VOWEL_AUDIO: Record<string, string> = {
  i: 'i',
  y: 'y',
  e: 'e',
  ø: 'o-slash',
  ɛ: 'eps',
  œ: 'oe',
  æ: 'ae',
  a: 'a',
  ɑ: 'alpha',
  ɔ: 'open-o',
  o: 'o',
  u: 'u',
  ə: 'schwa'
};

/**
 * 单元音（含长音变体）→ espeak-ng 音素助记符。
 * 映射经 espeak-ng en-us 实证（2026-08）：a→æ(TRAP)、E→ɛ、O→ɔ、U→ʊ、
 * @→ə、A:/0→ɑː、i:→iː、E:→ɛː、O:→ɔː、o:→oː、u:→uː。
 * en-us 缺 [y ø œ a]（前圆唇/开前元音），就近近似：y→i、ø→e、œ→ɛ、a→æ。
 */
export const ESPEAK_MNEMONICS: Record<string, string> = {
  i: 'i', 'iː': 'i:',
  y: 'i', 'yː': 'i:',
  e: 'e', 'eː': 'e:',
  ø: 'e', 'øː': 'e:',
  ɛ: 'E', 'ɛː': 'E:',
  œ: 'E', 'œː': 'E:',
  æ: 'a', 'æː': 'a:',
  a: 'a', 'aː': 'a:',
  ɑ: '0', 'ɑː': '0',
  ɔ: 'O', 'ɔː': 'O:',
  o: 'o', 'oː': 'o:',
  u: 'u', 'uː': 'u:',
  ə: '@'
};

/** 复元音 → espeak 助记符序列（实证：aI→aɪ、aU→aʊ、eI→eɪ、@U→əʊ） */
export const DIPHTHONG_MNEMONICS: Record<string, string> = {
  aɪ: 'aI',
  aʊ: 'aU',
  eɪ: 'eI',
  əʊ: '@U'
};

/** 辅音 → espeak 助记符（与音素输入同形） */
export const ESPEAK_CONSONANTS: Record<string, string> = {
  b: 'b', p: 'p', m: 'm', d: 'd', t: 't', n: 'n', h: 'h', g: 'g', k: 'k'
};
