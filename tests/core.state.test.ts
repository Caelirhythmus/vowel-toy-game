import { describe, expect, it } from 'vitest';
import type { Question } from '@/core';
import {
  answer,
  answerSystem,
  createGame,
  next,
  start,
  tick
} from '@/core/state';

const ev = (q: Question, c: unknown) => ({
  ok: q.kind !== 'system' && q.answer === c,
  answerLabel: String(q.answer)
});

describe('状态机', () => {
  it('限时模式：答错扣 1 秒并保留原题，答对进入 answered', () => {
    const s = createGame({ mode: 'type', difficulty: 'easy', timeSec: 30 });
    expect(s.phase).toBe('idle');
    expect(start(s, 1000)).toBe(true);
    expect(s.phase).toBe('playing');
    const q = s.question;
    expect(q).not.toBeNull();

    const before = s.timer.leftMs;
    const res = answer(s, 'WRONG_ID', ev, 1000);
    expect(res.ok).toBe(false);
    expect(s.stats.incorrect).toBe(1);
    expect(s.phase).toBe('playing');
    expect(s.question).toBe(q);
    expect(s.timer.leftMs).toBeCloseTo(before - 1000, 0);

    const res2 = answer(s, (q as { answer: string }).answer, ev, 2000);
    expect(res2.ok).toBe(true);
    expect(s.phase).toBe('answered');
    expect(s.stats.correct).toBe(1);
    expect(s.stats.streak).toBe(1);
    expect(next(s, 2500)).toBe(true);
    expect(s.phase).toBe('playing');
  });

  it('不限时模式：答错不扣时', () => {
    const s = createGame({ mode: 'system', difficulty: 'hard', timeSec: 0 });
    start(s, 0);
    const q = s.question;
    expect(q).not.toBeNull();
    if (q?.kind !== 'system') return;
    const wrongSel = q.answer.length ? [(q.answer[0] + 1) % q.words.length] : [];
    const r = answerSystem(s, wrongSel, 0);
    expect(r.ok).toBe(false);
    expect(s.timer.leftMs).toBe(0);
    const r2 = answerSystem(s, q.answer, 100);
    expect(r2.ok).toBe(true);
  });

  it('tick：未超时继续，超时结束', () => {
    const s = createGame({ mode: 'type', difficulty: 'easy', timeSec: 5 });
    start(s, 0);
    expect(tick(s, 4000)).toBe(false);
    expect(s.phase).not.toBe('over');
    expect(tick(s, 5000)).toBe(true);
    expect(s.phase).toBe('over');
  });

  it('答错记录进错题本', () => {
    const s = createGame({ mode: 'type', difficulty: 'easy', timeSec: 0 });
    start(s, 0);
    const q = s.question as { answer: string };
    answer(s, 'NOT_THE_ANSWER', ev, 0);
    expect(s.mistakes).toHaveLength(1);
    expect(s.mistakes[0].chosen).toBe('NOT_THE_ANSWER');
    expect(q.answer).not.toBe('NOT_THE_ANSWER');
  });});
