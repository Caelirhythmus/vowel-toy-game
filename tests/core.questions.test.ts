import { describe, expect, it } from 'vitest';
import { genFreqQuestion, genQuestion, genSystemQuestion, genTypeQuestion } from '@/core/questions';
import { applicablePositions, ruleCanApply } from '@/core/rules';
import { wordText } from '@/core/words';
import { CHANGE_TYPE_IDS, TIER_IDS } from '@/config/game';

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
