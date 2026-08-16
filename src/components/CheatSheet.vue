<script setup lang="ts">
import { computed } from 'vue';
import { RULES } from '@/config/rules';
import { TIER_OPTIONS, TYPE_OPTIONS } from '@/config/game';
import { useI18n } from '@/composables/useI18n';

const { t, lang } = useI18n();
const tierName = (id: string) => TIER_OPTIONS.find((x) => x.id === id)?.[lang.value] ?? id;

/**
 * 按【规则】展开（而非按类型聚合）：一行一条规则。
 * 此前按类型聚合时频率列只取该类型第一条规则的档位——
 * 低化类有「a-mutation 型=典型」与「无条件=罕见」两条规则，
 * 表格却只显示“典型”，与频率题（分层抽样后三档均衡）互相矛盾。
 */
const rows = computed(() =>
  TYPE_OPTIONS.flatMap((type) =>
    RULES.filter((r) => r.type === type.id).map((r) => ({
      type: type[lang.value],
      rule: r.name[lang.value],
      ex: r.examples.map((e) => e.text).join('、') || '—',
      env: r.env ? (lang.value === 'zh' ? r.env.labelZh : r.env.labelEn) : t('q.env.none'),
      tier: r.tier
    }))
  )
);
</script>

<template>
  <table class="cheatsheet">
    <thead>
      <tr>
        <th>{{ t('fb.type') }}</th>
        <th>{{ t('set.rule') }}</th>
        <th>示例 · Examples</th>
        <th>{{ t('q.env') }}</th>
        <th>{{ t('fb.tier') }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row.type + row.rule">
        <td>{{ row.type }}</td>
        <td class="rule-name">{{ row.rule }}</td>
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
