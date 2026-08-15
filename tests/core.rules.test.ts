import { describe, expect, it } from 'vitest';
import { RULES } from '@/config/rules';
import { MONOPHTHONGS, DIPHTHONGS } from '@/config/vowels';
import type { Rule, Word, WordVowel } from '@/core';
import { applyRule, ruleCanApply } from '@/core/rules';

const W = (v1: WordVowel, v2: WordVowel, stress: 0 | 1): Word => ({ c: ['b', 't'], v: [v1, v2], stress });
const V = (s: string, long = false, diph = false): WordVowel => ({ s, long, diph });
const rId = (id: string): Rule => {
  const r = RULES.find((x) => x.id === id);
  if (!r) throw new Error('missing rule ' + id);
  return r;
};

describe('规则应用（构造用例）', () => {
  it('reduce：非重读 a→ə，重读位不适用', () => {
    const r = rId('reduce');
    const w = W(V('a'), V('i'), 1);
    expect(applyRule(r, w, 0)?.v[0].s).toBe('ə');
    expect(ruleCanApply(r, w, 1)).toBe(false);
  });

  it('a-mutation：重读 u 后接 a → o', () => {
    const r = rId('lower-a');
    expect(applyRule(r, W(V('u'), V('a'), 0), 0)?.v[0].s).toBe('o');
    expect(ruleCanApply(r, W(V('u'), V('a'), 1), 0)).toBe(false); // 非重读
    expect(ruleCanApply(r, W(V('u'), V('i'), 0), 0)).toBe(false); // 后接非 a
  });

  it('i-umlaut：u→y（后接 i）', () => {
    const r = rId('front-umlaut');
    expect(applyRule(r, W(V('u'), V('i'), 0), 0)?.v[0].s).toBe('y');
    expect(ruleCanApply(r, W(V('u'), V('a'), 0), 0)).toBe(false);
  });

  it('复元音化：iː→aɪ，短 i 不适用', () => {
    const r = rId('diph-long');
    expect(applyRule(r, W(V('i', true), V('a'), 0), 0)?.v[0]).toEqual({ s: 'aɪ', long: false, diph: true });
    expect(ruleCanApply(r, W(V('i'), V('a'), 0), 0)).toBe(false);
  });

  it('单元音化：aɪ→e', () => {
    const r = rId('mono');
    expect(applyRule(r, W(V('aɪ', false, true), V('a'), 0), 0)?.v[0].s).toBe('e');
  });

  it('高化：a→æ；eː→iː（长元音保持）；i 不再高化', () => {
    const r = rId('raise');
    expect(applyRule(r, W(V('a'), V('a'), 0), 0)?.v[0].s).toBe('æ');
    const out = applyRule(r, W(V('e', true), V('a'), 0), 0);
    expect(out?.v[0]).toEqual({ s: 'i', long: true, diph: false });
    expect(ruleCanApply(r, W(V('i'), V('a'), 0), 0)).toBe(false);
  });

  it('低化：i→e；a 不再低化', () => {
    const r = rId('lower-free');
    expect(applyRule(r, W(V('i'), V('a'), 0), 0)?.v[0].s).toBe('e');
    expect(ruleCanApply(r, W(V('a'), V('a'), 0), 0)).toBe(false);
  });

  it('后化：a→ɑ', () => {
    const r = rId('back-a');
    expect(applyRule(r, W(V('a'), V('a'), 0), 0)?.v[0].s).toBe('ɑ');
  });

  it('高元音复化：i→eɪ；uː 不适用', () => {
    const r = rId('diph-short');
    expect(applyRule(r, W(V('i'), V('a'), 0), 0)?.v[0].s).toBe('eɪ');
    expect(ruleCanApply(r, W(V('u', true), V('a'), 0), 0)).toBe(false);
  });
});

describe('规则变换产物合法性（抽样）', () => {
  it('所有可应用规则的结果都落在已知元音集合', () => {
    for (const r of RULES) {
      for (let i = 0; i < 200; i++) {
        const w = makeRandomWord();
        for (let p = 0; p < 2; p++) {
          if (!ruleCanApply(r, w, p as 0 | 1)) continue;
          const out = applyRule(r, w, p as 0 | 1);
          if (!out) continue;
          const s = out.v[p as 0 | 1].s;
          expect(s in MONOPHTHONGS || s in DIPHTHONGS).toBe(true);
        }
      }
    }
  });
});

function makeRandomWord(): Word {
  const symbols = Object.keys(MONOPHTHONGS).concat(Object.keys(DIPHTHONGS));
  const v = (): WordVowel => {
    const s = symbols[Math.floor(Math.random() * symbols.length)];
    return { s, long: !s.includes('ː') && Math.random() < 0.3, diph: s.length > 1 };
  };
  return { c: ['b', 't'], v: [v(), v()], stress: Math.random() < 0.5 ? 0 : 1 };
}
