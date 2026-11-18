<template>
  <!-- Nothing (no code, no listeners) until the first time it's opened. -->
  <MegaloWindow v-if="opened" :config="config" />
</template>

<script lang="ts">
import { widgetMegaloSpec } from '../widget-specs'

export default { widget: widgetMegaloSpec }
</script>

<script setup lang="ts">
import { defineAsyncComponent, shallowRef, watch } from 'vue'
import { initMegaloWidget } from './widget'
import type { MegaloWidget } from './widget'

const MegaloWindow = defineAsyncComponent(() => import('./MegaloWindow.vue'))

const props = defineProps<{
  config: MegaloWidget
}>()

if (props.config.wmFlags.includes('uninitialized')) {
  const { wmId, wmType, wmWants, wmZorder } = props.config
  Object.assign(props.config, initMegaloWidget(wmId), { wmType, wmWants, wmZorder })
}

const opened = shallowRef(false)
watch(() => props.config.wmWants, (w) => { if (w === 'show') opened.value = true }, { immediate: true })
</script>
