/* ============================================================
 * composables：useTierStyle —— 频率徽章风格（持久化）
 * 机制：<html data-tier-style='user|glass|dot|outline'>；
 * CSS 规则限定 [data-theme='sky']，非 sky 主题自动用各自默认
 * ============================================================ */
import { ref } from 'vue';
import {
  DEFAULT_TIER_STYLE,
  tierStyleById,
  type TierStyleId
} from '@/config/tierStyles';
import { STORAGE_KEYS, loadJSON, saveJSON } from '@/services/storage';

function loadStyle(): TierStyleId {
  const saved = loadJSON<{ style?: string }>(STORAGE_KEYS.tierStyle, { style: DEFAULT_TIER_STYLE });
  return tierStyleById(saved.style ?? '') ? (saved.style as TierStyleId) : DEFAULT_TIER_STYLE;
}

const style = ref<TierStyleId>(loadStyle());

function applyDom() {
  document.documentElement.dataset.tierStyle = style.value;
}

// 初始同步：持久化风格刷新后立即生效
if (typeof document !== 'undefined') applyDom();

export function useTierStyle() {
  function setStyle(id: TierStyleId) {
    style.value = id;
    saveJSON(STORAGE_KEYS.tierStyle, { style: id });
    applyDom();
  }

  return { style, setStyle };
}
