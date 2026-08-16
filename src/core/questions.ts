/* ============================================================
 * core：题型生成器（类型 / 频率 / 系统预测 / 混合）
 * 语系模式：按语系过滤规则（familyExcluded）、覆盖档位
 * （familyTiers）、以该语系音系子集构词。
 * ============================================================ */
import type { Difficulty, PairQuestion, Question, Rule, SystemQuestion, Tier, Word } from './types';
import { RULES } from '@/config/rules';
import { MIXED_WEIGHTS, SYSTEM_WEIGHTS } from '@/config/game';
import { ruleExcludedFor, ruleTierFor, nonEmptyTiersFor, freqAvailableFor } from '@/config/families';
import { randomWord, makeWordForRule, wordText } from './words';
import { applicablePositions, applyRule } from './rules';

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** 语系模式抽规则：剔除 familyExcluded 的规则，按难度（档位）过滤后加权抽取 */
function pickRule(difficulty: Difficulty, family: string, weights?: Record<string, number>): Rule {
  let pool = RULES.filter((r) => !ruleExcludedFor(r, family));
  if (difficulty === 'easy') pool = pool.filter((r) => ruleTierFor(r, family) === 'typical');
  const w = pool.map((r) => (weights ? weights[r.id] ?? 1 : 1));
  const total = w.reduce((s, x) => s + x, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= w[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** 词对生成：定向构词（环境规则）或随机重试（无环境规则）；按语系子集构词 */
function genPair(rule: Rule, family: string): { wordA: Word; wordB: Word; pos: 0 | 1 } | null {
  const cap = rule.env ? 40 : 400;
  for (let i = 0; i < cap; i++) {
    const wordA = makeWordForRule(rule, family);
    const poss = applicablePositions(rule, wordA);
    if (!poss.length) continue;
    const pos = pick(poss) as 0 | 1;
    const wordB = applyRule(rule, wordA, pos);
    if (!wordB || wordText(wordB) === wordText(wordA)) continue;
    return { wordA, wordB, pos };
  }
  return null;
}

export function genTypeQuestion(difficulty: Difficulty, family = 'generic'): PairQuestion | null {
  const rule = pickRule(difficulty, family);
  const p = genPair(rule, family);
  if (!p) return null;
  return { kind: 'type', rule, wordA: p.wordA, wordB: p.wordB, pos: p.pos, answer: rule.type };
}

/**
 * 频率题：分层抽样——先均匀抽档位，再从该档规则池抽规则。
 * 关键：不能直接按规则权重抽（easy 池全为 typical 时答案恒为“典型”，
 * 玩家无脑点选即可全对；hard 池 6:2:1 也严重偏斜）。
 * 语系模式：档位按 familyTiers 覆盖，池按 familyExcluded 过滤；
 * 只从该语系【非空】档位抽样（如斯拉夫史只有 typical 档），
 * 非空档位不足两档时频率题无区分度，返回 null 由调用方兜底。
 */
export function genFreqQuestion(difficulty: Difficulty, family = 'generic'): PairQuestion | null {
  const want: Tier[] =
    difficulty === 'easy' ? ['typical', 'occasional'] : ['typical', 'occasional', 'rare'];
  // 语系实际非空档位（排除矩阵 + 档位覆盖后）
  const tiers = want.filter((tier) => nonEmptyTiersFor(family).includes(tier));
  if (tiers.length < 2) return null; // 单档语系（如斯拉夫史）无区分度
  const tier = pick(tiers);
  const pool = RULES.filter(
    (r) => !ruleExcludedFor(r, family) && ruleTierFor(r, family) === tier
  );
  if (!pool.length) return null;
  const rule = pick(pool);
  const p = genPair(rule, family);
  if (!p) return null;
  // 答案档位 = 语系覆盖后的档位（familyTiers），不是泛语系 rule.tier
  return { kind: 'freq', rule, wordA: p.wordA, wordB: p.wordB, pos: p.pos, answer: ruleTierFor(rule, family), tiers };
}

export function genSystemQuestion(difficulty: Difficulty, family = 'generic'): SystemQuestion | null {
  for (let attempt = 0; attempt < 24; attempt++) {
    const rule = pickRule(difficulty, family, SYSTEM_WEIGHTS);
    for (let t = 0; t < 60; t++) {
      const words = Array.from({ length: 5 }, () => randomWord(family));
      const changed: number[] = [];
      words.forEach((w, idx) => {
        if (applicablePositions(rule, w).length) changed.push(idx);
      });
      if (changed.length >= 1 && changed.length < words.length) {
        return { kind: 'system', rule, words, answer: changed };
      }
    }
  }
  return null;
}

/** 按题型生成题目；mixed 按权重混合；family 为语系上下文 */
export function genQuestion(
  kind: 'type' | 'freq' | 'system' | 'mixed',
  difficulty: Difficulty,
  family = 'generic'
): Question | null {
  let k = kind;
  if (k === 'mixed') {
    // 频率题在单档语系（如斯拉夫史）无区分度：权重并入类型/系统题（按原比例 4:3）
    let w = MIXED_WEIGHTS;
    if (!freqAvailableFor(family)) {
      const total = MIXED_WEIGHTS.type + MIXED_WEIGHTS.system;
      w = {
        type: MIXED_WEIGHTS.type / total,
        freq: 0,
        system: MIXED_WEIGHTS.system / total
      };
    }
    const r = Math.random() * (w.type + w.freq + w.system);
    if (r < w.type) k = 'type';
    else if (r < w.type + w.freq) k = 'freq';
    else k = 'system';
  }
  if (k === 'type') return genTypeQuestion(difficulty, family);
  // 频率题兜底（单档语系如斯拉夫史无区分度时）：退化为类型题，保证永远有题
  if (k === 'freq') return genFreqQuestion(difficulty, family) ?? genTypeQuestion(difficulty, family);
  // 系统题兜底：退化为类型题，保证永远有题可出
  return genSystemQuestion(difficulty, family) ?? genTypeQuestion(difficulty, family);
}
