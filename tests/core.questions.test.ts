import { describe, expect, it } from 'vitest';
import { genFreqQuestion, genQuestion, genSystemQuestion, genTypeQuestion } from '@/core/questions';
import { applicablePositions, ruleCanApply } from '@/core/rules';
import { wordText } from '@/core/words';
import { CHANGE_TYPE_IDS, TIER_IDS } from '@/config/game';
import { FAMILY_IDS, vowelPoolFor, freqAvailableFor } from '@/config/families';
import { RULES } from '@/config/rules';
import { ruleExcludedFor, ruleTierFor } from '@/config/families';

describe('词对题生成不变量', () => {
  for (const diff of ['easy', 'hard'] as const) {
    it(`${diff}：type/freq 500 题无空题、无 A==B、答案合法`, () => {
      for (let i = 0; i < 500; i++) {
        const tq = genTypeQuestion(diff);
        expect(tq).not.toBeNull();
        if (!tq) continue;
        expect(CHANGE_TYPE_IDS).toContain(tq.answer as (typeof CHANGE_TYPE_IDS)[number]);
        expect(wordText(tq.wordA)).not.toBe(wordText(tq.wordB));
        expect(ruleCanApply(tq.rule, tq.wordA, tq.pos)).toBe(true);

        const fq = genFreqQuestion(diff);
        expect(fq).not.toBeNull();
        if (fq) expect(TIER_IDS).toContain(fq.answer as (typeof TIER_IDS)[number]);
      }
    });
  }
});

describe('频率题档位分布（分层抽样，回归：easy 答案曾恒为“典型”）', () => {
  it('easy：答案仅典型/偶见两档，且两档都大量出现', () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 400; i++) {
      const q = genFreqQuestion('easy');
      if (!q) continue;
      expect(['typical', 'occasional']).toContain(q.answer);
      expect(q.tiers).toEqual(['typical', 'occasional']);
      counts[q.answer] = (counts[q.answer] ?? 0) + 1;
    }
    expect(counts['typical']).toBeGreaterThan(50);
    expect(counts['occasional']).toBeGreaterThan(50);
  });

  it('hard：三档均衡出现，罕见档不再是边角料', () => {
    const counts: Record<string, number> = {};
    for (let i = 0; i < 600; i++) {
      const q = genFreqQuestion('hard');
      if (!q) continue;
      expect(q.tiers).toEqual(['typical', 'occasional', 'rare']);
      counts[q.answer] = (counts[q.answer] ?? 0) + 1;
    }
    for (const tier of ['typical', 'occasional', 'rare']) {
      expect(counts[tier]).toBeGreaterThan(50);
    }
  });
});

describe('系统预测题不变量', () => {
  it('词表 5 词、至少 1 变化 1 未变化、答案与计算一致（300 题）', () => {
    for (let i = 0; i < 300; i++) {
      const q = genSystemQuestion('hard');
      if (!q) continue; // 允许兜底路径
      expect(q.words).toHaveLength(5);
      const expected: number[] = [];
      q.words.forEach((w, idx) => {
        if (applicablePositions(q.rule, w).length) expected.push(idx);
      });
      expect(q.answer).toEqual(expected);
      expect(q.answer.length).toBeGreaterThanOrEqual(1);
      expect(q.answer.length).toBeLessThan(q.words.length);
    }
  });
});

describe('混合题型', () => {
  it('mixed 600 题全部可生成且题型合法', () => {
    for (let i = 0; i < 600; i++) {
      const q = genQuestion('mixed', 'easy');
      expect(q).not.toBeNull();
      if (q) expect(['type', 'freq', 'system']).toContain(q.kind);
    }
  });
});

describe('语系模式（family）', () => {
  it('排除矩阵：英语史不出 i-umlaut/a-mutation/后化/短复化；罗曼史不出长复化', () => {
    for (const fam of FAMILY_IDS) {
      for (const r of RULES) {
        if (ruleExcludedFor(r, fam)) {
          // 出题池（type/freq）绝不出现被排除的规则
          for (let i = 0; i < 120; i++) {
            const q = genTypeQuestion('hard', fam);
            if (q) expect(q.rule.id).not.toBe(r.id);
            const fq = genFreqQuestion('hard', fam);
            if (fq) expect(fq.rule.id).not.toBe(r.id);
          }
        }
      }
    }
  });

  it('档位覆盖：罗曼史无条件低化 = typical（泛语系 rare）', () => {
    const lowerFree = RULES.find((r) => r.id === 'lower-free')!;
    expect(ruleTierFor(lowerFree, 'generic')).toBe('rare');
    expect(ruleTierFor(lowerFree, 'romance')).toBe('typical');
    // 罗曼史频率题能抽到 lower-free 且答案 = typical
    let seen = false;
    for (let i = 0; i < 600 && !seen; i++) {
      const q = genFreqQuestion('easy', 'romance');
      if (q?.rule.id === 'lower-free') {
        expect(q.answer).toBe('typical');
        seen = true;
      }
    }
    expect(seen).toBe(true);
  });

  it('音系子集：英语史词表无前圆唇 y/ø/œ；罗曼史含 jɛ/wɔ', () => {
    const enPool = vowelPoolFor('english').map((e) => e.s);
    expect(enPool).not.toContain('y');
    expect(enPool).not.toContain('ø');
    expect(enPool).not.toContain('œ');
    const romPool = vowelPoolFor('romance').map((e) => e.s);
    expect(romPool).toContain('jɛ');
    expect(romPool).toContain('wɔ');
    // 英语史生成的题目词形不含子集外元音
    for (let i = 0; i < 100; i++) {
      const q = genTypeQuestion('hard', 'english');
      if (!q) continue;
      const text = wordText(q.wordA) + wordText(q.wordB);
      expect(text).not.toContain('y');
      expect(text).not.toContain('ø');
    }
  });

  it('频率题可用性：泛语系/英语史/汉语史/罗曼史可用，斯拉夫史禁用（单档）', () => {
    expect(freqAvailableFor('generic')).toBe(true);
    expect(freqAvailableFor('english')).toBe(true);
    expect(freqAvailableFor('chinese')).toBe(true);
    expect(freqAvailableFor('romance')).toBe(true);
    expect(freqAvailableFor('slavic')).toBe(false);
  });

  it('汉语史频率题：可出题规则集合 = 高化/弱化/短高元音复化（easy 档位覆盖为 typical）', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const q = genFreqQuestion('hard', 'chinese');
      if (q) ids.add(q.rule.id);
    }
    expect(ids.has('raise')).toBe(true);
    expect(ids.has('diph-short')).toBe(true);
    expect(ids.has('reduce')).toBe(true);
    // 排除项绝不出
    expect(ids.has('front-umlaut')).toBe(false);
    expect(ids.has('mono')).toBe(false);
  });

  it('回归：单档语系（斯拉夫史）频率题无区分度 → 返回 null，mixed 永远有题（兜底类型题）', () => {
    // 斯拉夫史只有 typical 档（reduce/mono），频率题应为 null
    for (let i = 0; i < 50; i++) {
      expect(genFreqQuestion('hard', 'slavic')).toBeNull();
      expect(genFreqQuestion('easy', 'slavic')).toBeNull();
    }
    // 但 mixed 模式绝不空：freq 兜底为类型题
    for (let i = 0; i < 300; i++) {
      const q = genQuestion('mixed', 'hard', 'slavic');
      expect(q).not.toBeNull();
    }
  });

  it('回归：单档语系 mixed 模式频率权重归零——生成的题绝不出现 freq 题型', () => {
    const kinds = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const q = genQuestion('mixed', 'hard', 'slavic');
      if (q) kinds.add(q.kind);
    }
    expect(kinds.has('freq')).toBe(false);
    expect(kinds.has('type')).toBe(true);
    expect(kinds.has('system')).toBe(true);
    // 对比：泛语系 mixed 正常出现三种题型
    const genericKinds = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const q = genQuestion('mixed', 'hard');
      if (q) genericKinds.add(q.kind);
    }
    expect(genericKinds.has('freq')).toBe(true);
  });

  it('回归：档位不全的语系（英语史无 rare）hard 频率题只出非空档位', () => {
    const answers = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const q = genFreqQuestion('hard', 'english');
      expect(q).not.toBeNull();
      if (q) answers.add(q.answer);
    }
    expect(answers.has('typical')).toBe(true);
    expect(answers.has('occasional')).toBe(true);
    expect(answers.has('rare')).toBe(false); // 英语史无 rare 规则
  });
});
