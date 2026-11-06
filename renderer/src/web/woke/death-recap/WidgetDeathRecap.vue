<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false" :readonly="true">
    <!-- Only after a death this session. The game logs no killer and no mods: see death-log.ts. -->
    <DockItem id="death-recap" title="Death recap" :show="store.sessionDeaths.value > 0"
      :badge="store.sessionDeaths.value || null" tone="down" :wake="store.sessionDeaths.value" :wm-id="config.wmId"
      card-width="27rem" :menu="dockMenu">
      <template #card>
        <div v-if="last" data-death-card>
          <div style="padding: 4px var(--w-pad) 0;">
            <div class="w-head-font w-accent" :class="$style.cardName">{{ last.name }}</div>
            <div class="w-dim text-xs">{{ subText(last) }}</div>
          </div>
          <div :class="$style.facts">
            <div>
              <div :class="{ 'w-down': last.nth > 1 }" class="font-semibold">{{ ordinal(last.nth) }} death</div>
              <div class="w-dim text-xs">in this {{ last.runKey ? 'map' : 'area' }}</div>
            </div>
            <div>
              <div class="font-semibold w-num">{{ shortTime(last.sinceEnterMs) }}</div>
              <div class="w-dim text-xs">{{ last.returned ? 'after coming back' : 'after entering' }}</div>
            </div>
            <div v-if="last.voice" class="min-w-0">
              <div class="font-semibold w-trunc">{{ last.voice.name }}</div>
              <div class="w-dim text-xs">last voice, {{ shortTime(last.voice.msBefore) }} before</div>
            </div>
          </div>
          <DeathMods v-if="last.runKey" :run="runOf(last)" />
          <div :class="$style.more">
            <div v-for="d in earlier" :key="d.id" class="flex gap-2 w-dim text-xs">
              <span class="flex-1 w-trunc" style="color: var(--w-fg);">{{ d.name }}</span>
              <span>{{ ordinal(d.nth) }} death</span>
              <span class="w-num">{{ whenText(d.at) }}</span>
            </div>
            <button type="button" class="w-accent text-xs text-left" data-death-open @click="openLog">All deaths and mods you die to</button>
          </div>
        </div>
      </template>
    </DockItem>
    <WPanel :title="config.wmTitle || 'Death recap'" width="60rem" max-height="80vh">
      <template v-if="store.loadError.value" #banner>
        <WBanner>Couldn't read your saved deaths: {{ store.loadError.value }}</WBanner>
      </template>
      <template v-if="characters.length > 1" #actions>
        <WSelect v-model="character" class="mr-1" :options="characterOptions" />
      </template>
      <WEmpty v-if="!store.deaths.value.length" icon="fas fa-skull">
        No deaths saved yet. They're read from the game's log as they happen.
      </WEmpty>
      <div v-else :class="$style.columns">
        <div :class="$style.left">
          <div class="w-group-label">Deaths</div>
          <template v-for="d in visible" :key="d.id">
            <button type="button" :class="[$style.death, { [$style.on]: selected?.id === d.id }]" data-death-row @click="picked = d.id">
              <div class="flex items-center gap-2">
                <span class="flex-1 w-trunc font-semibold">{{ d.name }}</span>
                <span v-if="d.runKey" :class="[$style.state, $style[stateOf(d)]]">{{ STATE_LABEL[stateOf(d)] }}</span>
              </div>
              <div class="w-dim text-xs">{{ rowText(d) }}</div>
            </button>
            <div v-if="selected?.id === d.id && d.runKey" :class="$style.detail"><DeathMods :run="runOf(d)" /></div>
          </template>
          <button v-if="shown.length > visible.length" type="button" class="w-accent text-xs" :class="$style.showMore" @click="limit += ROW_PAGE">
            Show more ({{ shown.length - visible.length }} older)
          </button>
        </div>
        <div class="min-w-0">
          <div class="flex items-baseline gap-2 w-group-label">
            <span class="flex-1">Mods you die to</span>
            <span class="w-dim text-xs" style="text-transform: none;">From maps you checked</span>
          </div>
          <div v-for="r in stats.rows" :key="r.matcher" :class="$style.stat" data-death-stat>
            <div class="flex gap-2">
              <span class="flex-1">{{ r.matcher }}</span>
              <span class="font-semibold whitespace-nowrap w-num">{{ r.deaths }} deaths in {{ r.maps }} {{ r.maps === 1 ? 'map' : 'maps' }}</span>
            </div>
            <div :class="$style.bar"><div :class="$style.fill" :style="{ width: `${Math.min(100, r.rate * 100)}%` }" /></div>
          </div>
          <div class="w-dim text-xs" :class="$style.stat">
            <template v-if="stats.rows.length">Your usual rate: {{ usualText(stats.usual) }}. Only mods above that show.</template>
            <template v-else-if="stats.maps">{{ stats.maps }} checked {{ stats.maps === 1 ? 'map' : 'maps' }} and {{ stats.deaths }} {{ stats.deaths === 1 ? 'death' : 'deaths' }} so far. A mod shows here once it has 2 deaths and beats your usual rate.</template>
            <template v-else>Nothing yet. This fills in as you check maps before opening them, then die in them.</template>
          </div>
        </div>
      </div>
    </WPanel>
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { DEATH_RECAP_TYPE, initDeathRecapWidget } from './widget'

export default {
  widget: {
    type: DEATH_RECAP_TYPE,
    instances: 'single',
    trNameKey: 'Death recap',
    initInstance: () => initDeathRecapWidget(0)
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { computed, inject, onUnmounted, shallowRef } from 'vue'
import { MainProcess } from '@/web/background/IPC'
import { parseClipboard } from '@/parser'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WBanner, WEmpty, WPanel, WSelect } from '../ui'
import DockItem from '../dock/DockItem.vue'
import type { DockMenuAction } from '../dock/dock'
import { hideWhilePlaying, showWithOverlay } from '../dock/dock'
import { followGameLog } from '../shared/game-log'
import DeathMods from './DeathMods.vue'
import { DeathTracker, modDeathStats, ordinal, shortTime, usualText, whenText } from './death-log'
import type { DeathRecord, RunRecord } from './death-log'
import { checkFromItem, useDeathRecap } from './store'
import type { DeathRecapWidget } from './widget'

const props = defineProps<{ config: DeathRecapWidget }>()
const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  Object.assign(props.config, initDeathRecapWidget(props.config.wmId))
}
hideWhilePlaying(props.config)

const store = useDeathRecap()
store.load()

let live = false
// A line can be in the tail and also queued live while the tail was loading.
let tailLines = new Set<string>()
const tracker = new DeathTracker({
  onMap: (map) => { store.enterMap(map, live) },
  onDeath: (death) => { store.addDeath(death) }
})

// The tail gives what happened while the app was closed, and where you are now.
followGameLog({
  since: () => null,
  onTail: (tail) => {
    live = false
    tailLines = new Set(tail.lines)
    for (const line of tail.lines) tracker.feed(line, Date.now())
  },
  onLines: (lines) => {
    live = true
    for (const { line, at } of lines) {
      if (!tailLines.delete(line)) tracker.feed(line, at)
    }
  }
})

// Every way of reading a map counts: the map check, price check and item info.
const items = MainProcess.onEvent('MAIN->CLIENT::item-text', (e) => {
  if (!e.clipboard.startsWith('Item Class: Maps')) return
  const item = parseClipboard(e.clipboard).unwrapOr(null)
  const check = item && checkFromItem(item, Date.now())
  if (check) store.addCheck({ ...check, position: e.position })
})
onUnmounted(() => { items.abort() })

const last = computed(() => store.deaths.value[0] ?? null)
const earlier = computed(() => store.deaths.value.slice(1, 3))

const STATE_LABEL = { exact: 'Exact', likely: 'Likely', unknown: 'Mods unknown' }

function runOf (d: DeathRecord): RunRecord | null {
  return d.runKey ? store.runByKey.value.get(d.runKey) ?? null : null
}
function stateOf (d: DeathRecord): 'exact' | 'likely' | 'unknown' {
  return runOf(d)?.match ?? 'unknown'
}
function tierText (d: DeathRecord) {
  const tier = runOf(d)?.tier
  return tier ? `T${tier}` : `Level ${d.level}`
}
function subText (d: DeathRecord) {
  return `${tierText(d)} · ${whenText(d.at)} · ${d.character}`
}
function rowText (d: DeathRecord) {
  const when = d.nth > 1 ? `${ordinal(d.nth)} here` : `${shortTime(d.sinceEnterMs)} in`
  const voice = d.voice ? ` · ${d.voice.name}, ${shortTime(d.voice.msBefore)} before` : ''
  return `${whenText(d.at)} · ${tierText(d)} · ${when}${voice}`
}

const ALL = ''
const character = shallowRef(ALL)
const characters = computed(() => [...new Set(store.deaths.value.map(d => d.character))])
const characterOptions = computed(() => [
  { value: ALL, label: 'All characters' },
  ...characters.value.map(c => ({ value: c, label: c }))
])
const shown = computed(() => store.deaths.value
  .filter(d => character.value === ALL || d.character === character.value))

// The panel stays mounted while hidden, so it doesn't draw every saved death.
const ROW_PAGE = 100
const limit = shallowRef(ROW_PAGE)
const visible = computed(() => shown.value.slice(0, limit.value))

const picked = shallowRef<string | null>(null)
const selected = computed(() => shown.value.find(d => d.id === picked.value) ?? shown.value[0] ?? null)

const stats = computed(() => modDeathStats(store.runs.value, shown.value))

function openLog () {
  showWithOverlay(wm, props.config.wmId)
}
const dockMenu = computed<DockMenuAction[]>(() => [{
  label: 'All deaths',
  icon: 'fas fa-list',
  action: openLog
}])
</script>

<style module>
.cardName { font-size: 1.15em; }
.facts {
  display: flex;
  gap: 18px;
  margin-top: 6px;
  padding: 7px var(--w-pad);
  border-top: 1px solid var(--w-line);
  border-bottom: 1px solid var(--w-line);
}
.more {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 6px;
  padding: 6px var(--w-pad) 2px;
  border-top: 1px solid var(--w-line);
}
.columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}
.left { border-right: 1px solid var(--w-line); min-width: 0; }
.death {
  display: block;
  width: 100%;
  padding: 7px var(--w-pad);
  text-align: left;
  border-top: 1px solid var(--w-line-soft);
}
.death:hover, .on { background: var(--w-panel-2); }
.detail { background: var(--w-panel-2); padding-bottom: 8px; }
.state {
  flex: none;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: 600;
  white-space: nowrap;
}
.exact { color: var(--w-up); background: color-mix(in srgb, var(--w-up) 14%, transparent); }
.likely { color: var(--w-warn); background: color-mix(in srgb, var(--w-warn) 14%, transparent); }
.unknown { color: var(--w-dim); background: var(--w-panel-3); }
.showMore { display: block; width: 100%; padding: 7px var(--w-pad); text-align: left; }
.stat { padding: 7px var(--w-pad); border-top: 1px solid var(--w-line-soft); }
.bar { height: 4px; margin-top: 5px; border-radius: 2px; background: var(--w-panel-3); }
.fill { height: 4px; border-radius: 2px; background: var(--w-down); }
</style>
