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

/* ============================================================
 * Piper（神经 TTS，主引擎）：en_US-joe-medium（CC0）
 * - 模型/配置由 scripts/vendor-piper.mjs 预置到 public/vendor/piper/
 * - onnxruntime-web@1.18（esm/ 子目录 + wasm 在父目录，保留包结构）
 * - 音素名 → id 表在语音配置 .onnx.json 里，运行时拉取；
 *   此处只做“我们的符号 → Piper 音素名序列”（纯映射，可测）
 * ============================================================ */

export const PIPER_VOICE = {
  id: 'en_US-joe-medium',
  /** 相对站点根的模型/配置路径（构建后以 document.baseURI 归一化） */
  modelPath: 'vendor/piper/en_US-joe-medium.onnx',
  configPath: 'vendor/piper/en_US-joe-medium.onnx.json',
  /** onnxruntime-web 目录（esm 入口 + wasm 二进制） */
  ortPath: 'vendor/onnxruntime-web'
} as const;

/** 元音（含长音/复元音）→ Piper 音素名序列（复元音按字符分解；en-us 缺 [y ø œ a] 就近近似） */
export const PIPER_VOWEL_TOKENS: Record<string, string[]> = {
  i: ['i'], 'iː': ['i', 'ː'],
  y: ['i'], 'yː': ['i', 'ː'],
  e: ['e'], 'eː': ['e', 'ː'],
  ø: ['e'], 'øː': ['e', 'ː'],
  ɛ: ['ɛ'], 'ɛː': ['ɛ', 'ː'],
  œ: ['ɛ'], 'œː': ['ɛ', 'ː'],
  æ: ['æ'], 'æː': ['æ', 'ː'],
  a: ['æ'], 'aː': ['æ', 'ː'],
  ɑ: ['ɑ'], 'ɑː': ['ɑ', 'ː'],
  ɔ: ['ɔ'], 'ɔː': ['ɔ', 'ː'],
  o: ['o'], 'oː': ['o', 'ː'],
  u: ['u'], 'uː': ['u', 'ː'],
  ə: ['ə'],
  aɪ: ['a', 'ɪ'],
  aʊ: ['a', 'ʊ'],
  eɪ: ['e', 'ɪ'],
  əʊ: ['o', 'ʊ']
};

/** 辅音 → Piper 音素名（注意 g 用 ɡ，joe 音素表无 ASCII g） */
export const PIPER_CONSONANTS: Record<string, string> = {
  b: 'b', p: 'p', m: 'm', d: 'd', t: 't', n: 'n', h: 'h', g: 'ɡ', k: 'k'
};
