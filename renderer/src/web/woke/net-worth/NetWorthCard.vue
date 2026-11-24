<template>
  <!-- The dock card (pick C1): am I up, and by what. The frame adds the title,
       the pin and the Open row. -->
  <div :class="$style.card">
    <template v-if="signedOut">
      <div class="w-dim text-xs">Signed out of pathofexile.com.</div>
      <button type="button" :class="$style.link" data-sign-in @click="emit('settings')">Sign in in Settings</button>
    </template>
    <template v-else>
      <div v-if="status?.error && status.error.kind !== 'signed-out'" class="text-xs" :class="$style.warn">{{ status.error.message }}</div>
      <!-- Pick Q1: while a run goes, the card opens on it; Net worth is a click away. -->
      <WSegmented v-if="run" :model-value="tab" :options="TAB_OPTIONS" data-card-tabs @update:model-value="tab = $event === 'worth' ? 'worth' : 'run'" />
      <template v-if="run && tab === 'run'">
        <div :class="$style.runHead" data-card-run>
          <b class="w-trunc" :class="$style.runName">{{ run.name }}</b>
          <span class="w-dim w-num text-xs">{{ runFor }} · {{ countLabel(run.maps, run.fights) }}</span>
        </div>
        <div :class="$style.total">
          <b class="w-num" :class="tone(run.profitChaos)" data-card-run-profit>{{ signed(toDiv(run.profitChaos)) }}<Coin :chaos="!divineRate" /></b>
          <span class="w-dim text-xs">profit</span>
        </div>
        <template v-if="run.faustusChaos">
          <div :class="$style.kv" title="Listed at Faustus during the run, sold and not collected yet, and items held outside"><span>Outside the stash</span><span class="w-num" :class="tone(run.faustusChaos)">{{ signed(toDiv(run.faustusChaos)) }}<Coin :chaos="!divineRate" /></span></div>
          <div :class="$style.kv" data-card-run-total><span :class="$style.gold">Total</span><span class="w-num" :class="tone(run.profitChaos + run.faustusChaos)">{{ signed(toDiv(run.profitChaos + run.faustusChaos)) }}<Coin :chaos="!divineRate" /></span></div>
        </template>
        <div :class="$style.stats" class="w-dim w-num text-xs" data-card-run-stats>
          <span v-if="runs">{{ signed(toDiv(run.profitChaos / runs)) }}<Coin :chaos="!divineRate" />/{{ unit }}</span><span v-else>No maps yet</span>
          <span v-if="perHour != null" :title="perHourTip">{{ signed(toDiv(perHour)) }}<Coin :chaos="!divineRate" />/h</span><span v-else>Per hour after 10 min</span>
          <span v-if="run.costPerMapChaos != null">Costs {{ div(run.costPerMapChaos) }}<Coin :chaos="!divineRate" />/{{ unit }}</span>
        </div>
        <!-- Where the run's time went (Client.txt): maps, hideout and town, away. -->
        <template v-if="time">
          <div :class="$style.timeBar" data-card-run-time>
            <i v-for="p in time.parts" :key="p.id" :class="$style[p.id]" :style="{ flexGrow: p.ms }" :title="`${p.label}: ${formatDuration(p.ms)}`" />
          </div>
          <div :class="$style.timeKey" class="w-dim w-num text-xs">
            <span v-for="p in time.parts" :key="p.id"><i :class="[$style.dot, $style[p.id]]" />{{ p.label }} {{ formatDuration(p.ms) }}</span>
            <RateTimePick :class="$style.ratePick" />
          </div>
        </template>
        <!-- What brought the most in (the stash's tally since the start). -->
        <template v-if="topCame.length">
          <div :class="$style.caps">Most income</div>
          <div v-for="r in topCame" :key="r.key" :class="$style.row" data-card-run-came>
            <img v-if="r.line.icon" :src="r.line.icon" alt="" :class="$style.art"><span v-else :class="$style.art" />
            <span v-item-tip="tipFor(tips, r.key, r.line.name, Math.abs(r.net))" class="w-trunc">{{ r.net > 1 ? `${fmt(r.net)} × ` : '' }}{{ r.line.name }}</span>
            <span class="w-num w-up" :title="inChaos(r.netChaos)">{{ signed(toDiv(r.netChaos)) }}</span>
          </div>
        </template>
        <button type="button" :class="$style.fold" title="Show Net worth" data-card-fold @click="tab = 'worth'">
          <span class="w-dim">Net worth</span>
          <b v-if="v" class="w-num" :title="totalTip">{{ div(v.chaos + listedAdd) }}<Coin :chaos="!divineRate" /></b>
          <span v-if="today != null" class="w-num text-xs" :class="tone(today)">{{ today >= 0 ? '▲' : '▼' }} {{ signed(today) }} today</span>
          <i class="fas fa-chevron-right w-dim" :class="$style.chev" />
        </button>
        <div :class="$style.foot">
          <button type="button" :class="[$style.refresh, $style.left, $style.stop]" data-card-stop :disabled="!canStop"
            :title="canStop ? 'Stop the run: reads your Faustus listings, then keeps the summary' : 'Waiting for Net worth to load'" @click="stopClick">
            <i class="fas fa-stop" /> {{ stopping ? 'Stopping…' : confirmStop ? 'Stop the run?' : 'Stop' }}
          </button>
          <button type="button" :class="[$style.refresh, $style.left]" data-card-open-run @click="emit('open-run')">Open run</button>
          <span class="w-dim text-xs" :class="$style.readEnd">{{ readLine }}</span>
        </div>
      </template>
      <template v-else>
      <template v-if="status?.lastReadAt">
        <div v-if="v" :class="$style.total">
          <b class="w-num" :title="totalTip">{{ div(v.chaos + listedAdd) }}<Coin :chaos="!divineRate" /></b>
          <span v-if="today != null" class="w-num text-xs" :class="tone(today)">{{ today >= 0 ? '▲' : '▼' }} {{ signed(today) }} today</span>
        </div>
        <div v-else class="w-dim text-xs">Waiting for poe.ninja prices…</div>
        <!-- Per hour of play, as in the window: hideout, town, closed and AFK left out. -->
        <!-- The window picked here (shared with the window's Details) sets the
             per hour figure and the graph. -->
        <div v-if="v" :class="$style.rates">
          <WSegmented :model-value="win" :options="WINDOW_OPTIONS" @update:model-value="pick" />
          <span class="w-num" :class="tone(rate.div)" :title="rate.tip">{{ rate.div == null ? '—' : signed(rate.div) }}<Coin :chaos="!divineRate" />/h</span>
        </div>
        <!-- The window's chart, short: hover a point for what changed, click to keep it. -->
        <LedgerChart v-if="series.length > 1" :series="series" :big="big" mode="total" :goal-div="null" :height="48" tip-below
          :tip-of="(name, count) => tipFor(tips, null, name, count)" :class="$style.spark" />
        <template v-if="v">
          <div v-if="diff" :class="$style.caps">Since last read · <span class="w-num" :class="tone(diff.netChaos)">{{ signed(toDiv(diff.netChaos)) }}<Coin :chaos="!divineRate" /></span></div>
          <div v-for="c in changes" :key="c.key + c.count" :class="$style.row">
            <img v-if="c.icon" :src="c.icon" alt="" :class="$style.art"><span v-else :class="$style.art" />
            <span v-item-tip="tipFor(tips, c.key, c.name, Math.abs(c.count))" class="w-trunc">{{ c.count < 0 ? `−${fmt(-c.count)} × ` : c.count > 1 ? `${fmt(c.count)} × ` : '' }}{{ c.name }}</span>
            <span class="w-num" :class="tone(c.chaos)" :title="inChaos(c.chaos)">{{ signed(toDiv(c.chaos)) }}</span>
          </div>
          <div v-if="!changes.length" class="w-dim text-xs">No changes since last read</div>
        </template>
      </template>
      <div v-else-if="!status?.running" class="w-dim text-xs">Not read yet</div>
      <!-- Start a run from here (no run going): from the last read, named like the last one. -->
      <div v-if="naming" :class="$style.foot" data-card-start-form>
        <input ref="nameEl" v-model="runName" class="w-input px-1 rounded" :class="$style.runInput" placeholder="Run name" maxlength="40" aria-label="Run name" @keydown.enter="startClick" @keydown.esc="naming = false">
        <button type="button" :class="[$style.refresh, $style.left]" :disabled="!canStart" data-card-start-go @click="startClick">{{ startingRun ? 'Starting…' : 'Start' }}</button>
        <button type="button" :class="$style.x" title="Cancel" aria-label="Cancel" @click="naming = false"><i class="fas fa-times" /></button>
      </div>
      <div :class="$style.foot">
        <button v-if="!run && !naming && status?.lastReadAt" type="button" :class="[$style.refresh, $style.left]" :disabled="!canStart" :title="canStart ? 'Start a strategy run from the last read' : 'Waiting for Net worth to load'" data-card-start @click="openNaming"><i class="fas fa-play" /> Start run</button>
        <span class="w-dim text-xs" :class="$style.readEnd">{{ readLine }}</span>
        <button type="button" :class="[$style.refresh, $style.left]" data-card-refresh :disabled="!canRefresh"
          :title="waitMs > 0 ? 'Reads wait 10 minutes after the last one' : 'Read your stash now'" @click="emit('refresh')">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': status?.running }" />
          {{ status?.running ? (status.progress ? `reading ${status.progress.done}/${status.progress.total}` : 'reading…') : waitMs > 0 ? `in ${Math.ceil(waitMs / 60_000)} min` : 'Refresh' }}
        </button>
      </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
// Loaded the first time the card opens, with the window's data (store.ts).
import { computed, nextTick, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import { WSegmented, vItemTip } from '../ui'
import { tipFor, tipIndex } from './tips'
import { agoPhrase, formatAmount, formatDuration } from '../ui/format'
import { divine as divineRate, historyNow, ledger, onStatus, ratesAt, pricePrefs, setLeague, stashNow, summary, valuation, wantPrices } from './store'
import { bigGains, refreshWaitMs, seriesFor, topCardChanges } from './ledger'
import type { SeriesPoint } from './ledger'
import type { ReaderStatus } from './widget'
import type { RunGlance } from './runs'
import { countLabel, runPerHour, tallyRows, unitOf } from './runs'
import { leftOutText, RATE_TIME_WHERE } from '../shared/rate-time'
import { rateTime } from '../shared/rate-time-now'
import RateTimePick from '../shared/RateTimePick.vue'
import { loadRuns, runsDoc } from './run-store'
import { runTimeIn } from './run-time'
import Coin from './Coin.vue'
import LedgerChart from './LedgerChart.vue'
import { RATE_WINDOWS, rateTip, startOfDay } from './play-time'
import type { RateWindow } from './play-time'

const props = defineProps<{
  status: ReaderStatus | null
  league: string | null
  // The per hour window picked (here or in the window).
  rateWindow?: RateWindow
  // The run going (its saved glance), or null.
  run?: RunGlance | null
  // Stop pressed, until the run is saved stopped.
  stopping?: boolean
  // Start pressed, until the run is saved.
  startingRun?: boolean
  // Unsold Faustus listings counted in the total (the At Faustus box).
  listedChaos?: number
}>()
const emit = defineEmits<{ (e: 'refresh' | 'settings' | 'stop' | 'open-run'): void, (e: 'window', w: RateWindow): void, (e: 'start', name: string): void }>()

// The clock for "in N min" and "3h ago": only while the card is shown.
const now = shallowRef(Date.now())
let clock: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  setLeague(props.league)
  if (props.status) onStatus(props.status)
  wantPrices()
  clock = setInterval(() => { now.value = Date.now() }, 15_000)
})
onUnmounted(() => { clearInterval(clock) })
// A read finishing while the card is open values it.
watch(() => props.status, (s) => { if (s) onStatus(s) })
watch(() => props.league, (id) => { setLeague(id) })

// Just after a league switch the store still holds the old league's read.
const sameLeague = computed(() => stashNow.value?.league === props.league && (!props.status?.league || props.status.league === props.league))
const v = computed(() => sameLeague.value ? valuation.value : null)
const listedAdd = computed(() => props.listedChaos ?? 0)
const totalTip = computed(() => v.value && listedAdd.value ? `Stash ${div(v.value.chaos)} + at Faustus ${div(listedAdd.value)} (${divineRate.value ? 'div' : 'chaos'})` : undefined)
const signedOut = computed(() => props.status?.error?.kind === 'signed-out' || (props.status != null && !props.status.account))
const today = computed(() => sameLeague.value ? summary.value?.sinceYesterdayDiv ?? null : null)
// Net worth over the picked window, as the window's chart draws it: its reads,
// from the one before it starts.
const series = computed<SeriesPoint[]>(() => {
  if (!sameLeague.value) return []
  const pts = ledger.value.points
  const end = Math.max(now.value, pts[pts.length - 1]?.at ?? 0)
  const from = win.value === 'today' ? startOfDay(end) : end - (RATE_WINDOWS.find(w => w.id === win.value)?.ms ?? 3_600_000)
  const all = seriesFor(pts, historyNow.value.days, '7d', end, divineRate.value)
  const i = all.findIndex(p => p.at >= from)
  // No read inside the window: a flat line from the last one.
  if (i < 0) { const last = all[all.length - 1]; return last ? [{ ...last, at: from, netDiv: null, top: [] }, { ...last, at: end, netDiv: null, top: [], daily: false }] : [] }
  // The read before the window starts the line at the window's start, so the
  // window fills the chart (its x axis is time).
  const out = all.slice(i)
  return i > 0 ? [{ ...all[i - 1], at: Math.min(from, out[0].at - 1), netDiv: null, top: [] }, ...out] : out
})
const big = computed(() => bigGains(series.value))
// The last read's changes, if that read had any to compare.
const diff = computed(() => {
  const d = ledger.value.diffs[ledger.value.diffs.length - 1]
  return sameLeague.value && d && d.at === historyNow.value.countedReadAt ? d : null
})
const changes = computed(() => topCardChanges(diff.value, pricePrefs.value.ignored))
const tips = computed(() => tipIndex(v.value ? [...v.value.lines, ...v.value.unpricedLines, ...v.value.ignoredLines] : []))
const waitMs = computed(() => refreshWaitMs(props.status, now.value))
const canRefresh = computed(() => !!props.status?.account && !props.status.running && waitMs.value === 0)
// Reads "now" so it moves with the clock.
const readLine = computed(() => now.value && props.status?.lastReadAt ? `Read ${agoPhrase(props.status.lastReadAt)}` : '')

const WINDOW_OPTIONS = [{ value: '1h', label: '1h' }, { value: '2h', label: '2h' }, { value: '3h', label: '3h' }, { value: 'today', label: 'Today' }]
const win = computed<RateWindow>(() => WINDOW_OPTIONS.some(o => o.value === props.rateWindow) ? props.rateWindow! : '1h')
const pick = (w: string) => { emit('window', w as RateWindow) }
// The same numbers as the window (store.ratesAt).
const rate = computed(() => {
  const r = ratesAt(now.value)
  const x = r[win.value]
  const amount = (chaos: number) => `${signed(toDiv(chaos))} ${divineRate.value ? 'd' : 'c'}`
  return { div: !sameLeague.value || x.perHour == null ? null : toDiv(x.perHour), tip: rateTip(win.value, x, r.fromLog, amount, r.withHub, r.withOff) }
})

// ---------- the run going (pick Q1) ----------
const TAB_OPTIONS = [{ value: 'run', label: 'Run' }, { value: 'worth', label: 'Net worth' }]
const tab = shallowRef<'run' | 'worth'>('run')
const runFor = computed(() => props.run ? formatDuration(Math.max(0, now.value - props.run.startAt)) : '')
// Stopping keeps totals from the chart's reads: wait for them to load.
const canStop = computed(() => sameLeague.value && ledger.value.points.length > 0 && !props.stopping)
// Two clicks: a stopped run can't be resumed.
const confirmStop = shallowRef(false)
let confirmTimer: ReturnType<typeof setTimeout> | undefined
function stopClick () {
  if (!canStop.value) return
  if (!confirmStop.value) {
    confirmStop.value = true
    clearTimeout(confirmTimer)
    confirmTimer = setTimeout(() => { confirmStop.value = false }, 3000)
    return
  }
  clearTimeout(confirmTimer)
  confirmStop.value = false
  emit('stop')
}
onUnmounted(() => { clearTimeout(confirmTimer) })
// The run's saved doc, for its tally.
watch(() => props.league, (l) => { if (l) loadRuns(l).catch(() => {}) }, { immediate: true })
// Start (no run going): a name, the last run's to begin with.
const naming = shallowRef(false)
const runName = shallowRef('')
const nameEl = shallowRef<HTMLInputElement | null>(null)
const canStart = computed(() => !props.run && sameLeague.value && ledger.value.points.length > 0 && !props.startingRun)
function openNaming () {
  runName.value = runsDoc.value.done.find(r => r.league === props.league)?.name ?? ''
  naming.value = true
  nextTick(() => nameEl.value?.select()).catch(() => {})
}
function startClick () {
  if (!canStart.value) return
  emit('start', runName.value)
  naming.value = false
}
watch(() => props.run, (r) => { if (r) naming.value = false })
const liveDoc = computed(() => props.run && runsDoc.value.live?.league === props.league && runsDoc.value.live.startAt === props.run.startAt ? runsDoc.value.live : null)
const topCame = computed(() => liveDoc.value ? tallyRows(liveDoc.value).came.slice(0, 3) : [])
// Time in each state from the start to the last stash read (the stretch the
// run's profit covers): read when the card opens and after each read.
// Maps and boss fights (each counts as one run of the strategy).
const runs = computed(() => props.run ? props.run.maps + (props.run.fights ?? 0) : 0)
const unit = computed(() => props.run ? unitOf(props.run.maps, props.run.fights) : 'map')
const spent = shallowRef<Record<'map' | 'play' | 'hub' | 'off', number> | null>(null)
watch(() => props.run ? [props.run.startAt, props.run.timeTo ?? props.run.at] as const : null, (span) => {
  if (!span) { spent.value = null; return }
  const [from, to] = span
  runTimeIn(from, to).then((t) => { if (props.run?.startAt === from && (props.run.timeTo ?? props.run.at) === to) spent.value = t?.ms ?? null }).catch(() => {})
}, { immediate: true })
const time = computed(() => {
  const t = spent.value
  if (!t) return null
  const parts = [
    { id: 'map', label: 'Maps', ms: t.map + t.play },
    { id: 'hub', label: 'Hideout', ms: t.hub },
    { id: 'off', label: 'Away', ms: t.off }
  ].filter(p => p.ms >= 60_000)
  return parts.length ? { parts, ...t } : null
})
// Over the time the Per hour setting counts (shared/rate-time.ts); the
// clock without Client.txt.
const perHour = computed(() => {
  const r = props.run
  if (!r) return null
  return runPerHour(r.profitChaos, (r.timeTo ?? r.at) - r.startAt, spent.value ?? r.time, rateTime())
})
const perHourTip = computed(() => (spent.value ?? props.run?.time) ? `Per hour, ${leftOutText(rateTime())}. ${RATE_TIME_WHERE}` : 'Per hour of the whole run: Client.txt not read')

const fmt = (n: number) => formatAmount(n)
const toDiv = (chaos: number) => divineRate.value ? chaos / divineRate.value : chaos
const div = (chaos: number) => {
  const d = toDiv(chaos)
  return d >= 100 ? formatAmount(d) : d >= 1 ? d.toFixed(1) : d.toFixed(2)
}
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n) >= 100 ? formatAmount(Math.abs(n)) : Math.abs(n).toFixed(1)}`
const inChaos = (chaos: number) => `${formatAmount(Math.round(chaos))} chaos`
const tone = (n: number | null | undefined) => n == null || n === 0 ? 'w-dim' : n > 0 ? 'w-up' : 'w-down'
</script>

<style module>
.card { display: flex; flex-direction: column; gap: 6px; padding: 8px var(--w-pad); font-size: var(--w-fs-sm); }
.total { display: flex; align-items: baseline; gap: 8px; }
.total b { font-size: calc(20px * var(--w-text-scale, 1)); font-weight: 500; color: var(--w-fg); line-height: 1.1; }
.spark { width: 100%; }
.rates { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.caps { font-family: var(--w-caps-face); text-transform: var(--w-caps-case); font-size: var(--w-fs-caps); color: var(--w-dim); }
.row { display: grid; grid-template-columns: 14px minmax(0, 1fr) auto; gap: 6px; align-items: center; }
.art { width: 14px; height: 14px; object-fit: contain; }
.foot { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.refresh { display: inline-flex; align-items: center; gap: 5px; margin-left: auto; padding: 1px 8px; font-size: var(--w-fs-xs); color: var(--w-fg); border: 1px solid var(--w-line-strong); border-radius: var(--w-r-sm); background: var(--w-panel-2); cursor: pointer; white-space: nowrap; }
.refresh:hover:not(:disabled) { border-color: var(--w-gold); }
.refresh:disabled { opacity: .55; cursor: default; }
.warn { color: var(--w-warn); }
.runHead { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.runName { font-family: var(--w-caps-face); color: var(--w-gold); font-weight: 500; min-width: 0; }
.kv { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; border-bottom: 1px solid var(--w-line); padding-bottom: 2px; }
.gold { color: var(--w-gold); }
.stats { display: flex; flex-wrap: wrap; gap: 2px 12px; }
.fold { display: flex; align-items: baseline; gap: 8px; padding: 4px 0 0; border: 0; border-top: 1px solid var(--w-line); background: none; color: var(--w-fg); cursor: pointer; text-align: left; font: inherit; }
.fold:hover .chev { color: var(--w-gold); }
.chev { margin-left: auto; font-size: var(--w-fs-xs); }
.left { margin-left: 0; }
.stop:not(:disabled) { color: var(--w-down); }
.readEnd { margin-left: auto; }
.runInput { flex: 1 1 auto; min-width: 0; font-size: var(--w-fs-xs); }
.x { background: none; border: 0; padding: 0; color: var(--w-dim); cursor: pointer; }
.x:hover { color: var(--w-down); }
.timeBar { display: flex; height: 6px; gap: 1px; border-radius: var(--w-r-sm); overflow: hidden; }
.timeBar i { display: block; min-width: 2px; }
.map { background: var(--w-up); }
.hub { background: var(--w-gold); }
.off { background: var(--w-line-strong); }
.ratePick { margin-left: auto; }
.timeKey { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 10px; }
.dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 4px; }
.link { align-self: flex-start; color: var(--w-gold); text-decoration: underline; cursor: pointer; font-size: var(--w-fs-sm); }
</style>
