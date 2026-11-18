<template>
  <!-- The frame is always placed; nothing inside runs (no build reads, no
       tree data) until the first time it's opened. -->
  <Widget :config="config" move-handles="corners" :inline-edit="false" readonly :removable="false">
    <MegaloWindow v-if="opened" :config="config" />
    <span v-else class="sr-only">Megalomaniac searcher</span>
  </Widget>
</template>

<script lang="ts">
import { widgetMegaloSpec } from '../widget-specs'

export default { widget: widgetMegaloSpec }
</script>

<script setup lang="ts">
import { defineAsyncComponent, shallowRef, watch } from 'vue'
import Widget from '@/web/overlay/Widget.vue'
import { initMegaloWidget } from './widget'
import type { MegaloWidget } from './widget'

const MegaloWindow = defineAsyncComponent(() => import('./MegaloWindow.vue'))

const props = defineProps<{
  config: MegaloWidget
}>()

// One made from the tool list starts bare, and a config can lack fields added
// later: fill in whatever is missing, keeping what's there.
{
  const c = props.config as unknown as Record<string, unknown>
  const defaults = initMegaloWidget(props.config.wmId) as unknown as Record<string, unknown>
  const fresh = !Array.isArray(c.wmFlags) || (c.wmFlags as string[]).includes('uninitialized')
  for (const [k, v] of Object.entries(defaults)) {
    if (k === 'wmId' || k === 'wmType' || k === 'wmWants' || k === 'wmZorder') continue
    if (c[k] == null || (fresh && (k === 'wmFlags' || k === 'wmTitle'))) c[k] = v
  }
}

const opened = shallowRef(false)
watch(() => props.config.wmWants, (w) => { if (w === 'show') opened.value = true }, { immediate: true })
</script>
