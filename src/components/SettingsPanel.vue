<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { useGame } from '@/composables/useGame';
import { useI18n } from '@/composables/useI18n';
import { DIFFICULTY_OPTIONS, MODE_OPTIONS, TIME_OPTIONS } from '@/config/game';
import type { Difficulty, GameMode } from '@/core';

const game = useGame();
const { t } = useI18n();

/**
 * 重新开始的两步确认：游戏中点击「重新开始」先变“确认重新开始？”（3 秒内
 * 再点一次才生效），防止误触丢掉本局进度。
 */
const confirmRestart = ref(false);
let confirmTimer: number | null = null;

const lockedHint = computed(() =>
  game.isRunning ? `${t('set.locked')}（${t('set.lockedHint')}）` : ''
);

const startLabel = computed(() => {
  if (confirmRestart.value) return t('btn.restart.confirm');
  return game.isRunning ? t('btn.restart') : t('btn.start');
});

function disarmConfirm() {
  confirmRestart.value = false;
  if (confirmTimer !== null) {
    clearTimeout(confirmTimer);
    confirmTimer = null;
  }
}

function onStart() {
  if (game.isRunning) {
    if (confirmRestart.value) {
      disarmConfirm();
      game.start();
    } else {
      confirmRestart.value = true;
      confirmTimer = window.setTimeout(disarmConfirm, 3000);
    }
  } else {
    game.start();
  }
}

function onEndRound() {
  disarmConfirm();
  game.reset();
}

onUnmounted(disarmConfirm);
</script>

<template>
  <div class="settings">
    <div class="setting" :title="lockedHint">
      <label for="mode-select">{{ t('set.mode') }}</label>
      <select id="mode-select" :disabled="game.isRunning" :value="game.state.settings.mode" @change="game.setSetting('mode', ($event.target as HTMLSelectElement).value as GameMode)">
        <option v-for="o in MODE_OPTIONS" :key="o.value" :value="o.value">{{ t(o.labelKey) }}</option>
      </select>
    </div>
    <div class="setting" :title="lockedHint">
      <label for="difficulty-select">{{ t('set.difficulty') }}</label>
      <select id="difficulty-select" :disabled="game.isRunning" :value="game.state.settings.difficulty" @change="game.setSetting('difficulty', ($event.target as HTMLSelectElement).value as Difficulty)">
        <option v-for="o in DIFFICULTY_OPTIONS" :key="o.value" :value="o.value">{{ t(o.labelKey) }}</option>
      </select>
    </div>
    <div class="setting" :title="lockedHint">
      <label for="time-select">{{ t('set.time') }}</label>
      <select id="time-select" :disabled="game.isRunning" :value="game.state.settings.timeSec" @change="game.setSetting('timeSec', Number(($event.target as HTMLSelectElement).value))">
        <option v-for="o in TIME_OPTIONS" :key="o.value" :value="o.value">{{ t(o.labelKey) }}</option>
      </select>
    </div>
    <div class="btn-row">
      <button class="btn start" :class="{ confirm: confirmRestart }" @click="onStart">{{ startLabel }}</button>
      <button v-if="game.isRunning" class="btn end-round" @click="onEndRound">{{ t('btn.endRound') }}</button>
    </div>
  </div>
</template>
