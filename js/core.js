/* ============================================================
 * 元音演变实验室 · 核心逻辑层（纯函数，无 DOM 依赖，Node 可测）
 * 命名空间：VL.core
 * ============================================================ */
(function (g) {
  'use strict';

  const D = g.VL.DATA;
  const MONO = D.MONOPHTHONGS;
  const DIPH = D.DIPHTHONGS;

  const rnd = Math.random;
  const ri = (n) => Math.floor(rnd() * n);
  const pick = (arr) => arr[ri(arr.length)];

  /* ---------- 元音对象 ----------
   * 词内元音：{ s, long, diph }
   * s 可以是单元音符号（i/e/…）或复元音串（aɪ/…）
   */
  function mkVowel(poolEntry) {
    const long = !poolEntry.diph && rnd() < D.LONG_PROB;
    return { s: poolEntry.s, long, diph: !!poolEntry.diph };
  }

  /* 基础特征（chart 定位用）：diph 复元音取起点，长元音取基元 */
  function resolveVowel(v) {
    if (v.diph) {
      const d = DIPH[v.s];
      return d ? MONO[d.start] : null;
    }
    return MONO[v.s] || null;
  }

  /* 完整显示串 */
  function vowelText(v) {
    return v.s + (v.long && !v.diph ? 'ː' : '');
  }

  /* ---------- 词形：{ c:[c1,c2], v:[v1,v2], stress:0|1 } ---------- */
  function randomWord() {
    const pool = D.VOWEL_POOL;
    const total = pool.reduce((s, e) => s + e.w, 0);
    const pickV = () => {
      let r = rnd() * total;
      for (const e of pool) {
        r -= e.w;
        if (r <= 0) return mkVowel(e);
      }
      return mkVowel(pool[0]);
    };
    return {
      c: [pick(D.CONSONANTS), pick(D.CONSONANTS)],
      v: [pickV(), pickV()],
      stress: ri(2)
    };
  }

  function wordText(w) {
    const s1 = w.c[0] + vowelText(w.v[0]);
    const s2 = w.c[1] + vowelText(w.v[1]);
    return w.stress === 0 ? 'ˈ' + s1 + s2 : s1 + 'ˈ' + s2;
  }

  /* 为带环境条件的规则“定向构词”：保证所需语境出现（否则随机碰运气太慢） */
  function makeWordForRule(rule) {
    const word = randomWord();
    const env = rule.env;
    if (!env) return word;
    const pos = ri(2);
    const opos = 1 - pos;
    switch (env.kind) {
      case 'stressed-next-a': // 重读 u（短）+ 另一音节 a
        word.stress = pos;
        word.v[opos] = { s: 'a', long: false, diph: false };
        word.v[pos] = { s: 'u', long: false, diph: false };
        break;
      case 'before-i': // 后元音/低元音 + 另一音节 i
        word.stress = ri(2);
        word.v[opos] = { s: 'i', long: false, diph: false };
        word.v[pos] = {
          s: pick(['u', 'o', 'ɔ', 'ɑ', 'a']),
          long: rnd() < 0.3,
          diph: false
        };
        break;
      case 'long': // 长元音 iː/uː/eː/oː
        word.stress = ri(2);
        word.v[pos] = { s: pick(['i', 'u', 'e', 'o']), long: true, diph: false };
        break;
      case 'unstressed': // 随机词即可（总有非重读位）
        break;
      default:
        break;
    }
    return word;
  }

  function otherBase(w, pos) {
    const o = w.v[1 - pos];
    return o.diph ? o.s : o.s; // 复元音直接比串
  }

  /* ---------- 环境匹配 ---------- */
  function envMatches(rule, word, pos) {
    const env = rule.env;
    if (!env) return true;
    const stressed = word.stress === pos;
    switch (env.kind) {
      case 'unstressed':
        return !stressed;
      case 'long':
        return !!word.v[pos].long;
      case 'stressed-next-a':
        return stressed && otherBase(word, pos) === 'a';
      case 'before-i':
        return otherBase(word, pos) === 'i';
      default:
        return true;
    }
  }

  function ruleCanApply(rule, word, pos) {
    const out = rule.transform(word.v[pos]);
    return !!out && envMatches(rule, word, pos);
  }

  function applicablePositions(rule, word) {
    const res = [];
    for (let i = 0; i < 2; i++) if (ruleCanApply(rule, word, i)) res.push(i);
    return res;
  }

  function applyRule(rule, word, pos) {
    const out = rule.transform(word.v[pos]);
    if (!out || !envMatches(rule, word, pos)) return null;
    const nv = { s: out.s, long: !!out.long, diph: !!out.diph };
    const v = [word.v[0], word.v[1]];
    v[pos] = nv;
    return { c: word.c.slice(), v, stress: word.stress };
  }

  /* ---------- 规则选取 ---------- */
  function pickRule(difficulty, weights) {
    let pool = D.RULES;
    if (difficulty === 'easy') pool = pool.filter((r) => r.tier === 'typical');
    const w = pool.map((r) => (weights ? weights[r.id] || 1 : 1));
    const total = w.reduce((s, x) => s + x, 0);
    let r = rnd() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= w[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  /* ---------- 词对生成（type / freq 共用） ---------- */
  function genPairQuestion(rule, difficulty) {
    const cap = rule.env ? 40 : 400;
    for (let i = 0; i < cap; i++) {
      const wordA = makeWordForRule(rule);
      const poss = applicablePositions(rule, wordA);
      if (!poss.length) continue;
      const pos = pick(poss);
      const wordB = applyRule(rule, wordA, pos);
      if (!wordB || wordText(wordB) === wordText(wordA)) continue;
      return { rule, wordA, wordB, pos };
    }
    return null;
  }

  function genTypeQuestion(difficulty) {
    const rule = pickRule(difficulty);
    const p = genPairQuestion(rule, difficulty);
    if (!p) return null;
    return {
      kind: 'type',
      rule,
      wordA: p.wordA,
      wordB: p.wordB,
      pos: p.pos,
      answer: rule.type
    };
  }

  function genFreqQuestion(difficulty) {
    const weights = { 'lower-free': 2.5, 'back-a': 1.6, 'diph-short': 1.6 };
    const rule = pickRule(difficulty, weights);
    const p = genPairQuestion(rule, difficulty);
    if (!p) return null;
    return {
      kind: 'freq',
      rule,
      wordA: p.wordA,
      wordB: p.wordB,
      pos: p.pos,
      answer: rule.tier
    };
  }

  /* ---------- 系统预测题 ---------- */
  const SYSTEM_WEIGHTS = {
    reduce: 3, 'diph-long': 2.2, 'lower-a': 2.2, 'front-umlaut': 2.2,
    raise: 1.6, mono: 1.6, 'lower-free': 1.2, 'back-a': 1, 'diph-short': 1
  };

  function genSystemQuestion(difficulty) {
    for (let attempt = 0; attempt < 24; attempt++) {
      const rule = pickRule(difficulty, SYSTEM_WEIGHTS);
      for (let t = 0; t < 60; t++) {
        const words = [];
        for (let i = 0; i < 5; i++) words.push(randomWord());
        const changed = [];
        words.forEach((w, idx) => {
          if (applicablePositions(rule, w).length) changed.push(idx);
        });
        if (changed.length >= 1 && changed.length < words.length) {
          return { kind: 'system', rule, words, answer: changed };
        }
      }
    }
    /* 兜底：退化为类型判断题，保证永远有题可出 */
    const q = genTypeQuestion(difficulty);
    return q ? Object.assign({}, q, { fallback: true }) : null;
  }

  function genQuestion(kind, difficulty) {
    if (kind === 'type') return genTypeQuestion(difficulty);
    if (kind === 'freq') return genFreqQuestion(difficulty);
    if (kind === 'system') return genSystemQuestion(difficulty);
    const r = rnd();
    const k = r < 0.4 ? 'type' : r < 0.7 ? 'freq' : 'system';
    return genQuestion(k, difficulty);
  }

  /* ---------- 查询辅助 ---------- */
  function byId(list, id) {
    for (const x of list) if (x.id === id) return x;
    return null;
  }
  const typeById = (id) => byId(D.TYPES, id);
  const tierById = (id) => byId(D.TIERS, id);
  const ruleById = (id) => byId(D.RULES, id);

  /* 单词在规则下是否变化（系统题反馈用） */
  function changedText(rule, word) {
    const poss = applicablePositions(rule, word);
    return poss.map((p) => {
      const after = applyRule(rule, word, p);
      return wordText(word) + ' → ' + (after ? wordText(after) : '?');
    });
  }

  g.VL.core = {
    mkVowel,
    resolveVowel,
    vowelText,
    randomWord,
    makeWordForRule,
    wordText,
    envMatches,
    ruleCanApply,
    applicablePositions,
    applyRule,
    pickRule,
    genTypeQuestion,
    genFreqQuestion,
    genSystemQuestion,
    genQuestion,
    typeById,
    tierById,
    ruleById,
    changedText
  };
})(typeof window !== 'undefined' ? window : globalThis);
