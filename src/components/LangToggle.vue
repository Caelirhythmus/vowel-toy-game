<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';

const { lang, toggleLang } = useI18n();
</script>

<template>
  <button class="lang-btn" :aria-label="lang === 'zh' ? 'Switch to English' : '切换到中文'" @click="toggleLang">
    {{ lang === 'zh' ? 'EN' : '中文' }}
  </button>
</template>
