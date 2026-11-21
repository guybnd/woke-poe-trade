<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <MapRegexBuilder :config="config" />
    <!-- Inside the window: a second root would drop its id and v-show. The
         badge is teleported and the dock icon registers itself. -->
    <MapScanLayer v-if="scanOwner" :config="config" />
  </Widget>
</template>

<script lang="ts">
import { widgetMapModsSpec } from '../widget-specs'
import type { MapModsWidget } from './widget'

export default { widget: widgetMapModsSpec }
</script>

<script setup lang="ts">
import { computed, inject } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import MapRegexBuilder from './MapRegexBuilder.vue'
import MapScanLayer from './MapScanLayer.vue'
import { isScanOwner } from './scan-session'
import { initMapModsWidget, normalizeMapModsWidget } from './widget'

const props = defineProps<{
  config: MapModsWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  initMapModsWidget(props.config)
  wm.show(props.config.wmId)
}
normalizeMapModsWidget(props.config)

// Map scan (dock icon, badge, keys) runs in the first Map mods window only.
const scanOwner = computed(() => isScanOwner(props.config))
</script>
