<script setup lang="ts">
import { computed } from 'vue';
import type { GamePhase, Question } from '@/core';
import { wordText } from '@/core';
import { TIER_OPTIONS, TYPE_OPTIONS } from '@/config/game';
import { useI18n } from '@/composables/useI18n';

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
      <button
        v-for="(w, i) in systemWords"
        :key="i"
        class="opt-btn sys-word"
        :class="{ selected: selection.has(i) }"
        :disabled="disabled(phase)"
        @click="emit('toggle', i)"
      >
        {{ wordText(w) }}
      </button>
      <button class="btn start" :disabled="disabled(phase)" @click="emit('submit')">{{ t('btn.submit') }}</button>
    </template>
  </div>
</template>
