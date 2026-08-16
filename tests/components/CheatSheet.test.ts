import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CheatSheet from '@/components/CheatSheet.vue';
import { RULES } from '@/config/rules';

describe('CheatSheet 演变类型速查表', () => {
  it('按规则展开：行数 = 规则数，含类型/规则/示例/环境/频率/语系倾向列', () => {
    const wrapper = mount(CheatSheet);
    const headers = wrapper.findAll('th').map((th) => th.text());
    expect(headers).toContain('语系倾向');
    expect(headers).toContain('规则');
    expect(wrapper.findAll('tbody tr')).toHaveLength(RULES.length);
  });

  it('低化两行频率档不同（a-mutation 典型 vs 无条件罕见）——按规则展开而非聚合', () => {
    const wrapper = mount(CheatSheet);
    const rows = wrapper.findAll('tbody tr');
    const lowerRows = rows.filter((tr) => tr.text().includes('低化'));
    expect(lowerRows.length).toBeGreaterThanOrEqual(2);
    const tierTexts = lowerRows.map((tr) => tr.find('.tier-badge').text());
    expect(tierTexts).toContain('典型');
    expect(tierTexts).toContain('罕见');
  });

  it('每条规则都有语系倾向说明', () => {
    const wrapper = mount(CheatSheet);
    const notes = wrapper.findAll('tbody .family-note');
    expect(notes).toHaveLength(RULES.length);
    for (const n of notes) expect(n.text().length).toBeGreaterThan(0);
  });
});
