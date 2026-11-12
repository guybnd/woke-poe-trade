<template>
  <DisenchantPanel :config="config" />
</template>

<script lang="ts">
import { widgetDisenchantSpec } from '../widget-specs'

export default { widget: widgetDisenchantSpec }
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
