/* ============================================================
 * composables：useTheme —— 主题状态（持久化）+ 切换
 * 切换机制：<html data-theme='<id>'>，CSS 变量组随之生效；
 * 同步 meta[name=theme-color]（浏览器 UI 着色）
 * ============================================================ */
import { computed, ref } from 'vue';
import { DEFAULT_THEME, THEMES, themeById, type ThemeId } from '@/config/themes';
import { STORAGE_KEYS, loadJSON, saveJSON } from '@/services/storage';

function loadTheme(): ThemeId {
  const saved = loadJSON<{ theme?: string }>(STORAGE_KEYS.theme, { theme: DEFAULT_THEME });
  return themeById(saved.theme ?? '') ? (saved.theme as ThemeId) : DEFAULT_THEME;
}

const theme = ref<ThemeId>(loadTheme());

function applyDom() {
  document.documentElement.dataset.theme = theme.value;
  // 同步浏览器 UI 着色（地址栏/标签栏背景，随主题强调色变化）
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) {
    const def = themeById(theme.value);
    meta.content = def ? THEME_COLOR[theme.value] : '#3d7edb';
  }
}

/** 各主题的浏览器 UI 着色（与 main.css 中 glass-header 深端同族） */
const THEME_COLOR: Record<ThemeId, string> = {
  sky: '#1e3a6e',
  dawn: '#7c3f1d',
  mint: '#155e47',
  lavender: '#43308a'
};

// 初始同步：持久化主题刷新后立即生效（避免首帧闪默认主题）
if (typeof document !== 'undefined') applyDom();

export function useTheme() {
  const current = computed(() => themeById(theme.value)!);

  /** 循环切换：sky → dawn → mint → lavender → sky */
  function cycle() {
    const idx = THEMES.findIndex((t) => t.id === theme.value);
    const next = THEMES[(idx + 1) % THEMES.length].id;
    setTheme(next);
  }

  function setTheme(id: ThemeId) {
    theme.value = id;
    saveJSON(STORAGE_KEYS.theme, { theme: id });
    applyDom();
  }

  return { theme, current, setTheme, cycle };
}
