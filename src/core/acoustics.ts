/* ============================================================
 * core：声学视图（F1×F2 共振峰空间映射，纯函数可测）
 * ============================================================ */
import { FORMANT_ESTIMATES } from '@/config/vowels';

/** 声学图坐标范围（归一化 0..1） */
export const ACOUSTIC_BOX = { x0: 0.09, x1: 0.91, y0: 0.09, y1: 0.91 } as const;
export const F2_RANGE = { min: 800, max: 2500 } as const;
export const F1_RANGE = { min: 250, max: 850 } as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export interface AcousticPoint {
  x: number; // 归一化 0..1（F2 反向：前元音在左）
  y: number; // 归一化 0..1（F1 正向：开元音在下）
  f1: number;
  f2: number;
}

/** 元音符号 → F1×F2 空间坐标（无估值时返回 null） */
export function acousticPoint(symbol: string): AcousticPoint | null {
  const est = FORMANT_ESTIMATES[symbol];
  if (!est) return null;
  const fx = (F2_RANGE.max - est.f2) / (F2_RANGE.max - F2_RANGE.min); // 前(高F2) → 左
  const fy = (est.f1 - F1_RANGE.min) / (F1_RANGE.max - F1_RANGE.min); // 高F1 → 下
  return {
    x: ACOUSTIC_BOX.x0 + clamp(fx, 0, 1) * (ACOUSTIC_BOX.x1 - ACOUSTIC_BOX.x0),
    y: ACOUSTIC_BOX.y0 + clamp(fy, 0, 1) * (ACOUSTIC_BOX.y1 - ACOUSTIC_BOX.y0),
    f1: est.f1,
    f2: est.f2
  };
}
