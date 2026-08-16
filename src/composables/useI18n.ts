/* ============================================================
 * composables：useI18n —— 语言状态（持久化）+ 文案取用
 * ============================================================ */
import { ref } from 'vue';
import type { Lang } from '@/core';
import { t as coreT, type I18nKey } from '@/core';
import { STORAGE_KEYS, loadJSON, saveJSON } from '@/services/storage';

function loadLang(): Lang {
  const saved = loadJSON<{ lang?: Lang }>(STORAGE_KEYS.lang, { lang: 'zh' });
  return saved.lang === 'en' ? 'en' : 'zh';
}

const lang = ref<Lang>(loadLang());

function applyDom() {
  document.documentElement.lang = lang.value;
  // en 的 app.title 即 "Vowel Change Lab"，不再拼接后缀（避免重复）
  const title = coreT('app.title', lang.value);
  document.title = lang.value === 'en' ? title : `${title} · Vowel Change Lab`;
}

// 初始同步：持久化语言（上次选了 en）刷新后立即反映到 <html lang> 与 <title>
if (typeof document !== 'undefined') applyDom();

export function useI18n() {
  function setLang(l: Lang) {
    lang.value = l;
    saveJSON(STORAGE_KEYS.lang, { lang: l });
    applyDom();
  }

  function toggleLang() {
    setLang(lang.value === 'zh' ? 'en' : 'zh');
  }

  /** 取文案；vars 用于 {key} 插值 */
  function t(key: I18nKey, vars?: Record<string, string | number>): string {
    return coreT(key, lang.value, vars);
  }

  return { lang, t, setLang, toggleLang };
}
