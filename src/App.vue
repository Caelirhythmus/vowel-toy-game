<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useGame } from '@/composables/useGame';
import { useI18n } from '@/composables/useI18n';
import { useCompactLayout } from '@/composables/useViewport';
import { speechService } from '@/services/audio';
import { applicablePositions, applyRule, wordText } from '@/core';
import LangToggle from '@/components/LangToggle.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
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
const { compact } = useCompactLayout();

/* ---------- 信息分层：手机上次要内容折叠成入口 ---------- */
/** 紧凑模式（手机）下：元音图默认折叠；桌面常显 */
const chartOpen = ref(false);
/** 速查表：桌面默认展开、手机默认折叠（用户手动切换后保持） */
const sheetOpen = ref(!compact.value);

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

/** 手机上答对系统题时自动展开元音图，让 diff 高亮可见 */
watch(diff, (d) => {
  if (compact.value && d) chartOpen.value = true;
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
  <!-- 玻璃拟态背景装饰层：fixed 彩色光斑 + 漂浮粒子，为 backdrop-filter 提供"可糊之物"（见 styles/main.css） -->
  <div class="bg-decor" aria-hidden="true">
    <span class="blob blob-1"></span>
    <span class="blob blob-2"></span>
    <span class="blob blob-3"></span>
    <span class="blob blob-4"></span>
    <span class="blob blob-5"></span>
    <span class="blob blob-6"></span>
    <span class="particle particle-1"></span>
    <span class="particle particle-2"></span>
    <span class="particle particle-3"></span>
  </div>

  <div class="container">
    <header>
      <div class="header-row">
        <div class="header-text">
          <h1>{{ t('app.title') }}</h1>
          <p class="subtitle">{{ t('app.subtitle') }}</p>
        </div>
        <div class="header-actions">
          <ThemeToggle />
          <LangToggle />
        </div>
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
          <!-- 手机：元音图折叠成开关条，点开查看（答对系统题时自动展开） -->
          <template v-if="compact">
            <button class="info-toggle chart-toggle" :aria-expanded="chartOpen" @click="chartOpen = !chartOpen">
              <span>📊 {{ t('chart.title') }}</span>
              <span aria-hidden="true">{{ chartOpen ? '▴' : '▾' }}</span>
            </button>
            <div v-show="chartOpen" class="chart-collapse-body">
              <VowelChart :a="pair ? pair.a : null" :b="pair ? pair.b : null" :anim-key="pairKey" :diff="diff" />
            </div>
          </template>
          <!-- 桌面：图表常驻 -->
          <VowelChart v-else :a="pair ? pair.a : null" :b="pair ? pair.b : null" :anim-key="pairKey" :diff="diff" />
        </aside>
      </div>
    </section>

    <section class="info">
      <ModelNotes />
      <button class="info-toggle" :aria-expanded="sheetOpen" @click="sheetOpen = !sheetOpen">
        <span>{{ t('info.types') }}</span>
        <span aria-hidden="true">{{ sheetOpen ? '▴' : '▾' }}</span>
      </button>
      <div v-show="sheetOpen">
        <CheatSheet />
      </div>
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
