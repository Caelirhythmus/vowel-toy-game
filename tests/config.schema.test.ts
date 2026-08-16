import { describe, expect, it } from 'vitest';
import { validateContent, validateRules, validateVowels } from '@/config/schema';
import { RULES } from '@/config/rules';

describe('内容配置校验', () => {
  it('当前内容全部合法', () => {
    expect(validateContent()).toEqual([]);
  });

  it('重复 rule id 报错', () => {
    const dup = [...RULES, { ...RULES[0] }];
    expect(validateRules(dup).some((i) => i.message.includes('duplicate rule id'))).toBe(true);
  });

  it('非法 tier 报错', () => {
    const bad = RULES.map((r, i) => (i === 0 ? { ...r, tier: 'super-common' as never } : r));
    expect(validateRules(bad).length).toBeGreaterThan(0);
  });

  it('空示例报错', () => {
    const bad = RULES.map((r, i) => (i === 0 ? { ...r, examples: [] } : r));
    expect(validateRules(bad).length).toBeGreaterThan(0);
  });

  it('缺 familyNote（语系倾向必填）报错', () => {
    const bad = RULES.map((r, i) => {
      const { familyNote, ...rest } = r;
      return i === 0 ? (rest as (typeof RULES)[number]) : r;
    });
    expect(validateRules(bad).length).toBeGreaterThan(0);
  });

  it('familyTiers 预留字段：tier 非法报错、合法通过', () => {
    const ok = RULES.map((r, i) =>
      i === 0 ? { ...r, familyTiers: [{ family: 'germanic', tier: 'typical' as const }] } : r
    );
    expect(validateRules(ok)).toEqual([]);
    const bad = RULES.map((r, i) => (i === 0 ? { ...r, familyTiers: [{ family: 'germanic', tier: 'legendary' as never }] } : r));
    expect(validateRules(bad).length).toBeGreaterThan(0);
  });

  it('元音池校验通过', () => {
    expect(validateVowels()).toEqual([]);
  });
});
