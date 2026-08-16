/* ============================================================
 * core：演变规则引擎（环境匹配 / 可应用判定 / 应用变换）
 * ============================================================ */
import type { Rule, Word, WordVowel } from './types';
import { RULES } from '@/config/rules';
import { wordText } from './words';

/** 环境条件匹配（pos 为目标元音位） */
export function envMatches(rule: Rule, word: Word, pos: 0 | 1): boolean {
  const env = rule.env;
  if (!env) return true;
  const stressed = word.stress === pos;
  const other = word.v[1 - pos];
  switch (env.kind) {
    case 'unstressed':
      return !stressed;
    case 'long':
      return word.v[pos].long;
    case 'stressed-next-a':
      // a-mutation 是“向后同化”（regressive）：重读的 u 在前音节，
      // 触发元音 a 在【后一】音节。pos=1 时“另一音节”是前一音节，
      // 那是“前接 a”，不是 a-mutation，必须排除。
      return pos === 0 && stressed && other.s === 'a' && !other.diph;
    case 'before-i':
      // i-umlaut 同理：目标元音在前音节、触发音 i 在【后一】音节
      return pos === 0 && other.s === 'i' && !other.diph;
    case 'stressed-open-syllable':
      // 意大利语复化：重读 + 开音节。CVCV 模型下音节恒为开音节
      // （每个 V 后直接是下一音节首或词尾），条件退化为"重读"
      return stressed;
    default:
      return true;
  }
}

/** 规则是否可应用于该词的该位置 */
export function ruleCanApply(rule: Rule, word: Word, pos: 0 | 1): boolean {
  const out = rule.transform(word.v[pos]);
  return !!out && envMatches(rule, word, pos);
}

/** 可应用位置列表 */
export function applicablePositions(rule: Rule, word: Word): number[] {
  const res: number[] = [];
  for (let i = 0; i < 2; i++) {
    if (ruleCanApply(rule, word, i as 0 | 1)) res.push(i);
  }
  return res;
}

/** 应用规则，返回新词（不适用时返回 null） */
export function applyRule(rule: Rule, word: Word, pos: 0 | 1): Word | null {
  const out = rule.transform(word.v[pos]);
  if (!out || !envMatches(rule, word, pos)) return null;
  const v: [WordVowel, WordVowel] = [word.v[0], word.v[1]];
  v[pos] = { s: out.s, long: out.long, diph: out.diph };
  return { c: [word.c[0], word.c[1]], v, stress: word.stress };
}

export function ruleById(id: string): Rule | undefined {
  return RULES.find((r) => r.id === id);
}

/** 系统题反馈：词在该规则下的变化描述 */
export function changedText(rule: Rule, word: Word): string[] {
  return applicablePositions(rule, word).map((p) => {
    const after = applyRule(rule, word, p as 0 | 1);
    return wordText(word) + ' → ' + (after ? wordText(after) : '?');
  });
}
