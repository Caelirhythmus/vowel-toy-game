<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import type { GameStats, Mistake, Question } from '@/core';
import { wordText } from '@/core';
import { TIER_OPTIONS, TYPE_OPTIONS } from '@/config/game';
import { loadHistory } from '@/services/storage';
import { useI18n } from '@/composables/useI18n';

const props = defineProps<{
  open: boolean;
  stats: GameStats;
  mistakes: Mistake[];
}>();

const emit = defineEmits<{ close: []; restart: [] }>();
const { t, lang } = useI18n();
const closeBtn = ref<HTMLButtonElement | null>(null);
const modalRef = ref<HTMLElement | null>(null);

const typeName = (id: string) => TYPE_OPTIONS.find((x) => x.id === id)?.[lang.value] ?? id;
const tierName = (id: string) => TIER_OPTIONS.find((x) => x.id === id)?.[lang.value] ?? id;
const ruleName = (q: Question) => q.rule.name[lang.value];

const reviewMistakes = () => props.mistakes.slice(-10).reverse();

function mistakeLine(m: Mistake): string {
  const question = m.q;
  if (question.kind === 'type') {
    return `${wordText(question.wordA)} → ${wordText(question.wordB)}（${t('fb.your')}：${typeName(String(m.chosen))}；${t('fb.answer')}：${typeName(question.answer)}）`;
  }
  if (question.kind === 'freq') {
    return `${wordText(question.wordA)} → ${wordText(question.wordB)}（${t('fb.your')}：${tierName(String(m.chosen))}；${t('fb.answer')}：${tierName(question.answer)}）`;
  }
  if (question.kind === 'system') {
    const chosen = Array.isArray(m.chosen) ? m.chosen.join(', ') : String(m.chosen);
    return `[${chosen}] / [${question.answer.join(', ')}]`;
  }
  return '';
}

/* ---------- 统计增强：正确率 + 历史最佳连对 ---------- */
const accuracy = computed(() =>
  props.stats.total > 0 ? Math.round((props.stats.correct / props.stats.total) * 100) : 0
);

/** 弹窗打开时读取历史（此时本局已 append 进 history，末条即本局） */
const history = ref<ReturnType<typeof loadHistory>>([]);
const histBest = computed(() => history.value.reduce((m, e) => Math.max(m, e.bestStreak), 0));
const isNewRecord = computed(() => {
  const prev = history.value.slice(0, -1).reduce((m, e) => Math.max(m, e.bestStreak), 0);
  return props.stats.bestStreak > 0 && props.stats.bestStreak > prev;
});

/* ---------- 焦点管理：陷阱 + 恢复；背景滚动锁定 ---------- */
let prevFocus: HTMLElement | null = null;

watch(
  () => props.open,
  async (open) => {
    if (open) {
      prevFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      history.value = loadHistory();
      document.body.style.overflow = 'hidden';
      await nextTick();
      closeBtn.value?.focus();
    } else {
      document.body.style.overflow = '';
      prevFocus?.focus?.();
      prevFocus = null;
    }
  }
);

function trapFocus(e: KeyboardEvent) {
  if (e.key !== 'Tab' || !modalRef.value) return;
  const focusables = modalRef.value.querySelectorAll<HTMLElement>(
    'button, [href], [tabindex]:not([tabindex="-1"])'
  );
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function onKey(e: KeyboardEvent) {
  if (!props.open) return;
  if (e.key === 'Escape') emit('close');
  trapFocus(e);
}

onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => {
  window.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal" @click.self="emit('close')">
      <div ref="modalRef" class="modal-content" role="dialog" aria-modal="true" :aria-label="t('end.title')">
        <h2>{{ t('end.title') }}</h2>
        <div class="final-stats">
          <p>{{ t('stat.correct') }}：<span>{{ stats.correct }}</span></p>
          <p>{{ t('stat.incorrect') }}：<span>{{ stats.incorrect }}</span></p>
          <p>{{ t('stat.total') }}：<span>{{ stats.total }}</span></p>
          <p>{{ t('end.accuracy') }}：<span>{{ accuracy }}%</span></p>
          <p>{{ t('stat.streak') }}（{{ t('end.bestStreak') }} <span>{{ stats.bestStreak }}</span>）</p>
          <p class="hist-best">
            {{ t('end.histBest') }}：<span>{{ histBest }}</span>
            <span v-if="isNewRecord" class="new-record">🏆 {{ t('end.newRecord') }}</span>
          </p>
        </div>
        <h3 class="mistakes-heading">{{ t('end.mistakes') }}</h3>
        <div v-if="mistakes.length === 0" class="no-mistakes">{{ t('end.none') }}</div>
        <div v-else>
          <div v-for="(m, i) in reviewMistakes()" :key="i" class="mistake-item">
            <span class="m-rule">{{ ruleName(m.q) }}</span>：{{ mistakeLine(m) }}
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn again" @click="emit('restart')">{{ t('end.playAgain') }}</button>
          <button ref="closeBtn" class="btn close" @click="emit('close')">{{ t('btn.close') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
