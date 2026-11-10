<template>
  <!-- Nothing (no code, no listeners) until the first time it's opened. -->
  <PoeReWindow v-if="opened" :config="config" />
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { POE_RE_TYPE, initPoeReWidget } from './poe-re-widget'

export default {
  widget: {
    type: POE_RE_TYPE,
    instances: 'single',
    initInstance: () => initPoeReWidget(0)
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { defineAsyncComponent, shallowRef, watch } from 'vue'
import type { PoeReWidget } from './poe-re-widget'

const PoeReWindow = defineAsyncComponent(() => import('./PoeReWindow.vue'))

const props = defineProps<{
  config: PoeReWidget
}>()

const opened = shallowRef(false)
watch(() => props.config.wmWants, (w) => { if (w === 'show') opened.value = true }, { immediate: true })
</script>
