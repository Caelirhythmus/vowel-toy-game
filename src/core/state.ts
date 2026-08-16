/* ============================================================
 * core：游戏状态机（纯逻辑，时间注入，Node/浏览器双端可测）
 * 阶段：idle → playing → answered → playing → … → over
 * ============================================================ */
import type {
  AnswerResult,
  GameSettings,
  GameState,
  Question
} from './types';
import { genQuestion } from './questions';

export const DEFAULT_SETTINGS: GameSettings = {
  mode: 'mixed',
  difficulty: 'easy',
  timeSec: 60,
  family: 'generic'
};

export function createGame(settings: Partial<GameSettings> = {}): GameState {
  return {
    phase: 'idle',
    settings: { ...DEFAULT_SETTINGS, ...settings },
    question: null,
    lastResult: null,
    stats: { correct: 0, incorrect: 0, total: 0, streak: 0, bestStreak: 0 },
    mistakes: [],
    timer: { deadline: 0, leftMs: 0 }
  };
}

export function applySettings(s: GameState, settings: Partial<GameSettings>): void {
  s.settings = { ...s.settings, ...settings };
}

export function isTimed(s: GameState): boolean {
  return s.settings.timeSec > 0;
}

export function leftMs(s: GameState, now: number): number {
  if (!isTimed(s)) return 0;
  return Math.max(0, s.timer.deadline - now);
}

/** 开局：重置统计并生成第一题 */
export function start(s: GameState, now: number): boolean {
  s.phase = 'idle';
  s.stats = { correct: 0, incorrect: 0, total: 0, streak: 0, bestStreak: 0 };
  s.mistakes = [];
  s.lastResult = null;
  const q = genQuestion(s.settings.mode, s.settings.difficulty, s.settings.family);
  if (!q) return false;
  s.question = q;
  s.timer.deadline = isTimed(s) ? now + s.settings.timeSec * 1000 : 0;
  s.timer.leftMs = isTimed(s) ? s.settings.timeSec * 1000 : 0;
  s.phase = 'playing';
  return true;
}

/** 限时模式答错扣 1 秒 */
function penalty(s: GameState, now: number): void {
  if (!isTimed(s)) return;
  s.timer.leftMs = Math.max(0, leftMs(s, now) - 1000);
}

type Evaluator = (q: Question, chosen: unknown) => AnswerResult;

/**
 * 统一答题入口。
 * 答对 → answered（等 next() 换题）；答错 → 保留原题重试，限时模式扣 1 秒。
 */
export function answer(s: GameState, chosen: unknown, evaluate: Evaluator, now: number): { ok: boolean; accepted: boolean } {
  if (s.phase !== 'playing' || !s.question) return { ok: false, accepted: false };
  const res = evaluate(s.question, chosen);
  s.stats.total++;
  if (res.ok) {
    s.stats.correct++;
    s.stats.streak++;
    s.stats.bestStreak = Math.max(s.stats.bestStreak, s.stats.streak);
    s.phase = 'answered';
    s.lastResult = res;
  } else {
    s.stats.incorrect++;
    s.stats.streak = 0;
    s.mistakes.push({ q: s.question, chosen });
    penalty(s, now);
    if (isTimed(s) && s.timer.leftMs <= 0) {
      s.phase = 'over';
    } else {
      s.phase = 'playing';
    }
    s.lastResult = res;
  }
  return { ok: res.ok, accepted: true };
}

/** 系统题：勾选词表，全对才算正确 */
export function answerSystem(s: GameState, selected: number[], now: number): { ok: boolean; accepted: boolean } {
  if (s.question?.kind !== 'system') return { ok: false, accepted: false };
  const norm = selected.slice().sort((a, b) => a - b);
  const ans = s.question.answer.slice().sort((a, b) => a - b);
  const same = norm.length === ans.length && norm.every((x, i) => x === ans[i]);
  return answer(s, norm, () => ({ ok: same, answerLabel: ans.join(',') }), now);
}

/** 答对后进入下一题 */
export function next(s: GameState, _now: number): boolean {
  if (s.phase !== 'answered') return false;
  const q = genQuestion(s.settings.mode, s.settings.difficulty, s.settings.family);
  if (!q) return false;
  s.question = q;
  s.lastResult = null;
  s.phase = 'playing';
  return true;
}

/** 计时心跳：返回是否超时结束 */
export function tick(s: GameState, now: number): boolean {
  if (!isTimed(s)) return false;
  if (s.phase === 'over') return true;
  if (s.phase !== 'idle') {
    s.timer.leftMs = leftMs(s, now);
    if (s.timer.leftMs <= 0) {
      s.phase = 'over';
      return true;
    }
  }
  return false;
}
