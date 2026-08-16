<script setup lang="ts">
import { useTierStyle } from '@/composables/useTierStyle';
import { useI18n } from '@/composables/useI18n';
import { TIER_STYLES } from '@/config/tierStyles';

const { style, setStyle } = useTierStyle();
const { lang } = useI18n();

const current = () => TIER_STYLES.find((s) => s.id === style.value) ?? TIER_STYLES[0];

function cycle() {
  const idx = TIER_STYLES.findIndex((s) => s.id === style.value);
  setStyle(TIER_STYLES[(idx + 1) % TIER_STYLES.length].id);
}
</script>

<template>
  <button
    class="theme-btn tier-style-btn"
    :aria-label="
      lang === 'zh'
        ? '切换徽章形态（当前：' + current().labelZh + '）'
        : 'Switch badge style (current: ' + current().labelEn + ')'
    "
    :title="lang === 'zh' ? current().descZh : current().descEn"
    @click="cycle"
  >
    <span aria-hidden="true">{{ current().icon }}</span>
    <span class="theme-label">{{ lang === 'zh' ? current().labelZh : current().labelEn }}</span>
  </button>
</template>
