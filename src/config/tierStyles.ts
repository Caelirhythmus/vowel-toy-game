/* ============================================================
 * config：频率徽章风格（sky 主题下的多方案设计对比）
 * 4 套形态语言：
 * - user    你的设计：实色填充白字，饱和度 22/55/85 递进
 * - glass   玻璃：半透明彩色玻璃底 + 模糊 + 同色系深字（与全站
 *           玻璃拟态统一）
 * - dot     色点：中性浅底 + 前置彩色圆点 + 中性深字（极简，
 *           档位信息压缩到最小色块）
 * - outline 描边：透明底 + 彩色描边 + 彩色深字（线性轻盈）
 * 切换机制：<html data-tier-style>，仅 sky 主题下生效
 * （CSS 规则带 [data-theme='sky'] 前缀）；其他主题用各自默认
 * ============================================================ */

export type TierStyleId = 'user' | 'glass' | 'dot' | 'outline';

export interface TierStyleDef {
  id: TierStyleId;
  labelZh: string;
  labelEn: string;
  descZh: string;
  descEn: string;
}

export const TIER_STYLES: TierStyleDef[] = [
  {
    id: 'user',
    labelZh: '你的设计',
    labelEn: 'User',
    descZh: '实色填充白字，饱和度 22/55/85 递进',
    descEn: 'Solid fill, white text, saturation ramp'
  },
  {
    id: 'glass',
    labelZh: '玻璃',
    labelEn: 'Glass',
    descZh: '半透明玻璃底 + 同色系深字，与页面玻璃语言统一',
    descEn: 'Translucent glass fill with tinted deep text'
  },
  {
    id: 'dot',
    labelZh: '色点',
    labelEn: 'Dot',
    descZh: '中性浅底 + 彩色圆点，极简不喧宾夺主',
    descEn: 'Neutral chip with a colored dot, minimal'
  },
  {
    id: 'outline',
    labelZh: '描边',
    labelEn: 'Outline',
    descZh: '透明底 + 彩色描边，线性轻盈',
    descEn: 'Transparent fill with colored outline'
  }
];

/** 默认风格：定稿后改这里 */
export const DEFAULT_TIER_STYLE: TierStyleId = 'user';

export function tierStyleById(id: string): TierStyleDef | undefined {
  return TIER_STYLES.find((s) => s.id === id);
}
