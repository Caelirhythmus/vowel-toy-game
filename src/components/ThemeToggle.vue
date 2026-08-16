<script setup lang="ts">
import { useTheme } from '@/composables/useTheme';
import { useI18n } from '@/composables/useI18n';

const { current, cycle } = useTheme();
const { lang } = useI18n();
</script>

<template>
  <button
    class="theme-btn"
    :aria-label="lang === 'zh' ? '切换主题（当前：' + current.labelZh + '）' : 'Switch theme (current: ' + current.labelEn + ')'"
    :title="lang === 'zh' ? '切换主题' : 'Switch theme'"
    @click="cycle"
  >
    <span aria-hidden="true">{{ current.icon }}</span>
    <span class="theme-label">{{ lang === 'zh' ? current.labelZh : current.labelEn }}</span>
  </button>
</template>
