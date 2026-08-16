<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useGame } from '@/composables/useGame';
import { useI18n } from '@/composables/useI18n';
import { speechService } from '@/services/audio';
import LangToggle from '@/components/LangToggle.vue';
import SettingsPanel from '@/components/SettingsPanel.vue';
import TimerBar from '@/components/TimerBar.vue';
import QuestionArea from '@/components/QuestionArea.vue';
import StatsBar from '@/components/StatsBar.vue';
import ModelNotes from '@/components/ModelNotes.vue';
import CheatSheet from '@/components/CheatSheet.vue';
import GameOverModal from '@/components/GameOverModal.vue';

const game = useGame();
const { t } = useI18n();

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
      <SettingsPanel />
      <TimerBar />
      <QuestionArea />
      <StatsBar :stats="game.state.stats" />
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
