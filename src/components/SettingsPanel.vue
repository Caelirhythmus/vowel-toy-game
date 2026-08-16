<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { useGame } from '@/composables/useGame';
import { useI18n } from '@/composables/useI18n';
import { useCompactLayout } from '@/composables/useViewport';
import SettingsFields from './SettingsFields.vue';

const game = useGame();
const { t } = useI18n();
const { compact } = useCompactLayout();
/** 紧凑模式下「⚙ 设置」折叠面板的展开状态 */
const settingsOpen = ref(false);

/**
 * 重新开始的两步确认：游戏中点击「重新开始」先变“确认重新开始？”（3 秒内
 * 再点一次才生效），防止误触丢掉本局进度。
 */
const confirmRestart = ref(false);
let confirmTimer: number | null = null;

const lockedHint = computed(() =>
  game.isRunning ? `${t('set.locked')}（${t('set.lockedHint')}）` : ''
);

const startLabel = computed(() => {
  if (confirmRestart.value) return t('btn.restart.confirm');
  return game.isRunning ? t('btn.restart') : t('btn.start');
});

function disarmConfirm() {
  confirmRestart.value = false;
  if (confirmTimer !== null) {
    clearTimeout(confirmTimer);
    confirmTimer = null;
  }
}

function onStart() {
  if (game.isRunning) {
    if (confirmRestart.value) {
      disarmConfirm();
      game.start();
    } else {
      confirmRestart.value = true;
      confirmTimer = window.setTimeout(disarmConfirm, 3000);
    }
  } else {
    game.start();
  }
}

function onEndRound() {
  disarmConfirm();
  game.reset();
}

onUnmounted(disarmConfirm);
</script>

<template>
  <div class="settings-wrap">
    <!-- 紧凑模式（手机/窄屏）：设置折叠成一行，开始/结束按钮常驻 -->
    <template v-if="compact">
      <div class="settings-compact">
        <button
          class="btn settings-toggle"
          :aria-expanded="settingsOpen"
          @click="settingsOpen = !settingsOpen"
        >
          ⚙ {{ t('set.title') }} <span aria-hidden="true">{{ settingsOpen ? '▴' : '▾' }}</span>
        </button>
        <button class="btn start" :class="{ confirm: confirmRestart }" @click="onStart">{{ startLabel }}</button>
        <button v-if="game.isRunning" class="btn end-round" @click="onEndRound">{{ t('btn.endRound') }}</button>
      </div>
      <div v-if="settingsOpen" class="settings fields-only">
        <SettingsFields :locked-hint="lockedHint" />
      </div>
    </template>

    <!-- 宽屏：设置与按钮平铺 -->
    <template v-else>
      <div class="settings">
        <SettingsFields :locked-hint="lockedHint" />
        <div class="btn-row">
          <button class="btn start" :class="{ confirm: confirmRestart }" @click="onStart">{{ startLabel }}</button>
          <button v-if="game.isRunning" class="btn end-round" @click="onEndRound">{{ t('btn.endRound') }}</button>
        </div>
      </div>
    </template>
  </div>
</template>
