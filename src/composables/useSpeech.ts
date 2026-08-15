/* ============================================================
 * composables：useSpeech —— 发音服务的响应式接线
 * 单例：模块级 ref，把 piper 加载状态暴露给 UI（按钮提示“加载中…”）
 * ============================================================ */
import { ref } from 'vue';
import { onPiperStatus, type PiperStatus } from '@/services/piper';
import { speechService } from '@/services/audio';

const status = ref<PiperStatus>('idle');
let subscribed = false;

function ensureSubscribed() {
  if (subscribed) return;
  subscribed = true;
  onPiperStatus((s) => {
    status.value = s;
  });
}

export function useSpeech() {
  ensureSubscribed();

  /** 预热主引擎（游戏开始时调用；幂等） */
  function warmup() {
    speechService.warmup();
  }

  return { status, warmup };
}
