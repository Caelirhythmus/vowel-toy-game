<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useGame } from '@/composables/useGame';
import { useI18n } from '@/composables/useI18n';
import { useSpeech } from '@/composables/useSpeech';
import { wordText } from '@/core';
import type { Word } from '@/core';
import { speechService } from '@/services/audio';
import OptionsPanel from './OptionsPanel.vue';
import FeedbackCard from './FeedbackCard.vue';

const game = useGame();
const { t, lang } = useI18n();
const { status: piperStatus, progress: piperProgress, phase: piperPhase, error: piperError } = useSpeech();

function speakWord(word: Word) {
  void speechService.playWord(word);
}

/** 发音按钮悬停说明：加载失败给出原因；加载中说明点击为近似朗读 */
const speakTitle = computed(() => {
  if (piperStatus.value === 'loading') return t('btn.speak.loading.note');
  if (piperStatus.value === 'error' && piperError.value) {
    return `Piper 加载失败：${piperError.value}（已回退近似合成）`;
  }
  return t('btn.speak.note');
});

/** 发音按钮文案：加载中提示（下载阶段含进度；初始化阶段独立文案）/ 主引擎不可用时标注回退 */
const speakLabel = computed(() => {
  if (piperStatus.value === 'loading') {
    // init 阶段：资源已就绪，正在编译/解析（无进度可报），用独立文案避免“100% 假进度”观感
    if (piperPhase.value === 'init') return t('btn.speak.init');
    if (piperProgress.value != null) return t('btn.speak.loading.pct', { pct: piperProgress.value });
    return t('btn.speak.loading');
  }
  if (piperStatus.value === 'error') return t('btn.speak.fallback');
  return t('btn.speak');
});

const q = computed(() => game.state.question);
const prompt = computed(() => {
  const question = q.value;
  if (!question) return '';
  if (question.kind === 'type') return t('q.type.prompt');
  if (question.kind === 'freq') return t('q.freq.prompt');
  return t('q.system.prompt', { rule: question.rule.name[lang.value] });
});
const speakSupported = speechService.supported();

/* ---------- 换题自动回到题目区：新题出现时用户可能正停在页面底部 ----------
 * 注意两点：
 * 1) 题目区顶部已在视口上半部时不滚动——避免点「开始」时页面突兀跳动；
 * 2) 滚动对齐位置（scroll-margin-top）必须留出 sticky 计时条的高度，
 *    否则计时条被钉在视口顶部时会盖住题目提示文本。
 */
const areaEl = ref<HTMLElement | null>(null);
const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

watch(
  () => game.state.question,
  () => {
    void nextTick(() => {
      const el = areaEl.value;
      if (!el || typeof window === 'undefined') return;
      const r = el.getBoundingClientRect();
      // 题目区顶部已在视口内（上半部）：无需滚动，保持用户当前位置
      if (r.top >= 0 && r.top <= window.innerHeight * 0.5) return;
      try {
        el.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
      } catch {
        /* 测试环境等无 scrollIntoView 实现时静默 */
      }
    });
  }
);
</script>

<template>
  <div ref="areaEl" class="question-area">
    <p v-if="prompt" class="prompt">{{ prompt }}</p>

    <div v-if="!q" class="idle-hint">
      <h2>{{ t('idle.hint.title') }}</h2>
      <ul>
        <li>{{ t('idle.hint.line1') }}</li>
        <li>{{ t('idle.hint.line2') }}</li>
        <li>{{ t('idle.hint.line3') }}</li>
      </ul>
    </div>

    <div v-if="q && q.kind !== 'system'" class="words">
      <div class="word-box a">
        <h3>A <button v-if="speakSupported" class="mini-btn" :title="speakTitle" @click="speakWord(q.wordA)">{{ speakLabel }}</button></h3>
        <div class="word">{{ wordText(q.wordA) }}</div>
      </div>
      <div class="arrow">→</div>
      <div class="word-box b">
        <h3>B <button v-if="speakSupported" class="mini-btn" :title="speakTitle" @click="speakWord(q.wordB)">{{ speakLabel }}</button></h3>
        <div class="word">{{ wordText(q.wordB) }}</div>
      </div>
    </div>

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

    <div v-if="q && game.state.phase === 'answered'" class="next-bar">
      <span>{{ t('fb.autoNext') }}</span>
      <button class="btn next" @click="game.nextQuestion()">{{ t('btn.next') }}</button>
    </div>
  </div>
</template>
