<template>
  <!-- The frame is always placed; nothing inside runs (no build reads, no
       mod data) until the first time it's opened. -->
  <Widget :config="config" move-handles="corners" :inline-edit="false" readonly :removable="false">
    <WatchersEyeWindow v-if="opened" :config="config" />
    <span v-else class="sr-only">Watcher's Eye finder</span>
  </Widget>
</template>

<script lang="ts">
import { widgetWatchersEyeSpec } from '../widget-specs'

export default { widget: widgetWatchersEyeSpec }
</script>

<script setup lang="ts">
import { defineAsyncComponent, inject, shallowRef, watch } from 'vue'
import Widget from '@/web/overlay/Widget.vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { onSavedOpen } from '../shared/saved-open'
import { WATCHERS_EYE_TYPE, initWatchersEyeWidget } from './widget'
import type { WatchersEyeWidget } from './widget'

const WatchersEyeWindow = defineAsyncComponent(() => import('./WatchersEyeWindow.vue'))

const props = defineProps<{
  config: WatchersEyeWidget
}>()

// One made from the tool list starts bare, and a config can lack fields added
// later: fill in whatever is missing, keeping what's there.
{
  const c = props.config as unknown as Record<string, unknown>
  const defaults = initWatchersEyeWidget(props.config.wmId) as unknown as Record<string, unknown>
  const fresh = !Array.isArray(c.wmFlags) || (c.wmFlags as string[]).includes('uninitialized')
  for (const [k, v] of Object.entries(defaults)) {
    if (k === 'wmId' || k === 'wmType' || k === 'wmWants' || k === 'wmZorder') continue
    if (c[k] == null || (fresh && (k === 'wmFlags' || k === 'wmTitle'))) c[k] = v
  }
}

const wm = inject<WidgetManager>('wm')!

// An aura or mod picked in the search palette: show it.
onSavedOpen(WATCHERS_EYE_TYPE, (name) => {
  props.config.focus = name
  wm.show(props.config.wmId)
})

const opened = shallowRef(false)
watch(() => props.config.wmWants, (w) => { if (w === 'show') opened.value = true }, { immediate: true })
</script>
