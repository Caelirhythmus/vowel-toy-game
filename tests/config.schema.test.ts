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

  it('元音池校验通过', () => {
    expect(validateVowels()).toEqual([]);
  });
});
