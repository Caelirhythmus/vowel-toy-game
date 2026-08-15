/* ============================================================
 * 元音演变实验室 · 引导层（事件、计时循环、自动下一题）
 * ============================================================ */
(function () {
  'use strict';

  const stateApi = VL.state;
  const ui = VL.ui;
  const $ = (id) => document.getElementById(id);

  /* 当前选择（系统题：哪些词会变化） */
  let sel = new Set();
  let state = null;

  function settingsFromDom() {
    return {
      mode: $('mode-select').value,
      difficulty: $('difficulty-select').value,
      timeSec: parseInt($('time-select').value, 10) || 0
    };
  }

  function freshStart() {
    ui.disposeTimers();
    stateApi.applySettings(state, settingsFromDom());
    if (!stateApi.start(state, Date.now())) return;
    sel = new Set();
    ui.render(state, sel);
  }

  function doReset() {
    ui.disposeTimers();
    ui.closeModal();
    state = stateApi.create(settingsFromDom());
    sel = new Set();
    ui.render(state, sel);
  }

  function finishIfOver() {
    if (state.phase === 'over') {
      ui.disposeTimers();
      ui.render(state, sel);
      ui.openModal(state);
      return true;
    }
    return false;
  }

  function scheduleNext() {
    ui.disposeTimers();
    ui._advanceTimer = setTimeout(function () {
      if (state.phase === 'answered') {
        stateApi.next(state, Date.now());
        sel = new Set();
        ui.render(state, sel);
      }
    }, 1800);
  }

  /* ---------- 答题 ---------- */
  function handleOpt(value) {
    if (state.phase !== 'playing' || !state.question) return;
    const q = state.question;
    const ev = function (qq, c) {
      const ok = qq.answer === c;
      return { ok: ok, answerLabel: qq.answer };
    };
    stateApi.answer(state, value, ev, Date.now());
    if (finishIfOver()) return;
    ui.render(state, sel);
    if (state.lastResult && state.lastResult.ok) scheduleNext();
  }

  function handleToggleWord(idx) {
    if (state.phase !== 'playing' || state.question.kind !== 'system') return;
    if (sel.has(idx)) sel.delete(idx); else sel.add(idx);
    ui.updateOptions(state, sel);
  }

  function handleSubmitSystem() {
    if (state.phase !== 'playing' || state.question.kind !== 'system') return;
    const arr = Array.from(sel).sort((a, b) => a - b);
    stateApi.answerSystem(state, arr, Date.now());
    if (finishIfOver()) return;
    ui.render(state, sel);
    if (state.lastResult && state.lastResult.ok) scheduleNext();
  }

  /* ---------- 事件 ---------- */
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    if (action === 'opt') handleOpt(btn.getAttribute('data-value'));
    else if (action === 'toggle-word') handleToggleWord(parseInt(btn.getAttribute('data-index'), 10));
    else if (action === 'submit-system') handleSubmitSystem();
  });

  $('start-btn').addEventListener('click', freshStart);
  $('reset-btn').addEventListener('click', doReset);
  $('close-modal').addEventListener('click', function () {
    ui.closeModal();
  });
  $('game-over-modal').addEventListener('click', function (e) {
    if (e.target === this) ui.closeModal();
  });

  $('lang-btn').addEventListener('click', function () {
    ui.setLang(ui.lang === 'zh' ? 'en' : 'zh');
    ui.renderCheatsheet();
    if (state) ui.render(state, sel);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ui._modalOpen) ui.closeModal();
  });

  /* ---------- 计时循环（时间戳差值，只刷时间显示） ---------- */
  setInterval(function () {
    if (!state || state.phase === 'idle' || state.phase === 'over') return;
    if (!stateApi.isTimed(state)) return;
    const over = stateApi.tick(state, Date.now());
    const secs = Math.max(0, Math.ceil(stateApi.leftMs(state, Date.now()) / 1000));
    $('timer-display').textContent = secs;
    if (over) {
      ui.disposeTimers();
      ui.render(state, sel);
      ui.openModal(state);
    }
  }, 250);

  /* ---------- 初始化 ---------- */
  (function init() {
    const saved = (function () {
      try { return localStorage.getItem('vl-lang'); } catch (e) { return null; }
    })();
    ui.setLang(saved === 'en' ? 'en' : 'zh');
    state = stateApi.create(settingsFromDom());
    ui.renderCheatsheet();
    ui.render(state, sel);
  })();
})();
