<template>
  <WPanel size-key="net-worth" :title="config.wmTitle || 'Net worth'" icon="divine" width="44rem" max-height="85vh"
    :hotkey="config.hotkey" :busy="status?.running === true" :stale="!!status?.error && !!v">
    <template #actions>
      <span class="w-dim text-xs mr-2">{{ readLine }}</span>
      <WButton size="sm" icon="fas fa-sync-alt" :disabled="status?.running || showPicker" @click="refresh">Refresh</WButton>
      <WButton size="sm" variant="ghost" icon="fas fa-layer-group" title="Choose which tabs to read" aria-label="Choose which tabs to read" :disabled="!status?.account || status?.running" @click="picking = true" />
      <WButton size="sm" variant="ghost" icon="fas fa-sliders-h" title="Sections to show" aria-label="Sections to show" @click="openSections" />
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
      <!-- H1: one summary line; the rest folds away under Details -->
      <section :class="$style.summary">
        <span :class="$style.total" class="w-num" :title="`${inChaos(v.chaos)} · liquid ${div(liquid)} ${unit}`">{{ div(v.chaos) }}<Coin :chaos="!divine" /></span>
        <span class="w-num" :class="tone(sum?.sinceYesterdayDiv)" title="Since yesterday's last read">
          <template v-if="sum?.sinceYesterdayDiv != null">{{ signed(sum.sinceYesterdayDiv) }}<Coin /> today</template><template v-else>— today</template>
        </span>
        <span v-if="perHourDiv != null" class="w-num" :class="tone(perHourDiv)" :title="inChaos(sum?.perHourChaos ?? 0) + ' per hour, today'">{{ signed(perHourDiv) }}<Coin :chaos="!divine" />/h</span>
        <WSpark v-if="spark.length > 1" :values="spark" :width="90" :height="18" :class="$style.spark" />
        <button v-if="anyDetails" type="button" :class="$style.toggle" :aria-expanded="detailsOpen" @click="config.detailsOpen = !detailsOpen">
          Details <i :class="detailsOpen ? 'fas fa-chevron-down' : 'fas fa-chevron-right'" />
        </button>
      </section>

      <template v-if="detailsOpen && anyDetails">
        <section v-if="shown.chart" :class="$style.chartBlock">
          <div :class="$style.chartHead">
            <WSegmented v-model="chartMode" :options="MODE_OPTIONS" />
            <span v-if="goal" class="text-xs" :class="$style.goalLine">
              {{ goal.name || 'Goal' }}: {{ fmt(goal.div) }}<Coin /> ·
              <template v-if="eta.reached">reached</template>
              <template v-else-if="eta.days != null">about {{ etaText(eta.days) }}</template>
              <template v-else>no ETA yet</template>
            </span>
            <WSegmented v-model="range" :options="RANGE_OPTIONS" />
          </div>
          <LedgerChart :series="series" :big="big" :mode="chartMode as 'total' | 'category'" :goal-div="goal?.div ?? null" :tip-of="(name, count) => tipFor(tips, null, name, count)" />
          <div v-if="chartMode === 'category'" :class="$style.legend">
            <span v-for="c in CATEGORIES" :key="c.id"><i :style="{ background: CAT_COLOUR[c.id] }" />{{ c.label }}</span>
          </div>
        </section>

        <section v-if="shown.numbers" :class="$style.kpis">
          <div><span :class="$style.caps">This session</span><b class="w-num" :class="tone(session?.div)"><template v-if="session">{{ signed(session.div) }}<Coin :chaos="!divine" /> · {{ duration(session.ms) }}</template><template v-else>—</template></b></div>
          <div><span :class="$style.caps">Liquid</span><b class="w-num" :title="inChaos(liquid)">{{ div(liquid) }}<Coin :chaos="!divine" /></b></div>
          <div><span :class="$style.caps">≈ Chaos</span><b class="w-num">{{ compact(v.chaos) }}<Coin chaos /></b></div>
          <div v-if="best"><span :class="$style.caps">Best item</span><b class="w-num w-trunc" :title="inChaos(best.chaos)">{{ best.name }} {{ div(best.chaos) }}<Coin :chaos="!divine" /></b></div>
        </section>

        <section v-if="shown.moves && moves.length" :class="$style.moves" class="text-xs">
          <span :class="$style.caps">Price moves today</span>
          <span v-for="m in moves.slice(0, 2)" :key="m.key" class="w-trunc"><span v-item-tip="tipFor(tips, m.key, m.name)">{{ m.name }}</span> <span :class="tone(m.change)" :title="inChaos(m.valueChaos)">{{ signedPct(m.change) }} ({{ signed(toDiv(m.valueChaos)) }}<Coin :chaos="!divine" />)</span></span>
          <span v-if="moves.length > 2" class="w-dim" :title="moves.slice(2).map(moveText).join('\n')">+{{ moves.length - 2 }} more</span>
        </section>

        <section v-if="showChanges || shown.where" :class="[$style.cols, { [$style.one]: !(showChanges && shown.where) }]">
          <div v-if="showChanges" :class="[$style.changesCol, { [$style.capped]: shown.where }]">
            <div :class="$style.colHead">
              <span :class="$style.caps">{{ session ? `Session · ${duration(session.ms)} · ${session.maps} maps` : 'Since last refresh' }}</span>
              <b v-if="session" class="w-num" :class="tone(session.div)">{{ signed(session.div) }}<Coin :chaos="!divine" /><template v-if="session.perHour != null"> · {{ fmt(session.perHour) }}<Coin :chaos="!divine" />/h</template></b>
            </div>
            <!-- The newest groups; the two latest open, the rest one row each. The
                 list scrolls inside, never stretching the window. -->
            <div :class="$style.scrollBox">
              <div :class="$style.scroll">
                <div v-for="(g, i) in groups.slice(0, groupLimit)" :key="g.key" :class="$style.group">
                  <button type="button" :class="$style.groupHead" :aria-expanded="groupOpen(g.key, i)" @click="toggleGroup(g.key, i)">
                    <i :class="groupOpen(g.key, i) ? 'fas fa-chevron-down' : 'fas fa-chevron-right'" />
                    <span class="w-trunc">{{ g.title }}<template v-if="!groupOpen(g.key, i)"> · {{ g.lines.length }} {{ g.lines.length === 1 ? 'change' : 'changes' }}</template></span>
                    <b class="w-num" :class="tone(g.netChaos)" :title="inChaos(g.netChaos)">{{ signed(toDiv(g.netChaos)) }}<Coin :chaos="!divine" /></b>
                  </button>
                  <template v-if="groupOpen(g.key, i)">
                    <div v-for="l in g.lines.slice(0, 5)" :key="l.dir + l.key" :class="$style.feedRow">
                      <img v-if="l.icon" :src="l.icon" alt="" :class="$style.icon"><span v-else :class="$style.icon" />
                      <span v-item-tip="tipFor(tips, l.key, l.name, l.count)" class="w-trunc">{{ l.count > 1 ? `${fmt(l.count)} × ` : '' }}{{ l.name }}</span>
                      <span class="w-num" :class="l.dir === 'add' ? 'w-up' : 'w-down'" :title="inChaos(l.chaos)">{{ l.dir === 'add' ? '+' : '−' }}{{ div(l.chaos) }}<Coin :chaos="!divine" /></span>
                    </div>
                    <div v-if="g.lines.length > 5" class="w-dim text-xs">+{{ g.lines.length - 5 }} more</div>
                  </template>
                </div>
                <button v-if="groups.length > groupLimit" type="button" :class="$style.clear" class="text-xs" @click="groupLimit += GROUP_STEP">Show older ({{ groups.length - groupLimit }})</button>
              </div>
            </div>
            <div v-if="session" :class="$style.sessionFoot">
              <span class="w-dim text-xs">Gains are read when you enter your hideout</span>
              <WButton size="sm" @click="endSession">End session</WButton>
            </div>
          </div>
          <div v-if="shown.where">
            <div :class="$style.caps" style="margin-bottom: 6px">Where it is</div>
            <button v-for="c in cats" :key="c.id" type="button" :class="[$style.catRow, { [$style.catOn]: cat === c.id }]"
              :aria-pressed="cat === c.id" @click="cat = cat === c.id ? 'all' : c.id">
              <span>{{ c.label }}</span><i :style="{ width: c.share * 100 + '%' }" /><b class="w-num" :title="inChaos(c.chaos)">{{ div(c.chaos) }}<Coin :chaos="!divine" /></b>
            </button>
          </div>
        </section>
      </template>

      <!-- T1: one line with the tab labels in it; when they don't fit it fades
           out at the right, and the chevron (or the fade) opens them all below -->
      <section v-if="shown.tabs" :class="$style.tabLine">
        <button v-if="tabsOverflow" type="button" :class="$style.toggle" :aria-expanded="expanded" @click="config.tabsOpen = !expanded">
          <i :class="expanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right'" /> Tabs
        </button>
        <span v-else :class="$style.caps">Tabs</span>
        <button type="button" :class="[$style.tabLabel, { [$style.tabOn]: !tabs.length }]" :aria-pressed="!tabs.length" title="Every tab" @click="tabs = []">All tabs</button>
        <div :class="$style.stripBox">
          <div ref="strip" :class="[$style.strip, { [$style.fade]: tabsOverflow && !expanded, [$style.ghost]: expanded }]" :aria-hidden="expanded" @scroll="unscroll">
            <button v-for="t in inlineLabels" :key="t.id" type="button" :class="[$style.tabLabel, { [$style.tabOn]: tabs.includes(t.id) }]" :tabindex="expanded ? -1 : undefined"
              :style="t.colour ? { '--tab-colour': t.colour } : undefined" :aria-pressed="tabs.includes(t.id)" :title="t.title" @click="tabs = toggleTab(tabs, t.id)">
              {{ t.name }}<span :class="$style.tabCount">{{ t.count }}</span>
            </button>
          </div>
          <button v-if="tabsOverflow && !expanded" type="button" :class="$style.fadeHit" title="Show every tab" aria-label="Show every tab" @click="config.tabsOpen = true" />
        </div>
        <span v-if="tabs.length" class="w-num text-xs" :class="$style.picked" :title="inChaos(selectedChaos)">{{ tabs.length }} picked · {{ div(selectedChaos) }}<Coin :chaos="!divine" /></span>
        <span class="w-dim text-xs" :class="$style.synced">{{ tabValues.length }} synced</span>
      </section>
      <section v-if="shown.tabs && expanded" :class="$style.tabLabels">
        <button v-for="t in tabLabels" :key="t.id" type="button" :class="[$style.tabLabel, { [$style.tabOn]: tabs.includes(t.id) }]"
          :style="t.colour ? { '--tab-colour': t.colour } : undefined" :aria-pressed="tabs.includes(t.id)" :title="t.title" @click="tabs = toggleTab(tabs, t.id)">
          {{ t.name }}<span :class="$style.tabCount">{{ t.count }}</span>
        </button>
      </section>

      <section :class="$style.chips">
        <WField v-model="query" type="search" icon="fas fa-search" placeholder="Search items" :class="$style.search" />
        <WChip v-if="cat !== 'all'" clickable active :title="`Only ${catLabel}. Click to show every category`" @click="cat = 'all'">{{ catLabel }} ×</WChip>
        <HideChip v-if="divine" :value="hideBelow" :on="config.hideDivOn === true" :idle="floor.limiting === 'chaos'"
          :title="floor.limiting === 'chaos' ? 'The chaos limit is higher, so it is the one hiding rows' : 'Hide rows worth less in total. Scroll the number or click it to type'"
          @on="config.hideDivOn = $event" @value="config.hideBelowDiv = $event" />
        <HideChip chaos :value="hideBelowChaos" :on="config.hideChaosOn === true" :idle="floor.limiting === 'div'"
          :title="floor.limiting === 'div' ? 'The divine limit is higher, so it is the one hiding rows' : 'Hide rows worth less in total. Scroll the number or click it to type'"
          @on="config.hideChaosOn = $event" @value="config.hideBelowChaos = $event" />
      </section>
      <ItemTable :lines="tableLines" :units="config.tableUnits" :filtered="cat !== 'all' || tabs.length > 0 || !!query.trim() || floor.minChaos > 0" :divine="divine" :changes="changes" :tab-names="tabNames"
        @units="config.tableUnits = $event" @clear="clearFilters" @price="onPrice" @ignore="onIgnore" />

      <div class="w-dim text-xs" :class="$style.foot">
        <span>
          {{ status?.listed ? `${status.chosen} of ${status.listed}` : sum?.tabs }} tabs
          <template v-if="status?.skipped"> · {{ status.skipped }} remove-only skipped</template>
          <template v-if="v.unpriced"> · {{ v.unpriced }} {{ v.unpriced === 1 ? 'item' : 'items' }} unpriced (rares aren't searched)
            <button type="button" :class="$style.clear" :aria-pressed="showUnpriced" title="List them, to set your own price" @click="showUnpriced = !showUnpriced">{{ showUnpriced ? 'hide' : 'show' }}</button></template>
          <template v-if="hiddenByValue"> · {{ hiddenByValue }} hidden by value
            <button type="button" :class="$style.clear" title="Switch the Hide &lt; limits off" @click="showHidden">show</button></template>
          <template v-if="ignoredCount"> · {{ ignoredCount }} ignored
            <button type="button" :class="$style.clear" :aria-pressed="showIgnored" title="List them, to stop ignoring one" @click="showIgnored = !showIgnored">{{ showIgnored ? 'hide' : 'show' }}</button></template>
        </span>
        <span>poe.ninja · {{ ninjaAge }}</span>
      </div>
    </div>
  </WPanel>
</template>

<script setup lang="ts">
// Net worth, pick A1 "Ledger", decluttered (H1 + T1): one summary line with
// the rest under Details, a thin tab line that opens to the labels, and a
// sections flyout to switch parts off.
import { computed, defineAsyncComponent, nextTick, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import { AppConfig } from '@/web/Config'
import { usePoeninja } from '@/web/background/Prices'
import { WBanner, WButton, WChip, WEmpty, WField, WPanel, WSegmented, WSpark, openMenu, toast, vItemTip } from '../ui'
import { tipFor, tipIndex } from './tips'
import { agoPhrase, formatAmount } from '../ui/format'
import { hostRequest } from '../shared/host'
import { FARMING_TYPE, elapsed, requestEndSession } from '../farming/farming'
import { isWidgetTypeOn } from '../modules'
import { stashGainsBetween } from './gains'
import type { FarmingWidget } from '../farming/farming'
import { CATEGORIES } from './valuation'
import type { Category } from './valuation'
import { bigGains, change24h, filterLines, selectedFirst, toggleTab, goalEta, groupByRefresh, groupByRuns, liquidChaos, priceMoves, seriesFor } from './ledger'
import type { ChartRange, PriceMove } from './ledger'
import { divine, historyNow, leagueNow, ledger, setIgnored, setMyPrice, summary, tabValues, valuation, wantPrices } from './store'
import { SECTIONS, hideBelowChaosOf, hideBelowOf, sectionOn, setSection, valueFloor } from './widget'
import type { NetWorthWidget, ReaderStatus } from './widget'
import { UNREADABLE } from './tab-picker'
import LedgerChart from './LedgerChart.vue'
import Coin from './Coin.vue'
import ItemTable from './ItemTable.vue'
import HideChip from './HideChip.vue'

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
const signedPct = (c: number) => `${c > 0 ? '+' : '−'}${Math.abs(c * 100).toFixed(1)}%`
const tone = (n: number | null | undefined) => n == null || n === 0 ? '' : n > 0 ? 'w-up' : 'w-down'
const duration = (ms: number) => {
  const m = Math.round(ms / 60_000)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}
const moveText = (m: PriceMove) => `${m.name} ${signedPct(m.change)} (${signed(toDiv(m.valueChaos))} ${unit.value})`
const etaText = (days: number) => days < 1 ? `${Math.max(1, Math.round(days * 24))} h` : days < 60 ? `${Math.round(days)} days` : `${Math.round(days / 30)} months`

const liquid = computed(() => v.value ? liquidChaos(v.value) : 0)
const perHourDiv = computed(() => sum.value?.perHourChaos == null ? null : toDiv(sum.value.perHourChaos))
const best = computed(() => v.value?.lines[0] ?? null)

// ---------- sections (⚙ flyout, Settings) and what's open ----------
const shown = computed(() => Object.fromEntries(SECTIONS.map(x => [x.id, sectionOn(props.config, x.id)])) as Record<typeof SECTIONS[number]['id'], boolean>)
const detailsOpen = computed(() => props.config.detailsOpen === true)
const tabsOpen = computed(() => props.config.tabsOpen === true)
function openSections (e: MouseEvent) {
  openMenu(e, SECTIONS.map(x => ({
    label: x.label,
    icon: shown.value[x.id] ? 'fas fa-check-square' : 'far fa-square',
    action: () => { setSection(props.config, x.id, !shown.value[x.id]) }
  })))
}
// Details with every section in it off: no toggle, nothing to open.
const anyDetails = computed(() => shown.value.chart || shown.value.numbers || shown.value.moves || shown.value.changes || shown.value.where)
// Tab labels switched off: a tab pick nothing shows any more is dropped.
watch(() => shown.value.tabs, (on) => { if (!on) tabs.value = [] })
// "Since last refresh" only when it has something.
const showChanges = computed(() => shown.value.changes && (groups.value.length > 0 || !!session.value))

// ---------- chart ----------
const chartMode = shallowRef('total')
const range = shallowRef<string>('7d')
const series = computed(() => seriesFor(ledger.value.points, historyNow.value.days, range.value as ChartRange, Date.now(), divine.value))
const big = computed(() => bigGains(series.value))
// The summary's tiny line: the last 7 days.
const spark = computed(() => seriesFor(ledger.value.points, historyNow.value.days, '7d', Date.now(), divine.value).map(p => p.div))
const goal = computed(() => props.config.goal && props.config.goal.div > 0 ? props.config.goal : null)
const eta = computed(() => goal.value ? goalEta(seriesFor(ledger.value.points, historyNow.value.days, '7d', Date.now(), divine.value), goal.value.div) : { reached: false, days: null })

// ---------- price moves (D3) ----------
// The item tooltip for any item named here: held ones by their table line.
const tips = computed(() => tipIndex(v.value ? [...v.value.lines, ...v.value.unpricedLines, ...v.value.ignoredLines] : []))

// Your own prices don't move with poe.ninja.
const changes = computed(() => new Map((v.value?.lines ?? []).map(l => [l.key, l.mine ? null : change24h(l.graph)])))
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
watch([farming, () => ledger.value.points[ledger.value.points.length - 1]?.at, leagueNow], async () => {
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
  return s ? groupByRuns(ledger.value.diffs, s.runs ?? [], s.startedAt) : groupByRefresh(ledger.value.diffs, ledger.value.diffs.length)
})
// The newest 5 groups, "Show older" adds more; the newest 2 open, the rest
// folded to their header unless clicked.
const GROUP_STEP = 5
const groupLimit = shallowRef(GROUP_STEP)
const groupToggled = shallowRef<Record<string, boolean>>({})
const groupOpen = (key: string, i: number) => groupToggled.value[key] ?? i < 2
function toggleGroup (key: string, i: number) {
  groupToggled.value = { ...groupToggled.value, [key]: !groupOpen(key, i) }
}
// A session starting or ending is a different list.
watch(farming, (now, before) => {
  if (!!now === !!before && now?.startedAt === before?.startedAt) return
  groupLimit.value = GROUP_STEP
  groupToggled.value = {}
})
function endSession () {
  const w = farmingWidget.value
  if (w) requestEndSession(w.wmId)
}

// ---------- categories, tabs, filters ----------
const cat = shallowRef<Category | 'all'>('all')
// Picked tabs (multi); none is every tab.
const tabs = shallowRef<string[]>([])
function clearFilters () {
  cat.value = 'all'
  tabs.value = []
  query.value = ''
  props.config.hideDivOn = false
  props.config.hideChaosOn = false
}
const query = shallowRef('')
const hideBelow = computed(() => hideBelowOf(props.config))
const hideBelowChaos = computed(() => hideBelowChaosOf(props.config))
const floor = computed(() => valueFloor(props.config, divine.value))

const cats = computed(() => {
  const val = v.value
  if (!val) return []
  const max = Math.max(1, ...Object.values(val.byCategory))
  return CATEGORIES.map(c => ({ ...c, chaos: val.byCategory[c.id], share: val.byCategory[c.id] / max }))
})

const tabNames = computed(() => new Map(tabValues.value.map(t => [t.id, t.name])))
const catLabel = computed(() => CATEGORIES.find(c => c.id === cat.value)?.label ?? '')
const selectedChaos = computed(() => tabValues.value.filter(t => tabs.value.includes(t.id)).reduce((x, t) => x + t.chaos, 0))
const tabLabels = computed(() => {
  const prev = ledger.value.tabChaos.prev
  return tabValues.value.map(t => {
    if (UNREADABLE.has(t.type)) {
      return { id: t.id, name: t.name, colour: t.colour, count: 'not readable', title: "pathofexile.com sends none of this tab's items" }
    }
    const change = prev[t.id] != null ? toDiv(t.chaos - prev[t.id]) : null
    return {
      id: t.id,
      name: t.name,
      colour: t.colour,
      count: `${div(t.chaos)} ${unit.value}`,
      title: `${t.name}: ${div(t.chaos)} ${unit.value} (${inChaos(t.chaos)})${change != null && Math.abs(change) >= 0.05 ? ` · ${signed(change)} ${unit.value} since the read before` : ''}`
    }
  })
})
// The labels in the tab row: the picked ones first when they don't all fit.
const inlineLabels = computed(() => tabsOverflow.value ? selectedFirst(tabLabels.value, tabs.value) : tabLabels.value)
// Do they fit on the row? Measured on the strip, again when it's resized or the
// labels change. Opened (tabsOpen) only means something when they don't.
const strip = shallowRef<HTMLElement | null>(null)
const tabsOverflow = shallowRef(false)
const expanded = computed(() => tabsOpen.value && tabsOverflow.value)
// A focused label would scroll the row sideways; it stays put.
function unscroll (e: Event) { (e.currentTarget as HTMLElement).scrollLeft = 0 }
function measureTabs () {
  const el = strip.value
  tabsOverflow.value = !!el && el.scrollWidth > el.clientWidth + 1
}
let tabsResize: ResizeObserver | null = null
watch(strip, (el, _, onCleanup) => {
  if (!el || typeof ResizeObserver === 'undefined') return
  // Measured on the next frame: a state change inside the observer's callback
  // resizes the row in the same frame ("ResizeObserver loop" warnings).
  let frame = 0
  tabsResize = new ResizeObserver(() => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(measureTabs)
  })
  tabsResize.observe(el)
  measureTabs()
  onCleanup(() => { cancelAnimationFrame(frame); tabsResize?.disconnect(); tabsResize = null })
}, { flush: 'post' })
watch(tabLabels, () => { nextTick(measureTabs) }, { flush: 'post' })
// The game font arriving later widens the labels without resizing the row.
onMounted(() => { document.fonts?.ready.then(measureTabs).catch(() => {}) })

// Tabs that are gone (tabs chosen again) drop out of the pick.
watch(tabValues, (list) => {
  const ids = new Set(list.map(t => t.id))
  if (tabs.value.some(t => !ids.has(t))) tabs.value = tabs.value.filter(t => ids.has(t))
})

// Unpriced and ignored items, shown dimmed under the rest from the footer.
const showUnpriced = shallowRef(false)
const showIgnored = shallowRef(false)
const tableLines = computed(() => {
  const val = v.value
  if (!val) return []
  const f = { cat: cat.value, tabs: tabs.value, query: query.value, minChaos: floor.value.minChaos }
  const extra = [...(showUnpriced.value ? val.unpricedLines : []), ...(showIgnored.value ? val.ignoredLines : [])]
  return [...filterLines(val.lines, f), ...filterLines(extra, { ...f, minChaos: 0 })]
})
const ignoredCount = computed(() => v.value?.ignoredLines.length ?? 0)
// Rows the value chips hide (the other filters aside).
const hiddenByValue = computed(() => {
  const val = v.value
  if (!val || !floor.value.minChaos) return 0
  const f = { cat: cat.value, tabs: tabs.value, query: query.value, minChaos: 0 }
  return filterLines(val.lines, f).length - filterLines(val.lines, { ...f, minChaos: floor.value.minChaos }).length
})
function showHidden () {
  props.config.hideDivOn = false
  props.config.hideChaosOn = false
}
watch(ignoredCount, (n) => { if (!n) showIgnored.value = false })

// ---------- your prices and ignored items (row menu) ----------
const NOT_READY = 'Not loaded yet. Try again in a moment'
function onPrice (key: string, chaos: number | null) {
  if (!setMyPrice(key, chaos)) toast(NOT_READY)
}
function onIgnore (key: string, name: string, on: boolean) {
  if (!setIgnored(key, on)) { toast(NOT_READY); return }
  toast(on ? `Ignoring ${name}` : `${name} counts again`, { undo: () => { setIgnored(key, !on) } })
}

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
.summary { display: flex; align-items: center; gap: var(--w-s3); padding: 6px var(--w-pad); border-bottom: 1px solid var(--w-line); flex-wrap: wrap; font-size: var(--w-fs-sm); }
.total { font-size: calc(20px * var(--w-text-scale, 1)); color: var(--w-fg); line-height: 1.1; }
.spark { margin-left: auto; }
.toggle { display: inline-flex; align-items: center; gap: 5px; color: var(--w-dim); font-size: var(--w-fs-sm); cursor: pointer; padding: 1px 4px; border-radius: var(--w-r-sm); white-space: nowrap; }
.toggle:hover { color: var(--w-fg); background: var(--w-panel-2); }
.toggle i { font-size: calc(9px * var(--w-text-scale, 1)); }
.chartBlock { display: flex; flex-direction: column; gap: 4px; padding: 6px var(--w-pad) 8px; border-bottom: 1px solid var(--w-line); }
.chartHead { display: flex; justify-content: space-between; align-items: center; gap: var(--w-s2); flex-wrap: wrap; }
.goalLine { color: var(--w-up); }
.legend { display: flex; gap: var(--w-s2); flex-wrap: wrap; font-size: var(--w-fs-xs); color: var(--w-dim); }
.legend i { display: inline-block; width: 8px; height: 8px; margin-right: 4px; opacity: .7; }
.kpis { display: flex; gap: var(--w-s4); padding: 6px var(--w-pad); border-bottom: 1px solid var(--w-line); flex-wrap: wrap; }
.kpis > div { display: flex; flex-direction: column; min-width: 0; max-width: 40%; }
.kpis b { font-size: var(--w-fs-md); font-weight: 500; }
.moves { display: flex; gap: var(--w-s3); padding: 4px var(--w-pad); border-bottom: 1px solid var(--w-line); align-items: baseline; min-width: 0; }
.cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); border-bottom: 1px solid var(--w-line); }
.cols.one { grid-template-columns: minmax(0, 1fr); }
.cols > div { padding: var(--w-s2) var(--w-pad); min-width: 0; }
.cols > div + div { border-left: 1px solid var(--w-line); }
.colHead { display: flex; justify-content: space-between; gap: var(--w-s2); margin-bottom: 2px; }
.colHead b { font-weight: 500; font-size: var(--w-fs-sm); }
.group { display: flex; flex-direction: column; gap: 1px; margin-top: 4px; }
.groupHead { display: flex; align-items: baseline; gap: 6px; width: 100%; font-size: var(--w-fs-xs); color: var(--w-dim); border-bottom: 1px dashed var(--w-line); text-align: left; cursor: pointer; }
.groupHead:hover { color: var(--w-fg); }
.groupHead > span { flex: 1 1 auto; min-width: 0; }
.groupHead > i { font-size: calc(8px * var(--w-text-scale, 1)); width: 8px; flex: none; }
.changesCol { display: flex; flex-direction: column; }
.scrollBox { flex: 1 1 auto; min-height: 0; }
.scroll { max-height: 320px; overflow-y: auto; overscroll-behavior: contain; padding-right: 2px; }
/* Beside "Where it is": as tall as that column (at least 240px), scrolling inside. */
.capped { min-height: 240px; }
.capped .scrollBox { position: relative; }
.capped .scroll { position: absolute; inset: 0; max-height: none; }
.feedRow { display: grid; grid-template-columns: 16px minmax(0, 1fr) auto; gap: 6px; align-items: center; font-size: var(--w-fs-sm); }
.icon { width: 16px; height: 16px; object-fit: contain; }
.sessionFoot { display: flex; justify-content: space-between; align-items: center; gap: var(--w-s2); margin-top: var(--w-s2); }
.catRow { display: grid; grid-template-columns: 84px minmax(0, 1fr) 64px; gap: 6px; align-items: center; width: 100%; padding: 2px 4px; font-size: var(--w-fs-sm); color: var(--w-fg); text-align: left; border-radius: var(--w-r-sm); cursor: pointer; }
.catRow:hover { background: var(--w-panel-2); }
.catRow i { display: block; height: 8px; min-width: 2px; background: linear-gradient(90deg, color-mix(in srgb, var(--w-gold) 50%, transparent), var(--w-gold)); }
.catRow b { text-align: right; font-weight: 500; }
.catOn { background: var(--w-panel-3); box-shadow: inset 2px 0 var(--w-gold); }
.tabLine { display: flex; align-items: center; gap: var(--w-s2); padding: 4px var(--w-pad); border-bottom: 1px solid var(--w-line); font-size: var(--w-fs-sm); min-width: 0; }
.clear { font-size: var(--w-fs-xs); color: var(--w-dim); text-decoration: underline; cursor: pointer; }
.synced { white-space: nowrap; flex: none; }
.picked { display: inline-flex; align-items: center; gap: 2px; white-space: nowrap; color: var(--w-gold); flex: none; }
.stripBox { position: relative; flex: 1 1 auto; min-width: 0; }
.strip { display: flex; gap: 3px; overflow: hidden; white-space: nowrap; }
.strip.fade { mask-image: linear-gradient(90deg, #000 calc(100% - 56px), transparent); -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 56px), transparent); }
.strip > * { flex: none; }
.ghost { visibility: hidden; }
.fadeHit { position: absolute; top: 0; right: 0; bottom: 0; width: 56px; cursor: pointer; }
.fadeHit:hover { background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--w-gold) 18%, transparent)); }
.tabLabels { display: flex; flex-wrap: wrap; gap: 3px; padding: 6px var(--w-pad); border-bottom: 1px solid var(--w-line); }
.tabLabel { display: inline-flex; align-items: baseline; gap: 5px; padding: 2px 8px; font-size: var(--w-fs-xs); color: var(--w-dim); background: var(--w-panel-2); border: 1px solid var(--w-line); border-top: 3px solid var(--tab-colour, var(--w-line)); border-radius: var(--w-r-sm) var(--w-r-sm) 0 0; cursor: pointer; white-space: nowrap; }
.tabLabel:hover { color: var(--w-fg); }
.tabOn { color: var(--w-fg); background: var(--w-panel-3); box-shadow: 0 0 0 1px var(--w-gold); }
.tabCount { font-family: var(--w-num); color: var(--w-faint); }
.chips { display: flex; gap: var(--w-s1); padding: 6px var(--w-pad); flex-wrap: wrap; align-items: center; border-bottom: 1px solid var(--w-line); }
.search { min-width: 150px; flex: 0 1 220px; }
.foot { display: flex; justify-content: space-between; gap: var(--w-s2); padding: 5px var(--w-pad); flex-wrap: wrap; }
</style>
