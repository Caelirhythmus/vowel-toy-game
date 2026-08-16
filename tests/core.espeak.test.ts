import { describe, expect, it } from 'vitest';
import {
  symbolToPhonemeInput,
  symbolToTtsText,
  vowelMnemonic,
  wordToPhonemeInput,
  wordToTtsText
} from '@/core/espeak';
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
    expect(vowelMnemonic({ s: 'oʊ', long: false, diph: true })).toBe('oU');
    expect(vowelMnemonic({ s: 'jɛ', long: false, diph: true })).toBe('jE');
    expect(vowelMnemonic({ s: 'wɔ', long: false, diph: true })).toBe('wO');
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

describe('TTS 兜底近似拼写（不读 IPA 原文，避免字母名误读）', () => {
  const WC = (
    c1: string,
    c2: string,
    v1: string,
    v2: string,
    stress: 0 | 1 = 0,
    v1long = false,
    v1diph = false
  ): Word => ({
    c: [c1, c2],
    v: [{ s: v1, long: v1long, diph: v1diph }, { s: v2, long: false, diph: false }],
    stress
  });

  it('symbolToTtsText：单元音与长音', () => {
    expect(symbolToTtsText('i')).toBe('ee');
    expect(symbolToTtsText('iː')).toBe('ee');
    expect(symbolToTtsText('u')).toBe('oo');
    expect(symbolToTtsText('ə')).toBe('uh');
    expect(symbolToTtsText('ɑ')).toBe('ah');
    expect(symbolToTtsText('ɔ')).toBe('aw');
  });

  it('symbolToTtsText：复元音', () => {
    expect(symbolToTtsText('aɪ')).toBe('ai');
    expect(symbolToTtsText('aʊ')).toBe('ow');
    expect(symbolToTtsText('eɪ')).toBe('ay');
    expect(symbolToTtsText('əʊ')).toBe('oh');
  });

  it('symbolToTtsText：未知返回 null', () => {
    expect(symbolToTtsText('?')).toBeNull();
  });

  it('wordToTtsText：puˈbi → poobee（不含重音标记）', () => {
    expect(wordToTtsText(WC('p', 'b', 'u', 'i', 0))).toBe('poobee');
    expect(wordToTtsText(WC('p', 'b', 'u', 'i', 1))).toBe('poobee');
  });

  it('wordToTtsText：长元音与复元音', () => {
    expect(wordToTtsText(WC('b', 't', 'i', 'a', 0, true))).toBe('beetah');
    expect(wordToTtsText(WC('b', 't', 'aɪ', 'a', 0, false, true))).toBe('baitah');
  });

  it('wordToTtsText：未知元音返回 null', () => {
    const bad: Word = {
      c: ['b', 't'],
      v: [{ s: '?', long: false, diph: false }, { s: 'a', long: false, diph: false }],
      stress: 0
    };
    expect(wordToTtsText(bad)).toBeNull();
  });
});
