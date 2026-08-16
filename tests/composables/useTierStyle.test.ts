import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_TIER_STYLE, TIER_STYLES } from '@/config/tierStyles';

type TierStyleApi = ReturnType<typeof import('@/composables/useTierStyle')['useTierStyle']>;

async function freshStyle(): Promise<TierStyleApi> {
  vi.resetModules();
  const mod = await import('@/composables/useTierStyle');
  return mod.useTierStyle();
}

describe('频率徽章风格配置', () => {
  it('方案注册表：id 唯一、文案齐全、默认方案在册', () => {
    const ids = TIER_STYLES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of TIER_STYLES) {
      expect(s.labelZh.length).toBeGreaterThan(0);
      expect(s.labelEn.length).toBeGreaterThan(0);
    }
    expect(ids).toContain(DEFAULT_TIER_STYLE);
  });
});

describe('useTierStyle 风格切换', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.tierStyle;
  });

  it('默认风格：无持久化时为 DEFAULT_TIER_STYLE，同步到 html data-tier-style', async () => {
    const ts = await freshStyle();
    expect(ts.style.value).toBe(DEFAULT_TIER_STYLE);
    expect(document.documentElement.dataset.tierStyle).toBe(DEFAULT_TIER_STYLE);
  });

  it('setStyle：更新属性 + 持久化 localStorage', async () => {
    const ts = await freshStyle();
    ts.setStyle('outline');
    expect(ts.style.value).toBe('outline');
    expect(document.documentElement.dataset.tierStyle).toBe('outline');
    const saved = JSON.parse(localStorage.getItem('vl.tierStyle') ?? '{}');
    expect(saved.style).toBe('outline');
  });

  it('持久化非法值：回退默认风格', async () => {
    localStorage.setItem('vl.tierStyle', JSON.stringify({ style: 'no-such-style' }));
    const ts = await freshStyle();
    expect(ts.style.value).toBe(DEFAULT_TIER_STYLE);
  });
});
