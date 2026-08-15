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
      zh: '无条件的舌位下降、开口度增大。真实存在但远不如高化常见，如 17 世纪英语 ʊ→ʌ。',
      en: 'Unconditioned lowering. Real but far less common than raising, e.g. English ʊ→ʌ in the 17th century.'
    },
    sysDesc: { zh: '元音低化（开口度增大）', en: 'Vowel lowering (larger opening)' },
    transform: (v) => {
      const b = resolveVowel(v);
      if (!b || v.s === 'ə' || v.diph) return null;
      return byFeatures(b.height - 1, b.back, b.round, v.long);
    },
    examples: [
      { text: 'ʊ → ʌ', srcZh: '英语 FOOT–STRUT 分裂（约 17 世纪）', srcEn: 'English FOOT–STRUT split (c. 17th c.)' }
    ]
  },
  {
    id: 'front-umlaut', type: 'fronting', tier: 'typical',
    env: { kind: 'before-i', labelZh: '后接 i', labelEn: 'before i' },
    name: { zh: '前化（i-umlaut 型）', en: 'Fronting (i-umlaut type)' },
    desc: {
      zh: '后元音在后接 i/j 时前化（常伴随高化）：u→y、o→ø、a→e。典型的环境触发音变。',
      en: 'Back vowels front (often raising too) before a following i/j: u→y, o→ø, a→e. A typical environment-triggered change.'
    },
    sysDesc: { zh: '后元音前化（后接 i）', en: 'back vowels front before i' },
    transform: (v) => {
      if (v.diph || v.s === 'ə') return null;
      const map: Record<string, string> = { u: 'y', o: 'ø', ɔ: 'œ', ɑ: 'æ', a: 'e' };
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
      zh: '短高元音裂化：i→eɪ、u→əʊ。汉语北方方言有“高元音复化”现象。',
      en: 'Short high vowels break: i→eɪ, u→əʊ. Known as “high-vowel breaking” in some Chinese dialects.'
    },
    sysDesc: { zh: '短高元音复化 i→eɪ、u→əʊ', en: 'short high vowels break' },
    transform: (v) => {
      const map: Record<string, string> = { i: 'eɪ', u: 'əʊ' };
      const t = !v.long && map[v.s] ? map[v.s] : null;
      return t ? { s: t, long: false, diph: true } : null;
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
    transform: (v) => {
      const map: Record<string, string> = { aɪ: 'e', aʊ: 'o', eɪ: 'e', əʊ: 'o' };
      const t = v.diph ? map[v.s] : null;
      return t ? { s: t, long: false, diph: false } : null;
    },
    examples: [
      { text: 'ae → e', srcZh: '拉丁语 ae→e（后古典时期）', srcEn: 'Latin ae→e (post-Classical)' }
    ]
  }
];
