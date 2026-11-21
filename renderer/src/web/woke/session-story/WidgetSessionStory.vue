<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false" :readonly="true">
    <!-- A night is read from Client.txt: see story.ts. -->
    <!-- Session story has no window of its own: the icon opens Session analytics. -->
    <DockItem ref="dockRef" id="session-story" title="Session analytics" :show="!!shown" :wm-id="analyticsId"
      :wake="store.finished.value" card-width="24rem" :menu="dockMenu" @activate="openAnalytics('history')">
      <template #card>
        <TonightBand />
        <div :class="$style.cardGear">
          <!-- A text button: an icon button is a fixed square, and its label wrapped word by word. -->
          <WButton variant="ghost" size="sm" icon="fas fa-cog" :class="{ 'w-accent': cardGear }" data-chip-gear-card
            title="After a map: where its time shows and how it goes away" @click="cardGear = !cardGear">After a map</WButton>
          <ChipSettings v-if="cardGear" :config="config" :show-me="showMe" :can-show="!!store.maps.value.length" live class="mt-1" />
        </div>
      </template>
    </DockItem>
    <GlanceBar v-if="config.glance" :map="glanceMap" :since="glanceSince" :before="glanceBefore" />
    <MapToast :chip="chip" :close-key="config.chipKey || null" :scale="toastScale" @close="closeChip" @hold="holdChip" @resize="resizeChip" />
  </Widget>
</template>

<script lang="ts">
import { widgetSessionStorySpec } from '../widget-specs'
import { initSessionStoryWidget } from './widget'

export default { widget: widgetSessionStorySpec }
// Session analytics shows tonight's card through this chunk (loaded whenever
// Session story is on). Importing TonightBand.vue there directly would split it
// into its own chunk and grow the startup bundle's preload lists.
export { default as TonightBand } from './TonightBand.vue'
export { default as NightsList } from './NightsList.vue'
</script>

<script setup lang="ts">
import { computed, inject, nextTick, onUnmounted, shallowRef, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WButton, toast } from '../ui'
import MapToast from './MapToast.vue'
import GlanceBar from './GlanceBar.vue'
import ChipSettings from './ChipSettings.vue'
import { formatChaos, formatClock, formatDuration } from '../ui/format'
import DockItem from '../dock/DockItem.vue'
import type { DockMenuAction } from '../dock/dock'
import { hideWhilePlaying, openOverlay } from '../dock/dock'
import { lineTime } from '../campaign/log-tail'
import { followGameLog } from '../shared/game-log'
import TonightBand from './TonightBand.vue'
import { NIGHT_GAP_MS, NightTracker } from './story'
import type { NightStory } from './story'
import { MapLog } from './map-log'
import { chipLines, clampScale, compareMap } from './chip'
import type { MapCompare } from './chip'
import type { MapRecord } from './map-log'
import { useNights } from './store'
import { useNightList } from './nights'
import { savedOpenRequest } from '../shared/saved-open'
import { ANALYTICS_TYPE } from '../analytics/types'
import { isSkippedArea, knownAreaName, setSkipAreas } from './skip-areas'
import { setAreaSkip } from '../farming/farming'
import { CHIP_CLOSE_TARGET } from './widget'
import type { SessionStoryWidget } from './widget'
import { MainProcess } from '@/web/background/IPC'
import { AppConfig, saveConfig } from '@/web/Config'
import { isModuleOn } from '../modules'

const props = defineProps<{ config: SessionStoryWidget }>()
const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  Object.assign(props.config, initSessionStoryWidget(props.config.wmId))
}
hideWhilePlaying(props.config)
// No window of its own: the tab bar and Ctrl+Space's tool list leave it out.
if (!props.config.wmFlags.includes('menu::skip')) props.config.wmFlags = [...props.config.wmFlags, 'menu::skip']

const store = useNights()
// Vaults and other areas that aren't counted as maps (Settings); Farming,
// Net worth, the drop counter and death recap use the same list.
setAreaSkip((areaId) => isSkippedArea(knownAreaName(areaId)))
watch(() => props.config.skipAreas, (list, old) => {
  setSkipAreas(list)
  // Tonight's card and Ctrl+Space follow a changed list right away.
  if (old !== undefined || list !== undefined) store.setLive(store.keptDraft())
}, { immediate: true, deep: true })
const dockRef = shallowRef<{ peek: (text: string, ms?: number) => void, unpeek: () => void } | null>(null)
// The map chip stays this long after you leave a map.
const CHIP_MS = 8000
// "Until the next map" still lets go after this long.
const UNTIL_MAP_MS = 2 * 3_600_000
const chipMs = () => {
  const s = props.config.chipSeconds
  return s === 0 ? UNTIL_MAP_MS : typeof s === 'number' && s > 0 ? s * 1000 : CHIP_MS
}
// The toast in the middle of the screen, while it shows.
const chip = shallowRef<{ rec: MapRecord, cmp: MapCompare } | null>(null)
let chipTimer: ReturnType<typeof setTimeout> | undefined
// When the toast goes; it waits while the pointer is on it.
let chipEndsAt = 0
let chipHeld = false
function startChipTimer (ms: number) {
  clearTimeout(chipTimer)
  chipEndsAt = Date.now() + ms
  chipTimer = setTimeout(() => { chip.value = null; chipHeld = false }, ms)
}
function showChip (rec: MapRecord, cmp: MapCompare, ms: number) {
  chip.value = { rec: { ...rec, npcs: [...rec.npcs] }, cmp }
  chipHeld = false
  startChipTimer(ms)
}
// After the pointer leaves it, at least this long before it goes.
const AFTER_HOLD_MS = 2500
function holdChip (on: boolean) {
  if (!chip.value || on === chipHeld) return
  chipHeld = on
  if (on) clearTimeout(chipTimer)
  else startChipTimer(Math.max(AFTER_HOLD_MS, chipEndsAt - Date.now()))
}
// Its size, from dragging its corner; saved when the drag ends.
const toastScale = computed(() => clampScale(props.config.chipScale))
function resizeChip (scale: number, done: boolean) {
  props.config.chipScale = scale
  if (done) saveConfig()
}
onUnmounted(() => { clearTimeout(chipTimer) })
// The dock is showing the map line (not the night's summary).
let chipPeek = false
function closeChip () {
  clearTimeout(chipTimer)
  chip.value = null
  chipHeld = false
  if (chipPeek) dockRef.value?.unpeek()
  chipPeek = false
}
// The close hotkey (Settings).
const chipKeySub = MainProcess.onEvent('MAIN->CLIENT::widget-action', (e) => {
  if (e.target === CHIP_CLOSE_TARGET) closeChip()
})
onUnmounted(() => { chipKeySub.abort() })
// The glance bar (off unless turned on): the map you're in, from the map log.
const glanceSince = shallowRef(0)
const glanceBefore = shallowRef(0)
const glanceMap = shallowRef<{ name: string, areaLevel: number } | null>(null)
// `replayed`: right after reading the log's tail, when you may already be in a map.
function syncGlance (replayed = false) {
  const cur = (live || replayed) && props.config.glance && mapLog.inCountedMap ? mapLog.current : null
  if (!cur) { glanceMap.value = null; return }
  glanceSince.value = mapLog.enteredThisTime
  glanceBefore.value = cur.mapMs
  // The name comes a line after the area starts: update when it changes.
  if (glanceMap.value?.name !== cur.name || glanceMap.value.areaLevel !== cur.areaLevel) glanceMap.value = { name: cur.name, areaLevel: cur.areaLevel }
}
watch(() => props.config.glance, () => syncGlance(true))
// Each map, for the chip and Session analytics' Map history.
const mapLog = new MapLog({
  onLeave: (rec) => {
    if (!live) return
    const place = props.config.chipPlace ?? 'dock'
    // The toast in the middle takes the mouse only once the pointer rests on it.
    if (place === 'center') showChip(rec, compareMap(rec, store.maps.value), chipMs())
    else if (place === 'dock') {
      dockRef.value?.peek(chipText(rec), chipMs())
      chipPeek = true
    }
  },
  // Into a map: the toast goes (it takes clicks, and a fight is no place for
  // that), and so does a dock line set to stay until then.
  onEnter: () => {
    if (live && (props.config.chipSeconds === 0 || chip.value)) closeChip()
  },
  onDone: (rec) => { store.addMap(rec).catch(() => {}) }
})

const tracker = new NightTracker((draft) => {
  mapLog.finish(draft.lastAt)
  syncGlance()
  store.finish(draft).then(async (story) => {
    // The icon only shows once the saved night is drawn; a peek before that is dropped.
    await nextTick()
    if (!live) return
    dockRef.value?.peek(peekText(story))
    chipPeek = false
  }).catch(() => {})
})
// Back after the module was off: carry on with the night it was reading.
tracker.draft = store.keptDraft()

function syncLive () {
  store.setLive(tracker.draft)
}

// Ends a night once the log has been quiet: one timer, pushed back with each
// line, so nothing wakes up while you play.
let quietTimer: ReturnType<typeof setTimeout> | undefined
function armQuiet () {
  clearTimeout(quietTimer)
  if (!tracker.draft) return
  quietTimer = setTimeout(() => {
    tracker.tick(Date.now())
    syncLive()
  }, NIGHT_GAP_MS + 1000)
}

let live = false
let tailLines = new Set<string>()
let stopLog: (() => void) | null = null
let stopped = false
onUnmounted(() => {
  // The map being read is saved as it stands.
  if (mapLog.current) mapLog.finish(Date.now())
  stopped = true
  stopLog?.()
  clearTimeout(quietTimer)
})

// Saved nights first, so the tail only replays what came after the last one.
Promise.all([store.load(), store.loadMaps()]).then(async () => {
  // After an app restart: the night as saved, then the tail adds what came after.
  const saved = await store.readDraft()
  if (!tracker.draft) tracker.draft = saved
  if (stopped) return
  // The character the last saved map was run on, until the log names one.
  const lastMap = store.maps.value[0]
  if (lastMap?.char && lastMap.className && lastMap.charLevel != null) {
    mapLog.char = { name: lastMap.char, className: lastMap.className, level: lastMap.charLevel + lastMap.levelsGained }
  }
  stopLog = followGameLog({
    since: () => null,
    onTail: (tail) => {
      live = false
      tailLines = new Set(tail.lines)
      // Read again when the game opens a new log: only lines not seen yet.
      const lastEnd = Math.max(store.nights.value[0]?.endedAt ?? 0, tracker.draft?.lastAt ?? 0)
      const mapsEnd = Math.max(store.maps.value[0]?.leftAt ?? 0, mapLog.lastAt)
      for (const line of tail.lines) {
        const at = lineTime(line)
        if (at != null && at > lastEnd) tracker.feed(line, at)
        if (at != null && at > mapsEnd) mapLog.feed(line, at)
      }
      // A night that went quiet while the app was closed ends now.
      tracker.tick(Date.now())
      syncGlance(true)
      syncLive()
      armQuiet()
    },
    onLines: (lines) => {
      live = true
      for (const { line, at } of lines) {
        if (tailLines.delete(line)) continue
        tracker.feed(line, at)
        mapLog.feed(line, at)
      }
      syncGlance()
      syncLive()
      armQuiet()
    }
  })
})

const { shown, profitOf } = useNightList()

// One line on the dock: "Fortress T16 · 1:30 · 1h avg 2:15 (2) ▼0:45 · …"
function chipText (rec: MapRecord): string {
  return chipLines(rec, compareMap(rec, store.maps.value), formatClock).join(' · ')
}

// The settings' preview: your last saved map, against the maps before it.
const cardGear = shallowRef(false)
function showMe () {
  const [last, ...before] = store.maps.value.filter(m => !isSkippedArea(m.name))
  if (!last) return
  if ((props.config.chipPlace ?? 'dock') === 'center') showChip(last, compareMap(last, before), chipMs())
  else {
    dockRef.value?.peek(chipLines(last, compareMap(last, before), formatClock).join(' · '), chipMs())
    chipPeek = true
  }
}

function peekText (s: NightStory): string {
  const p = profitOf(s)
  const profit = p != null ? ` · ${p > 0 ? '+' : ''}${formatChaos(p, s.divine)}` : ''
  return `${formatDuration(s.endedAt - s.startedAt)} · ${s.maps.length} maps${profit}`
}

// Session analytics on Map history or Nights; placed the first time if it isn't yet.
function openAnalytics (id: 'history' | 'nights') {
  // Its module off: nothing would open, so point at the switch instead.
  if (!isModuleOn(AppConfig(), 'session-analytics')) {
    toast('Turn on Session analytics (Settings › Farming & sessions) to see your maps and nights.', { ms: 4000 })
    return
  }
  openOverlay()
  if (!wm.widgets.value.some(w => w.wmType === ANALYTICS_TYPE)) wm.create(ANALYTICS_TYPE)
  savedOpenRequest.value = { tool: ANALYTICS_TYPE, id, at: Date.now() }
}
// The icon's own window is Session analytics, once it's placed: a click (also
// while playing) opens it, like any dock icon with a window.
const analyticsId = computed(() => isModuleOn(AppConfig(), 'session-analytics')
  ? wm.widgets.value.find(w => w.wmType === ANALYTICS_TYPE)?.wmId
  : undefined)
const dockMenu = computed<DockMenuAction[]>(() => [{
  label: 'Map history',
  icon: 'fas fa-map',
  action: () => openAnalytics('history')
}, {
  label: 'All nights',
  icon: 'fas fa-list',
  action: () => openAnalytics('nights')
}])
</script>

<style module>
.cardGear { padding: 4px var(--w-pad) 6px; border-top: 1px solid var(--w-line-soft); }
</style>
