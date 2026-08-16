/* ============================================================
 * composables：useGame —— 游戏编排层
 * 职责：把纯逻辑 core/state 接到 UI 世界（响应式状态、计时循环、
 * 自动下一题、系统题选择、设置/历史持久化）。
 * 单例 store：模块级 reactive 状态，全应用共享。
 * ============================================================ */
import { computed, reactive, ref } from 'vue';import * as core from '@/core';
import type { GameSettings, GameState } from '@/core';
import {
  STORAGE_KEYS,
  appendHistory,
  loadJSON,
  saveJSON
} from '@/services/storage';

function loadSettings(): GameSettings {
  return loadJSON<GameSettings>(STORAGE_KEYS.settings, { ...core.DEFAULT_SETTINGS });
}

const state: GameState = reactive(core.createGame(loadSettings()));
const modalOpen = ref(false);
const selection = ref<Set<number>>(new Set());

let advanceTimer: number | null = null;

/** 答对后自动进入下一题的等待时长：留足时间阅读规则讲解（可手动跳过） */
const ADVANCE_DELAY_MS = 3000;

function disposeAdvance() {
  if (advanceTimer !== null) {
    clearTimeout(advanceTimer);
    advanceTimer = null;
  }
}

function persistSettings() {
  saveJSON(STORAGE_KEYS.settings, state.settings);
}

function afterAnswer() {
  if (state.phase === 'over') {
    disposeAdvance();
    appendHistory({
      date: new Date().toISOString(),
      correct: state.stats.correct,
      incorrect: state.stats.incorrect,
      total: state.stats.total,
      bestStreak: state.stats.bestStreak
    });
    modalOpen.value = true;
  } else if (state.lastResult?.ok) {
    disposeAdvance();
    advanceTimer = window.setTimeout(() => {
      if (state.phase === 'answered') {
        core.next(state, Date.now());
        selection.value = new Set();
      }
    }, ADVANCE_DELAY_MS);
  }
}

export function useGame() {
  function start() {
    disposeAdvance();
    core.applySettings(state, loadSettings());
    if (!core.start(state, Date.now())) return;
    selection.value = new Set();
    modalOpen.value = false;
  }

  function reset() {
    disposeAdvance();
    const fresh = core.createGame(loadSettings());
    Object.assign(state, fresh);
    selection.value = new Set();
    modalOpen.value = false;
  }

  function setSetting<K extends keyof GameSettings>(key: K, value: GameSettings[K]) {
    state.settings[key] = value;
    persistSettings();
  }

  function answerOpt(value: string) {
    if (state.phase !== 'playing' || !state.question) return;
    core.answer(
      state,
      value,
      (q, c) => ({ ok: q.answer === c, answerLabel: String(q.answer) }),
      Date.now()
    );
    afterAnswer();
  }

  function toggleWord(idx: number) {
    if (state.phase !== 'playing' || state.question?.kind !== 'system') return;
    const next = new Set(selection.value);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    selection.value = next;
  }

  function submitSystem() {
    if (state.phase !== 'playing' || state.question?.kind !== 'system') return;
    const arr = Array.from(selection.value).sort((a, b) => a - b);
    core.answerSystem(state, arr, Date.now());
    afterAnswer();
  }

  /** 手动跳过等待，立即进入下一题（答对后可用） */
  function nextQuestion() {
    if (state.phase !== 'answered') return;
    disposeAdvance();
    if (core.next(state, Date.now())) {
      selection.value = new Set();
    }
  }

  /** 计时心跳（App 挂载后每 250ms 调用） */
  function tick() {
    if (state.phase === 'idle' || state.phase === 'over') return;
    const over = core.tick(state, Date.now());
    if (over) {
      disposeAdvance();
      modalOpen.value = true;
    }
  }

  function closeModal() {
    modalOpen.value = false;
  }

  function dispose() {
    disposeAdvance();
  }

  const isRunning = computed(() => state.phase === 'playing' || state.phase === 'answered');
  /**
   * 剩余秒数（向上取整）。
   * 注意：必须依赖响应式的 state.timer.leftMs（由 tick()/answer()/start() 更新），
   * 不能直接读 Date.now()——Date.now() 非响应式，computed 会永久缓存首个值导致数值不更新。
   */
  const leftSeconds = computed(() =>
    core.isTimed(state) ? Math.max(0, Math.ceil(state.timer.leftMs / 1000)) : 0
  );

  return reactive({
    state,
    modalOpen,
    selection,
    isRunning,
    leftSeconds,
    start,
    reset,
    setSetting,
    answerOpt,
    toggleWord,
    submitSystem,
    nextQuestion,
    tick,
    closeModal,
    dispose
  });
}
