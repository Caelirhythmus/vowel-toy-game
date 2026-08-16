/* ============================================================
 * 内容配置：语系档案（语系上下文玩法）
 * 数据依据：docs/family-mode-data.md（档位矩阵/真实语料/完备性报告）
 * - vowels：词表生成元音子集（null = 泛语系全池）；
 *   注意：子集只约束【输入】词表，规则输出（演变结果）允许在
 *   子集之外——音变产生音系外新音是历史音韵学的常态
 * - longProb：该语系的音位长度对立（罗曼/汉语/斯拉夫切片内无）
 * ============================================================ */
import type { VowelPoolEntry } from './vowels';
import { VOWEL_POOL } from './vowels';
import { RULES } from './rules';
import type { Rule, Tier } from '@/core/types';

export type FamilyId = 'generic' | 'english' | 'chinese' | 'romance' | 'slavic';

export interface FamilyDef {
  id: FamilyId;
  labelKey: 'fam.generic' | 'fam.english' | 'fam.chinese' | 'fam.romance' | 'fam.slavic';
  /** 音系子集（符号与 VOWEL_POOL/DIPHTHONGS 一致）；null = 全池 */
  vowels: string[] | null;
  /** 长元音概率（该语系音位长度对立） */
  longProb: number;
  /** 时间切片（教学说明用） */
  periodZh: string;
  periodEn: string;
}

export const FAMILIES: Record<FamilyId, FamilyDef> = {
  generic: {
    id: 'generic',
    labelKey: 'fam.generic',
    vowels: null,
    longProb: 0.35,
    periodZh: '跨语言（类型学平均）',
    periodEn: 'cross-linguistic (typological average)'
  },
  english: {
    id: 'english',
    labelKey: 'fam.english',
    // 中古英语→早期近代英语（1100–1700）：无前圆唇 y/ø/œ、无 ɑ 音位；
    // 模型无 ɪ/ʊ（近闭），以声明简化处理
    vowels: ['i', 'e', 'ɛ', 'æ', 'a', 'ɔ', 'o', 'u', 'ə', 'aɪ', 'aʊ', 'eɪ', 'əʊ'],
    longProb: 0.35,
    periodZh: '英语史（1100–1700，中古英语→早期近代英语）',
    periodEn: 'English (1100–1700, ME → EModE)'
  },
  chinese: {
    id: 'chinese',
    labelKey: 'fam.chinese',
    // 官话/北方方言（近代）：五元音音位 /i y u a ə/ + 韵母双元音 ei/ou
    vowels: ['i', 'y', 'u', 'a', 'ə', 'aɪ', 'eɪ', 'aʊ', 'oʊ'],
    longProb: 0,
    periodZh: '汉语史（官话/北方方言，近代）',
    periodEn: 'Chinese (Mandarin dialects, modern period)'
  },
  romance: {
    id: 'romance',
    labelKey: 'fam.romance',
    // 拉丁语→罗曼语：通俗拉丁语 7 元音 + 法语支前圆唇 + 意大利语上升复元音
    vowels: ['i', 'e', 'ɛ', 'a', 'ɔ', 'o', 'u', 'y', 'ø', 'œ', 'jɛ', 'wɔ'],
    longProb: 0,
    periodZh: '罗曼史（拉丁语→罗曼语，约前 200–1500）',
    periodEn: 'Romance (Latin → Romance, c. 200 BC – 1500)'
  },
  slavic: {
    id: 'slavic',
    labelKey: 'fam.slavic',
    // 共同斯拉夫语→俄语：模型可表达子集（ɨ/ь、鼻元音超出模型，声明省略）
    vowels: ['i', 'e', 'a', 'o', 'u', 'ə', 'aɪ', 'aʊ'],
    longProb: 0,
    periodZh: '斯拉夫史（共同斯拉夫语→俄语，约 500–1500）',
    periodEn: 'Slavic (Common Slavic → Russian, c. 500–1500)'
  }
};

export const FAMILY_IDS = Object.keys(FAMILIES) as FamilyId[];

/** 语系下拉选项（SettingsFields 用） */
export const FAMILY_OPTIONS: { value: string; labelKey: FamilyDef['labelKey'] }[] =
  FAMILY_IDS.map((id) => ({ value: id, labelKey: FAMILIES[id].labelKey }));

/** 子集专属元音（不在泛语系 VOWEL_POOL 中，按语系补充） */
const FAMILY_EXTRA_VOWELS: Record<string, VowelPoolEntry[]> = {
  romance: [
    { s: 'jɛ', w: 0.4, diph: true },
    { s: 'wɔ', w: 0.4, diph: true }
  ]
};

/** 按语系取词表元音池（泛语系 = 全池；子集 = 过滤 + 专属补充） */
export function vowelPoolFor(family: string): VowelPoolEntry[] {
  const def = FAMILIES[family as FamilyId];
  if (!def || !def.vowels) return VOWEL_POOL;
  const set = new Set(def.vowels);
  const base = VOWEL_POOL.filter((e) => set.has(e.s));
  return [...base, ...(FAMILY_EXTRA_VOWELS[family] ?? [])];
}

/** 语系长元音概率（词生成用） */
export function longProbFor(family: string): number {
  return FAMILIES[family as FamilyId]?.longProb ?? 0.35;
}

/** 规则在该语系中是否被排除（无此机制/时间切片外/证据不足，不出题） */
export function ruleExcludedFor(rule: Rule, family: string): boolean {
  return !!rule.familyExcluded?.includes(family);
}

/** 规则在该语系中的档位（familyTiers 覆盖；未覆盖时用泛语系档位） */
export function ruleTierFor(rule: Rule, family: string): Tier {
  return rule.familyTiers?.find((f) => f.family === family)?.tier ?? rule.tier;
}

/** 该语系实际非空的频率档位（排除矩阵 + 档位覆盖后） */
export function nonEmptyTiersFor(family: string): Tier[] {
  return (['typical', 'occasional', 'rare'] as Tier[]).filter((tier) =>
    RULES.some((r) => !ruleExcludedFor(r, family) && ruleTierFor(r, family) === tier)
  );
}

/**
 * 频率题在该语系是否可用：非空档位 ≥ 2 才有区分度。
 * 单档语系（如斯拉夫史只剩 typical）下频率题无意义，UI 禁用 + mixed 权重重分配。
 */
export function freqAvailableFor(family: string): boolean {
  return nonEmptyTiersFor(family).length >= 2;
}
