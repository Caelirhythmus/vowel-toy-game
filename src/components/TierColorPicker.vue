<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useTierColor } from '@/composables/useTierColor';
import { useI18n } from '@/composables/useI18n';
import { TIER_COLORS } from '@/config/tierColors';

const { current, setColor } = useTierColor();
const { lang } = useI18n();
const open = ref(false);

function onDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.tier-color-wrap')) open.value = false;
}

onMounted(() => document.addEventListener('click', onDocClick));
onBeforeUnmount(() => document.removeEventListener('click', onDocClick));
</script>

<template>
  <div class="tier-color-wrap">
    <button
      class="theme-btn tier-color-btn"
      :aria-expanded="open"
      :aria-label="lang === 'zh' ? '切换徽章配色（当前：' + current.labelZh + '）' : 'Switch badge colors (current: ' + current.labelEn + ')'"
      @click.stop="open = !open"
    >
      <span aria-hidden="true">🎨</span>
      <span class="theme-label">{{ lang === 'zh' ? current.labelZh : current.labelEn }}</span>
      <span class="caret" aria-hidden="true">{{ open ? '▴' : '▾' }}</span>
    </button>

    <div v-if="open" class="tier-color-menu" role="menu">
      <button
        v-for="c in TIER_COLORS"
        :key="c.id"
        class="tier-color-item"
        :class="{ active: c.id === current.id }"
        role="menuitem"
        :title="lang === 'zh' ? c.descZh : c.descEn"
        @click="setColor(c.id); open = false"
      >
        <span class="tier-swatch" aria-hidden="true">
          <span v-for="(s, i) in c.swatch" :key="i" :style="{ background: s }"></span>
        </span>
        {{ lang === 'zh' ? c.labelZh : c.labelEn }}
        <span v-if="c.id === current.id" class="tier-check" aria-hidden="true">✓</span>
      </button>
    </div>
  </div>
</template>
