import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import FeedbackCard from '@/components/FeedbackCard.vue';
import { createGame } from '@/core/state';
import { genTypeQuestion } from '@/core/questions';

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
