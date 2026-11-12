<template>
  <Widget :config="config" move-handles="corners" :removable="false" :readonly="true" :inline-edit="false" @moved="config.moved = true">
    <div class="flex flex-col gap-1 items-stretch">
      <MapVerdictCard v-if="result && mapMods" :result="result" :config="mapMods" />
      <WPanel v-else title="Map check" icon="map" width="22rem">
        <WEmpty :art="{ mechanic: 'map' }">That item isn't a map, invitation, logbook, heist contract or chart.</WEmpty>
      </WPanel>
      <div class="flex gap-1 justify-between">
        <WButton size="sm" variant="ghost" icon="fas fa-arrow-left" @click="openRegex">Map mods</WButton>
        <WButton size="sm" variant="ghost" icon="fas fa-times" @click="close">Close</WButton>
      </div>
    </div>
  </Widget>
</template>

<script lang="ts">
import { widgetMapCheckSpec } from '../widget-specs'

export default { widget: widgetMapCheckSpec }
</script>

<script setup lang="ts">
import { computed, inject, onUnmounted, shallowRef } from 'vue'
import { Host, MainProcess } from '@/web/background/IPC'
import { parseClipboard } from '@/parser'
import type { ParsedItem } from '@/parser'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WPanel, WEmpty, WButton } from '../ui'
import MapVerdictCard from './MapVerdictCard.vue'
import { MAP_MODS_TARGET } from './widget'
import { checkMap, ensureMapModsConfig, findMapModsConfig, isMapLike } from './check'
import type { MapCheckWidget } from './map-check'

const props = defineProps<{
  config: MapCheckWidget
}>()

const wm = inject<WidgetManager>('wm')!

const item = shallowRef<ParsedItem | null>(null)
const mapMods = computed(() => findMapModsConfig())
const result = computed(() => item.value && mapMods.value ? checkMap(item.value, mapMods.value) : null)

// Same placement as APT's item info: next to the stash or inventory panel,
// on the side away from the hovered item.
function place (position: { x: number, y: number }) {
  const width = wm.size.value.width
  const poePanelWidth = wm.poePanelWidth.value
  const side = position.x > (window.screenX + width / 2) ? 'inventory' : 'stash'
  props.config.anchor = {
    pos: side === 'stash' ? 'cl' : 'cr',
    y: 50,
    x: side === 'stash'
      ? (poePanelWidth / width) * 100
      : ((width - poePanelWidth) / width) * 100
  }
}

const handler = MainProcess.onEvent('MAIN->CLIENT::item-text', (e) => {
  if (e.target !== MAP_MODS_TARGET) return
  ensureMapModsConfig()
  if (!props.config.moved) place(e.position)
  const parsed = parseClipboard(e.clipboard).unwrapOr(null)
  item.value = parsed && isMapLike(parsed) ? parsed : null
  wm.show(props.config.wmId)
})
onUnmounted(() => { handler.abort() })

function close () {
  if (Host.isElectron) Host.sendEvent({ name: 'OVERLAY->MAIN::focus-game', payload: undefined })
  else wm.hide(props.config.wmId)
}

function openRegex () {
  wm.hide(props.config.wmId)
  if (mapMods.value) wm.show(mapMods.value.wmId)
}
</script>
