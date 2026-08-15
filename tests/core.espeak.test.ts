import { describe, expect, it } from 'vitest';
import { symbolToPhonemeInput, vowelMnemonic, wordToPhonemeInput } from '@/core/espeak';
import type { Word } from '@/core';

const W = (v1: string, v2: string, stress: 0 | 1, v1long = false, v1diph = false): Word => ({
  c: ['b', 't'],
  v: [
    { s: v1, long: v1long, diph: v1diph },
    { s: v2, long: false, diph: false }
  ],
  stress
});

describe('vowelMnemonic 助记符映射', () => {
  it('单元音（含长音）', () => {
    expect(vowelMnemonic({ s: 'i', long: false, diph: false })).toBe('i');
    expect(vowelMnemonic({ s: 'i', long: true, diph: false })).toBe('i:');
    expect(vowelMnemonic({ s: 'ɛ', long: false, diph: false })).toBe('E');
    expect(vowelMnemonic({ s: 'ə', long: false, diph: false })).toBe('@');
    expect(vowelMnemonic({ s: 'ɑ', long: false, diph: false })).toBe('0');
  });

  it('复元音取组件序列', () => {
    expect(vowelMnemonic({ s: 'aɪ', long: false, diph: true })).toBe('aI');
    expect(vowelMnemonic({ s: 'əʊ', long: false, diph: true })).toBe('@U');
  });

  it('未知符号返回 null', () => {
    expect(vowelMnemonic({ s: '?', long: false, diph: false })).toBeNull();
  });
});

describe('wordToPhonemeInput', () => {
  it('重音在首音节：ˈbata → [[b\'ata]]', () => {
    expect(wordToPhonemeInput(W('a', 'a', 0))).toBe("[[b'ata]]");
  });

  it('重音在次音节：baˈte → [[bat\'e]]', () => {
    expect(wordToPhonemeInput(W('a', 'e', 1))).toBe("[[bat'e]]");
  });

  it('长元音：ˈbiːta → [[b\'i:ta]]', () => {
    expect(wordToPhonemeInput(W('i', 'a', 0, true))).toBe("[[b'i:ta]]");
  });

  it('复元音：ˈbaʊta → [[b\'aUta]]', () => {
    expect(wordToPhonemeInput(W('aʊ', 'a', 0, false, true))).toBe("[[b'aUta]]");
  });

  it('含无法映射辅音返回 null', () => {
    const bad: Word = { c: ['x' as never, 't'], v: [{ s: 'a', long: false, diph: false }, { s: 'a', long: false, diph: false }], stress: 0 };
    expect(wordToPhonemeInput(bad)).toBeNull();
  });
});

describe('symbolToPhonemeInput', () => {
  it('单元音与长音', () => {
    expect(symbolToPhonemeInput('i')).toBe('[[i]]');
    expect(symbolToPhonemeInput('iː')).toBe('[[i:]]');
    expect(symbolToPhonemeInput('ə')).toBe('[[@]]');
  });

  it('复元音/未知返回 null', () => {
    expect(symbolToPhonemeInput('aɪ')).toBeNull();
    expect(symbolToPhonemeInput('?')).toBeNull();
  });
});
