/* ============================================================
 * 冒烟测试（Node）：数据完整性 / 规则应用 / 题型生成 / 状态机 / i18n
 * 运行：node scripts/smoke-test.js
 * ============================================================ */
'use strict';

require('../js/data.js');
require('../js/core.js');
require('../js/state.js');

const D = globalThis.VL.DATA;
const core = globalThis.VL.core;
const stateApi = globalThis.VL.state;

let failures = 0;
function check(name, cond, detail) {
  if (cond) {
    console.log('  PASS  ' + name);
  } else {
    failures++;
    console.log('  FAIL  ' + name + (detail ? '  —— ' + detail : ''));
  }
}

/* ---------- 1. 数据完整性 ---------- */
console.log('[1] 数据完整性');
const typeIds = new Set(D.TYPES.map((t) => t.id));
const tierIds = new Set(D.TIERS.map((t) => t.id));
const envKinds = new Set(['unstressed', 'long', 'stressed-next-a', 'before-i']);

D.RULES.forEach((r) => {
  check('rule ' + r.id + ' 类型合法', typeIds.has(r.type), r.type);
  check('rule ' + r.id + ' 频率合法', tierIds.has(r.tier), r.tier);
  check('rule ' + r.id + ' 中英名称', !!(r.name.zh && r.name.en));
  check('rule ' + r.id + ' 描述与示例完整',
    !!(r.desc.zh && r.desc.en && r.sysDesc.zh && r.sysDesc.en && r.examples.length));
  check('rule ' + r.id + ' 环境合法', !r.env || envKinds.has(r.env.kind), r.env && r.env.kind);
});

/* 每个类型的规则数 > 0 */
D.TYPES.forEach((t) => {
  check('类型 ' + t.id + ' 至少一条规则', D.RULES.some((r) => r.type === t.id));
});

/* ---------- 2. 规则应用正确性（构造用例） ---------- */
console.log('[2] 规则应用（构造用例）');
const W = (v1, v2, stress) => ({ c: ['b', 't'], v: [v1, v2], stress });
const V = (s, long, diph) => ({ s, long: !!long, diph: !!diph });
const rId = (id) => D.RULES.find((r) => r.id === id);

{
  const r = rId('reduce');
  const w = W(V('a'), V('i'), 1); // pos0 非重读
  check('reduce: 非重读 a→ə', core.applyRule(r, w, 0) && core.applyRule(r, w, 0).v[0].s === 'ə');
  check('reduce: 重读位置不适用', !core.ruleCanApply(r, w, 1));
}
{
  const r = rId('lower-a');
  const w = W(V('u'), V('a'), 0); // 重读 u + 后接 a
  check('a-mutation: u→o', core.applyRule(r, w, 0) && core.applyRule(r, w, 0).v[0].s === 'o');
  const w2 = W(V('u'), V('a'), 1); // pos0 非重读
  check('a-mutation: 非重读不适用', !core.ruleCanApply(r, w2, 0));
  const w3 = W(V('u'), V('i'), 0);
  check('a-mutation: 后接非 a 不适用', !core.ruleCanApply(r, w3, 0));
}
{
  const r = rId('front-umlaut');
  const w = W(V('u'), V('i'), 0);
  check('i-umlaut: u→y', core.applyRule(r, w, 0) && core.applyRule(r, w, 0).v[0].s === 'y');
  const w2 = W(V('u'), V('a'), 0);
  check('i-umlaut: 后接非 i 不适用', !core.ruleCanApply(r, w2, 0));
}
{
  const r = rId('diph-long');
  const w = W(V('i', true), V('a'), 0);
  check('复元音化: iː→aɪ', core.applyRule(r, w, 0) && core.applyRule(r, w, 0).v[0].s === 'aɪ');
  check('复元音化: 短 i 不适用', !core.ruleCanApply(r, W(V('i'), V('a'), 0), 0));
}
{
  const r = rId('mono');
  const w = W(V('aɪ', false, true), V('a'), 0);
  check('单元音化: aɪ→e', core.applyRule(r, w, 0) && core.applyRule(r, w, 0).v[0].s === 'e');
}
{
  const r = rId('raise');
  check('高化: a→æ', core.applyRule(r, W(V('a'), V('a'), 0), 0).v[0].s === 'æ');
  check('高化: eː→iː（长元音保持）', core.applyRule(r, W(V('e', true), V('a'), 0), 0).v[0].s === 'i'
    && core.applyRule(r, W(V('e', true), V('a'), 0), 0).v[0].long === true);
  check('高化: i 不再高化', !core.ruleCanApply(r, W(V('i'), V('a'), 0), 0));
}
{
  const r = rId('lower-free');
  check('低化: i→e', core.applyRule(r, W(V('i'), V('a'), 0), 0).v[0].s === 'e');
  check('低化: a 不再低化', !core.ruleCanApply(r, W(V('a'), V('a'), 0), 0));
}
{
  const r = rId('back-a');
  check('后化: a→ɑ', core.applyRule(r, W(V('a'), V('a'), 0), 0).v[0].s === 'ɑ');
}
{
  const r = rId('diph-short');
  check('高元音复化: i→eɪ', core.applyRule(r, W(V('i'), V('a'), 0), 0).v[0].s === 'eɪ');
  check('高元音复化: uː 不适用', !core.ruleCanApply(r, W(V('u', true), V('a'), 0), 0));
}

/* 变换结果必须落在词内可解析的元音集合 */
D.RULES.forEach((r) => {
  for (let i = 0; i < 300; i++) {
    const w = core.randomWord();
    for (let p = 0; p < 2; p++) {
      if (core.ruleCanApply(r, w, p)) {
        const b = core.applyRule(r, w, p);
        if (b && !(b.v[p].s in D.MONOPHTHONGS) && !(b.v[p].s in D.DIPHTHONGS)) {
          check('rule ' + r.id + ' 变换产物合法', false, b.v[p].s);
        }
      }
    }
  }
});
check('所有规则变换产物合法（抽样）', true);

/* ---------- 3. 题型生成不变量 ---------- */
console.log('[3] 题型生成（type / freq）');
for (const diff of ['easy', 'hard']) {
  let nulls = 0;
  for (let i = 0; i < 500; i++) {
    const tq = core.genTypeQuestion(diff);
    if (!tq) { nulls++; continue; }
    if (!typeIds.has(tq.answer)) check('type 答案合法', false, tq.answer);
    if (core.wordText(tq.wordA) === core.wordText(tq.wordB)) check('type 无 A==B', false);
    if (!core.ruleCanApply(tq.rule, tq.wordA, tq.pos)) check('type 位置可应用', false);
    const fq = core.genFreqQuestion(diff);
    if (!fq) { nulls++; continue; }
    if (!tierIds.has(fq.answer)) check('freq 答案合法', false, fq.answer);
  }
  check(diff + ': type/freq 生成无空题（500 次）', nulls === 0, 'nulls=' + nulls);
}

console.log('[4] 系统预测题');
let fallbacks = 0;
for (let i = 0; i < 300; i++) {
  const q = core.genSystemQuestion('hard');
  if (!q) { check('system 非空', false); continue; }
  if (q.fallback) { fallbacks++; continue; }
  check('system 词表长度 5', q.words.length === 5, String(q.words.length));
  const expected = [];
  q.words.forEach((w, idx) => { if (core.applicablePositions(q.rule, w).length) expected.push(idx); });
  const same = expected.length === q.answer.length && expected.every((x, j) => x === q.answer[j]);
  check('system 答案与计算一致', same, JSON.stringify(expected) + ' vs ' + JSON.stringify(q.answer));
  check('system 至少 1 变化词', q.answer.length >= 1);
  check('system 至少 1 未变化词', q.answer.length < q.words.length);
}
console.log('  system 兜底次数（允许少量）：' + fallbacks);

console.log('[5] 混合题型');
{
  let nulls = 0;
  for (let i = 0; i < 600; i++) {
    const q = core.genQuestion('mixed', 'easy');
    if (!q) nulls++;
    else if (!['type', 'freq', 'system'].includes(q.kind)) check('混合题型合法', false, q.kind);
  }
  check('混合生成无空题（600 次）', nulls === 0, 'nulls=' + nulls);
}

/* ---------- 6. 状态机 ---------- */
console.log('[6] 状态机');
{
  const s = stateApi.create({ mode: 'type', difficulty: 'easy', timeSec: 30 });
  check('初始 idle', s.phase === 'idle');
  check('start 成功', stateApi.start(s, 1000) === true);
  check('start 后 playing', s.phase === 'playing');
  const q = s.question;
  const ev = (qq, c) => ({ ok: qq.answer === c, answerLabel: qq.answer });
  const before = s.timer.leftMs;
  const res = stateApi.answer(s, 'WRONG_ID', ev, 1000);
  check('答错返回 ok=false', res.ok === false);
  check('答错计入 incorrect', s.stats.incorrect === 1);
  check('答错保持原题重试', s.phase === 'playing' && s.question === q);
  check('限时模式答错扣 1 秒', Math.abs(s.timer.leftMs - (before - 1000)) < 1, String(s.timer.leftMs) + ' vs ' + (before - 1000));
  const res2 = stateApi.answer(s, q.answer, ev, 2000);
  check('答对返回 ok=true', res2.ok === true);
  check('答对进入 answered', s.phase === 'answered');
  check('答对计数正确', s.stats.correct === 1 && s.stats.streak === 1);
  check('next 进入下一题', stateApi.next(s, 2500) === true && s.phase === 'playing');
}
{
  const s = stateApi.create({ mode: 'system', difficulty: 'hard', timeSec: 0 });
  stateApi.start(s, 0);
  const q = s.question;
  const wrongSel = [];
  if (q.answer.length > 0) wrongSel.push((q.answer[0] + 1) % q.words.length);
  const r = stateApi.answerSystem(s, wrongSel, 0);
  check('system 答错 ok=false', r.ok === false);
  check('不限时答错不扣时', s.timer.leftMs === 0);
  const r2 = stateApi.answerSystem(s, q.answer, 100);
  check('system 答对 ok=true', r2.ok === true);
}
{
  const s = stateApi.create({ mode: 'type', difficulty: 'easy', timeSec: 5 });
  stateApi.start(s, 0);
  check('tick 未超时不结束', stateApi.tick(s, 4000) === false && s.phase !== 'over');
  check('tick 超时结束', stateApi.tick(s, 5000) === true && s.phase === 'over');
}

/* ---------- 7. i18n 完整性 ---------- */
console.log('[7] i18n');
{
  const fs = require('fs');
  const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  const keys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]);
  const missing = keys.filter((k) => !D.I18N[k] || !D.I18N[k].zh || !D.I18N[k].en);
  check('index.html 全部 data-i18n 键有中英文案（' + keys.length + ' 个）', missing.length === 0, missing.join(','));
}

/* ---------- 汇总 ---------- */
console.log('');
if (failures === 0) {
  console.log('ALL PASS ✔');
} else {
  console.log(failures + ' FAILURE(S) ✘');
  process.exit(1);
}
