<script setup lang="ts">
import { computed } from 'vue';
import type { GameState } from '@/core';
import { changedText, wordText } from '@/core';
import { TIER_OPTIONS, TYPE_OPTIONS } from '@/config/game';
import { useI18n } from '@/composables/useI18n';

const props = defineProps<{ state: GameState }>();
const { t, lang } = useI18n();

const q = computed(() => props.state.question);
const last = computed(() => props.state.lastResult);
/** 限时模式：答错扣 1 秒（在反馈中明示，避免玩家对时间跳变困惑） */
const timed = computed(() => props.state.settings.timeSec > 0);

const typeName = (id: string) => TYPE_OPTIONS.find((x) => x.id === id)?.[lang.value] ?? id;
const tierName = (id: string) => TIER_OPTIONS.find((x) => x.id === id)?.[lang.value] ?? id;
const ruleName = computed(() => (q.value ? q.value.rule.name[lang.value] : ''));
const ruleDesc = computed(() => (q.value ? q.value.rule.desc[lang.value] : ''));
const tierId = computed(() => (q.value ? q.value.rule.tier : null));
/** 语系倾向说明（同类型在不同语系中的频率/触发差异） */
const familyNote = computed(() => (q.value ? q.value.rule.familyNote[lang.value] : ''));

const envLabel = computed(() => {
  if (!q.value) return '';
  const env = q.value.rule.env;
  if (!env) return t('q.env.none');
  return lang.value === 'zh' ? env.labelZh : env.labelEn;
});

const answerLabel = computed(() => {
  const question = q.value;
  if (!question || !last.value) return '';
  if (question.kind === 'type') return typeName(question.answer);
  if (question.kind === 'freq') return tierName(question.answer);
  if (question.kind === 'system') return '[' + question.answer.join(', ') + ']';
  return '';
});

const systemLines = computed(() => {
  const question = q.value;
  if (!question || question.kind !== 'system') return [];
  const changed = new Set(question.answer);
  return question.words.map((w, i) => {
    const tag = changed.has(i) ? t('fb.changed') : t('fb.unchanged');
    const detail = changed.has(i) ? changedText(question.rule, w).join('；') : wordText(w);
    return '· ' + tag + '：' + detail;
  });
});
</script>

<template>
  <div class="feedback" :class="last ? (last.ok ? 'ok' : 'bad') : ''" role="status" aria-live="polite">
    <template v-if="last && q">
      <div v-if="last.ok" class="fb-line">
        <strong>{{ t('fb.correct') }}</strong> {{ t('fb.answer') }}：{{ answerLabel }}
      </div>
      <div v-else class="fb-line">
        <strong>{{ t('fb.wrong') }}</strong>
      </div>

      <div v-if="!last.ok && timed" class="fb-line penalty">⚠ {{ t('fb.penalty') }}</div>

      <template v-if="last.ok">
        <div class="fb-line">
          <strong>{{ t('fb.type') }}：</strong>{{ typeName(q.rule.type) }}（{{ ruleName }}）
          <span v-if="tierId" class="tier-badge" :class="'tier-' + tierId">{{ tierName(tierId) }}</span>
        </div>
        <div class="fb-line"><strong>{{ t('fb.desc') }}：</strong>{{ ruleDesc }}</div>
        <div class="fb-line"><strong>{{ t('fb.family') }}：</strong>{{ familyNote }}</div>
        <div class="fb-line"><strong>{{ t('fb.example') }}：</strong></div>
        <div v-for="ex in q.rule.examples" :key="ex.text" class="example-card">
          <div class="ex-text">{{ ex.text }}</div>
          <div class="ex-src">{{ lang === 'zh' ? ex.srcZh : ex.srcEn }}</div>
        </div>
        <div v-for="line in systemLines" :key="line" class="fb-line">{{ line }}</div>
        <div class="fb-line"><strong>{{ t('q.env') }}：</strong>{{ envLabel }}</div>
      </template>
      <div v-else-if="q.kind !== 'system'" class="fb-line">
        <strong>{{ t('q.env') }}：</strong>{{ envLabel }}
      </div>
    </template>
  </div>
</template>
