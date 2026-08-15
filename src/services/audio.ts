/* ============================================================
 * services：语音服务（端口 + 适配器）
 * - 单元音：自托管权威录音（Wikimedia Commons，CC BY-SA 3.0）
 * - 词形（伪词）：espeak-ng WASM 离线合成（近似，GPL-3.0）
 * - 最后兜底：浏览器 Speech Synthesis（仅在录音缺失时）
 * ============================================================ */
import type { Word } from '@/core';
import { wordText } from '@/core';
import { VOWEL_AUDIO } from '@/config/audio';
import { synthWord } from './espeak';

export interface SpeechService {
  /** 是否有任何可用发声能力 */
  supported(): boolean;
  /** 单元音：权威录音（缺失时退化为 TTS 近似） */
  playVowel(symbol: string): void;
  /** 词形（伪词）：espeak-ng 离线合成；失败退化为 TTS 近似 */
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

  playVowel(symbol: string) {
    const key = VOWEL_AUDIO[symbol];
    if (key && playFile(key)) return;
    this.speak(symbol); // 兜底（正常不会走到）
  },

  async playWord(word: Word) {
    const wav = await synthWord(word);
    if (wav && wav.length > 44 && playWavBytes(wav)) return true;
    this.speak(wordText(word)); // espeak 失败时 TTS 近似兜底
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
