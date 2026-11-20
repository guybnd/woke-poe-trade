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
import { WBanner, WEmpty, WPanel, toast } from '../ui'
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
import { MapLog, tierText, usualMapMs } from './map-log'
import type { MapRecord } from './map-log'
import { useNights } from './store'
import type { SessionStoryWidget } from './widget'

const props = defineProps<{ config: SessionStoryWidget }>()
const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  Object.assign(props.config, initSessionStoryWidget(props.config.wmId))
}
hideWhilePlaying(props.config)

const store = useNights()
const dockRef = shallowRef<{ peek: (text: string, ms?: number) => void } | null>(null)
// The map chip stays this long after you leave a map.
const CHIP_MS = 8000
// A finished night shows on the dock for this long.
const RECENT_MS = 12 * 3_600_000

// Each map, for the chip and Session analytics' Map history.
const mapLog = new MapLog({
  onLeave: (rec) => {
    if (!live) return
    const place = props.config.chipPlace ?? 'dock'
    // The note in the middle never takes the mouse: clicks go to the game.
    if (place === 'center') toast(chipText(rec), { center: true, ms: CHIP_MS })
    else if (place === 'dock') dockRef.value?.peek(chipText(rec), CHIP_MS)
  },
  onDone: (rec) => { store.addMap(rec).catch(() => {}) }
})

const tracker = new NightTracker((draft) => {
  mapLog.finish(draft.lastAt)
  store.finish(draft).then(async (story) => {
    // The icon only shows once the saved night is drawn; a peek before that is dropped.
    await nextTick()
    if (live) dockRef.value?.peek(peekText(story))
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
function chipText (rec: MapRecord): string {
  const parts = [`${rec.name} ${tierText(rec.areaLevel)}`]
  const usual = usualMapMs(store.maps.value)
  const diff = usual != null ? rec.mapMs - usual : null
  const delta = diff != null && Math.abs(diff) >= 5000 ? ` ${diff < 0 ? '▼' : '▲'}${formatClock(Math.abs(diff))}` : ''
  parts.push(`${formatClock(rec.mapMs)}${delta}`)
  if (rec.deaths) parts.push(`${rec.deaths} ${rec.deaths === 1 ? 'death' : 'deaths'}`)
  if (rec.npcs.length) parts.push(rec.npcs.join(', '))
  if (rec.levelsGained && rec.charLevel != null) parts.push(`Level ${rec.charLevel + rec.levelsGained}`)
  return parts.join(' · ')
}

function peekText (s: NightStory): string {
  const p = profitOf(s)
  const profit = p != null ? ` · ${p > 0 ? '+' : ''}${formatChaos(p, s.divine)}` : ''
  return `${formatDuration(s.endedAt - s.startedAt)} · ${s.maps.length} maps${profit}`
}

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
