/* ============================================================
 * core：题型生成器（类型 / 频率 / 系统预测 / 混合）
 * ============================================================ */
import type { Difficulty, PairQuestion, Question, Rule, SystemQuestion, Tier, Word } from './types';
import { RULES } from '@/config/rules';
import { MIXED_WEIGHTS, SYSTEM_WEIGHTS } from '@/config/game';
import { randomWord, makeWordForRule, wordText } from './words';
import { applicablePositions, applyRule } from './rules';

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** 按难度与权重抽规则 */
export function pickRule(difficulty: Difficulty, weights?: Record<string, number>): Rule {
  let pool = RULES;
  if (difficulty === 'easy') pool = pool.filter((r) => r.tier === 'typical');
  const w = pool.map((r) => (weights ? weights[r.id] ?? 1 : 1));
  const total = w.reduce((s, x) => s + x, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= w[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** 词对生成：定向构词（环境规则）或随机重试（无环境规则） */
function genPair(rule: Rule): { wordA: Word; wordB: Word; pos: 0 | 1 } | null {
  const cap = rule.env ? 40 : 400;
  for (let i = 0; i < cap; i++) {
    const wordA = makeWordForRule(rule);
    const poss = applicablePositions(rule, wordA);
    if (!poss.length) continue;
    const pos = pick(poss) as 0 | 1;
    const wordB = applyRule(rule, wordA, pos);
    if (!wordB || wordText(wordB) === wordText(wordA)) continue;
    return { wordA, wordB, pos };
  }
  return null;
}

export function genTypeQuestion(difficulty: Difficulty): PairQuestion | null {
  const rule = pickRule(difficulty);
  const p = genPair(rule);
  if (!p) return null;
  return { kind: 'type', rule, wordA: p.wordA, wordB: p.wordB, pos: p.pos, answer: rule.type };
}

/**
 * 频率题：分层抽样——先均匀抽档位，再从该档规则池抽规则。
 * 关键：不能直接按规则权重抽（easy 池全为 typical 时答案恒为“典型”，
 * 玩家无脑点选即可全对；hard 池 6:2:1 也严重偏斜）。
 * 分层后答案分布完全均衡：easy 两档（典型/偶见）、hard 三档，
 * 玩家必须真正区分档位（如“条件低化=典型 vs 无条件低化=罕见”）。
 */
export function genFreqQuestion(difficulty: Difficulty): PairQuestion | null {
  const tiers: Tier[] =
    difficulty === 'easy' ? ['typical', 'occasional'] : ['typical', 'occasional', 'rare'];
  const tier = pick(tiers);
  const pool = RULES.filter((r) => r.tier === tier);
  if (!pool.length) return null;
  const rule = pick(pool);
  const p = genPair(rule);
  if (!p) return null;
  return { kind: 'freq', rule, wordA: p.wordA, wordB: p.wordB, pos: p.pos, answer: rule.tier, tiers };
}

export function genSystemQuestion(difficulty: Difficulty): SystemQuestion | null {
  for (let attempt = 0; attempt < 24; attempt++) {
    const rule = pickRule(difficulty, SYSTEM_WEIGHTS);
    for (let t = 0; t < 60; t++) {
      const words = Array.from({ length: 5 }, () => randomWord());
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

/** 按题型生成题目；mixed 按权重混合 */
export function genQuestion(kind: 'type' | 'freq' | 'system' | 'mixed', difficulty: Difficulty): Question | null {
  let k = kind;
  if (k === 'mixed') {
    const r = Math.random() * (MIXED_WEIGHTS.type + MIXED_WEIGHTS.freq + MIXED_WEIGHTS.system);
    if (r < MIXED_WEIGHTS.type) k = 'type';
    else if (r < MIXED_WEIGHTS.type + MIXED_WEIGHTS.freq) k = 'freq';
    else k = 'system';
  }
  if (k === 'type') return genTypeQuestion(difficulty);
  if (k === 'freq') return genFreqQuestion(difficulty);
  // 系统题兜底：退化为类型题，保证永远有题可出
  return genSystemQuestion(difficulty) ?? genTypeQuestion(difficulty);
}
