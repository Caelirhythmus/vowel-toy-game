/* ============================================================
 * 领域类型（core 层与 config 层共享，零依赖）
 * ============================================================ */

/** 元音基础特征（IPA 单元音） */
export interface VowelFeatures {
  symbol: string;
  /** 舌位高低：0=开 1=次开 2=半开 3=半闭 4=闭（数值越大开口越小） */
  height: number;
  /** 舌位前后：0=前 1=央 2=后 */
  back: 0 | 1 | 2;
  /** 圆唇 */
  round: boolean;
}

/** 复元音定义（图上按其起点定位） */
export interface DiphthongDef {
  symbol: string;
  /** 定位用的起点单元音 symbol */
  start: string;
  /** 标签相对起点元音的偏移（分数坐标，用于错开同起点标签） */
  labelOffset: { dx: number; dy: number };
}

/** 词内元音（精简载体，携带长短/复元音标记） */
export interface WordVowel {
  s: string;
  long: boolean;
  diph: boolean;
}

/** CVCV 词形；stress 表示重音所在元音位（0 或 1） */
export interface Word {
  c: [string, string];
  v: [WordVowel, WordVowel];
  stress: 0 | 1;
}

/** 频率档：跨语言粗略估计（教学简化，非定律） */
export type Tier = 'typical' | 'occasional' | 'rare';

/** 演变类型 */
export type ChangeType =
  | 'raising'
  | 'lowering'
  | 'fronting'
  | 'backing'
  | 'reduction'
  | 'diphthongization'
  | 'monophthongization';

/** 环境条件 */
export type EnvKind = 'unstressed' | 'long' | 'stressed-next-a' | 'before-i';

export interface RuleEnv {
  kind: EnvKind;
  labelZh: string;
  labelEn: string;
}

export interface RuleExample {
  text: string;
  srcZh: string;
  srcEn: string;
}

export interface LocalizedText {
  zh: string;
  en: string;
}

/** 演变规则：声明式内容 + 行为（transform） */
export interface Rule {
  id: string;
  type: ChangeType;
  tier: Tier;
  env: RuleEnv | null;
  name: LocalizedText;
  desc: LocalizedText;
  sysDesc: LocalizedText;
  /**
   * 语系/地域倾向说明：同一演变在不同语系中的频率与触发条件不同
   * （如弱化多见于重音语言；i-umlaut 集中于日耳曼语）。
   * 必填：教学上“泛语系平均”的档位需要语系视角的补充说明。
   */
  familyNote: LocalizedText;
  /**
   * 语系上下文频率覆盖（架构预留，暂未启用）：
   * 未来“语系模式”玩法按 family 覆盖 tier（同一规则在英语史/
   * 汉语史/罗曼史中的档位可能不同）。启用前需逐条文献审慎定档。
   */
  familyTiers?: { family: string; tier: Tier }[];
  /** 输入词内元音，返回新元音或 null（不适用） */
  transform: (v: WordVowel) => WordVowel | null;
  examples: RuleExample[];
}

export interface TypeOption {
  id: ChangeType;
  zh: string;
  en: string;
}

export interface TierOption {
  id: Tier;
  zh: string;
  en: string;
}

export type QuestionKind = 'type' | 'freq' | 'system';

export interface PairQuestion {
  kind: 'type' | 'freq';
  rule: Rule;
  wordA: Word;
  wordB: Word;
  /** 发生变化的元音位 */
  pos: 0 | 1;
  /** 正确答案：type → ChangeType id；freq → Tier id */
  answer: string;
  /** 频率题候选档位（按钮按此渲染）：easy 两档 / hard 三档，保证答案分布不偏斜 */
  tiers?: Tier[];
  /** 系统题生成兜底退化为词对题时置 true */
  fallback?: boolean;
}

export interface SystemQuestion {
  kind: 'system';
  rule: Rule;
  words: Word[];
  /** 发生变化的词下标 */
  answer: number[];
}

export type Question = PairQuestion | SystemQuestion;

export type GameMode = 'mixed' | 'type' | 'freq' | 'system';
export type Difficulty = 'easy' | 'hard';

export interface GameSettings {
  mode: GameMode;
  difficulty: Difficulty;
  /** 0 = 不限时 */
  timeSec: number;
}

export interface GameStats {
  correct: number;
  incorrect: number;
  total: number;
  streak: number;
  bestStreak: number;
}

export interface Mistake {
  q: Question;
  chosen: unknown;
}

export interface AnswerResult {
  ok: boolean;
  answerLabel: string;
}

export type GamePhase = 'idle' | 'playing' | 'answered' | 'over';

export interface GameState {
  phase: GamePhase;
  settings: GameSettings;
  question: Question | null;
  lastResult: AnswerResult | null;
  stats: GameStats;
  mistakes: Mistake[];
  timer: { deadline: number; leftMs: number };
}

export type Lang = 'zh' | 'en';
