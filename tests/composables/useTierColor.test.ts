import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TIER_COLOR, TIER_COLORS } from '@/config/tierColors';

type TierColorApi = ReturnType<typeof import('@/composables/useTierColor')['useTierColor']>;

async function freshColor(): Promise<TierColorApi> {
  vi.resetModules();
  const mod = await import('@/composables/useTierColor');
  return mod.useTierColor();
}

describe('徽章配色配置', () => {
  it('配色注册表：id 唯一、文案齐全、swatch 三色、默认在册', () => {
    const ids = TIER_COLORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of TIER_COLORS) {
      expect(c.labelZh.length).toBeGreaterThan(0);
      expect(c.labelEn.length).toBeGreaterThan(0);
      expect(c.swatch).toHaveLength(3);
      for (const s of c.swatch) expect(s).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(ids).toContain(DEFAULT_TIER_COLOR);
  });
});

describe('useTierColor 配色切换', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.tierColor;
  });

  it('默认配色：无持久化时为 DEFAULT_TIER_COLOR，同步到 html data-tier-color', async () => {
    const tc = await freshColor();
    expect(tc.color.value).toBe(DEFAULT_TIER_COLOR);
    expect(document.documentElement.dataset.tierColor).toBe(DEFAULT_TIER_COLOR);
  });

  it('setColor：更新属性 + 持久化 localStorage + current 计算属性', async () => {
    const tc = await freshColor();
    tc.setColor('nature');
    expect(tc.color.value).toBe('nature');
    expect(tc.current.value.id).toBe('nature');
    expect(document.documentElement.dataset.tierColor).toBe('nature');
    const saved = JSON.parse(localStorage.getItem('vl.tierColor') ?? '{}');
    expect(saved.color).toBe('nature');
  });

  it('持久化非法值：回退默认配色', async () => {
    localStorage.setItem('vl.tierColor', JSON.stringify({ color: 'no-such-color' }));
    const tc = await freshColor();
    expect(tc.color.value).toBe(DEFAULT_TIER_COLOR);
  });
});
