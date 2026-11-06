<template>
  <DisenchantPanel :config="config" />
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { DISENCHANT_TYPE } from './widget'

export default {
  widget: {
    type: DISENCHANT_TYPE,
    instances: 'multi',
    trNameKey: 'Disenchant'
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
// The panel loads on first open, so it adds nothing to startup.
import { defineAsyncComponent } from 'vue'
import type { DisenchantWidget } from './widget'

const DisenchantPanel = defineAsyncComponent(() => import('./DisenchantPanel.vue'))

defineProps<{
  config: DisenchantWidget
}>()
</script>
