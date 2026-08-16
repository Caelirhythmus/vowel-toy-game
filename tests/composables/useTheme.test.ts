import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEMES, DEFAULT_THEME } from '@/config/themes';

type ThemeApi = ReturnType<typeof import('@/composables/useTheme')['useTheme']>;

/* useTheme 是模块级单例：每用例 resetModules 重建（含 document 属性同步） */
async function freshTheme(): Promise<ThemeApi> {
  vi.resetModules();
  const mod = await import('@/composables/useTheme');
  return mod.useTheme();
}

describe('主题配置数据', () => {
  it('主题注册表：id 唯一、文案齐全、默认主题在册', () => {
    const ids = THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of THEMES) {
      expect(t.labelZh.length).toBeGreaterThan(0);
      expect(t.labelEn.length).toBeGreaterThan(0);
      expect(t.icon.length).toBeGreaterThan(0);
    }
    expect(ids).toContain(DEFAULT_THEME);
  });
});

describe('useTheme 主题切换', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('默认主题：无持久化时为 DEFAULT_THEME，且同步到 html data-theme', async () => {
    const theme = await freshTheme();
    expect(theme.theme.value).toBe(DEFAULT_THEME);
    expect(document.documentElement.dataset.theme).toBe(DEFAULT_THEME);
  });

  it('setTheme：更新属性 + 持久化 localStorage', async () => {
    const theme = await freshTheme();
    theme.setTheme('dawn');
    expect(theme.theme.value).toBe('dawn');
    expect(document.documentElement.dataset.theme).toBe('dawn');
    const saved = JSON.parse(localStorage.getItem('vl.theme') ?? '{}');
    expect(saved.theme).toBe('dawn');
  });

  it('cycle：按注册表顺序循环，末尾回到第一个', async () => {
    const theme = await freshTheme();
    theme.setTheme('lavender');
    theme.cycle(); // 末尾 → 回到第一个
    expect(theme.theme.value).toBe(THEMES[0].id);
    theme.cycle();
    expect(theme.theme.value).toBe(THEMES[1].id);
  });

  it('持久化非法值：回退默认主题', async () => {
    localStorage.setItem('vl.theme', JSON.stringify({ theme: 'no-such-theme' }));
    const theme = await freshTheme();
    expect(theme.theme.value).toBe(DEFAULT_THEME);
    expect(document.documentElement.dataset.theme).toBe(DEFAULT_THEME);
  });
});
