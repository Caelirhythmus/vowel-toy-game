/* ============================================================
 * composables：useViewport —— 响应式视口断点（布局分层用）
 * 紧凑模式（< breakpoint px，通常为手机/窄屏）下，页面把次要
 * 信息折叠成入口，只保留答题闭环在主视口中。
 * ============================================================ */
import { onBeforeUnmount, ref } from 'vue';
import type { Ref } from 'vue';

export function useCompactLayout(breakpoint = 959): { compact: Ref<boolean> } {
  const compact = ref(false);
  let mq: MediaQueryList | null = null;

  const update = () => {
    compact.value = mq?.matches ?? false;
  };

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    update();
    mq.addEventListener('change', update);
  }

  onBeforeUnmount(() => {
    mq?.removeEventListener('change', update);
  });

  return { compact };
}
