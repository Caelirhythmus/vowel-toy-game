/* ============================================================
 * services：语音服务（端口 + 适配器）
 * 当前适配器：Web Speech API（浏览器内置，零资源）
 * 未来可替换为 espeak-ng WASM / 预录音频，UI 层不感知实现。
 * ============================================================ */

export interface SpeechService {
  supported(): boolean;
  /** 朗读文本（IPA 符号尽量按英语发音规则读） */
  speak(text: string): void;
}

export const speechService: SpeechService = {
  supported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  },
  speak(text: string) {
    if (!this.supported()) return;
    try {
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
