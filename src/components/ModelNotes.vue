<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';

const { t } = useI18n();
</script>

<template>
  <details>
    <summary>{{ t('info.model') }}</summary>
    <ul>
      <li>{{ t('info.model.l1') }}</li>
      <li>{{ t('info.model.l2') }}</li>
      <li>{{ t('info.model.l3') }}</li>
      <li>{{ t('info.model.l4') }}</li>
    </ul>
  </details>
</template>
