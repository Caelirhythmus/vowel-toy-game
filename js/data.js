/* ============================================================
 * 元音演变实验室 · 数据层（零依赖，浏览器/Node 双端可用）
 * 命名空间：VL.DATA
 * ============================================================ */
(function (g) {
  'use strict';

  /* ---------- 基础元音（IPA 单元音）特征模型 ----------
   * height: 舌位高低 0=开 1=次开 2=半开 3=半闭 4=闭（数值越大开口越小）
   * back  : 舌位前后 0=前 1=央 2=后
   * round : 圆唇
   */
  const MONOPHTHONGS = {
    i: { s: 'i', height: 4, back: 0, round: false },
    y: { s: 'y', height: 4, back: 0, round: true },
    e: { s: 'e', height: 3, back: 0, round: false },
    ø: { s: 'ø', height: 3, back: 0, round: true },
    ɛ: { s: 'ɛ', height: 2, back: 0, round: false },
    œ: { s: 'œ', height: 2, back: 0, round: true },
    æ: { s: 'æ', height: 1, back: 0, round: false },
    a: { s: 'a', height: 0, back: 0, round: false },
    ɑ: { s: 'ɑ', height: 0, back: 2, round: false },
    ɔ: { s: 'ɔ', height: 2, back: 2, round: true },
    o: { s: 'o', height: 3, back: 2, round: true },
    u: { s: 'u', height: 4, back: 2, round: true },
    ə: { s: 'ə', height: 2.5, back: 1, round: false }
  };

  /* 复元音（输入词里可能出现；图上按其起点定位） */
  const DIPHTHONGS = {
    aɪ: { s: 'aɪ', start: 'a' },
    aʊ: { s: 'aʊ', start: 'a' },
    eɪ: { s: 'eɪ', start: 'e' },
    əʊ: { s: 'əʊ', start: 'ə' }
  };

  /* 演变类型（答题选项 / 速查表顺序） */
  const TYPES = [
    { id: 'raising',          zh: '高化',       en: 'Raising' },
    { id: 'lowering',         zh: '低化',       en: 'Lowering' },
    { id: 'fronting',         zh: '前化',       en: 'Fronting' },
    { id: 'backing',          zh: '后化',       en: 'Backing' },
    { id: 'reduction',        zh: '央化/弱化',  en: 'Centralization / Reduction' },
    { id: 'diphthongization', zh: '复元音化',   en: 'Diphthongization' },
    { id: 'monophthongization', zh: '单元音化', en: 'Monophthongization' }
  ];

  const TIERS = [
    { id: 'typical',    zh: '典型', en: 'Typical' },
    { id: 'occasional', zh: '偶见', en: 'Occasional' },
    { id: 'rare',       zh: '罕见', en: 'Rare' }
  ];

  /* ---------- 演变规则表（声明式） ----------
   * transform(v): 返回新元音（{s,long} 或 diphthong 串）或 null（不适用）
   * env: 环境条件（可空）
   * tier: 该方向在跨语言中的粗略频率（教学简化，非定律）
   */
  const RULES = [
    {
      id: 'raise', type: 'raising', tier: 'typical', env: null,
      name: { zh: '高化', en: 'Raising' },
      desc: {
        zh: '舌位升高、开口度减小，如 a→æ→ɛ→e→i 链。链移（chain shift）中极常见，是汉语历史音韵学“元音高化”倾向的体现。',
        en: 'Tongue height rises and jaw opening decreases (e.g. a→æ→ɛ→e→i). Very common in chain shifts; the classic “vowel raising” tendency in Chinese historical phonology.'
      },
      sysDesc: { zh: '元音高化（开口度减小）', en: 'Vowel raising (smaller opening)' },
      transform: function (v) {
        const b = resolveFeatures(v);
        if (!b || v.s === 'ə' || v.diph) return null;
        return byFeatures(b.height + 1, b.back, b.round, v.long);
      },
      examples: [
        { text: 'eː → iː', srcZh: '英语元音大推移（Great Vowel Shift）', srcEn: 'English Great Vowel Shift' },
        { text: 'a → æ', srcZh: '高化倾向（王力《汉语史稿》）', srcEn: 'raising tendency (Wang Li)' }
      ]
    },
    {
      id: 'lower-a', type: 'lowering', tier: 'typical', env: { kind: 'stressed-next-a' },
      name: { zh: '低化（a-mutation 型）', en: 'Lowering (a-mutation type)' },
      desc: {
        zh: '重读音节里的 u，若下一音节含 a，则低化为 o。这是有环境条件的典型低化。',
        en: 'Stressed u lowers to o when the next syllable contains a. A typical conditioned lowering.'
      },
      sysDesc: { zh: '重读音节的 u → o（后接 a 音节）', en: 'stressed u → o before a-syllable' },
      transform: function (v) {
        if (v.s === 'u' && !v.long) return { s: 'o', long: false };
        return null;
      },
      examples: [
        { text: '*u → *o', srcZh: '日耳曼语 a-mutation（word < *wurdą）', srcEn: 'Germanic a-mutation (word < *wurdą)' }
      ]
    },
    {
      id: 'lower-free', type: 'lowering', tier: 'rare', env: null,
      name: { zh: '低化（无条件）', en: 'Lowering (unconditioned)' },
      desc: {
        zh: '无条件的舌位下降、开口度增大。真实存在但远不如高化常见，如 17 世纪英语 ʊ→ʌ。',
        en: 'Unconditioned lowering. Real but far less common than raising, e.g. English ʊ→ʌ in the 17th century.'
      },
      sysDesc: { zh: '元音低化（开口度增大）', en: 'Vowel lowering (larger opening)' },
      transform: function (v) {
        const b = resolveFeatures(v);
        if (!b || v.s === 'ə' || v.diph) return null;
        return byFeatures(b.height - 1, b.back, b.round, v.long);
      },
      examples: [
        { text: 'ʊ → ʌ', srcZh: '英语 FOOT–STRUT 分裂（约 17 世纪）', srcEn: 'English FOOT–STRUT split (c. 17th c.)' }
      ]
    },
    {
      id: 'front-umlaut', type: 'fronting', tier: 'typical', env: { kind: 'before-i' },
      name: { zh: '前化（i-umlaut 型）', en: 'Fronting (i-umlaut type)' },
      desc: {
        zh: '后元音在后接 i/j 时前化（常伴随高化）：u→y、o→ø、a→e。典型的环境触发音变。',
        en: 'Back vowels front (often raising too) before a following i/j: u→y, o→ø, a→e. A typical environment-triggered change.'
      },
      sysDesc: { zh: '后元音前化（后接 i）', en: 'back vowels front before i' },
      transform: function (v) {
        if (v.diph || v.s === 'ə') return null;
        const map = { u: 'y', o: 'ø', ɔ: 'œ', ɑ: 'æ', a: 'e' };
        const t = map[v.s];
        return t ? { s: t, long: v.long } : null;
      },
      examples: [
        { text: 'u → y', srcZh: 'i-umlaut：英语 foot/feet、德语 Gast/Gäste', srcEn: 'i-umlaut: English foot/feet, German Gast/Gäste' }
      ]
    },
    {
      id: 'back-a', type: 'backing', tier: 'occasional', env: null,
      name: { zh: '后化', en: 'Backing' },
      desc: {
        zh: '舌位后移，如 a→ɑ。跨语言中偶见，常与低化/圆唇化伴生。',
        en: 'Tongue retracts, e.g. a→ɑ. Occasional cross-linguistically; often co-occurs with lowering/rounding.'
      },
      sysDesc: { zh: '元音后化（舌位后移）', en: 'Vowel backing' },
      transform: function (v) {
        const b = resolveFeatures(v);
        if (!b || v.s === 'ə' || v.diph) return null;
        return byFeatures(b.height, b.back + 2, b.round, v.long);
      },
      examples: [
        { text: 'a → ɑ', srcZh: '法语部分地区 a→ɑ', srcEn: 'French a→ɑ in some varieties' }
      ]
    },
    {
      id: 'reduce', type: 'reduction', tier: 'typical', env: { kind: 'unstressed' },
      name: { zh: '央化/弱化', en: 'Centralization / Reduction' },
      desc: {
        zh: '非重读元音央化为 ə。弱化几乎只发生在非重读位置，是所有重音语言的家常便饭。',
        en: 'Unstressed vowels centralize to ə. Reduction almost only affects unstressed syllables.'
      },
      sysDesc: { zh: '非重读元音 → ə', en: 'unstressed vowels → ə' },
      transform: function (v) {
        if (v.diph || v.s === 'ə') return null;
        return { s: 'ə', long: false };
      },
      examples: [
        { text: 'a → ə', srcZh: '英语 about [əˈbaʊt]；俄语 аканье', srcEn: 'English about [əˈbaʊt]; Russian akan’ye' }
      ]
    },
    {
      id: 'diph-long', type: 'diphthongization', tier: 'typical', env: { kind: 'long' },
      name: { zh: '复元音化（长元音）', en: 'Diphthongization (long vowels)' },
      desc: {
        zh: '长元音裂化为复元音：iː→aɪ、uː→aʊ、eː→eɪ、oː→əʊ。元音大推移的典型环节，常与高化链伴生。',
        en: 'Long vowels break into diphthongs: iː→aɪ, uː→aʊ, eː→eɪ, oː→əʊ. A hallmark of the Great Vowel Shift.'
      },
      sysDesc: { zh: '长元音复元音化', en: 'long vowels diphthongize' },
      transform: function (v) {
        const map = { i: 'aɪ', u: 'aʊ', e: 'eɪ', o: 'əʊ' };
        const t = v.long && map[v.s] ? map[v.s] : null;
        return t ? { s: t, diph: true } : null;
      },
      examples: [
        { text: 'iː → aɪ', srcZh: '英语元音大推移', srcEn: 'English Great Vowel Shift' }
      ]
    },
    {
      id: 'diph-short', type: 'diphthongization', tier: 'occasional', env: null,
      name: { zh: '复元音化（高元音复化）', en: 'Diphthongization (high-vowel breaking)' },
      desc: {
        zh: '短高元音裂化：i→eɪ、u→əʊ。汉语北方方言有“高元音复化”现象。',
        en: 'Short high vowels break: i→eɪ, u→əʊ. Known as “high-vowel breaking” in some Chinese dialects.'
      },
      sysDesc: { zh: '短高元音复化 i→eɪ、u→əʊ', en: 'short high vowels break' },
      transform: function (v) {
        const map = { i: 'eɪ', u: 'əʊ' };
        const t = !v.long && map[v.s] ? map[v.s] : null;
        return t ? { s: t, diph: true } : null;
      },
      examples: [
        { text: 'i → eɪ', srcZh: '汉语北方方言高元音复化', srcEn: 'high-vowel breaking, N. Chinese dialects' }
      ]
    },
    {
      id: 'mono', type: 'monophthongization', tier: 'typical', env: null,
      name: { zh: '单元音化', en: 'Monophthongization' },
      desc: {
        zh: '复元音合并为单元音：aɪ→e、aʊ→o。如古典拉丁语 ae→e。',
        en: 'Diphthongs merge into monophthongs: aɪ→e, aʊ→o. E.g. Classical Latin ae→e.'
      },
      sysDesc: { zh: '复元音单元音化', en: 'diphthongs monophthongize' },
      transform: function (v) {
        const map = { aɪ: 'e', aʊ: 'o', eɪ: 'e', əʊ: 'o' };
        const t = v.diph ? map[v.s] : null;
        return t ? { s: t, long: false } : null;
      },
      examples: [
        { text: 'ae → e', srcZh: '拉丁语 ae→e（后古典时期）', srcEn: 'Latin ae→e (post-Classical)' }
      ]
    }
  ];

  /* 词内元音（{s,long,diph}）→ 基础特征对象 */
  function resolveFeatures(v) {
    if (!v) return null;
    if (v.diph) {
      const d = DIPHTHONGS[v.s];
      return d ? MONOPHTHONGS[d.start] : null;
    }
    return MONOPHTHONGS[v.s] || null;
  }

  function byFeatures(height, back, round, long) {
    for (const k in MONOPHTHONGS) {
      const m = MONOPHTHONGS[k];
      if (m.height === height && m.back === back && m.round === round) {
        return { s: m.s, long: !!long };
      }
    }
    return null;
  }

  /* 辅音（保持原项目集合） */
  const CONSONANTS = ['b', 'p', 'm', 'd', 't', 'n', 'h', 'g', 'k'];

  /* 词生成用的元音池（含权重：常见前不圆唇元音权重高） */
  const VOWEL_POOL = [
    { s: 'i', w: 3 }, { s: 'e', w: 3 }, { s: 'ɛ', w: 2.5 }, { s: 'æ', w: 1.5 },
    { s: 'a', w: 3 }, { s: 'ɑ', w: 1 }, { s: 'ɔ', w: 1 }, { s: 'o', w: 1.5 },
    { s: 'u', w: 2 }, { s: 'y', w: 1 }, { s: 'ø', w: 0.6 }, { s: 'œ', w: 0.4 },
    { s: 'ə', w: 0.7 },
    { s: 'aɪ', w: 0.8, diph: true }, { s: 'aʊ', w: 0.5, diph: true },
    { s: 'eɪ', w: 0.5, diph: true }, { s: 'əʊ', w: 0.4, diph: true }
  ];

  /* 长元音概率 */
  const LONG_PROB = 0.35;

  /* ---------- 界面文案（i18n） ---------- */
  const I18N = {
    'app.title': { zh: '元音演变实验室', en: 'Vowel Change Lab' },
    'app.subtitle': {
      zh: '认识常见元音演变类型 · 判断其跨语言频率 · 预测系统层面的变化',
      en: 'Learn common vowel change types — judge their frequency and predict system-wide changes'
    },
    'set.mode': { zh: '题型', en: 'Question type' },
    'set.difficulty': { zh: '难度', en: 'Difficulty' },
    'set.time': { zh: '时长', en: 'Time' },
    'mode.mixed': { zh: '混合', en: 'Mixed' },
    'mode.type': { zh: '类型判断', en: 'Type' },
    'mode.freq': { zh: '频率判断', en: 'Frequency' },
    'mode.system': { zh: '系统预测', en: 'System' },
    'diff.easy': { zh: '入门（仅典型演变）', en: 'Beginner (typical only)' },
    'diff.hard': { zh: '进阶（全部规则）', en: 'Advanced (all rules)' },
    'time.unlimited': { zh: '不限时', en: 'Unlimited' },
    'time.30': { zh: '30 秒', en: '30 s' },
    'time.60': { zh: '60 秒', en: '60 s' },
    'time.90': { zh: '90 秒', en: '90 s' },
    'time.120': { zh: '120 秒', en: '120 s' },
    'btn.start': { zh: '开始', en: 'Start' },
    'btn.reset': { zh: '重置', en: 'Reset' },
    'btn.submit': { zh: '提交', en: 'Submit' },
    'btn.close': { zh: '关闭', en: 'Close' },
    'timer.left': { zh: '剩余时间', en: 'Time left' },
    'q.type.prompt': { zh: '这一变化属于哪种演变类型？', en: 'Which type of change is this?' },
    'q.freq.prompt': {
      zh: '这一方向在跨语言中常见吗？（“典型/偶见/罕见”为粗略频率，非定律）',
      en: 'How common is this direction cross-linguistically? (a rough typological estimate, not a law)'
    },
    'q.system.prompt': {
      zh: '下列词将经历规则「{rule}」。请选出会发生变化的词。',
      en: 'The following words undergo “{rule}”. Select the ones that change.'
    },
    'q.env': { zh: '环境', en: 'Environment' },
    'q.env.none': { zh: '无特殊环境', en: 'no special environment' },
    'fb.correct': { zh: '正确！', en: 'Correct!' },
    'fb.wrong': { zh: '不正确，再试一次（同一题）。', en: 'Not quite — try again (same question).' },
    'fb.answer': { zh: '正确答案', en: 'Correct answer' },
    'fb.your': { zh: '你的选择', en: 'Your pick' },
    'fb.type': { zh: '类型', en: 'Type' },
    'fb.tier': { zh: '频率', en: 'Frequency' },
    'fb.desc': { zh: '说明', en: 'Explanation' },
    'fb.example': { zh: '实例', en: 'Example' },
    'fb.note': { zh: '提示', en: 'Note' },
    'fb.changed': { zh: '发生变化', en: 'Changed' },
    'fb.unchanged': { zh: '未变化', en: 'Unchanged' },
    'fb.arrow': { zh: '→', en: '→' },
    'stat.correct': { zh: '正确', en: 'Correct' },
    'stat.incorrect': { zh: '错误', en: 'Wrong' },
    'stat.total': { zh: '已答', en: 'Answered' },
    'stat.streak': { zh: '连对', en: 'Streak' },
    'chart.title': { zh: '元音图（高度 × 前后 × 圆唇）', en: 'Vowel chart (height × backness × rounding)' },
    'chart.a': { zh: 'A 起点', en: 'A source' },
    'chart.b': { zh: 'B 终点', en: 'B target' },
    'info.model': { zh: '模型说明（本游戏的简化与局限）', en: 'Model notes (simplifications & limits)' },
    'info.model.l1': {
      zh: '元音音质是多维的：舌位高低、舌位前后、圆唇、长短……本游戏用特征向量建模并展示二维元音图。',
      en: 'Vowel quality is multidimensional: height, backness, rounding, length… This game models vowels as feature vectors on a 2-D chart.'
    },
    'info.model.l2': {
      zh: '“典型 / 偶见 / 罕见”是本游戏对跨语言频率的粗略分级，不是定律。真实语言中低化、央化、复元音化同样常见。',
      en: '“Typical / occasional / rare” is a rough typological scale, not a law. Lowering, reduction and diphthongization are all real and common.'
    },
    'info.model.l3': {
      zh: '真实音变作用于音系系统（同环境同变），并受重音、邻接音、词汇扩散、语言接触等影响——本游戏是教学简化。',
      en: 'Real sound change applies to the whole system (same change in the same environment), conditioned by stress, neighboring sounds, lexical diffusion, contact — this game is a teaching simplification.'
    },
    'info.model.l4': {
      zh: '音标均按 IPA 理解：[a] 为前开元音，与 [ɑ]（后开）不同。',
      en: 'Symbols are IPA: [a] is front open, distinct from [ɑ] (back open).'
    },
    'info.types': { zh: '演变类型速查', en: 'Change type cheat sheet' },
    'end.title': { zh: '时间到！', en: "Time's up!" },
    'end.stats': { zh: '最终统计', en: 'Final statistics' },
    'end.mistakes': { zh: '错题回顾', en: 'Mistake review' },
    'end.none': { zh: '没有错题 🎉', en: 'No mistakes 🎉' },
    'end.restart': { zh: '再来一局', en: 'Play again' },
    'aria.feedback': { zh: '答题反馈', en: 'Answer feedback' },
    'aria.words': { zh: '演变词对', en: 'Change pair' }
  };

  g.VL = g.VL || {};
  g.VL.DATA = {
    MONOPHTHONGS: MONOPHTHONGS,
    DIPHTHONGS: DIPHTHONGS,
    TYPES: TYPES,
    TIERS: TIERS,
    RULES: RULES,
    CONSONANTS: CONSONANTS,
    VOWEL_POOL: VOWEL_POOL,
    LONG_PROB: LONG_PROB,
    I18N: I18N
  };
})(typeof window !== 'undefined' ? window : globalThis);
