/* ============================================================
 * composables：useSpeech —— 发音服务的响应式接线
 * 单例：模块级 ref，把 piper 加载状态/进度暴露给 UI（按钮提示）
 * ============================================================ */
import { ref } from 'vue';
import { getPiperError, onPiperStatus, type PiperPhase, type PiperStatus } from '@/services/piper';
import { speechService } from '@/services/audio';

const status = ref<PiperStatus>('idle');
/** 下载进度百分比（0-100）；未知或非下载阶段为 null */
const progress = ref<number | null>(null);
/** loading 细分阶段：download=资源下载（显示百分比），init=初始化（显示独立文案） */
const phase = ref<PiperPhase | null>(null);
/** 加载失败原因（status === 'error' 时非空） */
const error = ref<string | null>(null);
let subscribed = false;

function ensureSubscribed() {
  if (subscribed) return;
  subscribed = true;
  onPiperStatus((s, pct, ph) => {
    status.value = s;
    progress.value = s === 'loading' ? (pct ?? null) : null;
    phase.value = s === 'loading' ? (ph ?? null) : null;
    if (s === 'error') error.value = getPiperError();
  });
}

export function useSpeech() {
  ensureSubscribed();

  /** 预热主引擎（页面挂载后调用；幂等） */
  function warmup() {
    speechService.warmup();
  }

  return { status, progress, phase, error, warmup };
}
