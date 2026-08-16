/* ============================================================
 * config：频率徽章配色方案（sky 主题，多风格对比）
 * 每套定义三档（典型/偶见/罕见）的主色 + 文字色 + 深色文字版；
 * CSS 侧以 [data-theme='sky'][data-tier-color='<id>'] 覆盖
 * --tier-* 变量（形态方案 glass/user 引用同一组变量，
 * 形态 × 配色两轴自由组合）
 * swatch = 三档主色 hex（下拉菜单预览色点用）
 * ============================================================ */

export type TierColorId = 'spectral' | 'nature';

export interface TierColorDef {
  id: TierColorId;
  labelZh: string;
  labelEn: string;
  descZh: string;
  descEn: string;
  /** 三档主色（典型/偶见/罕见），预览用 */
  swatch: [string, string, string];
}

export const TIER_COLORS: TierColorDef[] = [
  {
    id: 'spectral',
    labelZh: '光谱',
    labelEn: 'Spectral',
    descZh: '紫→蓝→青冷色渐变，跨度大辨识度高',
    descEn: 'Violet to blue to cyan gradient',
    swatch: ['#9d7fd8', '#5b8de0', '#17a8c4']
  },
  {
    id: 'nature',
    labelZh: '自然',
    labelEn: 'Nature',
    descZh: '绿→青→蓝，清新自然',
    descEn: 'Green to teal to blue, fresh',
    swatch: ['#5fbf8f', '#3f9fd1', '#2f6fc0']
  }
];

/** 默认配色：定稿后改这里 */
export const DEFAULT_TIER_COLOR: TierColorId = 'spectral';

export function tierColorById(id: string): TierColorDef | undefined {
  return TIER_COLORS.find((c) => c.id === id);
}
