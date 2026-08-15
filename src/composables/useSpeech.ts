/* ============================================================
 * composables：useSpeech —— 发音服务的响应式接线
 * 单例：模块级 ref，把 piper 加载状态/进度暴露给 UI（按钮提示）
 * ============================================================ */
import { ref } from 'vue';
import { onPiperStatus, type PiperStatus } from '@/services/piper';
import { speechService } from '@/services/audio';

const status = ref<PiperStatus>('idle');
/** 下载进度百分比（0-100）；未知或非下载阶段为 null */
const progress = ref<number | null>(null);
let subscribed = false;

function ensureSubscribed() {
  if (subscribed) return;
  subscribed = true;
  onPiperStatus((s, pct) => {
    status.value = s;
    progress.value = s === 'loading' ? (pct ?? null) : null;
  });
}

export function useSpeech() {
  ensureSubscribed();

  /** 预热主引擎（页面挂载后调用；幂等） */
  function warmup() {
    speechService.warmup();
  }

  return { status, progress, warmup };
}
