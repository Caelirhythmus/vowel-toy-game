import { describe, expect, it } from 'vitest';
import {
  piperVowelTokens,
  symbolToPiperTokens,
  tokensToPiperIds,
  wordToPiperIds,
  wordToPiperTokens
} from '@/core/piper';
import type { Word } from '@/core';

const W = (
  v1: string,
  v2: string,
  stress: 0 | 1,
  v1long = false,
  v1diph = false
): Word => ({
  c: ['p', 'b'],
  v: [
    { s: v1, long: v1long, diph: v1diph },
    { s: v2, long: false, diph: false }
  ],
  stress
});

/** joe 音色 id 表的子集（真实值） */
const JOE_MAP: Record<string, number[]> = {
  '^': [1], '$': [2], '_': [0],
  p: [28], ˈ: [120], u: [33], b: [15], i: [21], ː: [122],
  ɪ: [74], ʊ: [100], æ: [39], ɑ: [51], ə: [59], ɔ: [54],
  e: [18], o: [27], ɡ: [66]
};

describe('piperVowelTokens 元音 → Piper 音素名', () => {
  it('单元音（含长音）', () => {
    expect(piperVowelTokens({ s: 'i', long: false, diph: false })).toEqual(['i']);
    expect(piperVowelTokens({ s: 'i', long: true, diph: false })).toEqual(['i', 'ː']);
    expect(piperVowelTokens({ s: 'ɑ', long: false, diph: false })).toEqual(['ɑ']);
    expect(piperVowelTokens({ s: 'ə', long: false, diph: false })).toEqual(['ə']);
  });

  it('en-us 缺失元音就近近似（与 espeak 一致）', () => {
    expect(piperVowelTokens({ s: 'y', long: false, diph: false })).toEqual(['i']);
    expect(piperVowelTokens({ s: 'ø', long: false, diph: false })).toEqual(['e']);
    expect(piperVowelTokens({ s: 'œ', long: false, diph: false })).toEqual(['ɛ']);
    expect(piperVowelTokens({ s: 'a', long: false, diph: false })).toEqual(['æ']);
  });

  it('复元音按字符分解', () => {
    expect(piperVowelTokens({ s: 'aɪ', long: false, diph: true })).toEqual(['a', 'ɪ']);
    expect(piperVowelTokens({ s: 'aʊ', long: false, diph: true })).toEqual(['a', 'ʊ']);
    expect(piperVowelTokens({ s: 'eɪ', long: false, diph: true })).toEqual(['e', 'ɪ']);
    expect(piperVowelTokens({ s: 'əʊ', long: false, diph: true })).toEqual(['o', 'ʊ']);
  });

  it('未知符号返回 null', () => {
    expect(piperVowelTokens({ s: '?', long: false, diph: false })).toBeNull();
  });
});

describe('wordToPiperTokens 词 → Piper 音素名序列', () => {
  it('ˈpubi → p ˈ u b i；puˈbi → p u b ˈ i', () => {
    expect(wordToPiperTokens(W('u', 'i', 0))).toEqual(['p', 'ˈ', 'u', 'b', 'i']);
    expect(wordToPiperTokens(W('u', 'i', 1))).toEqual(['p', 'u', 'b', 'ˈ', 'i']);
  });

  it('长元音：ˈbiːba → b ˈ i ː b æ', () => {
    const w: Word = {
      c: ['b', 'b'],
      v: [{ s: 'i', long: true, diph: false }, { s: 'a', long: false, diph: false }],
      stress: 0
    };
    expect(wordToPiperTokens(w)).toEqual(['b', 'ˈ', 'i', 'ː', 'b', 'æ']);
  });

  it('复元音：paʊˈbə → p a ʊ b ˈ ə', () => {
    expect(wordToPiperTokens(W('aʊ', 'ə', 1, false, true))).toEqual(['p', 'a', 'ʊ', 'b', 'ˈ', 'ə']);
  });

  it('辅音 g → ɡ（joe 音素表无 ASCII g）', () => {
    const w: Word = {
      c: ['g', 'k' as never],
      v: [{ s: 'i', long: false, diph: false }, { s: 'a', long: false, diph: false }],
      stress: 0
    };
    expect(wordToPiperTokens(w)).toEqual(['ɡ', 'ˈ', 'i', 'k', 'æ']);
  });

  it('无法映射的音素返回 null', () => {
    const bad: Word = {
      c: ['x' as never, 'b'],
      v: [{ s: 'i', long: false, diph: false }, { s: 'a', long: false, diph: false }],
      stress: 0
    };
    expect(wordToPiperTokens(bad)).toBeNull();
  });
});

describe('symbolToPiperTokens', () => {
  it('单元音/复元音', () => {
    expect(symbolToPiperTokens('i')).toEqual(['i']);
    expect(symbolToPiperTokens('aɪ')).toEqual(['a', 'ɪ']);
    expect(symbolToPiperTokens('ɔ')).toEqual(['ɔ']);
  });

  it('未知返回 null', () => {
    expect(symbolToPiperTokens('?')).toBeNull();
  });
});

describe('tokensToPiperIds / wordToPiperIds（推理输入约定）', () => {
  it('BOS + 每个音素后跟 pad + EOS', () => {
    expect(tokensToPiperIds(['p', 'ˈ', 'u', 'b', 'i'], JOE_MAP)).toEqual([
      1, 28, 0, 120, 0, 33, 0, 15, 0, 21, 0, 2
    ]);
  });

  it('wordToPiperIds 端到端（pubi → 12 个 id）', () => {
    expect(wordToPiperIds(W('u', 'i', 0), JOE_MAP)).toEqual([
      1, 28, 0, 120, 0, 33, 0, 15, 0, 21, 0, 2
    ]);
  });

  it('未知音素 → null', () => {
    expect(tokensToPiperIds(['z'], JOE_MAP)).toBeNull();
  });

  it('缺 BOS/EOS/pad 或音素 → null', () => {
    expect(tokensToPiperIds(['p'], {})).toBeNull();
    expect(tokensToPiperIds(['p'], { '^': [1], '$': [2], '_': [0] })).toBeNull();
    expect(tokensToPiperIds(['p'], { '^': [1], '$': [2], '_': [0], p: [28] })).toEqual([1, 28, 0, 2]);
  });
});
