<script setup lang="ts">
import { useGame } from '@/composables/useGame';
import { useI18n } from '@/composables/useI18n';

const game = useGame();
const { t } = useI18n();
</script>

<template>
  <div v-if="game.state.settings.timeSec > 0" class="timer">
    {{ t('timer.left') }}：<span class="timer-value">{{ game.leftSeconds }}</span>
  </div>
</template>
