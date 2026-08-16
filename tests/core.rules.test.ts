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

  it('a-mutation 是向后同化：u 在次音节（前接 a）不适用', () => {
    const r = rId('lower-a');
    // 反向语境：a 在首音节、u 在次音节——这不是 a-mutation（回归：曾误判可应用）
    expect(ruleCanApply(r, W(V('a'), V('u'), 1), 1)).toBe(false);
    expect(ruleCanApply(r, W(V('u'), V('a'), 0), 0)).toBe(true);
  });

  it('i-umlaut：u→y（后接 i）', () => {
    const r = rId('front-umlaut');
    expect(applyRule(r, W(V('u'), V('i'), 0), 0)?.v[0].s).toBe('y');
    expect(ruleCanApply(r, W(V('u'), V('a'), 0), 0)).toBe(false);
  });

  it('i-umlaut 是向后同化：u 在次音节（前接 i）不适用', () => {
    const r = rId('front-umlaut');
    // 反向语境：i 在首音节、u 在次音节——前向同化不是 i-umlaut
    expect(ruleCanApply(r, W(V('i'), V('u'), 0), 1)).toBe(false);
    expect(ruleCanApply(r, W(V('u'), V('i'), 0), 0)).toBe(true);
  });

  it('i-umlaut：a→æ（æ 是直接结果，e 是后续高化产物）', () => {
    const r = rId('front-umlaut');
    expect(applyRule(r, W(V('a'), V('i'), 0), 0)?.v[0].s).toBe('æ');
    expect(applyRule(r, W(V('ɑ'), V('i'), 0), 0)?.v[0].s).toBe('æ');
  });

  it('复元音化：iː→aɪ，短 i 不适用', () => {
    const r = rId('diph-long');
    expect(applyRule(r, W(V('i', true), V('a'), 0), 0)?.v[0]).toEqual({ s: 'aɪ', long: false, diph: true });
    expect(ruleCanApply(r, W(V('i'), V('a'), 0), 0)).toBe(false);
  });

  it('单元音化：aɪ→e；oʊ→o', () => {
    const r = rId('mono');
    expect(applyRule(r, W(V('aɪ', false, true), V('a'), 0), 0)?.v[0].s).toBe('e');
    expect(applyRule(r, W(V('oʊ', false, true), V('a'), 0), 0)?.v[0].s).toBe('o');
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

  it('高元音复化：i→eɪ、u→oʊ；长音不适用', () => {
    const r = rId('diph-short');
    expect(applyRule(r, W(V('i'), V('a'), 0), 0)?.v[0].s).toBe('eɪ');
    expect(applyRule(r, W(V('u'), V('a'), 0), 0)?.v[0]).toEqual({ s: 'oʊ', long: false, diph: true });
    expect(ruleCanApply(r, W(V('u', true), V('a'), 0), 0)).toBe(false);
  });

  it('意大利语复化（rom-diph）：重读位 ɛ→jɛ、ɔ→wɔ；非重读不适用', () => {
    const r = rId('rom-diph');
    expect(applyRule(r, W(V('ɛ'), V('a'), 0), 0)?.v[0]).toEqual({ s: 'jɛ', long: false, diph: true });
    expect(applyRule(r, W(V('ɔ'), V('a'), 0), 0)?.v[0].s).toBe('wɔ');
    expect(ruleCanApply(r, W(V('ɛ'), V('a'), 1), 0)).toBe(false); // 非重读
    expect(ruleCanApply(r, W(V('ɛ', true), V('a'), 0), 0)).toBe(false); // 长元音
  });

  it('单元音化：jɛ→ɛ、wɔ→ɔ（意大利语移动双元音去半元音）', () => {
    const r = rId('mono');
    expect(applyRule(r, W(V('jɛ', false, true), V('a'), 0), 0)?.v[0].s).toBe('ɛ');
    expect(applyRule(r, W(V('wɔ', false, true), V('a'), 0), 0)?.v[0].s).toBe('ɔ');
  });

  it('无条件前化（fr-front）：u→y、o→ø；长元音保留；不含 a（避免与高化歧义）', () => {
    const r = rId('fr-front');
    expect(applyRule(r, W(V('u'), V('a'), 0), 0)?.v[0].s).toBe('y');
    expect(applyRule(r, W(V('o'), V('a'), 0), 0)?.v[0].s).toBe('ø');
    expect(applyRule(r, W(V('u', true), V('a'), 0), 0)?.v[0]).toEqual({ s: 'y', long: true, diph: false });
    expect(ruleCanApply(r, W(V('a'), V('a'), 0), 0)).toBe(false);
    expect(ruleCanApply(r, W(V('i'), V('a'), 0), 0)).toBe(false);
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
