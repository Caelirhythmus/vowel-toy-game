<script setup lang="ts">
import { computed } from 'vue';
import { useGame } from '@/composables/useGame';
import { useI18n } from '@/composables/useI18n';
import { applicablePositions, applyRule, wordText } from '@/core';
import type { Word } from '@/core';
import { speechService } from '@/services/audio';
import VowelChart from './VowelChart.vue';
import OptionsPanel from './OptionsPanel.vue';
import FeedbackCard from './FeedbackCard.vue';

const game = useGame();
const { t, lang } = useI18n();

function speakWord(word: Word) {
  void speechService.playWord(word);
}

const q = computed(() => game.state.question);
const pair = computed(() =>
  q.value && q.value.kind !== 'system'
    ? { a: q.value.wordA.v[q.value.pos], b: q.value.wordB.v[q.value.pos] }
    : null
);
/** 词对标识：换题时重新触发路径动画 */
const pairKey = computed(() => {
  const question = q.value;
  if (!question || question.kind === 'system') return '';
  return wordText(question.wordA) + '→' + wordText(question.wordB);
});
/** 系统题 diff：答对后按词表统计实际变化的源/目标元音 */
const diff = computed(() => {
  const question = q.value;
  if (!question || question.kind !== 'system' || !game.state.lastResult?.ok) return null;
  const sources = new Set<string>();
  const targets = new Set<string>();
  question.answer.forEach((idx) => {
    const w = question.words[idx];
    applicablePositions(question.rule, w).forEach((p) => {
      sources.add(w.v[p].s);
      const out = applyRule(question.rule, w, p as 0 | 1);
      if (out) targets.add(out.v[p as 0 | 1].s);
    });
  });
  return { sources: [...sources], targets: [...targets] };
});
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
        <h3>A <button v-if="speakSupported" class="mini-btn" :title="t('btn.speak.note')" @click="speakWord(q.wordA)">{{ t('btn.speak') }}</button></h3>
        <div class="word">{{ wordText(q.wordA) }}</div>
      </div>
      <div class="arrow">→</div>
      <div class="word-box b">
        <h3>B <button v-if="speakSupported" class="mini-btn" :title="t('btn.speak.note')" @click="speakWord(q.wordB)">{{ t('btn.speak') }}</button></h3>
        <div class="word">{{ wordText(q.wordB) }}</div>
      </div>
    </div>

    <VowelChart :a="pair ? pair.a : null" :b="pair ? pair.b : null" :anim-key="pairKey" :diff="diff" />

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
