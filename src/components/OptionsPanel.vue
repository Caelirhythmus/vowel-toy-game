<script setup lang="ts">
import { computed } from 'vue';
import type { GamePhase, Question, Word } from '@/core';
import { wordText } from '@/core';
import { TIER_OPTIONS, TYPE_OPTIONS } from '@/config/game';
import { useI18n } from '@/composables/useI18n';
import { speechService } from '@/services/audio';

const props = defineProps<{
  question: Question;
  phase: GamePhase;
  selection: Set<number>;
}>();

const emit = defineEmits<{
  answer: [value: string];
  toggle: [index: number];
  submit: [];
}>();

const { t, lang } = useI18n();
const disabled = (phase: GamePhase) => phase !== 'playing';

// 模板内联判别式收窄在 vue-tsc 下不可靠，脚本内收窄一次
const isSystem = computed(() => props.question.kind === 'system');
const systemWords = computed(() =>
  props.question.kind === 'system' ? props.question.words : []
);

/** 系统题每个词都可点读（与词对题的发音按钮同一链路） */
const speakSupported = speechService.supported();
function speakWord(word: Word) {
  void speechService.playWord(word);
}
</script>

<template>
  <div class="options">
    <template v-if="question.kind === 'type'">
      <button v-for="o in TYPE_OPTIONS" :key="o.id" class="opt-btn" :disabled="disabled(phase)" @click="emit('answer', o.id)">
        {{ o[lang] }}
      </button>
    </template>
    <template v-else-if="question.kind === 'freq'">
      <button v-for="o in TIER_OPTIONS" :key="o.id" class="opt-btn" :disabled="disabled(phase)" @click="emit('answer', o.id)">
        {{ o[lang] }}
      </button>
    </template>
    <template v-else-if="isSystem">
      <div class="sys-list">
        <div v-for="(w, i) in systemWords" :key="i" class="sys-row">
          <button
            class="opt-btn sys-word"
            :class="{ selected: selection.has(i) }"
            :disabled="disabled(phase)"
            :aria-pressed="selection.has(i)"
            @click="emit('toggle', i)"
          >
            {{ wordText(w) }}
          </button>
          <button
            v-if="speakSupported"
            class="sys-speak"
            :title="t('btn.speak.note')"
            :aria-label="`${t('btn.speak')} ${wordText(w)}`"
            @click="speakWord(w)"
          >
            🔊
          </button>
        </div>
      </div>
      <div class="sys-footer" v-if="phase === 'playing'">
        <span class="sys-count">{{ t('sys.selected', { n: selection.size }) }}</span>
        <button class="btn start" :disabled="selection.size === 0" @click="emit('submit')">{{ t('btn.submit') }}</button>
      </div>
    </template>
  </div>
</template>
