/* ============================================================
 * 元音演变实验室 · 状态层（有限状态机 + 时间戳计时，Node 可测）
 * 命名空间：VL.state
 * 阶段：idle → playing → answered → playing → … → over
 * ============================================================ */
(function (g) {
  'use strict';

  const core = g.VL.core;

  function create(settings) {
    return {
      phase: 'idle', // idle | playing | answered | over
      settings: {
        mode: settings.mode || 'mixed',
        difficulty: settings.difficulty || 'easy',
        timeSec: settings.timeSec || 0 // 0 = 不限时
      },
      question: null,
      lastResult: null, // { ok, chosen, answerLabel }
      stats: { correct: 0, incorrect: 0, total: 0, streak: 0, bestStreak: 0 },
      mistakes: [], // { q, chosen }
      timer: { deadline: 0, leftMs: 0 }
    };
  }

  function isTimed(s) {
    return s.settings.timeSec > 0;
  }

  function start(s, now) {
    s.phase = 'idle';
    s.stats = { correct: 0, incorrect: 0, total: 0, streak: 0, bestStreak: 0 };
    s.mistakes = [];
    s.lastResult = null;
    const q = core.genQuestion(s.settings.mode, s.settings.difficulty);
    if (!q) return false;
    s.question = q;
    s.timer.deadline = isTimed(s) ? now + s.settings.timeSec * 1000 : 0;
    s.timer.leftMs = isTimed(s) ? s.settings.timeSec * 1000 : 0;
    s.phase = 'playing';
    return true;
  }

  function penalty(s, now) {
    if (!isTimed(s)) return;
    s.timer.leftMs = Math.max(0, leftMs(s, now) - 1000);
  }

  function leftMs(s, now) {
    if (!isTimed(s)) return 0;
    const remain = s.timer.deadline - now;
    return Math.max(0, remain);
  }

  /* 统一答题入口：chosen 为原始选择，evaluate 返回 {ok, answerLabel} */
  function answer(s, chosen, evaluate, now) {
    if (s.phase !== 'playing' || !s.question) return { ok: false, accepted: false };
    const res = evaluate(s.question, chosen);
    s.stats.total++;
    if (res.ok) {
      s.stats.correct++;
      s.stats.streak++;
      s.stats.bestStreak = Math.max(s.stats.bestStreak, s.stats.streak);
      s.phase = 'answered';
      s.lastResult = { ok: true, chosen, answerLabel: res.answerLabel };
    } else {
      s.stats.incorrect++;
      s.stats.streak = 0;
      s.mistakes.push({ q: s.question, chosen });
      penalty(s, now);
      if (isTimed(s) && s.timer.leftMs <= 0) {
        s.phase = 'over';
      } else {
        s.phase = 'playing'; // 保留原题重试
      }
      s.lastResult = { ok: false, chosen, answerLabel: res.answerLabel };
    }
    return { ok: res.ok, accepted: true };
  }

  const evaluateType = (q, choice) => ({
    ok: q.answer === choice,
    answerLabel: q.answer
  });
  const evaluateFreq = (q, choice) => ({
    ok: q.answer === choice,
    answerLabel: q.answer
  });

  function answerSystem(s, selected, now) {
    const norm = selected.slice().sort((a, b) => a - b);
    const ans = s.question.answer.slice().sort((a, b) => a - b);
    const same = norm.length === ans.length && norm.every((x, i) => x === ans[i]);
    return answer(s, norm, () => ({ ok: same, answerLabel: ans.join(',') }), now);
  }

  /* 答对后进入下一题 */
  function next(s, now) {
    if (s.phase !== 'answered') return false;
    const q = core.genQuestion(s.settings.mode, s.settings.difficulty);
    if (!q) return false;
    s.question = q;
    s.lastResult = null;
    s.phase = 'playing';
    return true;
  }

  /* 计时器心跳：返回是否超时结束 */
  function tick(s, now) {
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

  function applySettings(s, settings) {
    s.settings = {
      mode: settings.mode || s.settings.mode,
      difficulty: settings.difficulty || s.settings.difficulty,
      timeSec: settings.timeSec === undefined ? s.settings.timeSec : settings.timeSec
    };
  }

  g.VL.state = {
    create,
    start,
    answer,
    answerSystem,
    next,
    tick,
    leftMs,
    isTimed,
    applySettings
  };
})(typeof window !== 'undefined' ? window : globalThis);
