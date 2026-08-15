<script setup lang="ts">
import { computed } from 'vue';
import type { WordVowel } from '@/core';
import { resolveVowel } from '@/core';
import { MONOPHTHONGS, DIPHTHONGS } from '@/config/vowels';
import { useI18n } from '@/composables/useI18n';

const props = defineProps<{ a: WordVowel | null; b: WordVowel | null }>();
const { t } = useI18n();

const W = 360;
const H = 230;

function yF(h: number): number {
  if (h === 4) return 0.13;
  if (h === 3) return 0.32;
  if (h === 2) return 0.51;
  if (h === 0) return 0.88;
  return 0.415; // ə（央、中）
}

function xF(back: number, h: number): number {
  const openX = [0.16, 0.5, 0.84][back] as number;
  const closeX = [0.3, 0.5, 0.7][back] as number;
  return openX + (closeX - openX) * (h / 4);
}

const px = (fx: number) => (fx * W).toFixed(1);
const py = (fy: number) => (fy * H).toFixed(1);
const P = (fx: number, fy: number) => `${px(fx)},${py(fy)}`;

const trapezoid = `${P(0.3, 0.13)} ${P(0.7, 0.13)} ${P(0.84, 0.88)} ${P(0.16, 0.88)}`;
const rowHeights = [4, 3, 2, 0] as const;

const dots = computed(() =>
  Object.values(MONOPHTHONGS).map((m) => ({
    x: xF(m.back, m.height),
    y: yF(m.height),
    s: m.symbol,
    round: m.round
  }))
);

const diphLabels = computed(() =>
  Object.values(DIPHTHONGS).map((d) => {
    const base = MONOPHTHONGS[d.start];
    return { x: xF(base.back, base.height) + 0.045, y: yF(base.height) - 0.045, s: d.symbol };
  })
);

function pos(v: WordVowel | null): { x: number; y: number } | null {
  if (!v) return null;
  const b = resolveVowel(v);
  if (!b) return null;
  return { x: xF(b.back, b.height), y: yF(b.height) };
}

const aPos = computed(() => pos(props.a));
const bPos = computed(() => pos(props.b));
</script>

<template>
  <div class="chart-wrap">
    <h3 class="chart-title">{{ t('chart.title') }}</h3>
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="t('chart.title')">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#c0392b" />
        </marker>
      </defs>
      <polygon :points="trapezoid" fill="#f4f7fb" stroke="#9db3d3" stroke-width="1.5" />
      <line v-for="h in rowHeights" :key="'r' + h" :x1="px(xF(0, h))" :y1="py(yF(h))" :x2="px(xF(2, h))" :y2="py(yF(h))" stroke="#c9d6ea" stroke-width="1" />
      <line :x1="px(xF(1, 4))" :y1="py(yF(4))" :x2="px(xF(1, 0))" :y2="py(yF(0))" stroke="#c9d6ea" stroke-width="1" stroke-dasharray="3 3" />
      <g v-for="d in dots" :key="d.s">
        <circle :cx="px(d.x)" :cy="py(d.y)" r="4" :fill="d.round ? '#8e44ad' : '#2d3436'" />
        <text :x="px(d.x + 0.02)" :y="py(d.y + 0.015)" font-size="12.5" fill="#333">{{ d.s }}</text>
      </g>
      <text v-for="d in diphLabels" :key="d.s" :x="px(d.x)" :y="py(d.y)" font-size="11.5" font-style="italic" fill="#7f8c8d">{{ d.s }}</text>
      <template v-if="aPos && bPos">
        <line :x1="px(aPos.x)" :y1="py(aPos.y)" :x2="px(bPos.x)" :y2="py(bPos.y)" stroke="#c0392b" stroke-width="2" marker-end="url(#arr)" />
        <circle :cx="px(aPos.x)" :cy="py(aPos.y)" r="8" fill="rgba(75,108,183,0.18)" stroke="#4b6cb7" stroke-width="2.5" />
        <circle :cx="px(bPos.x)" :cy="py(bPos.y)" r="8" fill="rgba(231,76,60,0.18)" stroke="#e74c3c" stroke-width="2.5" />
      </template>
    </svg>
    <div class="chart-legend">
      <span class="dot dot-a"></span><span>{{ t('chart.a') }}</span>
      <span class="dot dot-b"></span><span>{{ t('chart.b') }}</span>
    </div>
  </div>
</template>
