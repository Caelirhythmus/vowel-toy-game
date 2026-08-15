/* ============================================================
 * services：语音服务（端口 + 适配器）
 * - 单元音：自托管权威录音（Wikimedia Commons，CC BY-SA 3.0）
 * - 词形（伪词）主引擎：Piper 神经 TTS（显式音素输入，GPL-3.0 兼容，
 *   CC0 音色 en_US-joe-medium；onnxruntime-web MIT）
 * - 回退：espeak-ng WASM 合成（近似，GPL-3.0）
 * - 最后兜底：浏览器 Speech Synthesis（近似拼写朗读）
 * ============================================================ */
import type { Word } from '@/core';
import { VOWEL_AUDIO } from '@/config/audio';
import { symbolToTtsText, wordToTtsText } from '@/core/espeak';
import { synthWord } from './espeak';
import { synthPiperWord, warmupPiper } from './piper';

export interface SpeechService {
  /** 是否有任何可用发声能力 */
  supported(): boolean;
  /** 预热主引擎（后台下载/加载语音模型；幂等，可重复调用） */
  warmup(): void;
  /** 单元音：权威录音（缺失时退化为 TTS 近似） */
  playVowel(symbol: string): void;
  /** 词形（伪词）：Piper 神经 TTS 主引擎 → espeak-ng 回退 → TTS 兜底 */
  playWord(word: Word): Promise<boolean>;
  /** 任意文本：浏览器 TTS（近似，最后兜底） */
  speak(text: string): void;
}

function audioUrl(key: string): string {
  return `${import.meta.env.BASE_URL}audio/vowel-${key}.wav`;
}

function playFile(key: string): boolean {
  try {
    if (typeof Audio === 'undefined') return false;
    const el = new Audio(audioUrl(key));
    el.play().catch(() => {
      /* 自动播放被浏览器拦截时静默 */
    });
    return true;
  } catch {
    return false;
  }
}

function playWavBytes(bytes: Uint8Array): boolean {
  try {
    if (typeof Audio === 'undefined' || typeof Blob === 'undefined') return false;
    // slice() 复制出独立的 ArrayBuffer 视图，满足 BlobPart 类型约束
    const blob = new Blob([bytes.slice()], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const el = new Audio(url);
    el.onended = () => URL.revokeObjectURL(url);
    el.play().catch(() => URL.revokeObjectURL(url));
    return true;
  } catch {
    return false;
  }
}

export const speechService: SpeechService = {
  supported() {
    return typeof window !== 'undefined' && ('Audio' in window || 'speechSynthesis' in window);
  },

  warmup() {
    // 后台预热 Piper（幂等：sessionPromise 只会建立一次）；失败静默，点发音时自然回退
    void warmupPiper();
  },

  playVowel(symbol: string) {
    const key = VOWEL_AUDIO[symbol];
    if (key && playFile(key)) return;
    // 兜底：近似拼写（"ee"/"oo"…）；不再直接朗读 IPA 符号（TTS 会读成字母名）
    const tts = symbolToTtsText(symbol);
    if (tts) this.speak(tts);
  },

  async playWord(word: Word) {
    // 主引擎：Piper（神经 TTS，显式音素输入）
    const wav = await synthPiperWord(word);
    if (wav && wav.length > 44 && playWavBytes(wav)) return true;
    // 回退：espeak-ng（离线共振峰合成）
    const wav2 = await synthWord(word);
    if (wav2 && wav2.length > 44 && playWavBytes(wav2)) return true;
    // 最后兜底：近似拼写（"poobee"…）；不再朗读含 ˈ/IPA 的原文（曾听成字母名）
    const tts = wordToTtsText(word);
    if (tts) this.speak(tts);
    return false;
  },

  speak(text: string) {
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en';
      u.rate = 0.8;
      synth.speak(u);
    } catch {
      /* 忽略朗读失败 */
    }
  }
};
