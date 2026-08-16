/* ============================================================
 * composables：useTierColor —— 频率徽章配色方案（持久化）
 * 机制：<html data-tier-color='violet|mono|...'>；
 * CSS 规则限定 [data-theme='sky']，非 sky 主题自动用各自默认
 * ============================================================ */
import { computed, ref } from 'vue';
import {
  DEFAULT_TIER_COLOR,
  tierColorById,
  type TierColorId
} from '@/config/tierColors';
import { STORAGE_KEYS, loadJSON, saveJSON } from '@/services/storage';

function loadColor(): TierColorId {
  const saved = loadJSON<{ color?: string }>(STORAGE_KEYS.tierColor, { color: DEFAULT_TIER_COLOR });
  return tierColorById(saved.color ?? '') ? (saved.color as TierColorId) : DEFAULT_TIER_COLOR;
}

const color = ref<TierColorId>(loadColor());

function applyDom() {
  document.documentElement.dataset.tierColor = color.value;
}

// 初始同步：持久化配色刷新后立即生效
if (typeof document !== 'undefined') applyDom();

export function useTierColor() {
  const current = computed(() => tierColorById(color.value)!);

  function setColor(id: TierColorId) {
    color.value = id;
    saveJSON(STORAGE_KEYS.tierColor, { color: id });
    applyDom();
  }

  return { color, current, setColor };
}
