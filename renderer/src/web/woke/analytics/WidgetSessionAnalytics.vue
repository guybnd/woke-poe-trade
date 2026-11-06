<template>
  <Widget :config="config" move-handles="corners" :inline-edit="false" :readonly="true">
    <WPanel ref="panel" :title="config.wmTitle || 'Session analytics'" icon="divine" width="34rem" :busy="busy">
      <template v-if="store.error.value" #banner>
        <WBanner>Couldn't read your saved sessions: {{ store.error.value }}
          <template #actions><WButton size="sm" @click="reload">Retry</WButton></template>
        </WBanner>
      </template>
      <template #tabs>
        <WTabs v-model="tab" :options="tabOptions" />
      </template>
      <template #meta>
        <div class="flex flex-wrap items-center gap-1">
          <WSegmented v-model="config.range" :options="rangeOptions" />
          <WSegmented v-model="config.unit" :options="unitOptions" />
          <span v-if="config.unit === 'div' && !divineNow" class="text-xs" style="color: var(--w-warn);" title="Sessions saved without a divine rate need today's poe.ninja prices">Waiting for poe.ninja prices.</span>
        </div>
      </template>

      <div class="flex flex-col gap-2 py-2" style="padding-left: var(--w-pad); padding-right: var(--w-pad);">
        <WSkeleton v-if="!store.loaded.value && !store.error.value" :rows="5" />

        <!-- ===== Strategies (A1) ===== -->
        <template v-else-if="tab === 'strategies'">
          <WEmpty v-if="!rows.length" :art="{ mechanic: 'map' }">
            Maps show here after you end a session in Farming.
          </WEmpty>
          <template v-else>
            <div>
              <div class="w-row w-row--head px-0" :class="$style.stratGrid">
                <span>Strategy</span><span class="text-right">Maps</span><span class="text-right">Hours</span><span>{{ unitLabel }} / hour</span><span class="text-right">Trend</span>
              </div>
              <button v-for="row in rows" :key="row.key" class="w-row px-0 w-full text-left" :class="[$style.stratGrid, row.key === selectedRow?.key ? $style.sel : '']"
                @click="selectedKey = row.key" @contextmenu="strategyMenu($event, row)">
                <span class="w-trunc">
                  <WIcon v-if="row.kind === 'boss'" mechanic="maven" title="Boss run" class="mr-1" />{{ row.strategy }}
                </span>
                <span class="text-right w-num w-dim">{{ row.kind === 'boss' ? row.units.length : row.maps }}<span v-if="row.kind === 'boss'" class="w-faint text-xs"> k</span></span>
                <span class="text-right w-num w-dim">{{ row.hours.toFixed(1) }}</span>
                <span class="flex items-center gap-1 min-w-0" :title="rangeTitle(row)">
                  <svg :width="BAR_W" height="16" :viewBox="`0 0 ${BAR_W} 16`" class="flex-none" aria-hidden="true">
                    <line :x1="scaleX(0)" :x2="scaleX(0)" y1="2" y2="14" stroke="var(--w-line-strong)" />
                    <rect v-if="row.perHour != null" :x="Math.min(scaleX(0), scaleX(row.perHour))" y="5" :width="Math.abs(scaleX(row.perHour) - scaleX(0))" height="6" rx="2"
                      :fill="row.perHour >= 0 ? 'var(--w-accent)' : 'var(--w-down)'" opacity="0.85" />
                    <template v-if="row.range">
                      <line :x1="scaleX(row.range[0])" :x2="scaleX(row.range[1])" y1="8" y2="8" stroke="var(--w-fg)" opacity="0.7" />
                      <line :x1="scaleX(row.range[0])" :x2="scaleX(row.range[0])" y1="4" y2="12" stroke="var(--w-fg)" opacity="0.7" />
                      <line :x1="scaleX(row.range[1])" :x2="scaleX(row.range[1])" y1="4" y2="12" stroke="var(--w-fg)" opacity="0.7" />
                    </template>
                  </svg>
                  <span class="w-num text-xs" :class="(row.perHour ?? 0) >= 0 ? '' : 'w-down'">{{ row.perHour != null ? num(row.perHour) : '—' }}</span>
                </span>
                <span class="flex justify-end"><WSpark :values="row.trend" :width="48" :height="16" /></span>
              </button>
              <div class="pt-1"><WInfo :text="`Bar: ${unitLabel} per hour. Whisker: 90% range.\n\nWhiskers show after ${MIN_UNITS_FOR_RANGE} maps. Overlapping whiskers mean it is too early to tell two strategies apart.`" /></div>
            </div>

            <div v-if="selectedRow" :class="$style.detail">
              <div class="flex justify-between gap-2 items-baseline">
                <span class="w-accent font-medium w-trunc">{{ selectedRow.strategy }}</span>
                <button v-if="selectedRow.kind === 'maps'" class="text-xs w-dim hover:underline" @click="openSessionsFor(selectedRow.strategy)">Sessions ›</button>
              </div>
              <div :class="$style.kv">
                <span class="w-dim">{{ selectedRow.kind === 'boss' ? 'Per kill' : 'Per map' }}</span><span class="w-num">{{ maybe(selectedRow.perMap) }}</span>
                <span class="w-dim" title="Median: half your maps earned more, half less. One lucky drop barely moves it.">Typical {{ selectedRow.kind === 'boss' ? 'kill' : 'map' }}</span><span class="w-num">{{ maybe(selectedRow.typicalMap) }}</span>
                <template v-if="selectedRow.kind === 'maps'">
                  <span class="w-dim">Map cost</span><span class="w-num">{{ maybe(selectedRow.costPerMap) }}</span>
                  <span class="w-dim">Maps / hour</span><span class="w-num">{{ selectedRow.mapsPerHour != null ? selectedRow.mapsPerHour.toFixed(1) : '—' }}</span>
                </template>
                <span class="w-dim">Best {{ selectedRow.kind === 'boss' ? 'kill' : 'map' }}</span><span class="w-num" :class="(selectedRow.bestMap ?? 0) >= 0 ? 'w-up' : 'w-down'">{{ maybe(selectedRow.bestMap, true) }}</span>
                <span class="w-dim">Losing {{ selectedRow.kind === 'boss' ? 'kills' : 'maps' }}</span><span class="w-num">{{ selectedRow.losingShare != null ? Math.round(selectedRow.losingShare * 100) + '%' : '—' }}</span>
                <span class="w-dim">Profit</span><span class="w-num" :class="selectedRow.profit >= 0 ? 'w-up' : 'w-down'">{{ num(selectedRow.profit, true) }}</span>
                <span class="w-dim">{{ selectedRow.kind === 'boss' ? 'Kills' : 'Sessions' }}</span><span class="w-num">{{ selectedRow.kind === 'boss' ? selectedRow.units.length : selectedRow.sessions }}</span>
              </div>
              <div v-if="selectedRow.mapShare != null">
                <div :class="$style.k">Time split</div>
                <div :class="$style.bar"><i :style="{ width: `${selectedRow.mapShare * 100}%` }" /></div>
                <div class="text-xs w-faint">{{ Math.round(selectedRow.mapShare * 100) }}% in maps · {{ 100 - Math.round(selectedRow.mapShare * 100) }}% hideout and town</div>
              </div>
              <div v-if="versus" class="text-xs">
                <template v-if="versus.chance == null"><span class="w-dim">Against {{ versus.other }}: too few maps to compare yet.</span></template>
                <template v-else>
                  <span class="w-dim">Against {{ versus.other }}:</span>
                  {{ versusText(versus.chance) }}
                </template>
              </div>
              <div v-if="selectedRow.kind === 'boss'"><WInfo text="From your Boss runs kill log at today's prices, with your run time from there." /></div>
            </div>
          </template>
          <!-- Trading (from the trade assistant's sales log) -->
          <div v-if="trading" :class="$style.trading" data-analytics="trading">
            <span class="w-accent font-medium"><i class="fas fa-handshake mr-1" />Trading</span>
            <span class="w-dim">sold <span class="w-num w-up">{{ num(trading.sold) }}</span> ({{ trading.sales }})</span>
            <span class="w-dim">spent <span class="w-num w-down">{{ num(trading.spent) }}</span> ({{ trading.buys }})</span>
            <span class="ml-auto w-num" :class="trading.sold - trading.spent >= 0 ? 'w-up' : 'w-down'">{{ num(trading.sold - trading.spent, true) }} {{ unitLabel }}</span>
          </div>
        </template>

        <!-- ===== Sessions (B1) ===== -->
        <template v-else-if="tab === 'sessions'">
          <template v-if="!openSession">
            <div v-if="strategyFilter" class="flex items-center gap-1 text-xs">
              <WChip active clickable @click="strategyFilter = ''">{{ strategyFilter }} <i class="fas fa-times" /></WChip>
            </div>
            <WEmpty v-if="!sessionList.length" icon="fas fa-history">No sessions in this range.
              <template v-if="config.range !== 'all'" #actions><WButton size="sm" variant="ghost" @click="config.range = 'all'">Show all time</WButton></template>
            </WEmpty>
            <div v-else>
              <div class="w-row w-row--head px-0" :class="$style.sessGrid">
                <span>When</span><span>Strategy</span><span class="text-right">Maps</span><span class="text-right">Time</span><span class="text-right">{{ unitLabel }}</span><span class="text-right">/ hour</span>
              </div>
              <button v-for="sum in sessionList" :key="sum.s.id" class="w-row px-0 w-full text-left w-focusable" :class="$style.sessGrid" @click="openId = sum.s.id"
                @contextmenu="sessionMenu($event, sum.s)" @keydown.delete.prevent="deleteSession(sum.s)">
                <span class="w-trunc w-dim">{{ formatSessionDate(sum.s.startedAt) }}</span>
                <span class="w-trunc">{{ sum.s.strategy || 'Unnamed' }}<i v-if="sum.s.imported" class="fas fa-box-archive w-faint text-xs ml-1" title="From Farming's old history: totals only" /></span>
                <span class="text-right w-num">{{ sum.s.maps }}</span>
                <span class="text-right w-num w-dim">{{ formatDuration(sum.s.durationMs) }}</span>
                <span class="text-right w-num" :class="(sum.profit ?? 0) >= 0 ? 'w-up' : 'w-down'">{{ maybe(sum.profit, true) }}</span>
                <span class="text-right w-num">{{ maybe(sum.perHour) }}</span>
              </button>
            </div>
            <div class="flex gap-1 pt-1">
              <WButton size="sm" icon="fas fa-file-csv" :disabled="!sessionList.length" @click="exportCsv">Export CSV</WButton>
              <span v-if="exported" class="text-xs w-dim self-center">Saved {{ exported }}</span>
            </div>
          </template>

          <template v-else>
            <div class="flex justify-between gap-2 items-baseline">
              <span class="min-w-0 w-trunc">
                <button class="w-icon-btn" title="Back" @click="openId = null"><i class="fas fa-chevron-left" /></button>
                <span class="font-medium">{{ formatSessionDate(openSession.startedAt) }}</span>
                <span class="w-dim"> · {{ openSession.strategy || 'Unnamed' }} · {{ formatDuration(openSession.durationMs) }}</span>
              </span>
              <span class="w-num flex-none" :class="(openSummary!.profit ?? 0) >= 0 ? 'w-up' : 'w-down'">{{ maybe(openSummary!.profit, true) }}<span class="w-dim"> · {{ maybe(openSummary!.perHour) }}/h</span></span>
            </div>

            <div v-if="openSession.imported" class="text-xs w-dim">This session came from Farming's old history, so it has totals but no maps.</div>
            <div v-else-if="!openSession.runs.length" class="text-xs w-dim">No maps were recorded one by one (maps added by hand or before this update).</div>

            <div v-if="openSession.runs.length">
              <div v-for="(r, i) in openSession.runs" :key="i" class="w-row px-0" :class="[$style.runGrid, r.excluded ? $style.excluded : '']">
                <span class="w-faint w-num text-xs pt-0.5">{{ i + 1 }}</span>
                <div class="flex flex-col gap-1 min-w-0">
                  <div class="flex gap-2 items-baseline min-w-0">
                    <span class="font-medium w-trunc">{{ r.name }}</span>
                    <span class="w-faint w-num text-xs">{{ formatDuration(r.mapMs) }}<template v-if="r.otherMs >= 60_000"> + {{ formatDuration(r.otherMs) }} out</template></span>
                    <span v-if="isBigDrop(r, openSession)" :class="$style.flag">big drop</span>
                    <span v-if="r.excluded" class="text-xs w-faint">left out</span>
                  </div>
                  <div :class="$style.timeBar" :title="`${formatDuration(r.mapMs)} in the map, ${formatDuration(r.otherMs)} elsewhere`">
                    <i :style="{ width: `${r.mapMs / runScaleMs * 100}%` }" />
                    <i :class="$style.other" :style="{ left: `${r.mapMs / runScaleMs * 100}%`, width: `${r.otherMs / runScaleMs * 100}%` }" />
                  </div>
                  <div v-if="r.loot.length" class="flex flex-wrap gap-1">
                    <button v-for="(l, j) in r.loot" :key="j" :style="{ color: lootColour(l.type) }" :class="[$style.loot, moving && moving.run === i && moving.line === j ? $style.moving : '']"
                      :title="`${l.chaos != null ? num(l.chaos * l.qty / (rate(openSession) ?? 1)) + ' ' + unitLabel : 'no price'}. Click to move to another map.`"
                      v-item-tip="l" @click="pickLoot(i, j)"><WIcon :src="lootArt(l.type, l.name)" fallback="fas fa-coins" class="mr-1" />{{ l.name }}<template v-if="l.qty > 1"> ×{{ l.qty }}</template></button>
                  </div>
                </div>
                <div class="flex flex-col items-end gap-1">
                  <span class="w-num" :class="(runValue(r) ?? 0) >= 0 ? 'w-up' : 'w-down'">{{ maybe(runValue(r), true) }}</span>
                  <WButton v-if="moving && moving.run !== i" size="sm" @click="moveHere(i)">Move here</WButton>
                  <button v-else class="w-icon-btn text-xs" :title="r.excluded ? 'Count this map again' : 'Leave this map out of the averages'" @click="toggleExcluded(r)">
                    <i :class="r.excluded ? 'fas fa-eye-slash' : 'fas fa-eye'" />
                  </button>
                </div>
              </div>
            </div>
            <div v-if="openSession.loot.length" class="text-xs w-dim">
              Before the first map: <span v-for="(l, j) in openSession.loot" :key="j"><span v-item-tip="l">{{ l.name }}<template v-if="l.qty > 1"> ×{{ l.qty }}</template></span><template v-if="j < openSession.loot.length - 1">, </template></span>
            </div>

            <div class="flex flex-wrap gap-1 items-center pt-1">
              <input v-model="renameTo" :class="$style.input" list="woke-analytics-strategies" placeholder="Strategy" style="width: 12rem;">
              <datalist id="woke-analytics-strategies">
                <option v-for="name in strategyNames" :key="name" :value="name" />
              </datalist>
              <WButton size="sm" :disabled="renameTo.trim() === openSession.strategy" @click="rename">Rename</WButton>
              <span class="grow" />
              <WButton size="sm" variant="ghost" icon="fas fa-trash" title="You can undo" @click="deleteSession(openSession)">Delete</WButton>
            </div>
          </template>
        </template>

        <!-- ===== Maps ===== -->
        <template v-else>
          <WEmpty v-if="!tiles.length" :art="{ mechanic: 'map' }">Maps show up here once sessions record them one by one.</WEmpty>
          <div v-else>
            <div class="w-row w-row--head px-0" :class="$style.tileGrid">
              <span>Map</span><span class="text-right">Runs</span><span class="text-right">Avg</span><span class="text-right" title="Median map">Typical</span><span class="text-right">Best</span><span class="text-right">Time</span>
            </div>
            <div v-for="t in tiles" :key="t.name" class="w-row px-0" :class="$style.tileGrid">
              <span class="w-trunc flex items-center gap-1"><WIcon mechanic="map" />{{ t.name }}</span>
              <span class="text-right w-num w-dim">{{ t.runs }}</span>
              <span class="text-right w-num" :class="t.perMap >= 0 ? 'w-up' : 'w-down'">{{ num(t.perMap) }}</span>
              <span class="text-right w-num">{{ num(t.typical) }}</span>
              <span class="text-right w-num w-dim">{{ num(t.best) }}</span>
              <span class="text-right w-num w-dim">{{ t.minutes.toFixed(1) }}m</span>
            </div>
            <div class="pt-1"><WInfo text="Each map includes its share of hideout time and of loot not tied to a map. Maps you left out are not counted." /></div>
          </div>
        </template>
      </div>
    </WPanel>
  </Widget>
</template>

<script lang="ts">
import type { WidgetSpec } from '@/web/overlay/interfaces'
import { ANALYTICS_TYPE } from './types'

export default {
  widget: {
    type: ANALYTICS_TYPE,
    instances: 'multi',
    trNameKey: 'Session analytics'
  } satisfies WidgetSpec
}
</script>

<script setup lang="ts">
import { popupAnchor } from '../ui/window-anchor'
import { inject, computed, shallowRef, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import Widget from '@/web/overlay/Widget.vue'
import { formatDuration } from '../ui/format'
import { AppConfig } from '@/web/Config'
import { useLeagues } from '@/web/background/Leagues'
import { WInfo, WPanel, WTabs, WSegmented, WButton, WEmpty, WChip, WSpark, WIcon, WBanner, WSkeleton, openMenu, toast, vItemTip } from '../ui'
import { copyText } from '../ui/copy'
import { ninjaIcon } from '../ui/game-icons'
import { usePriceIndex } from '../market/price-index'
import { hostRequest } from '../shared/host'
import { BOSSES } from '../boss-runs/bosses'
import { BOSS_RUNS_TYPE } from '../boss-runs/widget'
import type { BossRunsWidget } from '../boss-runs/widget'
import { evaluateBoss, priceResolver } from '../boss-runs/calc'
import { useSessionStore } from './store'
import { tradeTotals, tradesInRange, useTradeLog } from '../trade/log-store'
import { isModuleOn } from '../modules'
import { useVisibleClock } from '../shared/visible-clock'
import {
  MIN_UNITS_FOR_RANGE, buildRow, chanceBetter, exportRows, filterSessions, formatSessionDate,
  inRange, isBigDrop, mapTileRows, perHour, rateFor, runProfit, sessionTotals, sessionUnits, sortRows, strategyRows
} from './stats'
import type { StrategyRow, Unit } from './stats'
import type { AnalyticsWidget, MapRun, SessionRecord } from './types'

const props = defineProps<{
  config: AnalyticsWidget
}>()

const wm = inject<WidgetManager>('wm')!

if (props.config.wmFlags[0] === 'uninitialized') {
  props.config.wmFlags = ['invisible-on-blur']
  props.config.wmTitle = 'Session analytics'
  props.config.anchor = popupAnchor()
  props.config.unit = 'div'
  props.config.range = 'league'
  props.config.bosses = true
  wm.show(props.config.wmId)
}

const tab = shallowRef<'strategies' | 'sessions' | 'maps'>('strategies')
const tabOptions = [
  { value: 'strategies', label: 'Strategies' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'maps', label: 'Maps' }
]
const rangeOptions = [{ value: '7d', label: '7 days' }, { value: 'league', label: 'League' }, { value: 'all', label: 'All' }]
const unitOptions = [{ value: 'div', label: 'div' }, { value: 'chaos', label: 'c' }]

const store = useSessionStore()
// Re-read when the window opens, in case another copy of the app saved.
watch(() => props.config.wmWants, (wants) => { if (wants === 'show') store.load(true) }, { immediate: true })
store.load()

const prices = usePriceIndex()
const divineNow = computed(() => prices.snapshot.value?.divine ?? null)

// Trading: sales and purchases from the trade assistant, in the same range.
const tradeLog = useTradeLog()
if (isModuleOn(AppConfig(), 'trade')) tradeLog.load()
const trading = computed(() => {
  // Like the sessions: "Last 7 days" means this league's last 7 days.
  const range = props.config.range
  const leagueId = leagues.selectedId.value ?? ''
  const ofLeague = range === 'all' ? tradeLog.trades.value : tradesInRange(tradeLog.trades.value, 'league', leagueId, now.value)
  const list = range === '7d' ? tradesInRange(ofLeague, '7d', leagueId, now.value) : ofLeague
  if (!list.length) return null
  // Each trade at the divine rate it happened at (today's for old ones).
  let sold = 0
  let spent = 0
  for (const t of list) {
    const rate = props.config.unit === 'div' ? (t.divine ?? divineNow.value) : 1
    if (!rate || t.chaos == null) continue
    if (t.dir === 'sell') sold += t.chaos / rate
    else spent += t.chaos / rate
  }
  const counts = tradeTotals(list)
  return { sold, spent, sales: counts.sales, buys: counts.buys }
})
const leagues = useLeagues()
const league = computed(() => leagues.selectedId.value ?? '')
const unitLabel = computed(() => props.config.unit === 'div' ? 'div' : 'c')

// "Last 7 days" and "Today" are counted from now: read the clock when the
// panel comes on screen (the overlay runs for days) and when data changes.
const now = shallowRef(Date.now())
useVisibleClock(() => props.config, () => { now.value = Date.now() }, 60_000)
watch([() => store.sessions.value, () => tradeLog.trades.value], () => { now.value = Date.now() })

const inView = computed(() => filterSessions(store.sessions.value, props.config.range, league.value, now.value))

// --- Boss kills from Boss runs ---
const bossRows = computed<StrategyRow[]>(() => {
  if (!props.config.bosses) return []
  const w = AppConfig().widgets.find(x => x.wmType === BOSS_RUNS_TYPE) as BossRunsWidget | undefined
  if (!w?.kills) return []
  const rate = props.config.unit === 'div' ? divineNow.value : 1
  if (!rate) return []
  const px = priceResolver(prices.snapshot.value?.items ?? [])
  const out: StrategyRow[] = []
  for (const boss of BOSSES) {
    // "League" shows this league's kills (and old kills saved without one).
    const kills = (w.kills[boss.id] ?? []).filter(k => inRange(k.ts, props.config.range, now.value) &&
      (props.config.range === 'all' || !k.league || k.league === league.value))
    if (!kills.length) continue
    const r = evaluateBoss(boss, w, px)
    const units: Unit[] = kills.map(k => ({
      profit: (k.drops.reduce((n, d) => n + (px.price(d.name, d.variant) ?? 0) * d.qty, 0) - r.entry) / rate,
      ms: r.runSeconds * 1000,
      ts: k.ts,
      name: boss.name
    }))
    out.push(buildRow(`boss:${boss.id}`, boss.name, 'boss', units, {
      sessions: 0,
      maps: units.length,
      costPerMap: r.entry / rate,
      mapShare: null,
      trend: []
    }))
  }
  return out
})

const rows = computed(() => sortRows([...strategyRows(inView.value, props.config.unit, divineNow.value), ...bossRows.value]))

const selectedKey = shallowRef<string | null>(null)
const selectedRow = computed(() => rows.value.find(r => r.key === selectedKey.value) ?? rows.value[0] ?? null)

// The selected strategy against the next one in the ranking (or the one above).
const versus = computed(() => {
  const list = rows.value
  const i = list.findIndex(r => r.key === selectedRow.value?.key)
  if (i < 0 || list.length < 2) return null
  const other = list[i + 1] ?? list[i - 1]
  return { other: other.strategy, chance: chanceBetter(list[i].units, other.units) }
})

function versusText (chance: number): string {
  const sure = Math.max(chance, 1 - chance)
  const pct = `${Math.round(sure * 100)}%`
  const word = chance >= 0.5 ? 'more' : 'less'
  if (sure >= 0.95) return `earns ${word}, very likely (${pct}).`
  if (sure >= 0.8) return `earns ${word}, fairly sure (${pct}).`
  return `too close to call yet (${Math.round(chance * 100)}% chance it earns more).`
}

const BAR_W = 96
const scale = computed(() => {
  let lo = 0
  let hi = 0
  for (const r of rows.value) {
    const vals = [r.perHour ?? 0, ...(r.range ?? [])]
    lo = Math.min(lo, ...vals)
    hi = Math.max(hi, ...vals)
  }
  return { lo, hi: hi > lo ? hi : lo + 1 }
})
function scaleX (v: number): number {
  const { lo, hi } = scale.value
  return 2 + (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo) * (BAR_W - 4)
}
function rangeTitle (row: StrategyRow): string {
  if (!row.range) return `Too few ${row.kind === 'boss' ? 'kills' : 'maps'} for a range yet (${row.units.length} of ${MIN_UNITS_FOR_RANGE}).`
  return `Likely between ${num(row.range[0])} and ${num(row.range[1])} ${unitLabel.value} per hour.`
}

function num (v: number, signed = false): string {
  const sign = signed && v > 0 ? '+' : ''
  if (props.config.unit === 'div') return `${sign}${v.toFixed(Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2)}`
  return `${sign}${Math.round(v).toLocaleString()}`
}
function maybe (v: number | null, signed = false): string {
  return v == null ? '—' : num(v, signed)
}

// --- Sessions ---
const strategyFilter = shallowRef('')
const openId = shallowRef<string | null>(null)

function rate (s: SessionRecord): number | null {
  return rateFor(s, props.config.unit, divineNow.value)
}
function summary (s: SessionRecord) {
  const r = rate(s)
  const t = sessionTotals(s)
  return {
    s,
    profit: r ? t.profit / r : null,
    perHour: perHour(sessionUnits(s, props.config.unit, divineNow.value, true))
  }
}
const sessionList = computed(() => inView.value
  .filter(s => !strategyFilter.value || (s.strategy.trim() || 'Unnamed') === strategyFilter.value)
  .map(summary))
const openSession = computed(() => store.sessions.value.find(s => s.id === openId.value) ?? null)
const openSummary = computed(() => openSession.value ? summary(openSession.value) : null)
const runScaleMs = computed(() => Math.max(60_000, ...(openSession.value?.runs ?? []).map(r => r.mapMs + r.otherMs)))

function openSessionsFor (strategy: string) {
  strategyFilter.value = strategy
  openId.value = null
  tab.value = 'sessions'
}

function runValue (r: MapRun): number | null {
  const s = openSession.value
  if (!s) return null
  const k = rate(s)
  return k ? runProfit(r, s) / k : null
}

function lootColour (type: string): string {
  if (type === 'DivinationCard') return 'var(--w-r-divination)'
  if (type.startsWith('Unique')) return 'var(--w-r-unique)'
  if (type === 'SkillGem') return 'var(--w-r-gem)'
  return 'var(--w-r-currency)'
}

const renameTo = shallowRef('')
watch(openSession, (s) => {
  renameTo.value = s?.strategy ?? ''
  moving.value = null
})
const strategyNames = computed(() => [...new Set(store.sessions.value.map(s => s.strategy.trim()).filter(Boolean))])

function saveOpen (change: (s: SessionRecord) => void) {
  const s = openSession.value
  if (!s) return
  const copy = JSON.parse(JSON.stringify(s)) as SessionRecord
  change(copy)
  store.save(copy).catch(() => {})
}
function toggleExcluded (r: MapRun) {
  const i = openSession.value!.runs.indexOf(r)
  saveOpen(s => { s.runs[i].excluded = !s.runs[i].excluded || undefined })
}
function rename () {
  const name = renameTo.value.trim()
  saveOpen(s => { s.strategy = name })
}
const panel = shallowRef<InstanceType<typeof WPanel> | null>(null)
const busy = shallowRef(false)
async function reload () {
  busy.value = true
  try { await store.load(true) } finally { busy.value = false }
}

// No "are you sure": delete now, offer Undo (P9).
function deleteSession (s: SessionRecord) {
  const copy = JSON.parse(JSON.stringify(s)) as SessionRecord
  if (openId.value === s.id) openId.value = null
  store.remove(s.id).catch(() => {})
  toast(`Deleted the ${formatSessionDate(s.startedAt)} session`, {
    anchor: panel.value?.el,
    undo: () => { store.save(copy).catch(() => {}) }
  })
}

function sessionMenu (e: MouseEvent, s: SessionRecord) {
  const name = s.strategy.trim() || 'Unnamed'
  openMenu(e, [
    { label: 'Open', icon: 'fas fa-list', keys: 'Enter', action: () => { openId.value = s.id } },
    ...(strategyFilter.value ? [] : [{ label: `Only "${name}"`, icon: 'fas fa-filter', action: () => { strategyFilter.value = name } }]),
    { separator: true },
    { label: 'Delete', icon: 'fas fa-trash', keys: 'Del', danger: true, action: () => deleteSession(s) }
  ])
}

function strategyMenu (e: MouseEvent, row: StrategyRow) {
  openMenu(e, [
    ...(row.kind === 'maps' ? [{ label: 'Sessions', icon: 'fas fa-history', action: () => openSessionsFor(row.strategy) }] : []),
    { label: 'Copy name', icon: 'far fa-copy', action: () => { copyText(row.strategy) } }
  ])
}

function lootArt (type: string, name: string) {
  return ninjaIcon(type, name) ?? undefined
}

// Move a loot line to another map: click the chip, then "Move here".
const moving = shallowRef<{ run: number, line: number } | null>(null)
function pickLoot (run: number, line: number) {
  const m = moving.value
  moving.value = m && m.run === run && m.line === line ? null : { run, line }
}
function moveHere (target: number) {
  const m = moving.value
  if (!m) return
  moving.value = null
  saveOpen(s => {
    const [line] = s.runs[m.run].loot.splice(m.line, 1)
    if (!line) return
    const same = s.runs[target].loot.find(l => l.type === line.type && l.name === line.name && l.variant === line.variant)
    if (same) same.qty += line.qty
    else s.runs[target].loot.push(line)
  })
}

const exported = shallowRef('')
async function exportCsv () {
  try {
    const file = await hostRequest<string>('sessions-export', { rows: exportRows(sessionList.value.map(x => x.s)) })
    exported.value = file.split(/[\\/]/).pop() ?? file
  } catch (err) {
    exported.value = `failed: ${(err as Error).message}`
  }
}

// --- Maps ---
const tiles = computed(() => mapTileRows(inView.value, props.config.unit, divineNow.value))

</script>

<style module>
.stratGrid { grid-template-columns: minmax(0, 1fr) 40px 40px 136px 52px; gap: 6px; }
.sessGrid { grid-template-columns: 104px minmax(0, 1fr) 36px 52px 56px 52px; gap: 6px; }
.tileGrid { grid-template-columns: minmax(0, 1fr) 36px 56px 56px 56px 48px; gap: 6px; }
.runGrid { grid-template-columns: 16px minmax(0, 1fr) auto; gap: 8px; align-items: start; padding-top: 5px; padding-bottom: 5px; }
.sel { background: var(--w-accent-soft); }
.excluded { opacity: 0.5; }
.detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  background: var(--w-panel-2);
  border: 1px solid var(--w-line-soft);
  border-radius: var(--w-r-sm);
}
.kv { display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 2px 12px; }
.k { font-size: var(--w-fs-xs); text-transform: uppercase; letter-spacing: 0.08em; color: var(--w-faint); margin-bottom: 2px; }
.bar { height: 7px; border-radius: var(--w-r-sm); background: var(--w-panel-3); position: relative; overflow: hidden; }
.bar i { position: absolute; inset: 0 auto 0 0; background: var(--w-accent); border-radius: var(--w-r-sm); }
.timeBar { height: 4px; border-radius: var(--w-r-sm); background: var(--w-panel-3); position: relative; overflow: hidden; }
.timeBar i { position: absolute; top: 0; bottom: 0; left: 0; background: var(--w-accent); opacity: 0.75; }
.timeBar i.other { background: var(--w-faint); opacity: 1; }
.loot {
  font-size: var(--w-fs-xs);
  padding: 0 6px;
  border-radius: var(--w-r-sm);
  background: var(--w-panel-3);
  border: 1px solid transparent;
  white-space: nowrap;
}
.loot:hover { border-color: var(--w-line-strong); }
.moving { border-color: var(--w-accent); }
.flag { font-size: var(--w-fs-xs); color: var(--w-warn); border: 1px solid var(--w-warn); border-radius: var(--w-r-sm); padding: 0 4px; opacity: 0.85; }
.input {
  height: 24px;
  padding: 0 8px;
  font-size: var(--w-fs-md);
  color: var(--w-fg);
  background: var(--w-panel-2);
  border: 1px solid var(--w-line);
  border-radius: var(--w-r-sm);
}
.input:focus { outline: none; border-color: var(--w-accent); }
.trading { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; padding: 6px 0 2px; border-top: 1px solid var(--w-line); font-size: calc(12px * var(--w-text-scale, 1)); }
</style>
