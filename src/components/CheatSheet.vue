<script setup lang="ts">
import { computed } from 'vue';
import { RULES } from '@/config/rules';
import { TIER_OPTIONS, TYPE_OPTIONS } from '@/config/game';
import { FAMILIES, ruleExcludedFor, ruleTierFor } from '@/config/families';
import { useI18n } from '@/composables/useI18n';
import { useGame } from '@/composables/useGame';
import TierColorPicker from './TierColorPicker.vue';
import TierStyleToggle from './TierStyleToggle.vue';

const { t, lang } = useI18n();
const game = useGame();
const tierName = (id: string) => TIER_OPTIONS.find((x) => x.id === id)?.[lang.value] ?? id;

/** 当前语系（非泛语系时显示上下文提示） */
const famDef = computed(() => {
  const f = game.state.settings.family;
  return f !== 'generic' ? (FAMILIES[f as keyof typeof FAMILIES] ?? null) : null;
});

/**
 * 按【规则】展开（而非按类型聚合）：一行一条规则。
 * 语系模式：只显示该语系可出题的规则（familyExcluded 过滤），
 * 档位/示例按语系取值（familyTiers / familyExamples），与题目一致。
 */
const rows = computed(() => {
  const f = game.state.settings.family;
  return TYPE_OPTIONS.flatMap((type) =>
    RULES.filter((r) => r.type === type.id && !ruleExcludedFor(r, f)).map((r) => {
      const ex =
        f !== 'generic' && r.familyExamples?.[f] ? r.familyExamples[f] : r.examples;
      return {
        type: type[lang.value],
        rule: r.name[lang.value],
        ex: ex.map((e) => e.text).join('、') || '—',
        env: r.env ? (lang.value === 'zh' ? r.env.labelZh : r.env.labelEn) : t('q.env.none'),
        tier: ruleTierFor(r, f),
        family: r.familyNote[lang.value]
      };
    })
  );
});
</script>

<template>
  <div v-if="famDef" class="cheatsheet-context">
    {{ t('set.family') }}：{{ t(famDef.labelKey) }}（{{ lang === 'zh' ? famDef.periodZh : famDef.periodEn }}）· {{ t('cheat.familyScope') }}
  </div>
  <!-- 频率底色调节：控制下方表格与答题反馈中档位徽章的配色/形态 -->
  <div class="tier-toolbar">
    <span class="tier-toolbar-label">{{ t('tier.toolbar') }}</span>
    <TierColorPicker />
    <TierStyleToggle />
  </div>
  <table class="cheatsheet">
    <thead>
      <tr>
        <th>{{ t('fb.type') }}</th>
        <th>{{ t('set.rule') }}</th>
        <th>示例 · Examples</th>
        <th>{{ t('q.env') }}</th>
        <th>{{ t('fb.tier') }}</th>
        <th>{{ t('fb.family') }}</th>
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
        <td class="family-note">{{ row.family }}</td>
      </tr>
    </tbody>
  </table>
</template>
