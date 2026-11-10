<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false">
    <!-- Only the icon while playing. The card takes clicks with the game focused, but not typing, so adding an item opens the overlay. -->
    <DockItem ref="dockRef" :menu="dockMenu" id="drop-counter" title="Drop counter" :show="dockShow"
      :badge="config.maps || null" :wm-id="config.wmId" :card-width="cardWidth" @open-change="cardChanged">
      <template #card>
        <template v-if="config.layout === 'strip'">
          <div :class="$style.strip">
            <button type="button" :class="$style.tile" @click="changeMaps(config, 1); saveConfig()"
              @contextmenu.prevent="changeMaps(config, -1); saveConfig()"
              @mouseenter="stripHover = 'maps'" @mouseleave="stripHover = null">
              <span :class="$style.tileLabel" class="w-head-font w-accent">Maps</span>
              <span :class="$style.tileCount" class="w-num">{{ config.maps }}</span>
            </button>
            <span :class="$style.stripRule" />
            <button v-for="line in config.items" :key="line.name" type="button" :class="$style.tile" :aria-label="line.name"
              @click="bump(line)" @contextmenu.prevent="unbump(line)"
              @mouseenter="stripHover = line.name" @mouseleave="stripHover = null">
              <WIcon :src="art(line)" fallback="fas fa-hashtag" :style="{ width: '34px', height: '34px' }" />
              <span :class="[$style.tileCount, { 'w-dim': !line.drops.length }]" class="w-num">{{ line.drops.length }}</span>
            </button>
            <button type="button" :class="$style.tile" aria-label="Add an item" @click="openToAdd"
              @mouseenter="stripHover = 'add'" @mouseleave="stripHover = null">
              <i class="fas fa-plus w-accent" />
            </button>
          </div>
          <div :class="$style.stripHint" class="w-dim w-trunc">{{ stripHint }}</div>
        </template>
        <template v-else>
          <div :class="$style.mapsRow">
            <span class="w-dim grow">Maps run</span>
            <button type="button" class="w-icon-btn" aria-label="One map less" @click="changeMaps(config, -1); saveConfig()"><i class="fas fa-minus text-xs" /></button>
            <span :class="$style.mapsCount" class="w-num">{{ config.maps }}</span>
            <button type="button" class="w-icon-btn" aria-label="One map more" @click="changeMaps(config, 1); saveConfig()"><i class="fas fa-plus text-xs" /></button>
          </div>
          <div v-for="line in config.items" :key="line.name" :class="$style.cardRow" @contextmenu.prevent="unbump(line)">
            <WIcon :src="art(line)" fallback="fas fa-hashtag" size="lg" />
            <div class="min-w-0">
              <div class="w-trunc">{{ line.name }}</div>
              <div :class="$style.detail" class="w-dim w-trunc">{{ lineDetail(line, config.maps) }}</div>
            </div>
            <span :class="$style.mapsCount" class="w-num">{{ line.drops.length }}</span>
            <button type="button" :class="$style.plus" :aria-label="`Add one ${line.name}`" @click="bump(line)">+1</button>
          </div>
          <button type="button" :class="$style.addRow" @click="openToAdd"><i class="fas fa-plus text-xs" /> Add an item</button>
        </template>
      </template>
    </DockItem>

    <WPanel ref="panel" :title="config.wmTitle || 'Drop counter'" :icon="panelIcon" width="24rem">
      <div class="flex flex-col gap-2 py-2" style="padding-left: var(--w-pad); padding-right: var(--w-pad);">
        <div ref="searchBox" class="relative">
          <WField v-model="query" icon="fas fa-plus" placeholder="Add an item" class="w-full" @keydown.enter="addFirst" />
          <!-- In the flow, not floating: the panel is short when the list is, and would clip it. -->
          <div v-if="results.length" class="w-surface mt-1 py-1">
            <button v-for="r in results" :key="r.type + r.name" type="button" class="w-row w-full text-left" style="grid-template-columns: minmax(0,1fr) auto;" @click="addResult(r)">
              <span class="w-trunc flex items-center gap-1"><WIcon :src="art(r)" fallback="fas fa-hashtag" />{{ r.label }}</span>
              <span class="w-dim text-xs">{{ r.hint }}</span>
            </button>
          </div>
        </div>
        <div :class="$style.panelRow">
          <span class="w-dim grow">Maps run</span>
          <button type="button" class="w-icon-btn" aria-label="One map less" @click="changeMaps(config, -1)"><i class="fas fa-minus text-xs" /></button>
          <span :class="$style.mapsCount" class="w-num">{{ config.maps }}</span>
          <button type="button" class="w-icon-btn" aria-label="One map more" @click="changeMaps(config, 1)"><i class="fas fa-plus text-xs" /></button>
          <span :class="$style.rowEnd" />
        </div>
        <WEmpty v-if="!config.items.length" icon="fas fa-hashtag">Add the drops you want to count.</WEmpty>
        <div v-for="line in config.items" :key="line.name" :class="$style.panelRow">
          <WIcon :src="art(line)" fallback="fas fa-hashtag" size="lg" />
          <div class="min-w-0 grow">
            <div class="w-trunc">{{ line.name }}</div>
            <div :class="$style.detail" class="w-dim w-trunc">{{ lineDetail(line, config.maps) }}</div>
          </div>
          <button type="button" class="w-icon-btn" :aria-label="`Take one ${line.name} off`" @click="unbump(line)"><i class="fas fa-minus text-xs" /></button>
          <span :class="$style.mapsCount" class="w-num">{{ line.drops.length }}</span>
          <button type="button" class="w-icon-btn" :aria-label="`Add one ${line.name}`" @click="bump(line)"><i class="fas fa-plus text-xs" /></button>
          <button type="button" class="w-icon-btn" :class="$style.rowEnd" :aria-label="`Remove ${line.name}`" title="Remove. You can undo." @click="remove(line)"><i class="fas fa-times" /></button>
        </div>
        <WButton v-if="config.maps || config.items.length" variant="ghost" size="sm" icon="fas fa-undo" class="self-start" title="You can undo" @click="reset()">Reset counts</WButton>
      </div>
    </WPanel>
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { DROP_COUNTER_TYPE } from './drop-counter'

export default {
  widget: {
    type: DROP_COUNTER_TYPE,
    instances: 'multi',
    trNameKey: 'Drop counter'
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { computed, inject, nextTick, onUnmounted, shallowRef, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { saveConfig } from '@/web/Config'
import { MainProcess } from '@/web/background/IPC'
import { parseClipboard } from '@/parser'
import { WPanel, WField, WButton, WEmpty, WIcon, toast } from '../ui'
import { ninjaIcon, moduleIcon } from '../ui/game-icons'
import { popupAnchor } from '../ui/window-anchor'
import DockItem from '../dock/DockItem.vue'
import { dockIconEl, showWithOverlay } from '../dock/dock'
import type { DockMenuAction } from '../dock/dock'
import { countNewMap, isMapArea } from '../farming/farming'
import { usePriceIndex } from '../market/price-index'
import { searchPrices, typeLabel } from '../search/search'
import { onGameLog } from '../shared/game-log'
import { useZone } from '../shared/zone'
import { DROP_COUNTER_TARGET, addLine, changeMaps, findLine, initDropCounter, lineDetail, minusOne, peekText, plusOne, removeLine, resetCounts, restoreCounts, restoreLine } from './drop-counter'
import type { DropCounterWidget, DropLine } from './drop-counter'
// The header shows the module's own art, the same as the dock and tab bar.
const panelIcon = moduleIcon('drop-counter').art ?? 'divine'

const props = defineProps<{
  config: DropCounterWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Drop counter'
  props.config.anchor = popupAnchor()
  initDropCounter(props.config)
  wm.show(props.config.wmId)
}

const zone = useZone()
const prices = usePriceIndex()
const dockRef = shallowRef<InstanceType<typeof DockItem> | null>(null)
const panel = shallowRef<InstanceType<typeof WPanel> | null>(null)
const searchBox = shallowRef<HTMLElement | null>(null)
const cardOpen = shallowRef(false)
// The strip's hovered tile: 'maps', 'add', or an item name. Worked out live, so
// it follows a click.
const stripHover = shallowRef<string | null>(null)
const stripHint = computed(() => {
  const hover = stripHover.value
  if (hover === 'maps') return 'Maps run'
  if (hover === 'add') return 'Add an item'
  const line = hover ? findLine(props.config.items, hover) : null
  return line ? `${line.name}: ${lineDetail(line, props.config.maps)}` : 'Click adds one. Right-click takes one off.'
})

// Not while levelling: nothing here is about the campaign.
const dockShow = computed(() => zone.kind !== 'campaign')

// Tiles wrap after eight; never narrower than the hint under them.
const cardWidth = computed(() => {
  if (props.config.layout !== 'strip') return '21rem'
  const tiles = Math.min(8, props.config.items.length + 2)
  return `max(18rem, calc(${tiles} * 58px + 20px))`
})

function art (x: { type: string, name: string }) {
  return ninjaIcon(x.type, x.name) ?? undefined
}

function bump (line: DropLine) {
  plusOne(props.config, line)
  // Not with the card open: it shows the count, and a growing icon can shift it
  // from under the mouse.
  if (!cardOpen.value) dockRef.value?.peek(peekText(line, props.config.maps))
  saveConfig()
}

function cardChanged (open: boolean) {
  cardOpen.value = open
  // A mouse leave can go missing in game.
  if (!open) stripHover.value = null
}

function unbump (line: DropLine) {
  minusOne(line)
  saveConfig()
}

// --- Adding ---
const query = shallowRef('')

interface Result { type: string, name: string, label: string, hint: string }

const results = computed<Result[]>(() => {
  const q = query.value.trim()
  if (!q) return []
  const found: Result[] = searchPrices(prices.snapshot.value?.items ?? [], q, { limit: 6 })
    .map(g => ({ type: g.type, name: g.name, label: g.name, hint: typeLabel(g.type) }))
  if (!found.some(r => r.name.toLowerCase() === q.toLowerCase())) {
    found.push({ type: '', name: q, label: `Count "${q}" by that name`, hint: 'Any text' })
  }
  return found
})

function addResult (r: Result) {
  addLine(props.config, r)
  query.value = ''
  focusSearch()
  saveConfig()
}

function addFirst () {
  if (results.value.length) addResult(results.value[0])
}

// From the card the panel is still hidden until the overlay has opened, and a
// hidden box can't take focus: try again once it has.
let focusWanted = false
function focusSearch () {
  focusWanted = true
  nextTick(() => {
    const input = searchBox.value?.querySelector('input')
    input?.focus()
    if (input && document.activeElement === input) focusWanted = false
  })
}
watch(() => wm.active.value, (active) => {
  if (!active) focusWanted = false
  else if (focusWanted) focusSearch()
})

function openToAdd () {
  showWithOverlay(wm, props.config.wmId)
  focusSearch()
}

// --- Removing ---
// Undo reads props.config when it runs: saving swaps the config for a new copy.
function remove (line: DropLine) {
  const removed = removeLine(props.config, line.name)
  if (!removed) return
  saveConfig()
  toast(`Removed ${line.name}`, {
    anchor: panel.value?.el,
    undo: () => { restoreLine(props.config, removed); saveConfig() }
  })
}

function reset (dock = false) {
  const backup = resetCounts(props.config)
  saveConfig()
  toast('Counts reset', {
    anchor: dock ? dockIconEl('drop-counter') : panel.value?.el,
    dock,
    undo: () => { restoreCounts(props.config, backup); saveConfig() }
  })
}

const dockMenu = computed<DockMenuAction[]>(() => [
  { label: 'Add an item', icon: 'fas fa-plus', action: openToAdd },
  { label: 'Reset counts', icon: 'fas fa-undo', action: () => { reset(true) } }
])

// --- Maps ---
onGameLog((lines) => {
  if (!props.config.autoCountMaps) return
  let changed = false
  for (const { ev } of lines) {
    if (ev?.kind !== 'area' || !isMapArea(ev.areaId)) continue
    if (countNewMap(props.config, ev.areaId, ev.seed)) {
      changeMaps(props.config, 1)
      changed = true
    }
  }
  if (changed) saveConfig()
})

// --- Hotkey: +1 the hovered item (copied by APT), adding it if it's new ---
const itemListener = MainProcess.onEvent('MAIN->CLIENT::item-text', (e) => {
  if (e.target !== DROP_COUNTER_TARGET) return
  const parsed = parseClipboard(e.clipboard).unwrapOr(null)
  if (!parsed) return
  const name = parsed.info.refName
  const line = findLine(props.config.items, name) ??
    addLine(props.config, { type: prices.snapshot.value?.items.find(i => i.name === name)?.type ?? '', name })
  if (line) bump(line)
})
onUnmounted(() => { itemListener.abort() })
</script>

<style module>
.mapsRow, .cardRow { display: flex; align-items: center; gap: 8px; padding: 5px var(--w-pad); }
.mapsRow { border-bottom: 1px solid var(--w-line); }
.cardRow { display: grid; grid-template-columns: var(--w-icon-lg) minmax(0, 1fr) auto auto; }
.cardRow:hover { background: var(--w-line-soft); }
.panelRow { display: flex; align-items: center; gap: 6px; min-height: 30px; }
.rowEnd { width: 22px; flex: none; }
.detail { font-size: var(--w-fs-xs); }
.mapsCount { min-width: 28px; text-align: center; font-size: var(--w-fs-lg); font-weight: 600; }
.plus {
  width: 44px;
  height: 28px;
  border: 1px solid var(--w-line-strong);
  border-radius: var(--w-r-sm);
  background: var(--w-accent-soft);
  color: var(--w-accent);
  font: 600 var(--w-fs-md) var(--w-num);
  cursor: pointer;
}
.plus:hover { background: var(--w-accent); color: var(--w-accent-fg); }
.addRow {
  width: 100%;
  height: 32px;
  padding: 0 var(--w-pad);
  background: none;
  border: 0;
  border-top: 1px solid var(--w-line);
  color: var(--w-dim);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.addRow:hover { color: var(--w-fg); }
.strip { display: flex; flex-wrap: wrap; align-items: center; padding: 3px; }
.stripRule { width: 1px; height: 54px; margin: 0 3px; background: var(--w-line); }
.tile {
  width: 58px;
  height: 74px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 0;
  background: none;
  border: 1px solid transparent;
  border-radius: var(--w-r-sm);
  color: var(--w-fg);
  cursor: pointer;
}
.tile:hover { background: var(--w-accent-soft); border-color: var(--w-line-strong); }
.tileLabel { height: 34px; display: grid; place-items: center; }
.tileCount { font-size: var(--w-fs-lg); font-weight: 600; }
.stripHint { padding: 3px var(--w-pad) 5px; border-top: 1px solid var(--w-line); font-size: var(--w-fs-xs); }
</style>
