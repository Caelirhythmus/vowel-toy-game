import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import FeedbackCard from '@/components/FeedbackCard.vue';
import { createGame } from '@/core/state';
import { genTypeQuestion } from '@/core/questions';
import { RULES } from '@/config/rules';
import type { Word } from '@/core';

describe('FeedbackCard', () => {
  it('答对时展示规则说明与示例卡', () => {
    const q = genTypeQuestion('easy');
    if (!q) throw new Error('no question');
    const s = createGame({ mode: 'type', difficulty: 'easy', timeSec: 0 });
    s.question = q;
    s.phase = 'answered';
    s.lastResult = { ok: true, answerLabel: q.answer };

    const wrapper = mount(FeedbackCard, { props: { state: s } });
    expect(wrapper.text()).toContain('正确');
    expect(wrapper.find('.example-card').exists()).toBe(true);
    expect(wrapper.find('.tier-badge').exists()).toBe(true);
  });

  it('答对时展示语系倾向说明（familyNote）', () => {
    const q = genTypeQuestion('easy');
    if (!q) throw new Error('no question');
    const s = createGame({ mode: 'type', difficulty: 'easy', timeSec: 0 });
    s.question = q;
    s.phase = 'answered';
    s.lastResult = { ok: true, answerLabel: q.answer };

    const wrapper = mount(FeedbackCard, { props: { state: s } });
    expect(wrapper.text()).toContain('语系倾向');
    expect(wrapper.text()).toContain(q.rule.familyNote.zh);
  });

  it('语系模式：示例卡优先展示该语系真实语料', () => {
    // easy 池抽不到 rare 的 lower-free，手动构造固定规则题目
    const lowerFree = RULES.find((r) => r.id === 'lower-free');
    if (!lowerFree) throw new Error('no lower-free rule');
    const word = (v: string): Word => ({
      c: ['b', 't'],
      v: [
        { s: v, long: false, diph: false },
        { s: 'a', long: false, diph: false }
      ],
      stress: 0
    });
    const s = createGame({ mode: 'type', difficulty: 'easy', timeSec: 0 });
    s.settings.family = 'english';
    s.question = { kind: 'type', rule: lowerFree, wordA: word('i'), wordB: word('e'), pos: 0, answer: 'lowering' };
    s.phase = 'answered';
    s.lastResult = { ok: true, answerLabel: 'lowering' };

    const wrapper = mount(FeedbackCard, { props: { state: s } });
    const exTexts = wrapper.findAll('.ex-text').map((el) => el.text());
    expect(exTexts.length).toBeGreaterThan(0);
    // 语系示例覆盖：英语史下无条件低化显示 FOOT–STRUT 而非默认的通俗拉丁语
    expect(wrapper.text()).toContain('FOOT');
  });

  it('答错时提示重试且不泄露规则', () => {
    const q = genTypeQuestion('easy');
    if (!q) throw new Error('no question');
    const s = createGame({ mode: 'type', difficulty: 'easy', timeSec: 0 });
    s.question = q;
    s.phase = 'playing';
    s.lastResult = { ok: false, answerLabel: q.answer };

    const wrapper = mount(FeedbackCard, { props: { state: s } });
    expect(wrapper.text()).toContain('再试一次');
    expect(wrapper.find('.example-card').exists()).toBe(false);
  });
});
