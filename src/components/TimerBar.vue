<script setup lang="ts">
import { computed } from 'vue';
import { useGame } from '@/composables/useGame';
import { useI18n } from '@/composables/useI18n';

const game = useGame();
const { t } = useI18n();

/** 剩余比例（进度条） */
const pct = computed(() => {
  const total = game.state.settings.timeSec;
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((game.leftSeconds / total) * 100)));
});

/** 最后 10 秒进入警示态（红色脉冲） */
const urgent = computed(() => game.leftSeconds > 0 && game.leftSeconds <= 10);
</script>

<template>
  <div v-if="game.state.settings.timeSec > 0" class="timer" :class="{ urgent }" role="timer">
    <div class="timer-bar" :style="{ width: pct + '%' }"></div>
    <div class="timer-row">
      {{ t('timer.left') }}：<span class="timer-value">{{ game.leftSeconds }}</span>
    </div>
  </div>
</template>
