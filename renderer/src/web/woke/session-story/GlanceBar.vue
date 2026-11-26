<template>
  <Teleport to="body">
    <!-- While you're in a map: a thin bar, click-through while you play. With the
         overlay open it can be dragged anywhere; while Settings is open it also
         shows outside a map, so it can be placed before one. Its fields and
         whether it stays out of maps (a run going, or all night) are settings. -->
    <div v-if="map || editing || outside || after" :class="[$style.bar, { [$style.movable]: movable || editing, [$style.editing]: editing }]" :style="place" class="w-num" data-glance-bar role="status"
      :title="(movable || editing) && !popover ? 'Drag to move' : undefined" @pointerdown="startDrag">
      <template v-if="map">
        <template v-if="on.map">
          <span :class="$style.name" data-glance-map>{{ map.name }}</span>
          <span class="w-dim">{{ tierText(map.areaLevel) }}</span>
        </template>
        <span v-if="on.time" :class="{ 'w-warn': slow }" data-glance-time
          :title="pace != null ? `Your average for it: ${formatClock(pace)}` : undefined">{{ formatClock(elapsed) }}</span>
        <span v-if="on.deaths && map.deaths" class="w-down" data-glance-deaths><i class="fas fa-skull" /> {{ map.deaths }}</span>
        <span v-if="on.mechanics && map.npcs.length" :class="$style.mechs" class="w-dim" data-glance-mechanics>
          <span v-for="n in map.npcs" :key="n" :class="$style.mech"><WIcon v-if="logMechanic(n)" :mechanic="logMechanic(n)" title="" size="sm" />{{ n }}</span>
        </span>
      </template>
      <template v-else-if="outside && on.last && last">
        <span class="w-dim">Last</span>
        <span :class="$style.name" data-glance-last>{{ last.name }}</span>
        <span>{{ formatClock(last.mapMs) }}</span>
        <span v-if="last.diff != null && Math.abs(last.diff) >= 1000" :class="last.diff > 0 ? 'w-down' : 'w-up'" title="Against your average for it">{{ last.diff > 0 ? '+' : '−' }}{{ formatClock(Math.abs(last.diff)) }}</span>
      </template>
      <!-- In maps only: the map you just left, for a few seconds (its time against your usual). -->
      <span v-else-if="after" :class="$style.name" data-glance-after>{{ after }}</span>
      <span v-else-if="outside" class="w-dim" data-glance-out>Out of maps</span>
      <span v-else :class="$style.name">Glance bar</span>
      <!-- A strategy run going (Net worth › Runs): its maps and profit instead of tonight's. -->
      <template v-if="run && runFields">
        <span :class="$style.sep" />
        <span class="w-dim" data-glance-run>Run</span>
        <template v-if="on.maps">
          <span v-if="runMaps || !run.fights" data-glance-run-maps>{{ runMaps }} {{ runMaps === 1 ? 'map' : 'maps' }}</span>
          <span v-if="run.fights">{{ run.fights }} {{ run.fights === 1 ? 'fight' : 'fights' }}</span>
        </template>
        <span v-if="on.profit" :class="run.profitChaos >= 0 ? 'w-up' : 'w-down'" :title="run.readAt ? `Profit at the last stash read, ${clock(run.readAt)}` : undefined">{{ run.profitChaos > 0 ? '+' : '' }}{{ formatChaos(run.profitChaos, run.divine) }}</span>
        <span v-if="on.perHour && runRate != null" data-glance-rate :title="leftOutText(time)">{{ formatChaos(runRate, run.divine) }}/h</span>
        <span v-if="on.total" data-glance-total title="Since the run started">{{ hoursText(clockNow - run.startAt) }}</span>
        <span v-if="on.avg && runAvg != null" class="w-dim" data-glance-avg title="Average map time in the run, its last 20 maps at most">avg {{ formatClock(runAvg) }}</span>
      </template>
      <template v-else-if="night && nightFields">
        <span :class="$style.sep" />
        <span class="w-dim" data-glance-session>This session</span>
        <span v-if="on.maps">{{ night.maps.length }} {{ night.maps.length === 1 ? 'map' : 'maps' }}</span>
        <span v-if="on.profit && profit != null" :class="profit >= 0 ? 'w-up' : 'w-down'">{{ profit > 0 ? '+' : '' }}{{ formatChaos(profit, night.divine) }}</span>
        <span v-if="on.perHour && nightRate != null" data-glance-rate :title="leftOutText(time)">{{ formatChaos(nightRate, night.divine) }}/h</span>
        <span v-if="on.total" data-glance-total title="This session so far, AFK left out">{{ hoursText(playedMs(nightNow ?? night)) }}</span>
        <span v-if="on.avg && nightAvg != null" class="w-dim" data-glance-avg>avg {{ formatClock(nightAvg) }}</span>
      </template>
      <!-- With the overlay open (not in Settings already): its settings, one click away. -->
      <button v-if="movable && !editing && config" type="button" :class="[$style.cog, { 'w-accent': popover }]" class="w-dim" data-glance-cog title="What the bar shows"
        @pointerdown.stop @click.stop="popover = !popover"><i class="fas fa-cog" /></button>
      <!-- The cog's settings, under the bar: they apply and save as you tick. -->
      <div v-if="popover && movable && !editing && config" ref="popEl" :class="[$style.popover, { [$style.up]: popUp }]" :style="popShift" data-glance-popover @pointerdown.stop>
        <GlanceSettings :config="config" live />
      </div>
      <span :class="[$style.grip, { [$style.gripOn]: movable || editing }]" class="w-dim" data-glance-drag><i class="fas fa-grip-vertical" /></span>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
// Settings › Sessions › "While in a map". On unless turned off.
import { computed, nextTick, onUnmounted, shallowRef, watch } from 'vue'
import { AppConfig } from '@/web/Config'
import { hostRequest } from '../shared/host'
import { formatChaos, formatClock, nowMinute } from '../ui/format'
import { tickWhile } from '../dock/dock'
import { tierText, usualMapMs } from './map-log'
import { dragSpot } from '../ui/drag-spot'
import type { MapRecord } from './map-log'
import { useNightList } from './nights'
import { useNights } from './store'
import { runMapsNow } from './glance-run'
import { avgMapMs, glanceFields, glanceOutside, glanceShow, hoursText, perHourOf } from './glance-fields'
import type { LastMap } from './glance-fields'
import type { SessionStoryWidget } from './widget'
import GlanceSettings from './GlanceSettings.vue'
import WIcon from '../ui/WIcon.vue'
import { logMechanic } from '../ui/game-icons'
import { isSkippedArea } from './skip-areas'
import { nightRateMs, nightUpTo, playedMs } from './night-rate'
import { countedMs, leftOutText } from '../shared/rate-time'
import type { TimeSplit } from '../shared/rate-time'
import { rateTime } from '../shared/rate-time-now'

const props = defineProps<{
  // The map you're in, as Session story's map log has it; null in hideout or town.
  map: (Pick<MapRecord, 'name' | 'areaLevel' | 'deaths'> & { npcs: readonly string[] }) | null
  // When you went in this time through the portal, and the map's time before that.
  since: number
  before: number
  // Settings is open: the bar shows even outside a map, outlined, to be placed.
  editing?: boolean
  // The overlay is open: the bar takes the mouse and can be dragged by any part.
  movable?: boolean
  // Where it sits: its top centre, as a share of the screen; null: top centre.
  pos?: { x: number, y: number } | null
  // The saved fields and when it shows (glance-fields.ts cleans them).
  fields?: unknown
  show?: unknown
  // The map you just left (till the next one), for the bar between maps.
  last?: LastMap | null
  // The map line after a map (chip place "bar"), for a few seconds.
  after?: string | null
  // The widget's config, for the cog's popover; left out: no cog.
  config?: SessionStoryWidget
}>()
const emit = defineEmits<{ move: [pos: { x: number, y: number }, done: boolean] }>()
// The cog's popover; shut whenever the overlay closes.
const popover = shallowRef(false)
watch(() => props.movable, (open) => { if (!open) popover.value = false })
// Kept on screen: above the bar in the lower half, and moved in from a side edge.
const popEl = shallowRef<HTMLElement | null>(null)
const popUp = computed(() => (props.pos?.y ?? 0) > 0.5)
const popShift = shallowRef<{ transform: string } | undefined>(undefined)
watch([popover, () => props.pos], async () => {
  popShift.value = undefined
  if (!popover.value) return
  await nextTick()
  const r = popEl.value?.getBoundingClientRect()
  if (!r) return
  const dx = r.left < 8 ? 8 - r.left : r.right > window.innerWidth - 8 ? window.innerWidth - 8 - r.right : 0
  if (dx) popShift.value = { transform: `translateX(calc(-50% + ${Math.round(dx)}px))` }
})

const on = computed(() => {
  const f = glanceFields(props.fields)
  return { map: f.has('map'), time: f.has('time'), deaths: f.has('deaths'), mechanics: f.has('mechanics'), maps: f.has('maps'), profit: f.has('profit'), perHour: f.has('perHour'), total: f.has('total'), avg: f.has('avg'), last: f.has('last') }
})
const runFields = computed(() => on.value.maps || on.value.profit || on.value.perHour || on.value.total || on.value.avg)
const nightFields = runFields
const showWhen = computed(() => glanceShow(props.show))

const place = computed(() => props.pos
  ? { left: `${props.pos.x * 100}%`, top: `${props.pos.y * 100}%` }
  : undefined)
// Dragging moves its top centre with the pointer, kept on screen (drag-spot.ts).
function startDrag (e: PointerEvent) {
  if (!props.movable && !props.editing) return
  dragSpot(e, e.currentTarget as HTMLElement, (spot, done) => emit('move', spot, done))
}

// The map's time so far, like the after-map toast, ticking each second while
// in a map, only while it shows (Map time off: nothing ticks). Out of maps
// nothing ticks faster than the shared minute clock.
const now = shallowRef(Date.now())
onUnmounted(tickWhile(() => !!props.map && on.value.time, () => { now.value = Date.now() }, 1000))
const elapsed = computed(() => props.before + Math.max(0, now.value - props.since))
const clockNow = computed(() => props.map && on.value.time ? now.value : Math.max(now.value, nowMinute.value))
const nights = useNightList()
const night = computed(() => nights.shown.value?.live ? nights.shown.value.story : null)
const profit = computed(() => night.value ? nights.profitOf(night.value) : null)
// The Per hour setting (Play / + Hideout / All); the config is reactive.
const time = computed(() => rateTime())

// The strategy run's saved glance (net-worth/runs.ts RunGlance), read each
// time you go into or out of a map, when the overlay closes (Start and Stop
// are pressed there) and, while the bar stays out of maps, each minute.
// `at`: when it was saved (its map count is up to then); `readAt`: the stash
// read its profit is from.
interface RunNumbers { name: string, maps: number, fights: number, profitChaos: number, divine: number | null, at: number, startAt: number, lastMapAt?: number, readAt: number | null, time: TimeSplit | null }
const run = shallowRef<RunNumbers | null>(null)
const recent = useNights()
type SavedGlance = Partial<RunNumbers> & { league?: string, timeTo?: number }
const isSplit = (t: unknown): t is TimeSplit => t != null && typeof t === 'object' &&
  (['map', 'play', 'hub', 'off'] as const).every(k => typeof (t as Record<string, unknown>)[k] === 'number')
// Reads can cross: only the newest one's answer counts.
let readSeq = 0
function readRun () {
  const league = AppConfig().leagueId
  if (!league) { run.value = null; return }
  const seq = ++readSeq
  hostRequest('doc-get', { collection: 'net-worth', key: `${league}-run-glance` })
    .then((g) => {
      if (seq !== readSeq) return
      const o = g as SavedGlance | null
      run.value = o && o.league === league && typeof o.profitChaos === 'number' && Number.isFinite(o.profitChaos) && typeof o.maps === 'number'
        ? { name: String(o.name ?? ''), maps: o.maps, fights: typeof o.fights === 'number' ? o.fights : 0, profitChaos: o.profitChaos, divine: typeof o.divine === 'number' ? o.divine : null, at: typeof o.at === 'number' ? o.at : 0, startAt: typeof o.startAt === 'number' ? o.startAt : 0, ...(typeof o.lastMapAt === 'number' ? { lastMapAt: o.lastMapAt } : {}), readAt: typeof o.timeTo === 'number' ? o.timeTo : null, time: isSplit(o.time) ? o.time : null }
        : null
    })
    .catch(() => {})
}
watch(() => props.map ? props.since : null, () => {
  readRun()
  recent.loadMaps().catch(() => {})
}, { immediate: true })
// Stop saves the run's end after a Faustus read: read again a little later too.
let lateRead: ReturnType<typeof setTimeout> | undefined
watch(() => props.movable, (open, was) => {
  if (!was || open) return
  readRun()
  clearTimeout(lateRead)
  lateRead = setTimeout(readRun, 5000)
})
onUnmounted(() => clearTimeout(lateRead))
let runPoll: ReturnType<typeof setInterval> | undefined
// Only while there's something to show: a run or tonight going (a run started
// from the overlay is read when it closes).
watch(() => showWhen.value !== 'map' && !props.map && (!!run.value || !!night.value), (poll) => {
  clearInterval(runPoll)
  runPoll = poll ? setInterval(readRun, 60_000) : undefined
}, { immediate: true })
onUnmounted(() => clearInterval(runPoll))

// Out of a map, the bar stays while a run goes, or all night (the setting).
const outside = computed(() => !props.map && glanceOutside(showWhen.value, !!run.value, !!night.value))

// The saved count changes only with a stash read; maps since then come from
// the map log, so the count keeps up map by map (profit waits for a read).
const runMaps = computed(() => {
  const r = run.value
  if (!r) return 0
  return runMapsNow(r, recent.maps.value)
})
// Per hour over the time the Per hour setting counts, to the stash read the
// profit is from (the clock without Client.txt), like Net worth's runs.
const runRate = computed(() => {
  const r = run.value
  if (!r) return null
  const to = r.readAt ?? r.at
  const known = r.time && r.time.map + r.time.play + r.time.hub > 0 ? r.time : null
  return perHourOf(r.profitChaos, known && time.value !== 'all' ? countedMs(known, time.value) : to - r.startAt)
})
const runAvg = computed(() => {
  const r = run.value
  return r ? avgMapMs(recent.maps.value.filter(m => m.leftAt > r.startAt && !isSkippedArea(m.name))) : null
})
// The live night carried on to now (night-rate.ts).
const nightNow = computed(() => night.value ? nightUpTo(night.value, clockNow.value, !!props.map) : null)
const nightRate = computed(() => nightNow.value ? perHourOf(profit.value, nightRateMs(nightNow.value, time.value)) : null)
// Finished maps only: the one you're in is still counting.
const nightAvg = computed(() => night.value ? avgMapMs(props.map ? night.value.maps.slice(0, -1) : night.value.maps) : null)

// This map's pace: your average for it in the hour before you went in, else
// your usual map (as the after-map toast compares). Amber once past it.
const pace = computed(() => {
  const m = props.map
  if (!m) return null
  const others = recent.maps.value.filter(r => r.enteredAt < props.since && r.mapMs > 30_000 && !isSkippedArea(r.name))
  const same = others.filter(r => r.name === m.name && props.since - r.enteredAt <= 3_600_000)
  return same.length ? same.reduce((s, r) => s + r.mapMs, 0) / same.length : usualMapMs(others)
})
const slow = computed(() => pace.value != null && elapsed.value > pace.value)
const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
</script>

<style module>
.mechs { display: inline-flex; align-items: center; gap: 8px; }
.mech { display: inline-flex; align-items: center; gap: 3px; }
.bar {
  position: fixed;
  /* Below the dock's default row; the dock sits at z-index 900. */
  top: 52px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 2px 10px;
  font-size: var(--w-fs-sm);
  white-space: nowrap;
  color: var(--w-fg);
  background: color-mix(in srgb, var(--w-panel) 86%, transparent);
  border: 1px solid var(--w-line);
  pointer-events: none;
  z-index: 950;
}
/* With the overlay open: takes the mouse, grip on hover only (it can sit over a price check). */
.movable { pointer-events: auto; cursor: move; user-select: none; }
.grip { visibility: hidden; }
.movable:hover .gripOn, .editing .gripOn { visibility: visible; }
.movable:hover, .editing { border-color: var(--w-accent); }
.name { color: var(--w-accent); }
.cog { all: unset; cursor: pointer; padding: 0 2px; }
.cog:hover { color: var(--w-accent); }
.popover {
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 10px;
  align-items: center;
  padding: 8px 10px;
  white-space: nowrap;
  cursor: default;
  background: var(--w-panel);
  border: 1px solid var(--w-line);
}
.popover > * { justify-self: start; }
.up { top: auto; bottom: calc(100% + 4px); }
.sep { width: 1px; align-self: stretch; background: var(--w-line); }
</style>
