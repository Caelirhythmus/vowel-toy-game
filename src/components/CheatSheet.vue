<script setup lang="ts">
import { computed } from 'vue';
import { RULES } from '@/config/rules';
import { TIER_OPTIONS, TYPE_OPTIONS } from '@/config/game';
import { useI18n } from '@/composables/useI18n';

const { t, lang } = useI18n();
const tierName = (id: string) => TIER_OPTIONS.find((x) => x.id === id)?.[lang.value] ?? id;

const rows = computed(() =>
  TYPE_OPTIONS.map((type) => {
    const rules = RULES.filter((r) => r.type === type.id);
    const ex = rules.map((r) => r.examples.map((e) => e.text).join('、')).join('；') || '—';
    const env = rules.map((r) => (r.env ? (lang.value === 'zh' ? r.env.labelZh : r.env.labelEn) : t('q.env.none'))).join(' / ') || '—';
    const tier = rules[0]?.tier ?? null;
    return { type: type[lang.value], ex, env, tier };
  })
);
</script>

<template>
  <table class="cheatsheet">
    <thead>
      <tr>
        <th>{{ t('fb.type') }}</th>
        <th>示例 · Examples</th>
        <th>{{ t('q.env') }}</th>
        <th>{{ t('fb.tier') }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row.type">
        <td>{{ row.type }}</td>
        <td>{{ row.ex }}</td>
        <td>{{ row.env }}</td>
        <td>
          <span v-if="row.tier" class="tier-badge" :class="'tier-' + row.tier">{{ tierName(row.tier) }}</span>
          <span v-else>—</span>
        </td>
      </tr>
    </tbody>
  </table>
</template>
