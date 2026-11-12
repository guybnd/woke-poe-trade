<template>
  <WPanel size-key="net-worth" :title="config.wmTitle || 'Net worth'" icon="divine" width="44rem" max-height="85vh"
    :hotkey="config.hotkey" :busy="status?.running === true" :stale="!!status?.error && !!v">
    <template #actions>
      <span class="w-dim text-xs mr-2">{{ readLine }}</span>
      <WButton size="sm" icon="fas fa-sync-alt" :disabled="status?.running || showPicker" @click="refresh">Refresh</WButton>
      <WButton size="sm" variant="ghost" icon="fas fa-layer-group" title="Choose which tabs to read" aria-label="Choose which tabs to read" :disabled="!status?.account || status?.running" @click="picking = true" />
    </template>
    <template v-if="status?.error && !showPicker" #banner>
      <WBanner :tone="status.error.kind === 'rate-limited' ? 'warn' : 'error'">{{ errorLine }}</WBanner>
    </template>

    <TabPicker v-if="showPicker" :key="status?.league ?? ''" :can-cancel="!needsPick" :remove-only="status?.skipped ?? 0" :running="status?.running === true" @done="onPicked" />
    <WEmpty v-else-if="!v && !status?.lastReadAt" icon="fas fa-box-open">
      {{ status?.account ? 'Not read yet. Press Refresh.' : 'Sign in under Settings › Game & league, then press Refresh.' }}
    </WEmpty>
    <WEmpty v-else-if="!v" icon="fas fa-hourglass-half">Waiting for poe.ninja prices…</WEmpty>
    <div v-else :class="$style.body">
      <!-- Hero: the total, and its line -->
      <section :class="$style.hero">
        <div>
          <div :class="$style.caps">Total</div>
          <div :class="$style.big" class="w-num" :title="inChaos(v.chaos)">{{ div(v.chaos) }}<Coin :chaos="!divine" /></div>
          <div class="w-dim text-xs">≈ {{ compact(v.chaos) }}<Coin chaos /> · liquid <span :title="inChaos(liquid)">{{ div(liquid) }}<Coin :chaos="!divine" /></span></div>
          <div v-if="goal" class="text-xs" :class="$style.goalLine">
            {{ goal.name || 'Goal' }}: {{ fmt(goal.div) }}<Coin /> ·
            <template v-if="eta.reached">reached</template>
            <template v-else-if="eta.days != null">about {{ etaText(eta.days) }} at this rate</template>
            <template v-else>no ETA yet</template>
          </div>
        </div>
        <div :class="$style.chartBox">
          <div :class="$style.chartHead">
            <WSegmented v-model="chartMode" :options="MODE_OPTIONS" />
            <WSegmented v-model="range" :options="RANGE_OPTIONS" />
          </div>
          <LedgerChart :series="series" :big="big" :mode="chartMode as 'total' | 'category'" :goal-div="goal?.div ?? null" />
          <div v-if="chartMode === 'category'" :class="$style.legend">
            <span v-for="c in CATEGORIES" :key="c.id"><i :style="{ background: CAT_COLOUR[c.id] }" />{{ c.label }}</span>
          </div>
        </div>
      </section>

      <!-- KPIs -->
      <section :class="$style.kpis">
        <div><span :class="$style.caps">Since yesterday</span><b class="w-num" :class="tone(sum?.sinceYesterdayDiv)" :title="sum?.sinceYesterdayDiv != null ? inChaos(sum.sinceYesterdayDiv * (divine ?? 1)) : undefined">{{ signedOrDash(sum?.sinceYesterdayDiv) }}<Coin v-if="sum?.sinceYesterdayDiv != null" /></b></div>
        <div><span :class="$style.caps">Per hour today</span><b class="w-num" :class="tone(perHourDiv)" :title="sum?.perHourChaos != null ? inChaos(sum.perHourChaos) : undefined">{{ signedOrDash(perHourDiv) }}<Coin v-if="perHourDiv != null" :chaos="!divine" /></b></div>
        <div><span :class="$style.caps">This session</span><b class="w-num" :class="tone(session?.div)"><template v-if="session">{{ signed(session.div) }}<Coin :chaos="!divine" /> · {{ duration(session.ms) }}</template><template v-else>—</template></b></div>
        <div v-if="best"><span :class="$style.caps">Best item</span><b class="w-num w-trunc" :title="inChaos(best.chaos)">{{ best.name }} {{ div(best.chaos) }}<Coin :chaos="!divine" /></b></div>
      </section>
      <section v-if="moves.length" :class="$style.moves" class="text-xs">
        <span :class="$style.caps">Price moves today</span>
        <span v-for="m in moves" :key="m.key">{{ m.name }} <span :class="tone(m.change)" :title="inChaos(m.valueChaos)">{{ signedPct(m.change) }} ({{ signed(toDiv(m.valueChaos)) }}<Coin :chaos="!divine" />)</span></span>
      </section>

      <!-- What changed | Where it is -->
      <section :class="$style.cols">
        <div>
          <div :class="$style.colHead">
            <span :class="$style.caps">{{ session ? `Session · ${duration(session.ms)} · ${session.maps} maps` : 'Since last refresh' }}</span>
            <b v-if="session" class="w-num" :class="tone(session.div)">{{ signed(session.div) }}<Coin :chaos="!divine" /><template v-if="session.perHour != null"> · {{ fmt(session.perHour) }}<Coin :chaos="!divine" />/h</template></b>
          </div>
          <div v-if="!groups.length" class="w-dim text-xs">Changes show after two full reads.</div>
          <div v-for="g in groups" :key="g.key" :class="$style.group">
            <div :class="$style.groupHead"><span class="w-trunc">{{ g.title }}</span><b class="w-num" :class="tone(g.netChaos)" :title="inChaos(g.netChaos)">{{ signed(toDiv(g.netChaos)) }}<Coin :chaos="!divine" /></b></div>
            <div v-for="l in g.lines.slice(0, 5)" :key="l.dir + l.key" :class="$style.feedRow">
              <img v-if="l.icon" :src="l.icon" alt="" :class="$style.icon">
              <span class="w-trunc">{{ l.count > 1 ? `${fmt(l.count)} × ` : '' }}{{ l.name }}</span>
              <span class="w-num" :class="l.dir === 'add' ? 'w-up' : 'w-down'" :title="inChaos(l.chaos)">{{ l.dir === 'add' ? '+' : '−' }}{{ div(l.chaos) }}<Coin :chaos="!divine" /></span>
            </div>
            <div v-if="g.lines.length > 5" class="w-dim text-xs">+{{ g.lines.length - 5 }} more</div>
          </div>
          <div v-if="session" :class="$style.sessionFoot">
            <span class="w-dim text-xs">Gains are read when you enter your hideout</span>
            <WButton size="sm" @click="endSession">End session</WButton>
          </div>
        </div>
        <div>
          <div :class="$style.caps" style="margin-bottom: 6px">Where it is</div>
          <button v-for="c in cats" :key="c.id" type="button" :class="[$style.catRow, { [$style.catOn]: cat === c.id }]"
            :aria-pressed="cat === c.id" @click="pickCat(c.id)">
            <span>{{ c.label }}</span><i :style="{ width: c.share * 100 + '%' }" /><b class="w-num" :title="inChaos(c.chaos)">{{ div(c.chaos) }}<Coin :chaos="!divine" /></b>
          </button>
        </div>
      </section>

      <!-- Tabs, filters, items -->
      <WTabs :model-value="tab" :options="tabOptions" :class="$style.tabs" @update:model-value="pickTab" />
      <section :class="$style.chips">
        <WField v-model="query" type="search" icon="fas fa-search" placeholder="Search items" :class="$style.search" />
        <WChip clickable :active="cat === 'all'" @click="pickCat('all')">All</WChip>
        <WChip v-for="c in CATEGORIES" :key="c.id" clickable :active="cat === c.id" @click="pickCat(c.id)">{{ c.label }}</WChip>
        <WChip v-if="divine" clickable :active="hideSmall" @click="hideSmall = !hideSmall">Hide &lt; {{ fmt(hideBelow) }}<Coin /></WChip>
      </section>
      <ItemTable :lines="tableLines" :filtered="cat !== 'all' || tab !== 'all' || !!query.trim() || hideSmall" @clear="clearFilters" :divine="divine" :changes="changes" :tab-names="tabNames" />

      <div class="w-dim text-xs" :class="$style.foot">
        <span>
          {{ status?.listed ? `${status.chosen} of ${status.listed}` : sum?.tabs }} tabs
          <template v-if="status?.skipped"> · {{ status.skipped }} remove-only skipped</template>
          <template v-if="v.unpriced"> · {{ v.unpriced }} items unpriced (rares aren't searched)</template>
        </span>
        <span>poe.ninja · {{ ninjaAge }}</span>
      </div>
    </div>
  </WPanel>
</template>

<script setup lang="ts">
// Net worth, pick A1 "Ledger": the answer first (total, its line, KPIs),
// then what changed and where it is, then your tabs and every item.
import { computed, defineAsyncComponent, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import { AppConfig } from '@/web/Config'
import { usePoeninja } from '@/web/background/Prices'
import { WBanner, WButton, WChip, WEmpty, WField, WPanel, WSegmented, WTabs } from '../ui'
import { agoPhrase, formatAmount } from '../ui/format'
import { hostRequest } from '../shared/host'
import { FARMING_TYPE, elapsed, requestEndSession } from '../farming/farming'
import { isWidgetTypeOn } from '../modules'
import { stashGainsBetween } from './gains'
import type { FarmingWidget } from '../farming/farming'
import { CATEGORIES } from './valuation'
import type { Category } from './valuation'
import { bigGains, change24h, filterLines, pickFilter, goalEta, groupByRefresh, groupByRuns, liquidChaos, priceMoves, seriesFor } from './ledger'
import type { ChartRange, TableFilter } from './ledger'
import { divine, historyNow, leagueNow, ledger, summary, tabValues, valuation, wantPrices } from './store'
import { hideBelowOf } from './widget'
import type { NetWorthWidget, ReaderStatus } from './widget'
import { UNREADABLE } from './tab-picker'
import LedgerChart from './LedgerChart.vue'
import Coin from './Coin.vue'
import ItemTable from './ItemTable.vue'

const TabPicker = defineAsyncComponent(() => import('./TabPicker.vue'))

const props = defineProps<{
  config: NetWorthWidget
  status: ReaderStatus | null
}>()

onMounted(wantPrices)

const v = valuation
const sum = summary
const ninja = usePoeninja()

const CAT_COLOUR: Record<Category, string> = {
  currency: 'var(--w-r-currency)',
  fragments: 'var(--w-r-normal)',
  cards: 'var(--w-r-divination)',
  gear: 'var(--w-r-unique)',
  other: 'var(--w-faint)'
}
const MODE_OPTIONS = [{ value: 'total', label: 'Total' }, { value: 'category', label: 'By category' }]
const RANGE_OPTIONS = [{ value: '24h', label: '24h' }, { value: '7d', label: '7d' }, { value: 'league', label: 'League' }]

// ---------- the tab picker (WOKEPOET-209) ----------
const picking = shallowRef(false)
const picked = shallowRef(false)
const needsPick = computed(() => {
  const s = props.status
  if (!s?.account || s.running || picked.value) return false
  return s.error?.kind === 'pick-tabs' || (!s.lastReadAt && !s.chosen && !s.error)
})
const showPicker = computed(() => picking.value || needsPick.value)
function onPicked () {
  picking.value = false
  picked.value = true
}
watch(() => props.status?.league, () => { picked.value = false; picking.value = false })

// ---------- numbers ----------
const fmt = (n: number) => formatAmount(n)
// The chaos behind a divine figure, for hover titles.
const inChaos = (chaos: number) => `${formatAmount(Math.round(chaos))} chaos`
const unit = computed(() => divine.value ? 'd' : 'c')
const compact = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}k` : formatAmount(n)
const toDiv = (chaos: number) => divine.value ? chaos / divine.value : chaos
const div = (chaos: number) => {
  const d = toDiv(chaos)
  return d >= 100 ? formatAmount(d) : d >= 1 ? d.toFixed(1) : d.toFixed(2)
}
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n) >= 100 ? formatAmount(Math.abs(n)) : Math.abs(n).toFixed(1)}`
const signedOrDash = (n: number | null | undefined) => n == null ? '—' : signed(n)
const signedPct = (c: number) => `${c > 0 ? '+' : '−'}${Math.abs(c * 100).toFixed(1)}%`
const tone = (n: number | null | undefined) => n == null || n === 0 ? '' : n > 0 ? 'w-up' : 'w-down'
const duration = (ms: number) => {
  const m = Math.round(ms / 60_000)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}
const etaText = (days: number) => days < 1 ? `${Math.max(1, Math.round(days * 24))} h` : days < 60 ? `${Math.round(days)} days` : `${Math.round(days / 30)} months`

const liquid = computed(() => v.value ? liquidChaos(v.value) : 0)
const perHourDiv = computed(() => sum.value?.perHourChaos == null ? null : toDiv(sum.value.perHourChaos))
const best = computed(() => v.value?.lines[0] ?? null)

// ---------- chart ----------
const chartMode = shallowRef('total')
const range = shallowRef<string>('7d')
const series = computed(() => seriesFor(ledger.value.points, historyNow.value.days, range.value as ChartRange, Date.now(), divine.value))
const big = computed(() => bigGains(series.value))
const goal = computed(() => props.config.goal && props.config.goal.div > 0 ? props.config.goal : null)
const eta = computed(() => goal.value ? goalEta(seriesFor(ledger.value.points, historyNow.value.days, '7d', Date.now(), divine.value), goal.value.div) : { reached: false, days: null })

// ---------- price moves (D3) ----------
const changes = computed(() => new Map((v.value?.lines ?? []).map(l => [l.key, change24h(l.graph)])))
const moves = computed(() => priceMoves(v.value?.lines ?? [], k => changes.value.get(k) ?? null).filter(m => Math.abs(toDiv(m.valueChaos)) >= 0.1))

// ---------- what changed (C2, C1) ----------
// The Farming window's running session, if any: its maps come from Client.txt.
// Its module must be on: off, the window isn't there to end it.
const farmingWidget = computed(() => AppConfig().widgets.find(x =>
  x.wmType === FARMING_TYPE && (x as FarmingWidget).session && isWidgetTypeOn(AppConfig(), x.wmType)) as FarmingWidget | undefined)
const farming = computed(() => farmingWidget.value?.session ?? null)
// The session's clock moves while you sit in the hideout.
const now = shallowRef(Date.now())
const clock = setInterval(() => { now.value = Date.now() }, 30_000)
onUnmounted(() => { clearInterval(clock) })
// The session's total from every refresh in it (gains.ts keeps them all).
const sessionChaos = shallowRef(0)
watch([farming, () => ledger.value.points.length, leagueNow], async () => {
  const s = farming.value
  const id = leagueNow.value
  sessionChaos.value = s && id ? (await stashGainsBetween(id, s.startedAt, Date.now())).chaos : 0
}, { immediate: true })
const session = computed(() => {
  const s = farming.value
  if (!s) return null
  const ms = elapsed(s, now.value)
  const divVal = toDiv(sessionChaos.value)
  return { div: divVal, ms, maps: s.maps, perHour: ms >= 10 * 60_000 ? divVal / (ms / 3_600_000) : null }
})
const groups = computed(() => {
  const s = farming.value
  return s ? groupByRuns(ledger.value.diffs, s.runs ?? [], s.startedAt) : groupByRefresh(ledger.value.diffs)
})
function endSession () {
  const w = farmingWidget.value
  if (w) requestEndSession(w.wmId)
}

// ---------- categories, tabs, filters ----------
const cat = shallowRef<Category | 'all'>('all')
const tab = shallowRef('all')
// One filter at a time: a category or a tab, not both (both made "Currency"
// inside the Fragment tab, which is empty).
function apply (f: TableFilter) {
  cat.value = f.cat
  tab.value = f.tab
}
const filterNow = (): TableFilter => ({ cat: cat.value, tab: tab.value, query: query.value, minChaos: 0 })
function pickCat (id: Category | 'all') {
  apply(id === 'all' ? { ...filterNow(), cat: 'all', tab: 'all' } : pickFilter(filterNow(), { cat: id }))
}
function pickTab (id: string) {
  apply(pickFilter(filterNow(), { tab: id }))
}
function clearFilters () {
  cat.value = 'all'
  tab.value = 'all'
  query.value = ''
  hideSmall.value = false
}
const query = shallowRef('')
const hideSmall = shallowRef(false)
const hideBelow = computed(() => hideBelowOf(props.config))

const cats = computed(() => {
  const val = v.value
  if (!val) return []
  const max = Math.max(1, ...Object.values(val.byCategory))
  return CATEGORIES.map(c => ({ ...c, chaos: val.byCategory[c.id], share: val.byCategory[c.id] / max }))
})

const tabNames = computed(() => new Map(tabValues.value.map(t => [t.id, t.name])))
const tabOptions = computed(() => {
  const prev = ledger.value.tabChaos.prev
  return [
    { value: 'all', label: 'All', count: v.value ? `${div(v.value.chaos)} ${unit.value}` : undefined },
    ...tabValues.value.map(t => {
      const change = prev[t.id] != null ? toDiv(t.chaos - prev[t.id]) : null
      if (UNREADABLE.has(t.type)) {
        return { value: t.id, label: t.name, count: 'not readable', colour: t.colour ?? undefined, title: "pathofexile.com sends none of this tab's items" }
      }
      return {
        value: t.id,
        label: t.name,
        count: `${div(t.chaos)} ${unit.value}`,
        colour: t.colour ?? undefined,
        title: `${t.name}: ${div(t.chaos)} ${unit.value} (${inChaos(t.chaos)})${change != null && Math.abs(change) >= 0.05 ? ` · ${signed(change)} ${unit.value} since the read before` : ''}`
      }
    })
  ]
})
// A tab that's gone (tabs chosen again) shows them all.
watch(tabOptions, (opts) => { if (!opts.some(o => o.value === tab.value)) tab.value = 'all' })

const tableLines = computed(() => filterLines(v.value?.lines ?? [], {
  ...filterNow(),
  minChaos: hideSmall.value && divine.value ? hideBelow.value * divine.value : 0
}))

// ---------- header and footer ----------
const readLine = computed(() => {
  const s = props.status
  if (s?.running) return s.progress ? `reading ${s.progress.done}/${s.progress.total}` : 'reading…'
  return s?.lastReadAt ? `read ${agoPhrase(s.lastReadAt)}` : ''
})
const ninjaAge = computed(() => ninja.updatedAt.value ? agoPhrase(ninja.updatedAt.value) : 'loading')

const errorLine = computed(() => {
  const e = props.status?.error
  if (!e) return ''
  if (e.kind === 'rate-limited' && e.retryAt) {
    const min = Math.max(1, Math.ceil((e.retryAt - Date.now()) / 60_000))
    return `Rate-limited by pathofexile.com. Try again in ${min} min.`
  }
  return e.message
})

function refresh () {
  hostRequest('stash-reader-read', null, 15 * 60_000).catch(() => {})
}
</script>

<style module>
.body { display: flex; flex-direction: column; }
.caps { font-family: var(--w-caps-face); text-transform: var(--w-caps-case); font-size: var(--w-fs-caps); color: var(--w-dim); }
.hero { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--w-s3); padding: var(--w-s2) var(--w-pad); border-bottom: 1px solid var(--w-line); align-items: end; }
.big { font-size: calc(28px * var(--w-text-scale, 1)); line-height: 1.1; color: var(--w-fg); }
.big small { font-size: var(--w-fs-sm); color: var(--w-dim); margin-left: 4px; }
.goalLine { color: var(--w-up); margin-top: 2px; }
.chartBox { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.chartHead { display: flex; justify-content: space-between; gap: var(--w-s2); flex-wrap: wrap; }
.legend { display: flex; gap: var(--w-s2); flex-wrap: wrap; font-size: var(--w-fs-xs); color: var(--w-dim); }
.legend i { display: inline-block; width: 8px; height: 8px; margin-right: 4px; opacity: .7; }
.kpis { display: flex; gap: var(--w-s4); padding: 6px var(--w-pad); border-bottom: 1px solid var(--w-line); flex-wrap: wrap; }
.kpis > div { display: flex; flex-direction: column; min-width: 0; max-width: 40%; }
.kpis b { font-size: var(--w-fs-md); font-weight: 500; }
.moves { display: flex; gap: var(--w-s3); padding: 4px var(--w-pad); border-bottom: 1px solid var(--w-line); flex-wrap: wrap; align-items: baseline; }
.cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); border-bottom: 1px solid var(--w-line); }
.cols > div { padding: var(--w-s2) var(--w-pad); min-width: 0; }
.cols > div + div { border-left: 1px solid var(--w-line); }
.colHead { display: flex; justify-content: space-between; gap: var(--w-s2); margin-bottom: 2px; }
.colHead b { font-weight: 500; font-size: var(--w-fs-sm); }
.group { display: flex; flex-direction: column; gap: 1px; margin-top: 4px; }
.groupHead { display: flex; justify-content: space-between; gap: var(--w-s2); font-size: var(--w-fs-xs); color: var(--w-dim); border-bottom: 1px dashed var(--w-line); }
.feedRow { display: grid; grid-template-columns: 16px minmax(0, 1fr) auto; gap: 6px; align-items: center; font-size: var(--w-fs-sm); }
.icon { width: 16px; height: 16px; object-fit: contain; }
.sessionFoot { display: flex; justify-content: space-between; align-items: center; gap: var(--w-s2); margin-top: var(--w-s2); }
.catRow { display: grid; grid-template-columns: 84px minmax(0, 1fr) 56px; gap: 6px; align-items: center; width: 100%; padding: 2px 4px; font-size: var(--w-fs-sm); color: var(--w-fg); text-align: left; border-radius: var(--w-r-sm); cursor: pointer; }
.catRow:hover { background: var(--w-panel-2); }
.catRow i { display: block; height: 8px; min-width: 2px; background: linear-gradient(90deg, color-mix(in srgb, var(--w-gold) 50%, transparent), var(--w-gold)); }
.catRow b { text-align: right; font-weight: 500; }
.catOn { background: var(--w-panel-3); box-shadow: inset 2px 0 var(--w-gold); }
.tabs { padding: 6px var(--w-pad) 0; }
.chips { display: flex; gap: var(--w-s1); padding: 6px var(--w-pad); flex-wrap: wrap; align-items: center; border-bottom: 1px solid var(--w-line); }
.search { min-width: 150px; flex: 0 1 200px; }
.foot { display: flex; justify-content: space-between; gap: var(--w-s2); padding: 5px var(--w-pad); flex-wrap: wrap; }
</style>
