import { describe, expect, it } from 'vitest';
import { describeDiphthong, describeVowel } from '@/core/describe';
import { acousticPoint, ACOUSTIC_BOX } from '@/core/acoustics';

const V = (s: string) => ({ s, long: false, diph: false });

describe('describeVowel 特征描述', () => {
  it('zh：前闭不圆唇（i）、后开不圆唇（ɑ）、央中（ə）', () => {
    expect(describeVowel(V('i'), 'zh')).toBe('前闭不圆唇元音');
    expect(describeVowel(V('y'), 'zh')).toBe('前闭圆唇元音');
    expect(describeVowel(V('ɑ'), 'zh')).toBe('后开不圆唇元音');
    expect(describeVowel(V('ə'), 'zh')).toBe('央中不圆唇元音');
  });

  it('en：close front unrounded vowel 等', () => {
    expect(describeVowel(V('i'), 'en')).toBe('close front unrounded vowel');
    expect(describeVowel(V('y'), 'en')).toBe('close front rounded vowel');
    expect(describeVowel(V('ɑ'), 'en')).toBe('open back unrounded vowel');
  });

  it('直接传特征对象亦可', () => {
    expect(describeVowel({ symbol: 'æ', height: 1, back: 0, round: false }, 'zh')).toBe('前次开不圆唇元音');
  });
});

describe('describeDiphthong', () => {
  it('中英描述', () => {
    expect(describeDiphthong('aɪ', 'a', 'zh')).toBe('aɪ（复元音，起点 a）');
    expect(describeDiphthong('əʊ', 'ə', 'en')).toBe('əʊ (diphthong, from ə)');
  });
});

describe('acousticPoint 共振峰映射', () => {
  it('坐标落在声学框内，且前元音在左、开元音在下', () => {
    const i = acousticPoint('i');
    const a = acousticPoint('a');
    const u = acousticPoint('u');
    expect(i).not.toBeNull();
    expect(a).not.toBeNull();
    expect(u).not.toBeNull();
    if (!i || !a || !u) return;
    expect(i.x).toBeGreaterThan(ACOUSTIC_BOX.x0);
    expect(i.x).toBeLessThan(ACOUSTIC_BOX.x1);
    expect(a.y).toBeGreaterThan(ACOUSTIC_BOX.y0);
    expect(i.x).toBeLessThan(a.x); // 前元音（高 F2）在左
    expect(i.y).toBeLessThan(a.y); // 闭元音（低 F1）在上
    expect(u.x).toBeGreaterThan(i.x); // 后元音在右
  });

  it('未知符号返回 null', () => {
    expect(acousticPoint('aɪ')).toBeNull();
    expect(acousticPoint('?')).toBeNull();
  });
});
