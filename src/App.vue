<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useGame } from '@/composables/useGame';
import { useI18n } from '@/composables/useI18n';
import { speechService } from '@/services/audio';
import { applicablePositions, applyRule, wordText } from '@/core';
import LangToggle from '@/components/LangToggle.vue';
import SettingsPanel from '@/components/SettingsPanel.vue';
import TimerBar from '@/components/TimerBar.vue';
import QuestionArea from '@/components/QuestionArea.vue';
import StatsBar from '@/components/StatsBar.vue';
import VowelChart from '@/components/VowelChart.vue';
import ModelNotes from '@/components/ModelNotes.vue';
import CheatSheet from '@/components/CheatSheet.vue';
import GameOverModal from '@/components/GameOverModal.vue';

const game = useGame();
const { t } = useI18n();

/* ---------- 元音图数据（图表位于页面级右栏，数据在此汇总） ---------- */
const pair = computed(() => {
  const question = game.state.question;
  if (!question || question.kind === 'system') return null;
  return { a: question.wordA.v[question.pos], b: question.wordB.v[question.pos] };
});
/** 词对标识：换题时重新触发路径动画 */
const pairKey = computed(() => {
  const question = game.state.question;
  if (!question || question.kind === 'system') return '';
  return wordText(question.wordA) + '→' + wordText(question.wordB);
});
/** 系统题 diff：答对后按词表统计实际变化的源/目标元音 */
const diff = computed(() => {
  const question = game.state.question;
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

let tickTimer: number | null = null;

onMounted(() => {
  tickTimer = window.setInterval(() => game.tick(), 250);
  // 页面打开即后台预热发音主引擎（Piper 模型下载/加载），
  // 用户首次点“发音”时通常已就绪，无需干等
  speechService.warmup();
});
onUnmounted(() => {
  if (tickTimer !== null) clearInterval(tickTimer);
  game.dispose();
});
</script>

<template>
  <div class="container">
    <header>
      <div class="header-row">
        <div class="header-text">
          <h1>{{ t('app.title') }}</h1>
          <p class="subtitle">{{ t('app.subtitle') }}</p>
        </div>
        <LangToggle />
      </div>
    </header>

    <section class="game-area">
      <div class="game-layout">
        <div class="game-loop">
          <SettingsPanel />
          <TimerBar />
          <QuestionArea />
        </div>
        <aside class="game-side">
          <StatsBar :stats="game.state.stats" />
          <VowelChart :a="pair ? pair.a : null" :b="pair ? pair.b : null" :anim-key="pairKey" :diff="diff" />
        </aside>
      </div>
    </section>

    <section class="info">
      <ModelNotes />
      <details open>
        <summary>{{ t('info.types') }}</summary>
        <CheatSheet />
      </details>
      <details>
        <summary>{{ t('refs.title') }}</summary>
        <ul class="refs">
          <li>王力《汉语史稿》《汉语语音史》（元音高化倾向）</li>
          <li>
            Wikipedia:
            <a href="https://en.wikipedia.org/wiki/Great_Vowel_Shift" rel="noopener" target="_blank">Great Vowel Shift</a>、
            <a href="https://en.m.wikipedia.org/wiki/I-umlaut" rel="noopener" target="_blank">Germanic i-umlaut</a>、
            <a href="https://en.wikipedia.org/wiki/Vowel_reduction" rel="noopener" target="_blank">Vowel reduction</a>、
            <a href="https://en.wikipedia.org/wiki/Germanic_language_group" rel="noopener" target="_blank">Germanic languages (a-mutation)</a>
          </li>
          <li>Oxford Phonetics: <a href="https://www.phon.ox.ac.uk/jcoleman/CardinalVowels.htm" rel="noopener" target="_blank">Cardinal Vowels</a></li>
          <li>语音学误区研究：<code>docs/phonetics-misconceptions-and-refactor.md</code>；后续跟进分析：<code>docs/followup-analysis.md</code></li>
        </ul>
      </details>
    </section>

    <GameOverModal
      :open="game.modalOpen"
      :stats="game.state.stats"
      :mistakes="game.state.mistakes"
      @close="game.closeModal"
      @restart="game.start"
    />
  </div>
</template>
