<script setup lang="ts">
import type { GameStats } from '@/core';
import { useI18n } from '@/composables/useI18n';

defineProps<{ stats: GameStats }>();
const { t } = useI18n();
</script>

<template>
  <div class="stats">
    <div class="stat ok">
      <span class="stat-label">{{ t('stat.correct') }}</span>
      <span class="stat-value">{{ stats.correct }}</span>
    </div>
    <div class="stat bad">
      <span class="stat-label">{{ t('stat.incorrect') }}</span>
      <span class="stat-value">{{ stats.incorrect }}</span>
    </div>
    <div class="stat total">
      <span class="stat-label">{{ t('stat.total') }}</span>
      <span class="stat-value">{{ stats.total }}</span>
    </div>
    <div class="stat streak">
      <span class="stat-label">{{ t('stat.streak') }}</span>
      <span class="stat-value">{{ stats.streak }}</span>
    </div>
  </div>
</template>
