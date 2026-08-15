<script setup lang="ts">
import { computed } from 'vue';
import { useGame } from '@/composables/useGame';
import { useI18n } from '@/composables/useI18n';
import { wordText } from '@/core';
import { speechService } from '@/services/audio';
import VowelChart from './VowelChart.vue';
import OptionsPanel from './OptionsPanel.vue';
import FeedbackCard from './FeedbackCard.vue';

const game = useGame();
const { t, lang } = useI18n();

const q = computed(() => game.state.question);
const pair = computed(() =>
  q.value && q.value.kind !== 'system'
    ? { a: q.value.wordA.v[q.value.pos], b: q.value.wordB.v[q.value.pos] }
    : null
);
const prompt = computed(() => {
  const question = q.value;
  if (!question) return '';
  if (question.kind === 'type') return t('q.type.prompt');
  if (question.kind === 'freq') return t('q.freq.prompt');
  return t('q.system.prompt', { rule: question.rule.name[lang.value] });
});
const speakSupported = speechService.supported();
</script>

<template>
  <div class="question-area">
    <p class="prompt">{{ prompt }}</p>

    <div v-if="q && q.kind !== 'system'" class="words">
      <div class="word-box a">
        <h3>A <button v-if="speakSupported" class="mini-btn" @click="speechService.speak(wordText(q.wordA))">{{ t('btn.speak') }}</button></h3>
        <div class="word">{{ wordText(q.wordA) }}</div>
      </div>
      <div class="arrow">→</div>
      <div class="word-box b">
        <h3>B <button v-if="speakSupported" class="mini-btn" @click="speechService.speak(wordText(q.wordB))">{{ t('btn.speak') }}</button></h3>
        <div class="word">{{ wordText(q.wordB) }}</div>
      </div>
    </div>

    <VowelChart :a="pair ? pair.a : null" :b="pair ? pair.b : null" />

    <OptionsPanel
      v-if="q"
      :question="q"
      :phase="game.state.phase"
      :selection="game.selection"
      @answer="game.answerOpt"
      @toggle="game.toggleWord"
      @submit="game.submitSystem"
    />

    <FeedbackCard :state="game.state" />
  </div>
</template>
