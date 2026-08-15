/* ============================================================
 * 内容配置：游戏参数（题型/难度/时长选项、规则权重、混合比例）
 * ============================================================ */
import type { ChangeType, Difficulty, GameMode, Tier, TypeOption, TierOption } from '@/core/types';

export interface ModeOption {
  value: GameMode;
  labelKey: 'mode.mixed' | 'mode.type' | 'mode.freq' | 'mode.system';
}

export const MODE_OPTIONS: ModeOption[] = [
  { value: 'mixed', labelKey: 'mode.mixed' },
  { value: 'type', labelKey: 'mode.type' },
  { value: 'freq', labelKey: 'mode.freq' },
  { value: 'system', labelKey: 'mode.system' }
];

export interface DifficultyOption {
  value: Difficulty;
  labelKey: 'diff.easy' | 'diff.hard';
}

export const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  { value: 'easy', labelKey: 'diff.easy' },
  { value: 'hard', labelKey: 'diff.hard' }
];

export interface TimeOption {
  value: number;
  labelKey: 'time.unlimited' | 'time.30' | 'time.60' | 'time.90' | 'time.120';
}

export const TIME_OPTIONS: TimeOption[] = [
  { value: 0, labelKey: 'time.unlimited' },
  { value: 30, labelKey: 'time.30' },
  { value: 60, labelKey: 'time.60' },
  { value: 90, labelKey: 'time.90' },
  { value: 120, labelKey: 'time.120' }
];

export const TYPE_OPTIONS: TypeOption[] = [
  { id: 'raising', zh: '高化', en: 'Raising' },
  { id: 'lowering', zh: '低化', en: 'Lowering' },
  { id: 'fronting', zh: '前化', en: 'Fronting' },
  { id: 'backing', zh: '后化', en: 'Backing' },
  { id: 'reduction', zh: '央化/弱化', en: 'Centralization / Reduction' },
  { id: 'diphthongization', zh: '复元音化', en: 'Diphthongization' },
  { id: 'monophthongization', zh: '单元音化', en: 'Monophthongization' }
];

export const TIER_OPTIONS: TierOption[] = [
  { id: 'typical', zh: '典型', en: 'Typical' },
  { id: 'occasional', zh: '偶见', en: 'Occasional' },
  { id: 'rare', zh: '罕见', en: 'Rare' }
];

/** 混合题型抽题比例 */
export const MIXED_WEIGHTS: Record<'type' | 'freq' | 'system', number> = {
  type: 0.4,
  freq: 0.3,
  system: 0.3
};

/** 频率题：稀有规则提权，保证三档分布均衡 */
export const FREQ_WEIGHTS: Record<string, number> = {
  'lower-free': 2.5,
  'back-a': 1.6,
  'diph-short': 1.6
};

/** 系统预测题：环境型规则权重更高 */
export const SYSTEM_WEIGHTS: Record<string, number> = {
  reduce: 3,
  'diph-long': 2.2,
  'lower-a': 2.2,
  'front-umlaut': 2.2,
  raise: 1.6,
  mono: 1.6,
  'lower-free': 1.2,
  'back-a': 1,
  'diph-short': 1
};

export const CHANGE_TYPE_IDS: ChangeType[] = TYPE_OPTIONS.map((t) => t.id);
export const TIER_IDS: Tier[] = TIER_OPTIONS.map((t) => t.id);
