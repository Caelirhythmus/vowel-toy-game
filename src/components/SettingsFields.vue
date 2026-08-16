<script setup lang="ts">
import { computed } from 'vue';
import { useGame } from '@/composables/useGame';
import { useI18n } from '@/composables/useI18n';
import { useTheme } from '@/composables/useTheme';
import { useTierStyle } from '@/composables/useTierStyle';
import { DIFFICULTY_OPTIONS, MODE_OPTIONS, TIME_OPTIONS } from '@/config/game';
import { FAMILY_OPTIONS, freqAvailableFor } from '@/config/families';
import { TIER_STYLES, type TierStyleId } from '@/config/tierStyles';
import type { Difficulty, GameMode } from '@/core';

defineProps<{ lockedHint: string }>();

const game = useGame();
const { t, lang } = useI18n();
const { current: theme } = useTheme();
const tierStyle = useTierStyle();

/** 频率徽章风格多方案对比：当前仅对蓝色（sky）主题设计 */
const isSky = computed(() => theme.value.id === 'sky');

/** 当前语系下频率题是否可用（单档语系如斯拉夫史无区分度 → 禁用） */
const freqAvailable = computed(() => freqAvailableFor(game.state.settings.family));

function onFamilyChange(e: Event) {
  const family = (e.target as HTMLSelectElement).value;
  game.setSetting('family', family);
  // 切到单档语系时若正处"频率判断"模式（无区分度），自动改为混合，避免模式架空
  if (game.state.settings.mode === 'freq' && !freqAvailableFor(family)) {
    game.setSetting('mode', 'mixed');
  }
}
</script>

<template>
  <div class="setting" :title="lockedHint">
    <label for="mode-select">{{ t('set.mode') }}</label>
    <select id="mode-select" :disabled="game.isRunning" :value="game.state.settings.mode" @change="game.setSetting('mode', ($event.target as HTMLSelectElement).value as GameMode)">
      <option v-for="o in MODE_OPTIONS" :key="o.value" :value="o.value" :disabled="o.value === 'freq' && !freqAvailable" :title="o.value === 'freq' && !freqAvailable ? t('set.freqUnavailable') : undefined">
        {{ t(o.labelKey) }}
      </option>
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
    <select id="family-select" :disabled="game.isRunning" :value="game.state.settings.family" @change="onFamilyChange">
      <option v-for="o in FAMILY_OPTIONS" :key="o.value" :value="o.value">{{ t(o.labelKey) }}</option>
    </select>
  </div>
  <!-- 频率徽章风格：sky 主题多方案对比（定稿后移除或常驻） -->
  <div v-if="isSky" class="setting">
    <label for="tier-style-select">{{ t('set.tierStyle') }}</label>
    <select
      id="tier-style-select"
      :value="tierStyle.style.value"
      @change="tierStyle.setStyle(($event.target as HTMLSelectElement).value as TierStyleId)"
    >
      <option v-for="s in TIER_STYLES" :key="s.id" :value="s.id" :title="lang === 'zh' ? s.descZh : s.descEn">
        {{ lang === 'zh' ? s.labelZh : s.labelEn }}
      </option>
    </select>
  </div>
</template>
