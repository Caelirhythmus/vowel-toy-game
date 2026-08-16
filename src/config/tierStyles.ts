/* ============================================================
 * config：频率徽章形态方案（sky 主题，与配色方案双轴组合）
 * 3 套形态语言：
 * - user    实色填充（配色方案的 bg + ink）
 * - glass   玻璃：半透明彩色玻璃底 + 模糊 + 同色系深字（与全站
 *           玻璃拟态统一）
 * - outline 描边：透明底 + 彩色描边 + 彩色深字（线性轻盈）
 * 切换机制：<html data-tier-style>，仅 sky 主题下生效
 * （CSS 规则带 [data-theme='sky'] 前缀）；其他主题用各自默认
 * ============================================================ */

export type TierStyleId = 'user' | 'glass' | 'outline';

export interface TierStyleDef {
  id: TierStyleId;
  icon: string;
  labelZh: string;
  labelEn: string;
  descZh: string;
  descEn: string;
}

export const TIER_STYLES: TierStyleDef[] = [
  {
    id: 'glass',
    icon: '🧊',
    labelZh: '玻璃',
    labelEn: 'Glass',
    descZh: '半透明玻璃底 + 同色系深字，与页面玻璃语言统一',
    descEn: 'Translucent glass fill with tinted deep text'
  },
  {
    id: 'outline',
    icon: '⭕',
    labelZh: '描边',
    labelEn: 'Outline',
    descZh: '透明底 + 彩色描边，线性轻盈',
    descEn: 'Transparent fill with colored outline'
  },
  {
    id: 'user',
    icon: '🎯',
    labelZh: '实色',
    labelEn: 'Solid',
    descZh: '实色填充，按配色方案的字色',
    descEn: 'Solid fill with the palette ink'
  }
];

/** 默认形态：定稿后改这里 */
export const DEFAULT_TIER_STYLE: TierStyleId = 'glass';

export function tierStyleById(id: string): TierStyleDef | undefined {
  return TIER_STYLES.find((s) => s.id === id);
}
