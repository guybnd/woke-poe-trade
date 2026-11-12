<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <!-- In the hideout, while you set up the map device: the strategy's loadout. -->
    <DockItem :menu="dockMenu" id="atlas" :title="selected?.name || 'Atlas strategy'" :show="!!selected && zone.kind === 'hideout'"
      :wm-id="config.wmId" card-width="21rem">
      <template #card><AtlasCard v-if="selected" :strategy="selected" :regexes="regexes" /></template>
    </DockItem>
    <AtlasWindow v-if="opened" :config="config" />
  </Widget>
</template>

<script lang="ts">
import { ATLAS_TYPE } from './widget'
import type { WidgetSpec } from '@/web/overlay/interfaces'
import type { AtlasWidget } from './widget'

export default {
  widget: {
    type: ATLAS_TYPE,
    instances: 'multi',
    trNameKey: 'Atlas strategies'
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
// The Atlas strategies widget: a shell holding the hideout card, with the
// window itself (list, tree, loadout) loaded the first time it opens.
import { computed, defineAsyncComponent, inject, shallowRef, watch } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { popupAnchor } from '../ui/window-anchor'
import { copyText } from '../ui/copy'
import DockItem from '../dock/DockItem.vue'
import type { DockMenuAction } from '../dock/dock'
import { useZone } from '../shared/zone'
import { useWidgetVisible } from '../shared/visible-clock'
import { regexesIn } from '../regex-library/folders'
import { migrateAtlasWidget, regexFolderOf } from './widget'

const AtlasWindow = defineAsyncComponent(() => import('./AtlasWindow.vue'))
const AtlasCard = defineAsyncComponent(() => import('./AtlasCard.vue'))

const props = defineProps<{
  config: AtlasWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Atlas strategies'
  props.config.anchor = popupAnchor()
  props.config.dataUrl = ''
  props.config.selectedId = null
  props.config.strategies = []
  wm.show(props.config.wmId)
}
migrateAtlasWidget(props.config)

// Mounted from the first time it's on screen, and kept.
const visible = useWidgetVisible(() => props.config)
const opened = shallowRef(false)
watch(visible, (v) => { if (v) opened.value = true }, { immediate: true })

const zone = useZone()
const selected = computed(() => props.config.strategies.find(s => s.id === props.config.selectedId) ?? null)
const regexes = computed(() => {
  const s = selected.value
  if (!s) return []
  const list = regexesIn(regexFolderOf(s)).map(r => ({ name: r.name || 'Regex', text: r.text }))
  return s.regex ? [{ name: 'Map mods', text: s.regex }, ...list] : list
})

function pasteSearch (text: string) {
  MainProcess.sendEvent({
    name: 'CLIENT->MAIN::user-action',
    payload: { action: 'stash-search', text }
  })
}

// The icon's right-click menu: search with each of the strategy's regexes.
const dockMenu = computed<DockMenuAction[]>(() => regexes.value.flatMap(r => [
  { label: `Search: ${r.name}`, icon: 'fas fa-search', action: () => pasteSearch(r.text) },
  { label: `Copy: ${r.name}`, icon: 'far fa-copy', action: () => { copyText(r.text).catch(() => {}) } }
]))
</script>
