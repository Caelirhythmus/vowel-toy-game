<script setup lang="ts">
import { useGame } from '@/composables/useGame';
import { useI18n } from '@/composables/useI18n';
import { DIFFICULTY_OPTIONS, MODE_OPTIONS, TIME_OPTIONS } from '@/config/game';
import type { Difficulty, GameMode } from '@/core';

const game = useGame();
const { t } = useI18n();
</script>

<template>
  <div class="settings">
    <div class="setting">
      <label for="mode-select">{{ t('set.mode') }}</label>
      <select id="mode-select" :value="game.state.settings.mode" @change="game.setSetting('mode', ($event.target as HTMLSelectElement).value as GameMode)">
        <option v-for="o in MODE_OPTIONS" :key="o.value" :value="o.value">{{ t(o.labelKey) }}</option>
      </select>
    </div>
    <div class="setting">
      <label for="difficulty-select">{{ t('set.difficulty') }}</label>
      <select id="difficulty-select" :value="game.state.settings.difficulty" @change="game.setSetting('difficulty', ($event.target as HTMLSelectElement).value as Difficulty)">
        <option v-for="o in DIFFICULTY_OPTIONS" :key="o.value" :value="o.value">{{ t(o.labelKey) }}</option>
      </select>
    </div>
    <div class="setting">
      <label for="time-select">{{ t('set.time') }}</label>
      <select id="time-select" :value="game.state.settings.timeSec" @change="game.setSetting('timeSec', Number(($event.target as HTMLSelectElement).value))">
        <option v-for="o in TIME_OPTIONS" :key="o.value" :value="o.value">{{ t(o.labelKey) }}</option>
      </select>
    </div>
    <div class="btn-row">
      <button class="btn start" :disabled="game.isRunning" @click="game.start">{{ t('btn.start') }}</button>
      <button class="btn reset" @click="game.reset">{{ t('btn.reset') }}</button>
    </div>
  </div>
</template>
