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
      <template v-if="status?.lastReadAt">
        <div v-if="v" :class="$style.total">
          <b class="w-num">{{ div(v.chaos) }}<Coin :chaos="!divineRate" /></b>
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
      <div :class="$style.foot">
        <span class="w-dim text-xs">{{ readLine }}</span>
        <button type="button" :class="$style.refresh" data-card-refresh :disabled="!canRefresh"
          :title="waitMs > 0 ? 'Reads wait 10 minutes after the last one' : 'Read your stash now'" @click="emit('refresh')">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': status?.running }" />
          {{ status?.running ? (status.progress ? `reading ${status.progress.done}/${status.progress.total}` : 'reading…') : waitMs > 0 ? `in ${Math.ceil(waitMs / 60_000)} min` : 'Refresh' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// Loaded the first time the card opens, with the window's data (store.ts).
import { computed, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import { WSegmented, vItemTip } from '../ui'
import { tipFor, tipIndex } from './tips'
import { agoPhrase, formatAmount } from '../ui/format'
import { divine as divineRate, historyNow, ledger, onStatus, ratesAt, pricePrefs, setLeague, stashNow, summary, valuation, wantPrices } from './store'
import { bigGains, refreshWaitMs, seriesFor, topCardChanges } from './ledger'
import type { SeriesPoint } from './ledger'
import type { ReaderStatus } from './widget'
import Coin from './Coin.vue'
import LedgerChart from './LedgerChart.vue'
import { RATE_WINDOWS, rateTip, startOfDay } from './play-time'
import type { RateWindow } from './play-time'

const props = defineProps<{
  status: ReaderStatus | null
  league: string | null
  // The window's "Leave out hideout time" unticked.
  withHub?: boolean
  // The per hour window picked (here or in the window).
  rateWindow?: RateWindow
}>()
const emit = defineEmits<{ (e: 'refresh' | 'settings'): void, (e: 'window', w: RateWindow): void }>()

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
  const r = ratesAt(now.value, props.withHub === true)
  const x = r[win.value]
  const amount = (chaos: number) => `${signed(toDiv(chaos))} ${divineRate.value ? 'd' : 'c'}`
  return { div: !sameLeague.value || x.perHour == null ? null : toDiv(x.perHour), tip: rateTip(win.value, x, r.fromLog, amount, r.withHub) }
})

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
.link { align-self: flex-start; color: var(--w-gold); text-decoration: underline; cursor: pointer; font-size: var(--w-fs-sm); }
</style>
