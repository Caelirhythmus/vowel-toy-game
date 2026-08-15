<script setup lang="ts">
import { computed, ref } from 'vue';
import type { VowelFeatures, WordVowel } from '@/core';
import { resolveVowel } from '@/core';
import { ACOUSTIC_BOX, acousticPoint } from '@/core/acoustics';
import { describeDiphthong, describeVowel } from '@/core/describe';
import { MONOPHTHONGS, DIPHTHONGS } from '@/config/vowels';
import { useI18n } from '@/composables/useI18n';
import { speechService } from '@/services/audio';

const props = defineProps<{
  a: WordVowel | null;
  b: WordVowel | null;
  /** 词对标识：变化时重新触发路径动画 */
  animKey?: string;
  /** 系统题 diff：变化源 / 变化结果的元音符号 */
  diff?: { sources: string[]; targets: string[] } | null;
}>();

const { t, lang } = useI18n();

type ChartView = 'articulatory' | 'acoustic';
const view = ref<ChartView>('articulatory');

const W = 360;
const H = 230;
const ROUNDED_PAIR_DX = 0.045; // IPA 惯例：同格圆唇对并排，圆唇符号居右

/* ---------- 发音部位图坐标（梯形） ---------- */
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

/* ---------- 统一坐标：按视图返回归一化位置 ---------- */
function posFor(base: VowelFeatures, symbol: string): { x: number; y: number } | null {
  if (view.value === 'acoustic') {
    const p = acousticPoint(symbol);
    return p ? { x: p.x, y: p.y } : null;
  }
  const pairDx = base.round && base.back === 0 ? ROUNDED_PAIR_DX : 0;
  return { x: xF(base.back, base.height) + pairDx, y: yF(base.height) };
}

function posForVowel(v: WordVowel | null): { x: number; y: number } | null {
  if (!v) return null;
  const base = resolveVowel(v);
  if (!base) return null;
  return posFor(base, v.diph ? base.symbol : v.s);
}

const px = (fx: number) => (fx * W).toFixed(1);
const py = (fy: number) => (fy * H).toFixed(1);
const P = (fx: number, fy: number) => `${px(fx)},${py(fy)}`;

const trapezoid = `${P(0.3, 0.13)} ${P(0.7, 0.13)} ${P(0.84, 0.88)} ${P(0.16, 0.88)}`;
const rowHeights = [4, 3, 2, 0] as const;

/* ---------- 数据 ---------- */
interface Dot {
  s: string;
  x: number;
  y: number;
  round: boolean;
  features: VowelFeatures;
}

const dots = computed<Dot[]>(() =>
  Object.values(MONOPHTHONGS)
    .map((m) => {
      const p = posFor(m, m.symbol);
      if (!p) return null;
      return { s: m.symbol, x: p.x, y: p.y, round: m.round, features: m };
    })
    .filter((d): d is Dot => d !== null)
);

const diphLabels = computed(() =>
  Object.values(DIPHTHONGS)
    .map((d) => {
      const base = MONOPHTHONGS[d.start];
      const p = posFor(base, d.start);
      if (!p) return null;
      return { s: d.symbol, x: p.x + d.labelOffset.dx, y: p.y + d.labelOffset.dy };
    })
    .filter((d): d is { s: string; x: number; y: number } => d !== null)
);

/* ---------- A→B 高亮 ---------- */
const aPos = computed(() => posForVowel(props.a));
const bPos = computed(() => posForVowel(props.b));
const hasPair = computed(() => !!aPos.value && !!bPos.value);

/* ---------- diff 视图 ---------- */
const diffSet = computed(() => {
  if (!props.diff) return null;
  return {
    sources: new Set(props.diff.sources),
    targets: new Set(props.diff.targets)
  };
});

function dotState(s: string): 'source' | 'target' | 'idle' | 'normal' {
  const d = diffSet.value;
  if (!d) return 'normal';
  if (d.sources.has(s)) return 'source';
  if (d.targets.has(s)) return 'target';
  return 'idle';
}

/* ---------- 悬停特征卡 ---------- */
const hovered = ref<{ x: number; y: number; text: string } | null>(null);

function describeDot(d: Dot): string {
  const feats = describeVowel(d.features, lang.value);
  const est = view.value === 'acoustic' ? acousticPoint(d.s) : null;
  const formants = est ? ` · F1 ${est.f1} Hz · F2 ${est.f2} Hz` : '';
  return `${d.s} — ${feats}${formants}`;
}

function showTip(d: Dot) {
  hovered.value = { x: d.x, y: d.y, text: describeDot(d) };
}

function hideTip() {
  hovered.value = null;
}

/* ---------- 发音点播 ---------- */
function speak(text: string) {
  speechService.speak(text);
}

/* ---------- 轴标注 ---------- */
const rowLabels = [
  { h: 4, key: 'chart.axis.close' },
  { h: 3, key: 'chart.axis.closeMid' },
  { h: 2, key: 'chart.axis.openMid' },
  { h: 0, key: 'chart.axis.open' }
] as const;
const colLabels = [
  { back: 0, key: 'chart.axis.front' },
  { back: 1, key: 'chart.axis.central' },
  { back: 2, key: 'chart.axis.back' }
] as const;
</script>

<template>
  <div class="chart-wrap">
    <div class="chart-toolbar">
      <h3 class="chart-title">{{ t('chart.title') }}</h3>
      <div class="chart-views" role="group" :aria-label="t('chart.title')">
        <button
          class="chart-view-btn"
          :class="{ active: view === 'articulatory' }"
          @click="view = 'articulatory'"
        >
          {{ t('chart.view.articulatory') }}
        </button>
        <button
          class="chart-view-btn"
          :class="{ active: view === 'acoustic' }"
          @click="view = 'acoustic'"
        >
          {{ t('chart.view.acoustic') }}
        </button>
      </div>
    </div>

    <div class="chart-svg-wrap">
      <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="t('chart.title')">
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#c0392b" />
          </marker>
        </defs>

        <!-- 发音部位图底图 -->
        <template v-if="view === 'articulatory'">
          <polygon :points="trapezoid" fill="#f4f7fb" stroke="#9db3d3" stroke-width="1.5" />
          <line v-for="h in rowHeights" :key="'r' + h" :x1="px(xF(0, h))" :y1="py(yF(h))" :x2="px(xF(2, h))" :y2="py(yF(h))" stroke="#c9d6ea" stroke-width="1" />
          <line :x1="px(xF(1, 4))" :y1="py(yF(4))" :x2="px(xF(1, 0))" :y2="py(yF(0))" stroke="#c9d6ea" stroke-width="1" stroke-dasharray="3 3" />
          <text v-for="r in rowLabels" :key="r.key" :x="px(0.145)" :y="py(yF(r.h))" text-anchor="end" font-size="10.5" fill="#8a94a6">{{ t(r.key) }}</text>
          <text v-for="c in colLabels" :key="c.key" :x="px(xF(c.back, 0))" :y="py(0.965)" text-anchor="middle" font-size="10.5" fill="#8a94a6">{{ t(c.key) }}</text>
        </template>

        <!-- 声学图底图（F1×F2） -->
        <template v-else>
          <rect
            :x="px(ACOUSTIC_BOX.x0 - 0.015)"
            :y="py(ACOUSTIC_BOX.y0 - 0.015)"
            :width="px(ACOUSTIC_BOX.x1 - ACOUSTIC_BOX.x0 + 0.03)"
            :height="py(ACOUSTIC_BOX.y1 - ACOUSTIC_BOX.y0 + 0.03)"
            fill="#f4f7fb" stroke="#9db3d3" stroke-width="1.5"
          />
          <text :x="px(0.5)" :y="py(0.985)" text-anchor="middle" font-size="10.5" fill="#8a94a6">{{ t('chart.axis.f2') }}</text>
          <text :x="px(0.045)" :y="py(0.5)" text-anchor="middle" font-size="10.5" fill="#8a94a6" :transform="`rotate(-90 ${px(0.045)} ${py(0.5)})`">{{ t('chart.axis.f1') }}</text>
          <text :x="px(ACOUSTIC_BOX.x0)" :y="py(ACOUSTIC_BOX.y0 - 0.02)" text-anchor="middle" font-size="9" fill="#a0aaba">{{ '2300' }}</text>
          <text :x="px(ACOUSTIC_BOX.x1)" :y="py(ACOUSTIC_BOX.y0 - 0.02)" text-anchor="middle" font-size="9" fill="#a0aaba">{{ '900' }}</text>
          <text :x="px(ACOUSTIC_BOX.x0 - 0.018)" :y="py(ACOUSTIC_BOX.y0)" text-anchor="end" font-size="9" fill="#a0aaba">{{ '300' }}</text>
          <text :x="px(ACOUSTIC_BOX.x0 - 0.018)" :y="py(ACOUSTIC_BOX.y1)" text-anchor="end" font-size="9" fill="#a0aaba">{{ '800' }}</text>
        </template>

        <!-- 元音点（可聚焦/点击朗读/悬停看特征卡） -->
        <g
          v-for="d in dots"
          :key="d.s"
          role="button"
          tabindex="0"
          :aria-label="`${d.s}，${describeVowel(d.features, lang)}，${t('chart.speak')}`"
          @mouseenter="showTip(d)"
          @mouseleave="hideTip"
          @focusin="showTip(d)"
          @focusout="hideTip"
          @click="speak(d.s)"
          @keydown.enter.prevent="speak(d.s)"
          @keydown.space.prevent="speak(d.s)"
        >
          <circle
            :cx="px(d.x)" :cy="py(d.y)" r="4"
            :fill="dotState(d.s) === 'source' ? '#27ae60' : d.round ? '#8e44ad' : '#2d3436'"
            :stroke="dotState(d.s) === 'target' ? '#2980b9' : 'none'"
            :stroke-width="dotState(d.s) === 'target' ? 2 : 0"
            :stroke-dasharray="dotState(d.s) === 'target' ? '3 3' : undefined"
            :opacity="dotState(d.s) === 'idle' ? 0.3 : 1"
          />
          <text
            :x="px(d.x + 0.02)" :y="py(d.y + 0.015)" font-size="12.5"
            :fill="dotState(d.s) === 'idle' ? '#aab2c0' : dotState(d.s) === 'source' ? '#1e7d3c' : '#333'"
            :opacity="dotState(d.s) === 'idle' ? 0.4 : 1"
          >{{ d.s }}</text>
        </g>

        <!-- 复元音标签（同起点已按 labelOffset 错开） -->
        <text
          v-for="d in diphLabels"
          :key="d.s"
          :x="px(d.x)" :y="py(d.y)" font-size="11.5" font-style="italic"
          :fill="diffSet && diffSet.sources.has(d.s) ? '#1e7d3c' : '#7f8c8d'"
          role="button" tabindex="0"
          :aria-label="`${describeDiphthong(d.s, d.s.slice(0, 1), lang)}，${t('chart.speak')}`"
          @click="speak(d.s)"
          @keydown.enter.prevent="speak(d.s)"
          @keydown.space.prevent="speak(d.s)"
        >{{ d.s }}</text>

        <!-- A→B 高亮（路径动画 + 目标脉冲） -->
        <template v-if="hasPair && aPos && bPos">
          <line
            :key="animKey || 'pair'"
            :x1="px(aPos.x)" :y1="py(aPos.y)" :x2="px(bPos.x)" :y2="py(bPos.y)"
            stroke="#c0392b" stroke-width="2" marker-end="url(#arr)" pathLength="1" class="path-anim"
          />
          <circle :cx="px(aPos.x)" :cy="py(aPos.y)" r="8" fill="rgba(75,108,183,0.18)" stroke="#4b6cb7" stroke-width="2.5" />
          <circle :cx="px(bPos.x)" :cy="py(bPos.y)" r="8" fill="rgba(231,76,60,0.18)" stroke="#e74c3c" stroke-width="2.5" class="b-pulse" />
        </template>
      </svg>

      <!-- 悬停特征卡 -->
      <div v-if="hovered" class="chart-tip" :style="{ left: hovered.x * 100 + '%', top: hovered.y * 100 + '%' }">
        {{ hovered.text }}
      </div>
    </div>

    <div class="chart-legend">
      <template v-if="diffSet">
        <span class="dot dot-source"></span><span>{{ t('chart.diff.source') }}</span>
        <span class="dot dot-target"></span><span>{{ t('chart.diff.target') }}</span>
      </template>
      <template v-else-if="hasPair">
        <span class="dot dot-a"></span><span>{{ t('chart.a') }}</span>
        <span class="dot dot-b"></span><span>{{ t('chart.b') }}</span>
      </template>
    </div>
  </div>
</template>
