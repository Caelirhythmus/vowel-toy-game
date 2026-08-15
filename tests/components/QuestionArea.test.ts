import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import QuestionArea from '@/components/QuestionArea.vue';
import { useGame } from '@/composables/useGame';

/** 捕获 useSpeech 注册的 piper 状态回调，手动驱动 UI 状态 */
type StatusCb = (s: string, pct?: number | null) => void;
const listeners: StatusCb[] = [];

vi.mock('@/services/piper', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/services/piper')>();
  return {
    ...real,
    onPiperStatus: (cb: StatusCb) => {
      listeners.push(cb);
      return () => {
        const i = listeners.indexOf(cb);
        if (i >= 0) listeners.splice(i, 1);
      };
    },
    getPiperStatus: () => 'idle'
  };
});

describe('QuestionArea 发音按钮（Piper 加载状态）', () => {
  const game = useGame();

  beforeEach(() => {
    // 注意：不要清空 listeners —— useSpeech 的 subscribed 标志是模块级的，
    // 只有首个 mount 会注册回调；回调操作的是模块级 ref，跨测试复用无害
    game.reset();
    game.setSetting('mode', 'type');
    game.setSetting('difficulty', 'easy');
    game.setSetting('timeSec', 0);
    game.start(); // 必为词对题（type 模式），渲染 A/B 发音按钮
  });

  it('默认显示“发音”且可点击', () => {
    const wrapper = mount(QuestionArea);
    const btns = wrapper.findAll('.mini-btn');
    expect(btns.length).toBe(2);
    expect(btns[0].text()).toBe('发音');
    expect(btns[0].attributes('disabled')).toBeUndefined();
  });

  it('加载中：按钮显示“语音模型加载中…”且禁用', async () => {
    const wrapper = mount(QuestionArea);
    for (const cb of listeners) cb('loading', null);
    await nextTick();
    const btns = wrapper.findAll('.mini-btn');
    expect(btns[0].text()).toBe('语音模型加载中…');
    expect(btns[0].attributes('disabled')).toBeDefined();
  });

  it('加载中带进度：显示百分比', async () => {
    const wrapper = mount(QuestionArea);
    for (const cb of listeners) cb('loading', 45);
    await nextTick();
    expect(wrapper.find('.mini-btn').text()).toBe('语音模型加载中… 45%');
  });

  it('就绪后恢复“发音”并可点击', async () => {
    const wrapper = mount(QuestionArea);
    for (const cb of listeners) cb('loading', 80);
    await nextTick();
    for (const cb of listeners) cb('ready');
    await nextTick();
    const btns = wrapper.findAll('.mini-btn');
    expect(btns[0].text()).toBe('发音');
    expect(btns[0].attributes('disabled')).toBeUndefined();
  });
});
