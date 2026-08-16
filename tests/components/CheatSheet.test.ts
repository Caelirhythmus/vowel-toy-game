import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CheatSheet from '@/components/CheatSheet.vue';
import { RULES } from '@/config/rules';
import { useGame } from '@/composables/useGame';

describe('CheatSheet 演变类型速查表', () => {
  const game = useGame();

  beforeEach(() => {
    game.setSetting('family', 'generic');
  });

  afterEach(() => {
    game.setSetting('family', 'generic');
  });

  it('泛语系：按规则展开，行数 = 规则数，含类型/规则/示例/环境/频率/语系倾向列', () => {
    const wrapper = mount(CheatSheet);
    const headers = wrapper.findAll('th').map((th) => th.text());
    expect(headers).toContain('语系倾向');
    expect(headers).toContain('规则');
    expect(wrapper.findAll('tbody tr')).toHaveLength(RULES.length);
    expect(wrapper.find('.cheatsheet-context').exists()).toBe(false);
  });

  it('泛语系：低化两行频率档不同（a-mutation 典型 vs 无条件罕见）——按规则展开而非聚合', () => {
    const wrapper = mount(CheatSheet);
    const rows = wrapper.findAll('tbody tr');
    const lowerRows = rows.filter((tr) => tr.text().includes('低化'));
    expect(lowerRows.length).toBeGreaterThanOrEqual(2);
    const tierTexts = lowerRows.map((tr) => tr.find('.tier-badge').text());
    expect(tierTexts).toContain('典型');
    expect(tierTexts).toContain('罕见');
  });

  it('泛语系：每条规则都有语系倾向说明', () => {
    const wrapper = mount(CheatSheet);
    const notes = wrapper.findAll('tbody .family-note');
    expect(notes).toHaveLength(RULES.length);
    for (const n of notes) expect(n.text().length).toBeGreaterThan(0);
  });

  it('语系模式：只显示该语系可出题规则（英语史无 i-umlaut/a-mutation），并显示上下文提示', () => {
    game.setSetting('family', 'english');
    const wrapper = mount(CheatSheet);
    const text = wrapper.text();
    expect(wrapper.find('.cheatsheet-context').exists()).toBe(true);
    expect(wrapper.find('.cheatsheet-context').text()).toContain('英语史');
    expect(text).not.toContain('i-umlaut');
    expect(text).not.toContain('a-mutation');
    // 英语史可出题规则数 = 5（raise/lower-free/reduce/diph-long/mono）
    expect(wrapper.findAll('tbody tr')).toHaveLength(5);
  });

  it('语系模式：档位按语系覆盖显示（英语史无条件低化 = 偶见，非泛语系罕见）', () => {
    game.setSetting('family', 'english');
    const wrapper = mount(CheatSheet);
    const row = wrapper
      .findAll('tbody tr')
      .find((tr) => tr.text().includes('无条件'));
    expect(row).toBeDefined();
    expect(row!.find('.tier-badge').text()).toBe('偶见');
  });

  it('语系模式：示例优先该语系真实语料（斯拉夫史弱化显示 аканье 的音变式）', () => {
    game.setSetting('family', 'slavic');
    const wrapper = mount(CheatSheet);
    expect(wrapper.text()).toContain('o / a → ə'); // 俄语 аканье（来源见示例卡）
  });
});
