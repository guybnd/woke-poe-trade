<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false" :readonly="true">
    <!-- A night is read from Client.txt: see story.ts. -->
    <DockItem ref="dockRef" id="session-story" title="Session story" :show="!!shown" :wm-id="config.wmId"
      :wake="store.finished.value" card-width="24rem" :menu="dockMenu">
      <template #card>
        <NightCard v-if="shown" :story="shown.story" :live="shown.live" :farm="farmOf(shown.story)" :title="shown.live ? 'Tonight so far' : nightTitle(shown.story)" />
      </template>
    </DockItem>
    <WPanel :title="config.wmTitle || 'Session story'" width="34rem" max-height="80vh">
      <template v-if="store.loadError.value" #banner>
        <WBanner>Couldn't read your saved nights: {{ store.loadError.value }}</WBanner>
      </template>
      <template #meta>
        <div class="flex flex-wrap items-center gap-2" data-chip-place>
          <span class="w-dim text-xs" title="A line about each map you leave: time, deaths, league NPCs met, level-ups">After a map</span>
          <WSegmented v-model="chipPlace" :options="CHIP_OPTIONS" />
          <WSelect v-if="chipPlace !== 'off'" v-model="chipSeconds" :options="CHIP_TIMES" title="How long the line stays" />
          <WToggle v-if="chipPlace === 'center'" v-model="chipClick">Click closes it</WToggle>
        </div>
      </template>
      <WEmpty v-if="!list.length" icon="fas fa-moon">
        No nights yet. A night is read from the game's log, from your first map until it goes quiet for 15 minutes.
      </WEmpty>
      <template v-else>
        <NightCard v-if="selected" :story="selected.story" :live="selected.live" :farm="farmOf(selected.story)"
          :title="selected.live ? 'Tonight so far' : nightTitle(selected.story)" />
        <div class="w-group-label" :class="$style.label">Nights</div>
        <button v-for="n in list" :key="n.story.id" type="button" :class="[$style.row, { [$style.on]: selected?.story.id === n.story.id }]"
          data-night-row @click="picked = n.story.id">
          <span class="flex-1 w-trunc">{{ n.live ? 'Tonight so far' : nightTitle(n.story) }}</span>
          <span class="w-dim w-num">{{ formatDuration(n.story.endedAt - n.story.startedAt) }} · {{ n.story.maps.length }} maps</span>
          <span v-if="profitOf(n.story) != null" class="w-num" :class="profitOf(n.story)! >= 0 ? 'w-up' : 'w-down'">
            {{ formatChaos(profitOf(n.story)!, n.story.divine) }}
          </span>
        </button>
      </template>
    </WPanel>
  </Widget>
</template>

<script lang="ts">
import { widgetSessionStorySpec } from '../widget-specs'
import { initSessionStoryWidget } from './widget'

export default { widget: widgetSessionStorySpec }
</script>

<script setup lang="ts">
import { computed, inject, nextTick, onUnmounted, shallowRef } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { WBanner, WEmpty, WPanel, WSegmented, WSelect, WToggle, dismissToast, toast } from '../ui'
import { formatChaos, formatClock, formatDuration, nowMinute } from '../ui/format'
import DockItem from '../dock/DockItem.vue'
import type { DockMenuAction } from '../dock/dock'
import { hideWhilePlaying, showWithOverlay } from '../dock/dock'
import { lineTime } from '../campaign/log-tail'
import { followGameLog } from '../shared/game-log'
import NightCard from './NightCard.vue'
import { NIGHT_GAP_MS, NightTracker, farmingProfit } from './story'
import { useSessionStore } from '../analytics/store'
import { sessionTotals } from '../analytics/stats'
import type { NightStory } from './story'
import { MapLog, chipLines, compareMap } from './map-log'
import type { MapRecord } from './map-log'
import { useNights } from './store'
import { CHIP_CLOSE_TARGET } from './widget'
import type { ChipPlace, SessionStoryWidget } from './widget'
import { MainProcess } from '@/web/background/IPC'
import { pushHostConfig } from '@/web/Config'

const props = defineProps<{ config: SessionStoryWidget }>()
const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  Object.assign(props.config, initSessionStoryWidget(props.config.wmId))
}
hideWhilePlaying(props.config)

const store = useNights()
const dockRef = shallowRef<{ peek: (text: string, ms?: number) => void, unpeek: () => void } | null>(null)
// The map chip stays this long after you leave a map.
const CHIP_MS = 8000
// "Until the next map" still lets go after this long.
const UNTIL_MAP_MS = 2 * 3_600_000
const chipMs = () => {
  const s = props.config.chipSeconds
  return s === 0 ? UNTIL_MAP_MS : typeof s === 'number' && s > 0 ? s * 1000 : CHIP_MS
}
let chipToast: number | null = null
// The dock is showing the map line (not the night's summary).
let chipPeek = false
function closeChip () {
  if (chipToast != null) dismissToast(chipToast)
  chipToast = null
  if (chipPeek) dockRef.value?.unpeek()
  chipPeek = false
}
// The close hotkey (Settings).
const chipKeySub = MainProcess.onEvent('MAIN->CLIENT::widget-action', (e) => {
  if (e.target === CHIP_CLOSE_TARGET) closeChip()
})
onUnmounted(() => { chipKeySub.abort() })
// A finished night shows on the dock for this long.
const RECENT_MS = 12 * 3_600_000

// Each map, for the chip and Session analytics' Map history.
const mapLog = new MapLog({
  onLeave: (rec) => {
    if (!live) return
    const place = props.config.chipPlace ?? 'dock'
    // The note in the middle takes the mouse only with "Click closes it" on,
    // and only while the cursor is over it.
    if (place === 'center') chipToast = toast(chipText(rec, 2), { center: true, ms: chipMs(), closeOnClick: props.config.chipClick === true })
    else if (place === 'dock') {
      dockRef.value?.peek(chipText(rec, 1), chipMs())
      chipPeek = true
    }
  },
  // Into a map: a line set to stay until then goes, and so does one that can
  // take the mouse (it would catch clicks meant for the fight).
  onEnter: () => {
    if (live && (props.config.chipSeconds === 0 || props.config.chipClick === true)) closeChip()
  },
  onDone: (rec) => { store.addMap(rec).catch(() => {}) }
})

const tracker = new NightTracker((draft) => {
  mapLog.finish(draft.lastAt)
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
Promise.all([store.load(), store.loadMaps()]).then(() => {
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
      syncLive()
      armQuiet()
    }
  })
})

interface Shown { story: NightStory, live: boolean }

const shown = computed<Shown | null>(() => {
  if (store.live.value) return { story: store.live.value, live: true }
  const last = store.nights.value[0]
  return last && nowMinute.value - last.endedAt < RECENT_MS ? { story: last, live: false } : null
})

const list = computed<Shown[]>(() => [
  ...(store.live.value ? [{ story: store.live.value, live: true }] : []),
  ...store.nights.value.map(story => ({ story, live: false }))
])
const picked = shallowRef<string | null>(null)
const selected = computed(() => list.value.find(n => n.story.id === picked.value) ?? list.value[0] ?? null)

function nightTitle (s: NightStory): string {
  const d = new Date(s.startedAt)
  return `Night of ${d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}`
}

// Farming's saved sessions: profit for nights the stash reader didn't read.
const sessions = useSessionStore()
sessions.load().catch(() => {})
const farmSessions = computed(() => sessions.sessions.value.map(s => ({ startedAt: s.startedAt, endedAt: s.endedAt, profit: sessionTotals(s).profit })))
function farmOf (s: NightStory) {
  if (s.profitChaos != null) return null
  // The next night: the one just newer in the list (the live one is newest).
  const i = list.value.findIndex(n => n.story.id === s.id)
  const next = i > 0 ? list.value[i - 1].story.startedAt : null
  return farmingProfit(s, next, farmSessions.value)
}
function profitOf (s: NightStory): number | null {
  return s.profitChaos ?? farmOf(s)?.chaos ?? null
}

// "Fortress T16 · 6:42 ▼0:38 · 1 death · Einhar, Niko · Level 95"
// Two lines in the middle of the screen, one on the dock.
function chipText (rec: MapRecord, lines: 1 | 2): string {
  const out = chipLines(rec, compareMap(rec, store.maps.value), formatClock)
  return out.join(lines === 2 ? '
' : ' · ')
}

function peekText (s: NightStory): string {
  const p = profitOf(s)
  const profit = p != null ? ` · ${p > 0 ? '+' : ''}${formatChaos(p, s.divine)}` : ''
  return `${formatDuration(s.endedAt - s.startedAt)} · ${s.maps.length} maps${profit}`
}

// Same choice as in Settings › Farming & sessions.
const CHIP_OPTIONS: Array<{ value: ChipPlace, label: string }> = [
  { value: 'dock', label: 'On the dock icon' },
  { value: 'center', label: 'Middle of the screen' },
  { value: 'off', label: 'Off' }
]
const CHIP_TIMES = [
  { value: '5', label: '5 s' },
  { value: '8', label: '8 s' },
  { value: '15', label: '15 s' },
  { value: '30', label: '30 s' },
  { value: '0', label: 'Until the next map' }
]
const chipSeconds = computed({
  get: () => String(props.config.chipSeconds ?? 8),
  set: (v: string) => { props.config.chipSeconds = Number(v) }
})
const chipClick = computed({
  get: () => props.config.chipClick === true,
  set: (v: boolean) => { props.config.chipClick = v }
})
const chipPlace = computed({
  get: () => props.config.chipPlace ?? 'dock',
  // The close key is registered only while the line shows somewhere.
  set: (v: ChipPlace) => { props.config.chipPlace = v; pushHostConfig() }
})

const dockMenu = computed<DockMenuAction[]>(() => [{
  label: 'All nights',
  icon: 'fas fa-list',
  action: () => showWithOverlay(wm, props.config.wmId)
}])
</script>

<style module>
.label { padding: 10px var(--w-pad) 2px; border-top: 1px solid var(--w-line); margin-top: 6px; }
.row {
  display: flex;
  gap: 10px;
  width: 100%;
  padding: 5px var(--w-pad);
  text-align: left;
  border-top: 1px solid var(--w-line-soft);
}
.row:hover, .on { background: var(--w-panel-2); }
</style>
