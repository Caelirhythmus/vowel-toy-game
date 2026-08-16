/* ============================================================
 * 内容配置：发音资源（可配置化 —— 符号 → 录音文件 / espeak 助记符）
 *
 * 单元音：Wikimedia Commons 权威录音（CC BY-SA 3.0，
 * 见 public/audio/ATTRIBUTIONS.txt），已转码为通用 WAV 自托管。
 * 复元音：无权威录音，按用户决定不提供发音（仅保留图上标注）。
 * 词形/兜底：espeak-ng（GPL-3.0-or-later，见 THIRD_PARTY_NOTICES.md）
 * 离线合成，输入用其音素助记符（[[...]] 语法）。
 * ============================================================ */

/** 单元音 → 录音文件键（public/audio/vowel-{key}.wav） */
export const VOWEL_AUDIO: Record<string, string> = {
  i: 'i',
  y: 'y',
  e: 'e',
  ø: 'o-slash',
  ɛ: 'eps',
  œ: 'oe',
  æ: 'ae',
  a: 'a',
  ɑ: 'alpha',
  ɔ: 'open-o',
  o: 'o',
  u: 'u',
  ə: 'schwa'
};

/**
 * 单元音（含长音变体）→ espeak-ng 音素助记符。
 * 映射经 espeak-ng en-us 实证（2026-08）：a→æ(TRAP)、E→ɛ、O→ɔ、U→ʊ、
 * @→ə、A:/0→ɑː、i:→iː、E:→ɛː、O:→ɔː、o:→oː、u:→uː。
 * en-us 缺 [y ø œ a]（前圆唇/开前元音），就近近似：y→i、ø→e、œ→ɛ、a→æ。
 */
export const ESPEAK_MNEMONICS: Record<string, string> = {
  i: 'i', 'iː': 'i:',
  y: 'i', 'yː': 'i:',
  e: 'e', 'eː': 'e:',
  ø: 'e', 'øː': 'e:',
  ɛ: 'E', 'ɛː': 'E:',
  œ: 'E', 'œː': 'E:',
  æ: 'a', 'æː': 'a:',
  a: 'a', 'aː': 'a:',
  ɑ: '0', 'ɑː': '0',
  ɔ: 'O', 'ɔː': 'O:',
  o: 'o', 'oː': 'o:',
  u: 'u', 'uː': 'u:',
  ə: '@'
};

/** 复元音 → espeak 助记符序列（实证：aI→aɪ、aU→aʊ、eI→eɪ、@U→əʊ） */
export const DIPHTHONG_MNEMONICS: Record<string, string> = {
  aɪ: 'aI',
  aʊ: 'aU',
  eɪ: 'eI',
  əʊ: '@U'
};

/** 辅音 → espeak 助记符（与音素输入同形） */
export const ESPEAK_CONSONANTS: Record<string, string> = {
  b: 'b', p: 'p', m: 'm', d: 'd', t: 't', n: 'n', h: 'h', g: 'g', k: 'k'
};

/* ============================================================
 * Piper（神经 TTS，主引擎）：en_US-joe-medium（CC0）
 * - 模型/配置由 scripts/vendor-piper.mjs 预置到 public/vendor/piper/
 * - onnxruntime-web@1.18（esm/ 子目录 + wasm 在父目录，保留包结构）
 * - 音素名 → id 表在语音配置 .onnx.json 里，运行时拉取；
 *   此处只做“我们的符号 → Piper 音素名序列”（纯映射，可测）
 * - 模型源：多渠道候选（按顺序尝试，失败自动降级）。
 *   新增国内加速渠道（npmmirror/OSS 等）时只需往候选列表加条目。
 * ============================================================ */

/** 模型源候选：parts=分片列表 / url=单文件（绝对 URL 直接用，相对路径以站点根归一化）；
 *  chinaOnly=true 表示仅国内 IP 使用（如 Gitee 镜像，国外访问反而慢） */
export interface ModelCandidate {
  label: string;
  timeoutMs: number;
  parts?: readonly string[];
  totalBytes?: number;
  url?: string;
  knownBytes?: number;
  chinaOnly?: boolean;
}

/** float 模型 4 个分片的相对路径（随仓库提交，不可变；本地/同源渠道用） */
const FLOAT_PARTS_LOCAL = [
  'vendor/piper/en_US-joe-medium.onnx.part1',
  'vendor/piper/en_US-joe-medium.onnx.part2',
  'vendor/piper/en_US-joe-medium.onnx.part3',
  'vendor/piper/en_US-joe-medium.onnx.part4'
] as const;

/** float 模型 4 个分片的 jsDelivr 绝对 URL（CDN 镜像，分片不可变 → 无 @main 缓存问题） */
function jsdelivrParts(host: string): string[] {
  return FLOAT_PARTS_LOCAL.map(
    (p) => `https://${host}/gh/Caelirhythmus/vowel-toy-game@main/public/${p}`
  );
}

/**
 * Gitee 镜像（国内加速渠道，chinaOnly）：
 * 在 gitee.com 从 GitHub 导入本仓库（含已提交的分片文件）；
 * 国内 IP 首选（raw 直连快），国外 IP 跳过（访问 Gitee 反而慢）。
 * 仓库名/分支与下方常量一致即直接生效；若不同改这几行即可。
 */
const GITEE_OWNER = 'celestial-rhythm';
const GITEE_REPO = 'vowel-toy-game';
const GITEE_BRANCH = 'main';
function giteeUrl(relPath: string): string {
  return `https://gitee.com/${GITEE_OWNER}/${GITEE_REPO}/raw/${GITEE_BRANCH}/public/${relPath}`;
}

export const PIPER_VOICE = {
  id: 'en_US-joe-medium',
  /**
   * 音质优先架构 + IP 自适应：
   * - 国内 IP：Gitee 镜像（国内直连快）→ jsDelivr → 本地
   * - 国外 IP/代理：跳过 Gitee，jsDelivr → 本地
   * - 移动：int8 小模型为主（float 60MB 在手机端下载慢、会话创建易超时）
   * - 全失败 → 降级 espeak/TTS
   */
  modelPath: 'vendor/piper/en_US-joe-medium.int8.onnx',
  /** 已知字节数：用于下载进度（content-length 可能因服务器压缩/分块缺失而失真） */
  modelBytes: 16599901,
  modelBytesFloat: 63201294,
  /** 桌面候选：Gitee（仅国内）→ jsDelivr cdn → gcore → 本地分片 → int8 本地 */
  modelCandidatesDesktop: [
    {
      label: 'float Gitee 镜像',
      timeoutMs: 90_000,
      chinaOnly: true,
      parts: FLOAT_PARTS_LOCAL.map((p) => giteeUrl(p)),
      totalBytes: 63201294
    },
    {
      label: 'float jsDelivr CDN',
      timeoutMs: 90_000,
      parts: jsdelivrParts('cdn.jsdelivr.net'),
      totalBytes: 63201294
    },
    {
      label: 'float jsDelivr Gcore',
      timeoutMs: 90_000,
      parts: jsdelivrParts('gcore.jsdelivr.net'),
      totalBytes: 63201294
    },
    {
      label: 'float 本地分片',
      timeoutMs: 60_000,
      parts: FLOAT_PARTS_LOCAL,
      totalBytes: 63201294
    },
    { label: 'int8 本地', timeoutMs: 60_000, url: 'vendor/piper/en_US-joe-medium.int8.onnx', knownBytes: 16599901 }
  ] as ModelCandidate[],
  /** 移动候选：int8 Gitee（仅国内）→ jsDelivr → 本地 */
  modelCandidatesMobile: [
    {
      label: 'int8 Gitee 镜像',
      timeoutMs: 60_000,
      chinaOnly: true,
      url: giteeUrl('vendor/piper/en_US-joe-medium.int8.onnx'),
      knownBytes: 16599901
    },
    {
      label: 'int8 jsDelivr',
      timeoutMs: 60_000,
      url: 'https://cdn.jsdelivr.net/gh/Caelirhythmus/vowel-toy-game@main/public/vendor/piper/en_US-joe-medium.int8.onnx',
      knownBytes: 16599901
    },
    { label: 'int8 本地', timeoutMs: 90_000, url: 'vendor/piper/en_US-joe-medium.int8.onnx', knownBytes: 16599901 }
  ] as ModelCandidate[],
  configPath: 'vendor/piper/en_US-joe-medium.onnx.json',
  /** onnxruntime-web 目录（esm 入口 + wasm 二进制） */
  ortPath: 'vendor/onnxruntime-web'
} as const;

/** 元音（含长音/复元音）→ Piper 音素名序列（复元音按字符分解；en-us 缺 [y ø œ a] 就近近似） */
export const PIPER_VOWEL_TOKENS: Record<string, string[]> = {
  i: ['i'], 'iː': ['i', 'ː'],
  y: ['i'], 'yː': ['i', 'ː'],
  e: ['e'], 'eː': ['e', 'ː'],
  ø: ['e'], 'øː': ['e', 'ː'],
  ɛ: ['ɛ'], 'ɛː': ['ɛ', 'ː'],
  œ: ['ɛ'], 'œː': ['ɛ', 'ː'],
  æ: ['æ'], 'æː': ['æ', 'ː'],
  a: ['æ'], 'aː': ['æ', 'ː'],
  ɑ: ['ɑ'], 'ɑː': ['ɑ', 'ː'],
  ɔ: ['ɔ'], 'ɔː': ['ɔ', 'ː'],
  o: ['o'], 'oː': ['o', 'ː'],
  u: ['u'], 'uː': ['u', 'ː'],
  ə: ['ə'],
  aɪ: ['a', 'ɪ'],
  aʊ: ['a', 'ʊ'],
  eɪ: ['e', 'ɪ'],
  əʊ: ['o', 'ʊ']
};

/** 辅音 → Piper 音素名（注意 g 用 ɡ，joe 音素表无 ASCII g） */
export const PIPER_CONSONANTS: Record<string, string> = {
  b: 'b', p: 'p', m: 'm', d: 'd', t: 't', n: 'n', h: 'h', g: 'ɡ', k: 'k'
};
