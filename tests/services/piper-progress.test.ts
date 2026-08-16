import { describe, expect, it } from 'vitest';
import { computeTotalProgress } from '@/services/piper';

/* ============================================================
 * 总进度折算（模型 60% + wasm 40% 字节权重）：
 * 核心诉求——模型先就绪时进度条不能“100% 干等”，wasm 下载
 * 进度须继续推进；wasm 不可用/失败时权重归零不拖后腿。
 * ============================================================ */
describe('computeTotalProgress（模型 + wasm 并行下载的总进度折算）', () => {
  it('模型 100% 且 wasm 未完成：进度继续随 wasm 推进（用户报的“100% 干等”场景）', () => {
    expect(computeTotalProgress(100, { phase: 'pending', pct: 0 })).toBe(60);
    expect(computeTotalProgress(100, { phase: 'pending', pct: 50 })).toBe(80);
    expect(computeTotalProgress(100, { phase: 'pending', pct: 99 })).toBe(100);
  });

  it('wasm 完成：模型 100% 时总进度到 100%', () => {
    expect(computeTotalProgress(100, { phase: 'done', pct: 100 })).toBe(100);
    // wasm 先完成、模型下载中：总进度仍只反映模型部分
    expect(computeTotalProgress(50, { phase: 'done', pct: 100 })).toBe(70);
  });

  it('wasm 不可用/失败（skip）：权重归零，进度 = 模型进度（不拖后腿）', () => {
    expect(computeTotalProgress(100, { phase: 'skip', pct: 0 })).toBe(100);
    expect(computeTotalProgress(45, { phase: 'skip', pct: 0 })).toBe(45);
  });

  it('并行下载中：两者按权重合算', () => {
    expect(computeTotalProgress(0, { phase: 'pending', pct: 0 })).toBe(0);
    expect(computeTotalProgress(50, { phase: 'pending', pct: 50 })).toBe(50);
    expect(computeTotalProgress(80, { phase: 'pending', pct: 20 })).toBe(56);
  });

  it('进度恒不超 100', () => {
    expect(computeTotalProgress(100, { phase: 'pending', pct: 100 })).toBe(100);
    expect(computeTotalProgress(100, { phase: 'done', pct: 100 })).toBe(100);
  });
});
