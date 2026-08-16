/* ============================================================
 * config：主题定义（配色方案注册表）
 * 每个主题对应 main.css 中 :root[data-theme='<id>'] 的令牌组；
 * 切换 = 改 <html data-theme> 属性 + 持久化 vl.theme
 * 新增主题：① 此处加条目 ② main.css 加一组 :root[data-theme] 变量
 * ============================================================ */

export type ThemeId = 'sky' | 'dawn' | 'mint' | 'lavender';

export interface ThemeDef {
  id: ThemeId;
  /** 图标（按钮上展示） */
  icon: string;
  labelZh: string;
  labelEn: string;
  /** 一句话特征描述（设置面板提示用） */
  descZh: string;
  descEn: string;
}

export const THEMES: ThemeDef[] = [
  {
    id: 'sky',
    icon: '🌤️',
    labelZh: '晴空',
    labelEn: 'Sky',
    descZh: '清爽高亮蓝，明快通透',
    descEn: 'Bright fresh blue, airy and clear'
  },
  {
    id: 'dawn',
    icon: '🌅',
    labelZh: '晨曦',
    labelEn: 'Dawn',
    descZh: '暖白杏橙，柔和温润',
    descEn: 'Warm cream and apricot, soft and mellow'
  },
  {
    id: 'mint',
    icon: '🍃',
    labelZh: '薄荷',
    labelEn: 'Mint',
    descZh: '浅绿清新，自然放松',
    descEn: 'Fresh light green, natural and calm'
  },
  {
    id: 'lavender',
    icon: '💜',
    labelZh: '暮紫',
    labelEn: 'Lavender',
    descZh: '淡紫温柔，梦幻优雅',
    descEn: 'Gentle lavender, dreamy and elegant'
  }
];

/** 默认主题：改这里即可换默认（首次访问/无持久化时生效） */
export const DEFAULT_THEME: ThemeId = 'mint';

export function themeById(id: string): ThemeDef | undefined {
  return THEMES.find((t) => t.id === id);
}
