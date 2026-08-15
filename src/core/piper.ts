/* ============================================================
 * core：Piper 音素输入映射（纯函数，Node 可测）
 * Piper（VITS）的输入是“音素名 → id”序列（音素表来自音色的
 * .onnx.json 配置）。本模块把词形/音标符号翻译成 Piper 音素名
 * 序列，并按 piper 推理约定组装：
 *   [^ (BOS)] + 每个音素后跟 [_ (pad)] + [$ (EOS)]
 * ============================================================ */
import { PIPER_CONSONANTS, PIPER_VOWEL_TOKENS } from '@/config/audio';
import type { Word, WordVowel } from './types';

/** 词内元音 → Piper 音素名序列；无映射返回 null */
export function piperVowelTokens(v: WordVowel): string[] | null {
  if (v.diph) return PIPER_VOWEL_TOKENS[v.s] ?? null;
  return PIPER_VOWEL_TOKENS[v.s + (v.long ? 'ː' : '')] ?? PIPER_VOWEL_TOKENS[v.s] ?? null;
}

/**
 * 词 → Piper 音素名序列（主重音 ˈ 置于重读元音前，与 espeak 输入同构）。
 * 例：ˈpubi → ['p','ˈ','u','b','i']；puˈbi → ['p','u','b','ˈ','i']。
 */
export function wordToPiperTokens(word: Word): string[] | null {
  const tokens: string[] = [];
  for (let i = 0; i < 2; i++) {
    const v = piperVowelTokens(word.v[i]);
    const c = PIPER_CONSONANTS[word.c[i]];
    if (!v || !c) return null;
    tokens.push(c);
    if (word.stress === i) tokens.push('ˈ');
    tokens.push(...v);
  }
  return tokens;
}

/** 单个元音符号（可含长音 ː / 复元音）→ Piper 音素名序列；未知返回 null */
export function symbolToPiperTokens(symbol: string): string[] | null {
  return PIPER_VOWEL_TOKENS[symbol] ?? null;
}

/** Piper 推理边界标记（BOS/EOS/pad 音素名，取自音色 id 表） */
export const PIPER_BOS = '^';
export const PIPER_EOS = '$';
export const PIPER_PAD = '_';

/**
 * 音素名序列 → 推理 id 序列（BOS + 每个音素后跟 pad + EOS）。
 * 任一音素不在 id 表中时返回 null（上层回退到 espeak）。
 */
export function tokensToPiperIds(
  tokens: string[],
  idMap: Record<string, number[]>
): number[] | null {
  const bos = idMap[PIPER_BOS]?.[0];
  const eos = idMap[PIPER_EOS]?.[0];
  const pad = idMap[PIPER_PAD]?.[0];
  if (bos === undefined || eos === undefined || pad === undefined) return null;
  const ids: number[] = [bos];
  for (const t of tokens) {
    const id = idMap[t]?.[0];
    if (id === undefined) return null;
    ids.push(id, pad);
  }
  ids.push(eos);
  return ids;
}

/** 词 → Piper 推理 id 序列；任一环节不可映射返回 null */
export function wordToPiperIds(
  word: Word,
  idMap: Record<string, number[]>
): number[] | null {
  const tokens = wordToPiperTokens(word);
  if (!tokens) return null;
  return tokensToPiperIds(tokens, idMap);
}
