<template>
  <!-- The frame is always placed; nothing inside runs (no card data, no
       prices) until the first time it's opened. -->
  <Widget :config="config" move-handles="corners" :inline-edit="false" readonly :removable="false">
    <ScryingWindow v-if="opened" :config="config" />
    <span v-else class="sr-only">Scrying</span>
  </Widget>
</template>

<script lang="ts">
import { widgetScryingSpec } from '../widget-specs'

export default { widget: widgetScryingSpec }
</script>

<script setup lang="ts">
import { defineAsyncComponent, inject, shallowRef, watch } from 'vue'
import Widget from '@/web/overlay/Widget.vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { onSavedOpen } from '../shared/saved-open'
import { SCRYING_TYPE, initScryingWidget } from './widget'
import type { ScryingWidget } from './widget'

const ScryingWindow = defineAsyncComponent(() => import('./ScryingWindow.vue'))

const props = defineProps<{
  config: ScryingWidget
}>()

// One made from the tool list starts bare, and a config can lack fields added
// later: fill in whatever is missing, keeping what's there.
{
  const c = props.config as unknown as Record<string, unknown>
  const defaults = initScryingWidget(props.config.wmId) as unknown as Record<string, unknown>
  const fresh = !Array.isArray(c.wmFlags) || (c.wmFlags as string[]).includes('uninitialized')
  for (const [k, v] of Object.entries(defaults)) {
    if (k === 'wmId' || k === 'wmType' || k === 'wmWants' || k === 'wmZorder') continue
    if (c[k] == null || (fresh && (k === 'wmFlags' || k === 'wmTitle'))) c[k] = v
  }
}

const wm = inject<WidgetManager>('wm')!

// A map picked in the search palette: show it.
onSavedOpen(SCRYING_TYPE, (map) => {
  props.config.selected = map
  wm.show(props.config.wmId)
})

const opened = shallowRef(false)
watch(() => props.config.wmWants, (w) => { if (w === 'show') opened.value = true }, { immediate: true })
</script>
