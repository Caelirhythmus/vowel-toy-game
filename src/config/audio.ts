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

/** 复元音 → espeak 助记符序列（实证：aI→aɪ、aU→aʊ、eI→eɪ、@U→əʊ；oU→oʊ 美式 goat；
 *  jE→jɛ、wO→wɔ 意大利语上升复元音，espeak en-us 半元音 j/w + 开中元音 E/O） */
export const DIPHTHONG_MNEMONICS: Record<string, string> = {
  aɪ: 'aI',
  aʊ: 'aU',
  eɪ: 'eI',
  əʊ: '@U',
  oʊ: 'oU',
  jɛ: 'jE',
  wɔ: 'wO'
};

/** 辅音 → espeak 助记符（与音素输入同形） */
export const ESPEAK_CONSONANTS: Record<string, string> = {
  b: 'b', p: 'p', m: 'm', d: 'd', t: 't', n: 'n', h: 'h', g: 'g', k: 'k'
};

/* ============================================================
 * Piper（神经 TTS，主引擎）：en_US-joe-medium（CC0）
 * - 模型/配置由 scripts/vendor-piper.mjs 预置到 public/vendor/piper/
 * - onnxruntime-web@1.20.x（根目录 ort.min.mjs + 线程版 wasm 及 glue；
 *   1.18 的 esm/ 子目录已移除；wasm 经 wasmBinary 预取注入 Cache Storage）
 * - 音素名 → id 表在语音配置 .onnx.json 里，运行时拉取；
 *   此处只做“我们的符号 → Piper 音素名序列”（纯映射，可测）
 * - 模型源：多渠道候选（按顺序尝试，失败自动降级）。
 *   新增国内加速渠道（npmmirror/OSS 等）时只需往候选列表加条目。
 * ============================================================ */

/** 模型源候选：parts=分片列表 / url=单文件 / tgz=需解压的 npm 包 tarball
 *  （绝对 URL 直接用，相对路径以站点根归一化）；
 *  chinaOnly=true 表示仅国内 IP 使用——当前无候选使用此标记
 *  （Gitee 实测不可用已移除；未来接入国内渠道时需在 piper.ts 恢复 IP 检测） */
export interface ModelCandidate {
  label: string;
  timeoutMs: number;
  parts?: readonly string[];
  totalBytes?: number;
  url?: string;
  knownBytes?: number;
  tgz?: string;
  tgzFile?: string;
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
 * 国内加速渠道说明（2026-08 实测）：
 * - Gitee raw 不可用：①大文件（>10MB）匿名访问返回 403
 *   "large file require login for access."；②raw.giteeusercontent.com
 *   响应无 Access-Control-Allow-Origin，浏览器跨域 fetch 必被拦截。
 * - 可行方案（需账号，接入时在此加候选）：
 *   a) npm 包 + npmmirror：tgz 需浏览器端解压（fflate）
 *   b) 腾讯云 COS / 阿里云 OSS：BGP 直链 + CORS
 */

export const PIPER_VOICE = {
  id: 'en_US-joe-medium',
  /**
   * 音质优先架构：
   * - 桌面：float npm 包（npmjs tarball，直连实测 2.6MB/s，CORS ✓）
   *   → jsDelivr 多节点 → 本地分片 → int8
   * - 移动：int8 小模型为主（float 60MB 在手机端下载慢、会话创建易超时）
   * - 全失败 → 降级 espeak/TTS
   */
  modelPath: 'vendor/piper/en_US-joe-medium.int8.onnx',
  /** 已知字节数：用于下载进度（content-length 可能因服务器压缩/分块缺失而失真） */
  modelBytes: 16599901,
  modelBytesFloat: 63201294,
  /** 桌面候选：float npmjs → jsDelivr cdn → gcore → 本地分片 → int8 本地 */
  modelCandidatesDesktop: [
    {
      label: 'float npmjs',
      timeoutMs: 120_000,
      tgz: 'https://registry.npmjs.org/vowel-lab-voices-float/-/vowel-lab-voices-float-0.1.0.tgz',
      tgzFile: 'package/float.onnx',
      knownBytes: 63201294
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
  /** 移动候选：int8 npmjs → jsDelivr → 本地 */
  modelCandidatesMobile: [
    {
      label: 'int8 npmjs',
      timeoutMs: 60_000,
      tgz: 'https://registry.npmjs.org/vowel-lab-voices-int8/-/vowel-lab-voices-int8-0.1.0.tgz',
      tgzFile: 'package/int8.onnx',
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
  /** onnxruntime-web 目录（根目录 ESM 入口 ort.min.mjs + 线程版 wasm 及 glue） */
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
  əʊ: ['o', 'ʊ'],
  oʊ: ['o', 'ʊ'],
  jɛ: ['j', 'ɛ'],
  wɔ: ['w', 'ɔ']
};

/** 辅音 → Piper 音素名（注意 g 用 ɡ，joe 音素表无 ASCII g） */
export const PIPER_CONSONANTS: Record<string, string> = {
  b: 'b', p: 'p', m: 'm', d: 'd', t: 't', n: 'n', h: 'h', g: 'ɡ', k: 'k'
};
