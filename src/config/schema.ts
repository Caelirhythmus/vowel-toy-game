/* ============================================================
 * 内容校验：可配置化的守门员（zod schema + 启动/测试期校验）
 * 规则的行为部分（transform）无法序列化校验，由不变量测试兜底。
 * ============================================================ */
import { z } from 'zod';
import { RULES } from '@/config/rules';
import { MONOPHTHONGS, DIPHTHONGS, VOWEL_POOL, LONG_PROB, FORMANT_ESTIMATES } from '@/config/vowels';
import { DIPHTHONG_MNEMONICS, ESPEAK_MNEMONICS, VOWEL_AUDIO } from '@/config/audio';
import { CHANGE_TYPE_IDS, TIER_IDS } from '@/config/game';
import type { Rule } from '@/core/types';

const localized = z.object({
  zh: z.string().min(1),
  en: z.string().min(1)
});

const ruleMetaSchema = z.object({
  id: z.string().min(1),
  type: z.enum(CHANGE_TYPE_IDS as [string, ...string[]]),
  tier: z.enum(TIER_IDS as [string, ...string[]]),
  env: z
    .object({
      kind: z.enum(['unstressed', 'long', 'stressed-next-a', 'before-i']),
      labelZh: z.string().min(1),
      labelEn: z.string().min(1)
    })
    .nullable(),
  name: localized,
  desc: localized,
  sysDesc: localized,
  /** 语系倾向说明必填：每条规则都要有“泛语系平均”之外的视角 */
  familyNote: localized,
  /** 语系上下文频率覆盖（预留字段）：family 非空、tier 必须合法 */
  familyTiers: z
    .array(z.object({ family: z.string().min(1), tier: z.enum(TIER_IDS as [string, ...string[]]) }))
    .optional(),
  examples: z.array(z.object({ text: z.string().min(1), srcZh: z.string().min(1), srcEn: z.string().min(1) })).min(1)
});

const vowelPoolSchema = z.array(
  z.object({
    s: z.string().min(1),
    w: z.number().positive()
  })
);

export interface ContentIssue {
  path: string;
  message: string;
}

/** 校验规则表（元数据部分） */
export function validateRules(rules: Rule[] = RULES): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const seen = new Set<string>();
  rules.forEach((rule, i) => {
    const res = ruleMetaSchema.safeParse(rule);
    if (!res.success) {
      issues.push({ path: `rules[${i}]`, message: res.error.issues.map((e) => e.path.join('.') + ': ' + e.message).join('; ') });
      return;
    }
    if (seen.has(rule.id)) issues.push({ path: `rules[${i}]`, message: 'duplicate rule id: ' + rule.id });
    seen.add(rule.id);
  });
  return issues;
}

/** 校验元音池：符号必须可解析、权重为正、长元音概率在 (0,1)、
 *  每个单元音有共振峰估值、每个复元音有标签偏移 */
export function validateVowels(): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const pool = vowelPoolSchema.safeParse(VOWEL_POOL);
  if (!pool.success) {
    issues.push({ path: 'vowels', message: 'VOWEL_POOL 结构非法' });
    return issues;
  }
  VOWEL_POOL.forEach((e) => {
    const ok = e.diph ? DIPHTHONGS[e.s] !== undefined : MONOPHTHONGS[e.s] !== undefined;
    if (!ok) issues.push({ path: `vowels.pool[${e.s}]`, message: '未知元音符号' });
  });
  if (!(LONG_PROB > 0 && LONG_PROB < 1)) {
    issues.push({ path: 'vowels.longProb', message: 'LONG_PROB 必须在 (0,1)' });
  }
  for (const key of Object.keys(MONOPHTHONGS)) {
    const est = FORMANT_ESTIMATES[key];
    if (!est || !(est.f1 > 0) || !(est.f2 > 0)) {
      issues.push({ path: `vowels.formants[${key}]`, message: '缺少合法共振峰估值' });
    }
  }
  for (const key of Object.keys(DIPHTHONGS)) {
    const d = DIPHTHONGS[key];
    if (!d.labelOffset || typeof d.labelOffset.dx !== 'number' || typeof d.labelOffset.dy !== 'number') {
      issues.push({ path: `vowels.diph[${key}]`, message: '缺少 labelOffset' });
    }
  }
  for (const key of Object.keys(MONOPHTHONGS)) {
    if (!VOWEL_AUDIO[key]) {
      issues.push({ path: `audio.vowel[${key}]`, message: '缺少发音录音配置' });
    }
    if (!ESPEAK_MNEMONICS[key]) {
      issues.push({ path: `audio.espeak[${key}]`, message: '缺少 espeak 助记符（长音可回退短音）' });
    }
  }
  for (const key of Object.keys(DIPHTHONGS)) {
    if (!DIPHTHONG_MNEMONICS[key]) {
      issues.push({ path: `audio.espeak.diph[${key}]`, message: '缺少复元音助记符序列' });
    }
  }
  for (const key of Object.keys(ESPEAK_MNEMONICS)) {
    if (!/^[A-Za-z0-9@:']+$/.test(ESPEAK_MNEMONICS[key])) {
      issues.push({ path: `audio.espeak.map[${key}]`, message: '助记符含非法字符' });
    }
  }
  return issues;
}

/** 全量内容校验（开发期启动警告 + 测试） */
export function validateContent(): ContentIssue[] {
  return [...validateRules(), ...validateVowels()];
}
