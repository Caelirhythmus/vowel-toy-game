/* ============================================================
 * 内容配置：演变规则表（可配置化 —— 内容与引擎解耦）
 * transform 返回新词内元音或 null（不适用）；环境条件见 env
 * ============================================================ */
import type { Rule } from '@/core/types';
import { byFeatures, resolveVowel } from '@/core/vowels';

export const RULES: Rule[] = [
  {
    id: 'raise', type: 'raising', tier: 'typical', env: null,
    name: { zh: '高化', en: 'Raising' },
    desc: {
      zh: '舌位升高、开口度减小，如 a→æ→ɛ→e→i 链。链移（chain shift）中极常见，是汉语历史音韵学“元音高化”倾向的体现。',
      en: 'Tongue height rises and jaw opening decreases (e.g. a→æ→ɛ→e→i). Very common in chain shifts; the classic “vowel raising” tendency in Chinese historical phonology.'
    },
    sysDesc: { zh: '元音高化（开口度减小）', en: 'Vowel raising (smaller opening)' },
    familyNote: {
      zh: '高化跨语言普遍；汉语史研究传统尤重此倾向（王力）',
      en: 'Raising is common cross-linguistically; Chinese historical phonology has long emphasized it (Wang Li)'
    },
    familyTiers: [
      { family: 'romance', tier: 'rare' },
      { family: 'slavic', tier: 'rare' }
    ],
    transform: (v) => {
      const b = resolveVowel(v);
      if (!b || v.s === 'ə' || v.diph) return null;
      return byFeatures(b.height + 1, b.back, b.round, v.long);
    },
    examples: [
      { text: 'eː → iː', srcZh: '英语元音大推移（Great Vowel Shift）', srcEn: 'English Great Vowel Shift' },
      { text: 'a → æ', srcZh: '高化倾向（王力《汉语史稿》）', srcEn: 'raising tendency (Wang Li)' }
    ]
  },
  {
    id: 'lower-a', type: 'lowering', tier: 'typical',
    env: { kind: 'stressed-next-a', labelZh: '重读音节且下一音节为 a', labelEn: 'stressed syllable before a' },
    name: { zh: '低化（a-mutation 型）', en: 'Lowering (a-mutation type)' },
    desc: {
      zh: '重读音节里的 u，若下一音节含 a，则低化为 o。这是有环境条件的典型低化。',
      en: 'Stressed u lowers to o when the next syllable contains a. A typical conditioned lowering.'
    },
    sysDesc: { zh: '重读音节的 u → o（后接 a 音节）', en: 'stressed u → o before a-syllable' },
    familyNote: {
      zh: 'a-mutation 是日耳曼语的特征机制',
      en: 'a-mutation is a hallmark of Germanic'
    },
    familyExcluded: ['english', 'chinese', 'romance', 'slavic'],
    transform: (v) => {
      if (v.s === 'u' && !v.long) return { s: 'o', long: false, diph: false };
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
      zh: '无条件的舌位下降、开口度增大。真实存在但远不如高化常见，如通俗拉丁语 ŏ→ɔ（意大利语 fɔrte）。',
      en: 'Unconditioned lowering. Real but far less common than raising, e.g. Vulgar Latin ŏ→ɔ (Italian forte).'
    },
    sysDesc: { zh: '元音低化（开口度增大）', en: 'Vowel lowering (larger opening)' },
    familyNote: {
      zh: '无条件低化各语系皆罕见；罗曼语的低化多为条件性（重读开音节）',
      en: 'Unconditioned lowering is rare everywhere; Romance lowering is usually conditioned (stressed open syllables)'
    },
    familyTiers: [
      { family: 'english', tier: 'occasional' },
      { family: 'romance', tier: 'typical' }
    ],
    familyExcluded: ['chinese', 'slavic'],
    familyExamples: {
      english: [
        { text: 'ʊ → ʌ', srcZh: '英语 FOOT–STRUT 分裂（but，约 17 世纪）', srcEn: 'English FOOT–STRUT split (but, c. 17th c.)' }
      ],
      romance: [
        { text: 'ŏ → ɔ', srcZh: '通俗拉丁语长短合并的无条件质变（forte）', srcEn: 'Vulgar Latin unconditioned lowering (forte)' }
      ]
    },
    transform: (v) => {
      const b = resolveVowel(v);
      if (!b || v.s === 'ə' || v.diph) return null;
      return byFeatures(b.height - 1, b.back, b.round, v.long);
    },
    examples: [
      { text: 'o → ɔ', srcZh: '通俗拉丁语 ŏ→ɔ（意大利语 forte [ˈfɔrte]）', srcEn: 'Vulgar Latin ŏ→ɔ (Italian forte)' }
    ]
  },
  {
    id: 'front-umlaut', type: 'fronting', tier: 'typical',
    env: { kind: 'before-i', labelZh: '后接 i', labelEn: 'before i' },
    name: { zh: '前化（i-umlaut 型）', en: 'Fronting (i-umlaut type)' },
    desc: {
      zh: '后元音在后接 i/j 时前化（常伴随高化）：u→y、o→ø、a→æ。典型的环境触发音变。',
      en: 'Back vowels front (often raising too) before a following i/j: u→y, o→ø, a→æ. A typical environment-triggered change.'
    },
    sysDesc: { zh: '后元音前化（后接 i）', en: 'back vowels front before i' },
    familyNote: {
      zh: 'i-umlaut 型前化集中于日耳曼语；法语 u→y 是无条件前化的著名特例',
      en: 'i-umlaut fronting clusters in Germanic; French u→y is a famous unconditioned case'
    },
    // 语系模式：i-umlaut 完成于古英语期（切片 1100–1700 之外），
    // 其余语系无此机制；法语 u→y 需独立的"无条件前化"规则（v2 候选）
    familyExcluded: ['english', 'chinese', 'romance', 'slavic'],
    transform: (v) => {
      if (v.diph || v.s === 'ə') return null;
      // i-umlaut 的直接结果是 æ（Gast/Gäste、man/men 的古英语 æ）；
      // e 是之后高化的产物，不属于 umlaut 本身
      const map: Record<string, string> = { u: 'y', o: 'ø', ɔ: 'œ', ɑ: 'æ', a: 'æ' };
      const t = map[v.s];
      return t ? { s: t, long: v.long, diph: false } : null;
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
    familyNote: {
      zh: '后化见于法语等罗曼语变体与部分斯拉夫语',
      en: 'Backing occurs in French/Romance varieties and some Slavic languages'
    },
    // 英语史 BATH 后化在 18c（切片外）；汉语/斯拉夫史证据不足
    familyExcluded: ['english', 'chinese', 'slavic'],
    familyExamples: {
      romance: [
        { text: 'a → ɑ', srcZh: '法语部分地区后化', srcEn: 'French a→ɑ in some varieties' }
      ]
    },
    transform: (v) => {
      const b = resolveVowel(v);
      if (!b || v.s === 'ə' || v.diph) return null;
      return byFeatures(b.height, b.back + 2, b.round, v.long);
    },
    examples: [
      { text: 'a → ɑ', srcZh: '法语部分地区 a→ɑ', srcEn: 'French a→ɑ in some varieties' }
    ]
  },
  {
    id: 'reduce', type: 'reduction', tier: 'typical',
    env: { kind: 'unstressed', labelZh: '非重读', labelEn: 'unstressed' },
    name: { zh: '央化/弱化', en: 'Centralization / Reduction' },
    desc: {
      zh: '非重读元音央化为 ə。弱化几乎只发生在非重读位置，是所有重音语言的家常便饭。',
      en: 'Unstressed vowels centralize to ə. Reduction almost only affects unstressed syllables.'
    },
    sysDesc: { zh: '非重读元音 → ə', en: 'unstressed vowels → ə' },
    familyNote: {
      zh: '弱化多见于重音语言（英/德/俄）；音节计时语言（西/意/日）少得多',
      en: 'Reduction thrives in stress-timed languages (En/De/Ru); far less in syllable-timed ones (Es/It/Ja)'
    },
    familyTiers: [
      { family: 'chinese', tier: 'occasional' },
      { family: 'romance', tier: 'occasional' }
    ],
    familyExamples: {
      chinese: [
        { text: '非重读 → ə', srcZh: '北京话轻声央化（“哥哥” kɤ→kə）', srcEn: 'Mandarin neutral-tone reduction (gēge kɤ→kə)' }
      ],
      slavic: [
        { text: 'o / a → ə', srcZh: '俄语 аканье（非重读，14 世纪起）', srcEn: 'Russian akan’ye (unstressed, from 14th c.)' }
      ]
    },
    transform: (v) => {
      if (v.diph || v.s === 'ə') return null;
      return { s: 'ə', long: false, diph: false };
    },
    examples: [
      { text: 'a → ə', srcZh: '英语 about [əˈbaʊt]；俄语 аканье', srcEn: 'English about [əˈbaʊt]; Russian akan’ye' }
    ]
  },
  {
    id: 'diph-long', type: 'diphthongization', tier: 'typical',
    env: { kind: 'long', labelZh: '长元音', labelEn: 'long vowel' },
    name: { zh: '复元音化（长元音）', en: 'Diphthongization (long vowels)' },
    desc: {
      zh: '长元音裂化为复元音：iː→aɪ、uː→aʊ、eː→eɪ、oː→əʊ。元音大推移的典型环节，常与高化链伴生。',
      en: 'Long vowels break into diphthongs: iː→aɪ, uː→aʊ, eː→eɪ, oː→əʊ. A hallmark of the Great Vowel Shift.'
    },
    sysDesc: { zh: '长元音复元音化', en: 'long vowels diphthongize' },
    familyNote: {
      zh: '长元音复化是英语元音大推移的标志；德语、荷兰语史亦有',
      en: 'Long-vowel breaking marks the English GVS; also in German and Dutch history'
    },
    // 官话/罗曼/斯拉夫切片内无音位长度对立
    familyExcluded: ['chinese', 'romance', 'slavic'],
    transform: (v) => {
      const map: Record<string, string> = { i: 'aɪ', u: 'aʊ', e: 'eɪ', o: 'əʊ' };
      const t = v.long && map[v.s] ? map[v.s] : null;
      return t ? { s: t, long: false, diph: true } : null;
    },
    examples: [
      { text: 'iː → aɪ', srcZh: '英语元音大推移', srcEn: 'English Great Vowel Shift' }
    ]
  },
  {
    id: 'diph-short', type: 'diphthongization', tier: 'occasional', env: null,
    name: { zh: '复元音化（高元音复化）', en: 'Diphthongization (high-vowel breaking)' },
    desc: {
      zh: '短高元音裂化：i→eɪ、u→oʊ。汉语北方方言有“高元音复化”现象（济南话等 i→ei、u→ou）。',
      en: 'Short high vowels break: i→eɪ, u→oʊ. Known as “high-vowel breaking” in some Chinese dialects (Jinan i→ei, u→ou).'
    },
    sysDesc: { zh: '短高元音复化 i→eɪ、u→oʊ', en: 'short high vowels break' },
    familyNote: {
      zh: '短高元音复化集中于汉语官话方言',
      en: 'Short high-vowel breaking concentrates in Mandarin dialects'
    },
    familyTiers: [{ family: 'chinese', tier: 'typical' }],
    familyExcluded: ['english', 'romance', 'slavic'],
    familyExamples: {
      chinese: [
        { text: 'i → eɪ', srcZh: '济南等官话方言高元音复化', srcEn: 'Jinan high-vowel breaking' },
        { text: 'u → oʊ', srcZh: '济南等官话方言高元音复化', srcEn: 'Jinan high-vowel breaking' }
      ]
    },
    transform: (v) => {
      // 汉语高元音复化的 ou 起点是后元音 o（[ou]），不是英式 goat 的央起点 əʊ
      const map: Record<string, string> = { i: 'eɪ', u: 'oʊ' };
      const t = !v.long && map[v.s] ? map[v.s] : null;
      return t ? { s: t, long: false, diph: true } : null;
    },
    examples: [
      { text: 'i → eɪ', srcZh: '汉语北方方言高元音复化', srcEn: 'high-vowel breaking, N. Chinese dialects' },
      { text: 'u → oʊ', srcZh: '汉语北方方言高元音复化', srcEn: 'high-vowel breaking, N. Chinese dialects' }
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
    familyNote: {
      zh: '单元音化在拉丁语、希腊语、英语史均常见，跨语系普遍',
      en: 'Monophthongization recurs in Latin, Greek and English history — widespread'
    },
    familyTiers: [{ family: 'english', tier: 'occasional' }],
    familyExcluded: ['chinese'],
    familyExamples: {
      english: [
        { text: 'aɪ → e', srcZh: '中古英语 ai→ɛː（day，14 世纪）', srcEn: 'ME ai→ɛː (day, 14th c.)' }
      ],
      slavic: [
        { text: '*ai → ě', srcZh: '共同斯拉夫语双元音单化', srcEn: 'Common Slavic diphthong monophthongization' }
      ]
    },
    transform: (v) => {
      // jɛ→ɛ、wɔ→ɔ：意大利语"移动双元音"去半元音（部分方言单化）
      const map: Record<string, string> = { aɪ: 'e', aʊ: 'o', eɪ: 'e', əʊ: 'o', oʊ: 'o', jɛ: 'ɛ', wɔ: 'ɔ' };
      const t = v.diph ? map[v.s] : null;
      return t ? { s: t, long: false, diph: false } : null;
    },
    examples: [
      { text: 'ae → e', srcZh: '拉丁语 ae→e（后古典时期）', srcEn: 'Latin ae→e (post-Classical)' }
    ]
  },
  {
    id: 'rom-diph', type: 'diphthongization', tier: 'rare',
    env: { kind: 'stressed-open-syllable', labelZh: '重读开音节', labelEn: 'stressed open syllable' },
    name: { zh: '复元音化（重读开音节中元音）', en: 'Diphthongization (mid vowels, stressed open syllables)' },
    desc: {
      zh: '短中元音在重读开音节中裂化为上升复元音：ɛ→jɛ、ɔ→wɔ。意大利语史的典型环节（pedem→piede、bŏnum→buono）。',
      en: 'Short mid vowels break into rising diphthongs in stressed open syllables: ɛ→jɛ, ɔ→wɔ. A hallmark of Italian (pedem→piede, bŏnum→buono).'
    },
    sysDesc: { zh: '重读开音节中 ɛ→jɛ、ɔ→wɔ', en: 'ɛ→jɛ, ɔ→wɔ in stressed open syllables' },
    familyNote: {
      zh: '重读开音节的中元音复化是意大利语等罗曼语支的特征（同一复化类型在英语史=长元音、汉语史=短高元音）',
      en: 'Mid-vowel breaking in stressed open syllables is characteristic of Italian/Romance (vs. long-vowel breaking in English, high-vowel breaking in Chinese)'
    },
    familyTiers: [{ family: 'romance', tier: 'typical' }],
    familyExcluded: ['english', 'chinese', 'slavic'],
    familyExamples: {
      romance: [
        { text: 'ɛ → jɛ', srcZh: '意大利语史 pedem→piede（重读开音节）', srcEn: 'Italian pedem→piede (stressed open syllable)' },
        { text: 'ɔ → wɔ', srcZh: '意大利语史 bŏnum→buono', srcEn: 'Italian bŏnum→buono' }
      ]
    },
    transform: (v) => {
      const map: Record<string, string> = { ɛ: 'jɛ', ɔ: 'wɔ' };
      const t = !v.long && map[v.s] ? map[v.s] : null;
      return t ? { s: t, long: false, diph: true } : null;
    },
    examples: [
      { text: 'ɛ → jɛ', srcZh: '意大利语史 pedem→piede（重读开音节）', srcEn: 'Italian pedem→piede (stressed open syllable)' }
    ]
  }
];
