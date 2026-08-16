<script setup lang="ts">
import { useGame } from '@/composables/useGame';
import { useI18n } from '@/composables/useI18n';
import { DIFFICULTY_OPTIONS, MODE_OPTIONS, TIME_OPTIONS } from '@/config/game';
import { FAMILY_OPTIONS } from '@/config/families';
import type { Difficulty, GameMode } from '@/core';

defineProps<{ lockedHint: string }>();

const game = useGame();
const { t } = useI18n();
</script>

<template>
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
  <div class="setting" :title="lockedHint">
    <label for="family-select">{{ t('set.family') }}</label>
    <select id="family-select" :disabled="game.isRunning" :value="game.state.settings.family" @change="game.setSetting('family', ($event.target as HTMLSelectElement).value)">
      <option v-for="o in FAMILY_OPTIONS" :key="o.value" :value="o.value">{{ t(o.labelKey) }}</option>
    </select>
  </div>
</template>
