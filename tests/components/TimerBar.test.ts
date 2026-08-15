import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import TimerBar from '@/components/TimerBar.vue';
import { useGame } from '@/composables/useGame';

describe('TimerBar', () => {
  const game = useGame();

  beforeEach(() => {
    game.reset();
    game.setSetting('timeSec', 10);
    game.start();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    game.reset();
  });

  it('开局显示满时长', () => {
    const wrapper = mount(TimerBar);
    expect(wrapper.find('.timer-value').text()).toBe('10');
  });

  it('剩余时间随 tick 流逝而更新（回归：数值曾永不更新）', async () => {
    game.reset();
    const base = 1_700_000_000_000;
    const spy = vi.spyOn(Date, 'now').mockReturnValue(base);
    game.setSetting('timeSec', 10);
    game.start(); // deadline = base + 10000
    const wrapper = mount(TimerBar);
    expect(wrapper.find('.timer-value').text()).toBe('10');

    spy.mockReturnValue(base + 2600);
    game.tick(); // leftMs = 7400
    await nextTick();
    expect(wrapper.find('.timer-value').text()).toBe('8'); // ceil(7400/1000) = 8
    spy.mockRestore();
  });

  it('不限时（timeSec=0）时不渲染', () => {
    game.reset();
    game.setSetting('timeSec', 0);
    game.start();
    const wrapper = mount(TimerBar);
    expect(wrapper.find('.timer-value').exists()).toBe(false);
  });
});
