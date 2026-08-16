import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { useGame as UseGameFn } from '@/composables/useGame';

type GameApi = ReturnType<typeof UseGameFn>;

/* useGame 是模块级单例 store：每个用例 resetModules 后重新 import，
   获得全新实例（状态、计时器、localStorage 全部隔离）。
   注意：useGame() 返回 reactive 对象，顶层 ref 被自动解包——
   modalOpen 是 boolean、selection 是 Set、isRunning/leftSeconds 是裸值 */
async function freshGame(): Promise<GameApi> {
  vi.resetModules();
  const mod = await import('@/composables/useGame');
  return mod.useGame();
}

describe('useGame 编排层', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('初始态：idle、弹窗关、未运行、剩余秒 0', async () => {
    const game = await freshGame();
    expect(game.state.phase).toBe('idle');
    expect(game.state.question).toBeNull();
    expect(game.modalOpen).toBe(false);
    expect(game.isRunning).toBe(false);
    expect(game.leftSeconds).toBe(0);
  });

  it('start：进入 playing、生成题目、弹窗关闭', async () => {
    const game = await freshGame();
    game.modalOpen = true; // 模拟残留脏状态
    game.start();
    expect(game.state.phase).toBe('playing');
    expect(game.state.question).not.toBeNull();
    expect(game.state.stats.total).toBe(0);
    expect(game.modalOpen).toBe(false);
    expect(game.isRunning).toBe(true);
  });

  it('答错：保留原题继续 playing、统计与连对归零；答对：answered 且 3 秒后自动换题', async () => {
    const game = await freshGame();
    game.setSetting('mode', 'type'); // 确定性出词对题
    game.start();
    const q = game.state.question!;
    expect(q.kind).toBe('type');

    game.answerOpt('__NOT_A_REAL_ANSWER__');
    expect(game.state.phase).toBe('playing');
    expect(game.state.stats.incorrect).toBe(1);
    expect(game.state.stats.streak).toBe(0);
    expect(game.state.question).toBe(q); // 原题保留

    game.answerOpt(String(q.answer));
    expect(game.state.phase).toBe('answered');
    expect(game.state.stats.correct).toBe(1);
    expect(game.state.stats.streak).toBe(1);

    // 3 秒等待后自动进入下一题
    vi.advanceTimersByTime(3000);
    expect(game.state.phase).toBe('playing');
    expect(game.state.lastResult).toBeNull();
  });

  it('nextQuestion：答对后手动跳过等待立即换题', async () => {
    const game = await freshGame();
    game.setSetting('mode', 'type');
    game.start();
    const q = game.state.question!;
    game.answerOpt(String(q.answer));
    expect(game.state.phase).toBe('answered');
    game.nextQuestion();
    expect(game.state.phase).toBe('playing');
    expect(game.state.question).not.toBe(q);
  });

  it('系统题：勾选全对才判对，换题后选择集清空', async () => {
    const game = await freshGame();
    game.setSetting('mode', 'system');
    game.start();
    const q = game.state.question!;
    expect(q.kind).toBe('system');
    if (q.kind !== 'system') return; // 类型窄化（expect 非类型守卫）

    // 错选：只勾一个（若答案非空则选相邻下标，保证与答案不同）
    const wrong = q.answer.length ? [(q.answer[0] + 1) % q.words.length] : [];
    wrong.forEach((i) => game.toggleWord(i));
    expect(game.selection.size).toBe(wrong.length);
    game.submitSystem();
    expect(game.state.phase).toBe('playing');
    expect(game.state.stats.incorrect).toBe(1);

    // 全对
    game.selection = new Set();
    q.answer.forEach((i) => game.toggleWord(i));
    game.submitSystem();
    expect(game.state.phase).toBe('answered');
    expect(game.state.stats.correct).toBe(1);

    // 3 秒后自动换题，选择集清空
    vi.advanceTimersByTime(3000);
    expect(game.state.phase).toBe('playing');
    expect(game.selection.size).toBe(0);
  });

  it('限时模式：tick 超时 → over + 弹窗；closeModal 关闭', async () => {
    const game = await freshGame();
    game.setSetting('timeSec', 1);
    game.start();
    expect(game.state.phase).toBe('playing');

    vi.advanceTimersByTime(1500);
    game.tick();
    expect(game.state.phase).toBe('over');
    expect(game.modalOpen).toBe(true);

    game.closeModal();
    expect(game.modalOpen).toBe(false);
  });

  it('leftSeconds：随 tick 递减（依赖响应式 leftMs 而非 Date.now）', async () => {
    const game = await freshGame();
    game.setSetting('timeSec', 3);
    game.start();
    expect(game.leftSeconds).toBe(3);

    vi.advanceTimersByTime(1500);
    game.tick();
    expect(game.leftSeconds).toBe(2);

    vi.advanceTimersByTime(2000);
    game.tick();
    expect(game.leftSeconds).toBe(0);
    expect(game.state.phase).toBe('over');
  });

  it('setSetting：写入 localStorage 持久化', async () => {
    const game = await freshGame();
    game.setSetting('difficulty', 'hard');
    const saved = JSON.parse(localStorage.getItem('vl.settings') ?? '{}');
    expect(saved.difficulty).toBe('hard');
    expect(game.state.settings.difficulty).toBe('hard');
  });

  it('reset：回到 idle、统计清零、弹窗关闭', async () => {
    const game = await freshGame();
    game.start();
    game.answerOpt('__WRONG__');
    expect(game.state.stats.total).toBe(1);
    game.reset();
    expect(game.state.phase).toBe('idle');
    expect(game.state.question).toBeNull();
    expect(game.state.stats.total).toBe(0);
    expect(game.modalOpen).toBe(false);
  });

  it('dispose：清掉自动换题计时器（答对后 dispose 不再换题）', async () => {
    const game = await freshGame();
    game.setSetting('mode', 'type');
    game.start();
    const q = game.state.question!;
    game.answerOpt(String(q.answer));
    expect(game.state.phase).toBe('answered');
    game.dispose();
    vi.advanceTimersByTime(5000);
    expect(game.state.phase).toBe('answered');
    expect(game.state.question).toBe(q);
  });
});
