/* ============================================================
 * config：频率徽章配色方案（sky 主题，多风格对比）
 * 每套定义三档（典型/偶见/罕见）的主色 + 文字色 + 深色文字版；
 * CSS 侧以 [data-theme='sky'][data-tier-color='<id>'] 覆盖
 * --tier-* 变量（形态方案 user/glass/outline 引用同一组变量，
 * 形态 × 配色两轴自由组合）
 * swatch = 三档主色 hex（下拉菜单预览色点用）
 * ============================================================ */

export type TierColorId =
  | 'violet' // 紫→蓝（用户理论：低→高饱和）
  | 'mono' // 单色系：同一蓝相，明度阶梯
  | 'spectral' // 光谱：紫→蓝→青 冷色渐变
  | 'nature' // 自然：绿→青→蓝 清新
  | 'warm' // 暖警示：琥珀→橙→红
  | 'pastel' // 马卡龙：粉彩低饱和
  | 'traffic'; // 红绿灯语义：绿→黄→红

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
    id: 'violet',
    labelZh: '紫蓝',
    labelEn: 'Violet-blue',
    descZh: '紫→蓝过渡、低→高饱和（你的色彩理论）',
    descEn: 'Violet to blue, low to high saturation',
    swatch: ['#977bab', '#5f7fd0', '#1279e2']
  },
  {
    id: 'mono',
    labelZh: '单色蓝',
    labelEn: 'Mono blue',
    descZh: '同一蓝相，明度阶梯：罕见最深最醒目',
    descEn: 'One blue hue, lightness ramp: rare is deepest',
    swatch: ['#a8cdf0', '#5f9fe0', '#1a5fa8']
  },
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
  },
  {
    id: 'warm',
    labelZh: '暖警示',
    labelEn: 'Warm alert',
    descZh: '琥珀→橙→红，罕见=最强烈的警示感',
    descEn: 'Amber to orange to red, rare is alert',
    swatch: ['#d9a13b', '#d96f2e', '#c9433c']
  },
  {
    id: 'pastel',
    labelZh: '马卡龙',
    labelEn: 'Pastel',
    descZh: '粉彩低饱和 + 深字，柔和精致',
    descEn: 'Low-saturation pastels with deep text',
    swatch: ['#d6c3ef', '#bfd9f5', '#bfe8dd']
  },
  {
    id: 'traffic',
    labelZh: '红绿灯',
    labelEn: 'Traffic',
    descZh: '经典语义：绿=常见通行、黄=留意、红=警示',
    descEn: 'Classic semantics: green/yellow/red',
    swatch: ['#43a86e', '#d9a13b', '#d04a4a']
  }
];

/** 默认配色：定稿后改这里 */
export const DEFAULT_TIER_COLOR: TierColorId = 'violet';

export function tierColorById(id: string): TierColorDef | undefined {
  return TIER_COLORS.find((c) => c.id === id);
}
