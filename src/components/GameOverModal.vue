<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import type { GameStats, Mistake, Question } from '@/core';
import { wordText } from '@/core';
import { TIER_OPTIONS, TYPE_OPTIONS } from '@/config/game';
import { useI18n } from '@/composables/useI18n';

const props = defineProps<{
  open: boolean;
  stats: GameStats;
  mistakes: Mistake[];
}>();

const emit = defineEmits<{ close: [] }>();
const { t, lang } = useI18n();
const closeBtn = ref<HTMLButtonElement | null>(null);

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

watch(
  () => props.open,
  async (open) => {
    if (open) {
      await nextTick();
      closeBtn.value?.focus();
    }
  }
);

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) emit('close');
}

onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal" @click.self="emit('close')">
      <div class="modal-content" role="dialog" aria-modal="true" aria-label="Game over">
        <h2>{{ t('end.title') }}</h2>
        <div class="final-stats">
          <p>{{ t('stat.correct') }}：<span>{{ stats.correct }}</span></p>
          <p>{{ t('stat.incorrect') }}：<span>{{ stats.incorrect }}</span></p>
          <p>{{ t('stat.total') }}：<span>{{ stats.total }}</span></p>
          <p>{{ t('stat.streak') }}（{{ t('end.bestStreak') }} <span>{{ stats.bestStreak }}</span>）</p>
        </div>
        <h3 class="mistakes-heading">{{ t('end.mistakes') }}</h3>
        <div v-if="mistakes.length === 0" class="no-mistakes">{{ t('end.none') }}</div>
        <div v-else>
          <div v-for="(m, i) in reviewMistakes()" :key="i" class="mistake-item">
            <span class="m-rule">{{ ruleName(m.q) }}</span>：{{ mistakeLine(m) }}
          </div>
        </div>
        <button ref="closeBtn" class="btn close" @click="emit('close')">{{ t('btn.close') }}</button>
      </div>
    </div>
  </Teleport>
</template>
