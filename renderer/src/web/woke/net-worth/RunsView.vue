<template>
  <div :class="$style.runs" data-runs-view>
    <!-- Start: a name, from the last read or the chart point you clicked. -->
    <section v-if="!live" :class="$style.start">
      <div :class="$style.row">
        <input id="run-name" v-model="name" class="w-input px-1 leading-6 rounded" :class="$style.name" placeholder="Start a run: name it, e.g. Nightmare maps" maxlength="40" aria-label="Run name" @keydown.enter="start">
        <WButton size="sm" :disabled="startAt == null || starting" :title="startTitle" @click="start">{{ starting ? 'Starting…' : 'Start' }}</WButton>
      </div>
      <div :class="$style.chips">
        <button v-for="n in pastNames" :key="n" type="button" :class="[$style.chip, { [$style.on]: n === name }]" @click="name = n">{{ n }}</button>
        <span class="w-dim text-xs" :class="$style.from">
          <template v-if="startAt == null">Refresh your stash once first</template>
          <template v-else-if="from != null">From {{ clock(startAt) }} · <button type="button" :class="$style.link" @click="$emit('clear-from')">use the last read</button></template>
          <template v-else>From {{ clock(startAt) }} <i class="fas fa-info-circle" :class="$style.info" title="The last stash read. To start earlier, click a point on the chart." /></template>
        </span>
      </div>
      <!-- The kit (pick K1): last time's per-map costs for this name, priced
           live where they came from the stash or poe.ninja. -->
      <div v-if="kit.length" :class="$style.kit" data-run-kit>
        <div :class="$style.kitHead"><span :class="$style.caps">Kit, per map</span><span class="w-dim w-num text-xs">{{ amount(kitPerMap) }}<Coin :chaos="!divine" /> a map · from your last {{ name.trim() || 'Run' }} run</span></div>
        <div v-for="c in kit" :key="c.id" :class="$style.kitRow" data-run-kit-line>
          <span v-item-tip="tipOf(c.key, c.name)" class="w-trunc">{{ c.qty !== 1 ? `${c.qty} × ` : '' }}{{ c.name }}</span>
          <span class="w-num text-xs">{{ amount(kitEach(c)) }}<Coin :chaos="!divine" /></span>
          <span :class="[$style.src, { [$style.on]: c.live }]" :title="c.live ? 'Follows the price while the run goes' : 'Your price, kept as typed'">{{ c.live ? 'live' : 'typed' }}</span>
          <button type="button" :class="$style.x" :aria-label="`Leave ${c.name} out of this run`" title="Not this run" @click="dropKit(c.id)"><i class="fas fa-times" /></button>
        </div>
      </div>
    </section>

    <!-- The run going now, or a finished one you opened (pick L1: in and out side by side). -->
    <section v-if="shownRun && totals" :class="$style.card" data-run-card>
      <div :class="$style.head">
        <span :class="$style.title" class="w-trunc">{{ shownRun.name }}</span>
        <span class="w-dim w-num text-xs">{{ clock(shownRun.startAt) }} → {{ shownRun.stoppedAt ? clock(shownRun.stoppedAt) : 'now' }} · {{ span(totals.ms) }} · {{ countLabel(totals.maps, totals.fights) }}</span>
        <WButton v-if="shownRun === live" size="sm" :disabled="faustusReading" :title="'Reads your stash one last time and your Faustus listings, then shows the summary'" @click="stop">{{ stopPhase === 'stash' ? 'Reading stash…' : stopPhase === 'listings' ? 'Stopping…' : 'Stop' }}</WButton>
        <span v-else :class="$style.headEnd">
          <span :class="$style.seg" role="group" aria-label="Show the run">
            <button type="button" :class="{ [$style.on]: showSummary }" :aria-pressed="showSummary" data-run-summary-tab @click="summaryId = shownRun.id">Summary</button>
            <button type="button" :class="{ [$style.on]: !showSummary }" :aria-pressed="!showSummary" data-run-details-tab @click="summaryId = null">Details</button>
          </span>
          <WButton size="sm" variant="ghost" @click="opened = null">Close</WButton>
        </span>
      </div>
      <div :class="$style.hero" class="w-num">
        <span :title="profitTitle"><span :class="$style.caps">Profit</span><b :class="[$style.big, tone(totals.profitChaos)]">{{ signed(totals.profitChaos) }}<Coin :chaos="!divine" /></b></span>
        <span :title="unit === 'map' ? undefined : 'Per map or boss fight'" data-run-per><span :class="$style.caps">Per {{ unit }} <span v-if="sample" :class="$style.small" :title="sampleText" data-run-small>small sample</span></span><b :class="tone(totals.perMapChaos)">{{ totals.perMapChaos != null ? signed(totals.perMapChaos) : '—' }}</b></span>
        <span :title="perHourTip"><span :class="$style.caps">Per hour</span><b :class="tone(perHour)">{{ perHour != null ? signed(perHour) : '—' }}</b></span>
        <span v-if="totals.faustusChaos" title="Profit plus what's at Faustus or held outside the stash" data-run-total><span :class="$style.caps">With Faustus</span><b :class="tone(totals.totalChaos)">{{ signed(totals.totalChaos) }}</b></span>
        <span v-if="totals.leftOutChaos" title="Long shots you left out. None of it counts" data-run-left-out><span :class="$style.caps">Left out</span><b class="w-dim">{{ amount(totals.leftOutChaos) }}</b></span>
      </div>
      <RunTimeBar :start-at="shownRun.startAt" :end="timeEnd" :maps="totals.runs" :unit="unit" @spent="spent = $event" />

      <!-- A stopped run's summary (pick W1 + T1): opens on Stop. -->
      <RunSummary v-if="showSummary && totals" :key="shownRun.id" :run="shownRun" :done="doc.done" :totals="totals" :per-hour="perHour" :spent="spent" :tips="tips" :divine="divine" :map-cost-keys="mapCostKeys" :league="league" @details="summaryId = null" />
      <div v-else :class="$style.cols">
        <!-- In: what came into the stash, and what you added. -->
        <div :class="$style.col" data-run-in>
          <div :class="$style.colHead"><span :class="$style.colTitle">In</span><span class="w-num w-up">{{ signed(inSum) }}<Coin :chaos="!divine" /></span></div>
          <RunRow v-for="r in rows.came.slice(0, cameShown)" :key="r.key" data-run-came :icon="r.line.icon" :name="r.line.name" :tip="tipOf(r.key, r.line.name, Math.abs(r.net))" :count="tallyCount(r)" :chaos="Math.abs(isOut(rowKey.tally(r.key)) ? r.netChaos : tallyVal(r))" sign="+" :divine="divine"
            :out="isOut(rowKey.tally(r.key))" :edited="isEdited(rowKey.tally(r.key))" @edit="editRow(rowKey.tally(r.key), $event)" @out="leaveOut(rowKey.tally(r.key), $event)" @reset="resetRow(rowKey.tally(r.key))" />
          <RunRow v-for="m in manualIn" :key="m.id" :icon="m.icon" :name="m.name" :tip="tipOf(m.key ?? null, m.name, m.count)" :count="m.count" :chaos="m.count * m.each" :each="m.each" sign="+" sub="added" :divine="divine" :can-leave-out="false" removable
            @edit="editManual(m.id, $event)" @remove="removeManual(m.id)" />
          <button v-if="rows.came.length > cameShown" type="button" :class="$style.link" class="text-xs" @click="cameShown += 15">+{{ rows.came.length - cameShown }} more</button>
          <div v-if="!rows.came.length && !manualIn.length" class="w-dim text-xs">Nothing yet</div>
          <RunAdd :names="itemNames" :lines="lines" :divine="divine" label="Add an item" @add="addManual('in', $event)" />
        </div>

        <!-- Out: costs you typed, and what the stash says was used up. -->
        <div :class="$style.col" data-run-out>
          <div :class="$style.colHead"><span :class="$style.colTitle">Out</span><span class="w-num w-down">{{ outSum > 0 ? '−' : '' }}{{ amount(outSum) }}<Coin :chaos="!divine" /></span>
            <span v-if="totals.costPerMapChaos != null" class="w-dim w-num text-xs" :title="`Typed costs, plus maps, scarabs and fragments used up, per ${unit === 'run' ? 'map or fight' : unit}`">{{ amount(totals.costPerMapChaos) }} a {{ unit }}</span></div>
          <RunRow v-for="c in shownRun.costs" :key="c.id" :name="c.name" :tip="tipOf(c.key, c.name)" :count="c.qty" :each="c.unitChaos" :chaos="lineCost(c, totals.runs)" sign="−" :sub="costSub(c)" :divine="divine" :bought="c.bought ?? null" :can-leave-out="false" removable data-run-cost
            @edit="editCost(c.id, $event)" @remove="removeCost(c.id)">
            <template #sub>
              <button v-if="shownRun === live || c.live" type="button" :class="[$style.chip, { [$style.on]: c.live }]" :disabled="shownRun !== live" :title="c.live ? (shownRun === live ? 'Follows the price at each stash read. Click to keep this price' : 'Was live; kept at its price at Stop') : 'Kept at your price. Click to follow the price at each stash read'" :aria-pressed="!!c.live" data-run-live @click="setLive(c, !c.live)">live</button>
            </template>
          </RunRow>
          <RunRow v-for="o in shownRun.once" :key="o.id" :name="o.name" :tip="tipOf(null, o.name)" :count="null" :chaos="o.chaos" sign="−" sub="once" :divine="divine" :editable="false" :can-leave-out="false" removable @remove="removeOnce(o.id)" />
          <RunRow v-for="m in manualOut" :key="m.id" :icon="m.icon" :name="m.name" :tip="tipOf(m.key ?? null, m.name, m.count)" :count="m.count" :chaos="m.count * m.each" :each="m.each" sign="−" sub="added" :divine="divine" :can-leave-out="false" removable
            @edit="editManual(m.id, $event)" @remove="removeManual(m.id)" />
          <RunRow v-for="r in rows.used.slice(0, usedShown)" :key="r.key" data-run-used :icon="r.line.icon" :name="r.line.name" :tip="tipOf(r.key, r.line.name, Math.abs(r.net))" :count="tallyCount(r)" :chaos="Math.abs(isOut(rowKey.tally(r.key)) ? r.netChaos : tallyVal(r))" sign="−" :divine="divine"
            :out="isOut(rowKey.tally(r.key))" :edited="isEdited(rowKey.tally(r.key))" @edit="editRow(rowKey.tally(r.key), $event)" @out="leaveOut(rowKey.tally(r.key), $event)" @reset="resetRow(rowKey.tally(r.key))" />
          <button v-if="rows.used.length > usedShown" type="button" :class="$style.link" class="text-xs" @click="usedShown += 15">+{{ rows.used.length - usedShown }} more</button>
          <RunAdd :names="itemNames" :lines="lines" :divine="divine" label="Add a cost" per-map :unit="unit" @add="addManual('out', $event)" @per-map="addPerMap" />
        </div>

        <!-- Faustus: listed and sold, not in your stash yet; items you hold. -->
        <div :class="$style.col" data-run-faustus>
          <div :class="$style.colHead"><span :class="$style.colTitle">Faustus</span><span class="w-num" :class="totals.faustusChaos ? 'w-up' : 'w-dim'">{{ signed(totals.faustusChaos) }}<Coin :chaos="!divine" /></span>
            <i class="fas fa-info-circle" :class="$style.info" :title="faustusInfo" /></div>
          <RunRow v-for="r in outside.listed.slice(0, listedShown)" :key="'l' + r.item.id" data-run-listed :icon="r.item.icon" :name="saleName(r.item)" :tip="saleTip(r.item)" :count="r.item.stack" :chaos="r.chaos" sign="+" :sub="listedSub(r.item)" :divine="divine"
            :out="r.leftOut" :edited="r.edited" @edit="editRow(rowKey.item(r.item.id), $event)" @out="leaveOut(rowKey.item(r.item.id), $event)" @reset="resetRow(rowKey.item(r.item.id))" />
          <RunRow v-for="h in outside.held" :key="'h' + h.item.id" data-run-held :icon="h.item.icon" :name="h.item.name" :tip="{ name: h.item.name, count: h.left }" :count="h.left" :chaos="h.chaos" :sign="h.carried ? '' : '+'" :sub="h.carried ? 'from last run' : 'held'" :divine="divine"
            :out="h.leftOut" :edited="h.edited" :editable="!h.carried" :can-leave-out="!h.carried" removable @edit="editRow(rowKey.held(h.item.id), $event)" @out="leaveOut(rowKey.held(h.item.id), $event)" @reset="resetRow(rowKey.held(h.item.id))" @remove="removeHeld(h.item.id, h.carried)" />
          <RunRow v-for="r in outside.sold.slice(0, soldShown)" :key="'s' + r.item.id" data-run-sold :icon="r.item.icon" :name="saleName(r.item)" :tip="saleTip(r.item)" :count="r.item.stack" :chaos="r.chaos" :sign="soldSign(r)" :divine="divine"
            :out="r.leftOut" :edited="r.edited" :editable="!r.before && !r.collected" :can-leave-out="!r.before" @edit="editRow(rowKey.item(r.item.id), $event)" @out="leaveOut(rowKey.item(r.item.id), $event)" @reset="resetRow(rowKey.item(r.item.id))">
            <template #sub>
              <span class="w-dim text-xs" :title="r.collected ? 'A stash read saw its currency come in' : 'Its currency isn\'t in your stash yet'">{{ r.collected ? 'collected' : 'sold' }}</span>
              <button type="button" :class="[$style.chip, { [$style.on]: r.before }]" :title="r.before ? 'From before the run: not its profit. Click: it is the run\'s' : 'The run\'s. Click if the item was from before the run'" :aria-pressed="r.before" @click="markBefore(r.item.id, !r.before)">before</button>
            </template>
          </RunRow>
          <button v-if="outside.listed.length > listedShown" type="button" :class="$style.link" class="text-xs" @click="listedShown += 15">+{{ outside.listed.length - listedShown }} more listed</button>
          <button v-if="outside.sold.length > soldShown" type="button" :class="$style.link" class="text-xs" @click="soldShown += 15">+{{ outside.sold.length - soldShown }} more sold</button>
          <div v-if="!outside.listed.length && !outside.held.length && !outside.sold.length" class="w-dim text-xs">Nothing listed or held</div>
          <div :class="$style.colFoot" class="w-dim text-xs">
            <span v-if="shownRun.faustus">Read {{ clock(shownRun.faustus.at) }}<template v-if="shownRun.faustus.more"> · newest 100</template></span>
            <span v-if="outside.unpriced">{{ outside.unpriced }} unpriced</span>
            <button v-if="shownRun === live" type="button" :class="$style.link" :disabled="faustusReading" title="One trade search on your account, plus a fetch per 10 listings" @click="readListings">{{ faustusReading ? 'Reading…' : 'Read now' }}</button>
            <span v-if="holdKey && shownRun === live">· hold an item: <WKbd :keys="holdKey" /></span>
          </div>
        </div>
      </div>
      <div v-if="shownRun.tallyPartial" class="w-dim text-xs">Started in the past: small items before Start may be missing <i class="fas fa-info-circle" :class="$style.info" title="Reads before you pressed Start keep only their biggest changes." /></div>
    </section>

    <!-- Finished runs compared (pick C2): one row a run, or by strategy. -->
    <section v-if="doc.done.length" :class="$style.past" data-past-runs>
      <div :class="$style.head">
        <span :class="$style.caps">Past runs</span>
        <span :class="$style.seg" role="group" aria-label="Show past runs">
          <button type="button" :class="{ [$style.on]: !byName }" :aria-pressed="!byName" @click="byName = false">Each run</button>
          <button type="button" :class="{ [$style.on]: byName }" :aria-pressed="byName" data-by-strategy @click="byName = true">By strategy</button>
        </span>
      </div>
      <div :class="$style.tableWrap">
        <table :class="$style.table" data-compare>
          <thead><tr>
            <th v-for="c in COLUMNS" :key="c.id" :class="{ [$style.num]: c.id !== 'new' }" :aria-sort="sortBy === c.id ? (c.id === 'cost' ? 'ascending' : 'descending') : undefined">
              <button type="button" :class="[$style.sortBtn, { [$style.on]: sortBy === c.id }]" :title="c.tip" @click="sortBy = c.id">{{ c.id === 'perMap' ? `Per ${pastUnit}` : c.label }}</button>
            </th>
            <th v-if="!byName" />
          </tr></thead>
          <tbody>
            <tr v-for="r in pastRows" :key="r.id" data-past-run :class="{ [$style.on]: !byName && opened === r.id }">
              <td>
                <button v-if="!byName" type="button" :class="$style.pastOpen" class="w-trunc" :title="`Open ${r.name}`" @click="openId(r.id)">{{ r.name }}</button>
                <span v-else class="w-trunc">{{ r.name }}</span>
                <div class="w-dim w-num text-xs">{{ byName ? `${r.count} ${r.count === 1 ? 'run' : 'runs'}` : day(r.startAt) }} · {{ span(r.ms) }}</div>
              </td>
              <td :class="$style.num" class="w-num">{{ countLabel(r.maps, r.fights) }}</td>
              <td :class="[$style.num, tone(r.profitChaos)]" class="w-num">{{ signed(r.profitChaos) }}</td>
              <td :class="[$style.num, tone(r.perMapChaos)]" class="w-num">{{ r.perMapChaos != null ? signed(r.perMapChaos) : '—' }}<span v-if="r.sample" :class="$style.small" :title="sampleTextOf(r.runs, r.profitChaos, r.top, r.sample, pastUnit)">small</span></td>
              <td :class="[$style.num, tone(r.perHourChaos)]" class="w-num">{{ r.perHourChaos != null ? signed(r.perHourChaos) : '—' }}</td>
              <td :class="$style.num" class="w-num w-dim">{{ r.costPerMapChaos != null ? amount(r.costPerMapChaos) : '—' }}</td>
              <td :class="[$style.num, tone(r.perMapNoTopChaos)]" class="w-num" :title="r.top ? `Per ${pastUnit} without ${r.top.name} (${amount(r.top.chaos)})` : undefined">
                {{ r.perMapNoTopChaos != null ? signed(r.perMapNoTopChaos) : '—' }}
              </td>
              <td v-if="!byName"><button type="button" :class="$style.x" :aria-label="`Delete ${r.name}`" title="Delete" @click="removeId(r.id)"><i class="fas fa-trash-alt" /></button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="w-dim text-xs">In {{ divine ? 'divines' : 'chaos' }}. Per hour: {{ leftOutText(rateTime()) }}.<template v-if="doc.done.length > pastRows.length && !byName"> · {{ doc.done.length - pastRows.length }} without totals</template></div>
    </section>
  </div>
</template>

<script setup lang="ts">
// Strategy runs (WOKEPOET-515), the Runs view of Net worth: start a run from
// the last read or a chart point, see profit since then with what got used
// up, type the costs the stash can't see, and look back at finished runs.
import { computed, defineAsyncComponent, onUnmounted, shallowRef, watch } from 'vue'
import { WButton, WKbd, toast, vItemTip } from '../ui'
import { AppConfig } from '@/web/Config'
import { NET_WORTH_TYPE, runHotkeyOf } from './widget'
import type { NetWorthWidget } from './widget'
import { formatAmount, nowMinute } from '../ui/format'
import { tipFor } from './tips'
import type { TipIndex } from './tips'
import { span } from './play-time'
import Coin from './Coin.vue'
import { compareRows, countLabel, isMapCostItem, leftOf, lineCost, mapsIn, runPerHour, runTotals, smallSample, sortCompare, tallyRows, tallyValue, topDrop, unitOf, SAMPLE_MIN_RUNS } from './runs'
import { kitPrice } from './run-kit'
import { leftOutText, RATE_TIME_WHERE } from '../shared/rate-time'
import { rateTime } from '../shared/rate-time-now'
import type { CompareSort, CostLine, ManualLine, Run, SmallSample, TallyRow, TopDrop } from './runs'
import RunRow from './RunRow.vue'
import RunAdd from './RunAdd.vue'
import type { AddedLine } from './RunAdd.vue'
import RunTimeBar from './RunTimeBar.vue'
import type { RunTime } from './run-time'
import { addCost, deleteRun, editRun, loadRuns, refreshRunMaps, runMaps, runsDoc, setOutside, stopPhase, summaryFor, SUMMARY_FOR_MS } from './run-store'
import { stopLiveRun } from './run-stop'
import { lastCostsOf, startRunAt } from './run-start'
import { outsideSums, outsideTotals, rowKey, setBefore, setEdit } from './faustus'
import type { OutsideRow } from './faustus'
import { readFaustus } from './faustus-read'
import { loadSales, ninjaEach, rates, sales } from './sales-store'
import { saleName } from './sales'
import type { Sale } from './sales'
import { saleTip } from './sale-tip'
import type { LedgerPoint } from './ledger'
import type { StashDiff, ValuedLine } from './valuation'

const props = defineProps<{
  league: string
  divine: number | null
  points: LedgerPoint[]
  diffs: StashDiff[]
  lines: ValuedLine[]
  tips: TipIndex
  // A chart point you clicked "Start run here" on (null: the last read).
  from: number | null
}>()
defineEmits<{ 'clear-from': [] }>()

watch(() => props.league, (l) => { loadRuns(l).catch(() => {}); loadSales(l).catch(() => {}) }, { immediate: true })
const doc = runsDoc
const live = computed(() => doc.value.live?.league === props.league ? doc.value.live : null)
const opened = shallowRef<string | null>(null)
const shownRun = computed<Run | null>(() => (opened.value ? doc.value.done.find(r => r.id === opened.value) : null) ?? live.value)
watch(() => [shownRun.value?.id, shownRun.value?.stoppedAt], () => { refreshRunMaps(shownRun.value).catch(() => {}) }, { immediate: true })
// The summary (pick W1): its own chunk, loaded when a run stops or you ask.
const RunSummary = defineAsyncComponent(() => import('./RunSummary.vue'))
const summaryId = shallowRef<string | null>(null)
const showSummary = computed(() => shownRun.value?.stoppedAt != null && summaryId.value === shownRun.value.id)
// A run that just stopped (here or from the dock card): open its summary.
watch([summaryFor, () => doc.value.done], ([want]) => {
  if (!want) return
  if (Date.now() - want.at > SUMMARY_FOR_MS) { summaryFor.value = null; return }
  if (!doc.value.done.some(r => r.id === want.id)) return
  opened.value = want.id
  summaryId.value = want.id
  summaryFor.value = null
}, { immediate: true })
// New maps: read again with each new chart point (a read lands after maps).
watch(() => props.points.length, () => { if (shownRun.value && !shownRun.value.stoppedAt) refreshRunMaps(shownRun.value).catch(() => {}) })

// ---------- numbers ----------
const toDiv = (chaos: number) => props.divine ? chaos / props.divine : chaos
const amount = (chaos: number) => { const d = toDiv(chaos); return Math.abs(d) >= 100 ? formatAmount(d) : d.toFixed(Math.abs(d) < 1 && props.divine ? 2 : 1) }
const signed = (chaos: number) => `${chaos > 0 ? '+' : chaos < 0 ? '−' : ''}${amount(Math.abs(chaos))}`
const tone = (n: number | null | undefined) => n == null || Math.abs(n) < 0.05 ? '' : n > 0 ? 'w-up' : 'w-down'
const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const day = (ms: number) => new Date(ms).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + clock(ms)
const tipOf = (key: string | null, name: string, count?: number) => tipFor(props.tips, key, name, count)

// Faustus listings and sales the stash hasn't seen (faustus.ts).
const noOutside = outsideTotals({ startAt: 0 }, [], {})
const outside = computed(() => shownRun.value ? outsideTotals(shownRun.value, sales.value, rates.value) : noOutside)
setOutside(r => outsideSums(outsideTotals(r, sales.value, rates.value)))
onUnmounted(() => setOutside(null))
const listedShown = shallowRef(8)
const soldShown = shallowRef(8)
const DAY = 86_400_000
const stale = (l: Sale) => nowMinute.value - l.at > DAY
const ninjaOf = (l: Sale) => { const each = ninjaEach(l); return each != null ? each * l.stack : null }
// From before: off profit once collected. The run's: in Faustus until collected.
const soldSign = (r: OutsideRow): '+' | '−' | '' => r.before ? (r.collected ? '−' : '') : (r.collected ? '' : '+')
function markBefore (id: string, before: boolean) { edit(r => setBefore(r, id, before)) }
const listedSub = (l: Sale) => {
  const ninja = stale(l) ? ninjaOf(l) : null
  return `listed ${clock(l.at)}${stale(l) ? ` · ninja ${ninja != null ? amount(ninja) : '—'}` : ''}`
}
const faustusInfo = 'Listed at Faustus during the run (your asking price), sold but not collected yet, and items you hold. Profit counts a sale once its currency is in your stash.'

// ---------- your edits (L1): leave out, count and price, added by hand ----------
const editOf = (key: string) => shownRun.value?.edits?.[key]
const isOut = (key: string) => editOf(key)?.out === true
const isEdited = (key: string) => { const e = editOf(key); return e != null && (e.count != null || e.each != null) }
function leaveOut (key: string, out: boolean) { edit(r => setEdit(r, key, { out })) }
function editRow (key: string, v: { count?: number, each?: number }) { edit(r => setEdit(r, key, { ...(v.count != null ? { count: v.count } : {}), ...(v.each != null ? { each: v.each } : {}) })) }
function resetRow (key: string) { edit(r => setEdit(r, key, { count: undefined, each: undefined })) }
const tallyVal = (r: TallyRow) => tallyValue(r.line, editOf(rowKey.tally(r.key)))
const tallyCount = (r: TallyRow) => editOf(rowKey.tally(r.key))?.count ?? Math.abs(r.net)
const manualIn = computed(() => (shownRun.value?.manual ?? []).filter(m => m.side === 'in'))
const manualOut = computed(() => (shownRun.value?.manual ?? []).filter(m => m.side === 'out'))
let manualSeq = 0
function addManual (side: 'in' | 'out', l: AddedLine) {
  const m: ManualLine = { id: `m${Date.now().toString(36)}${(manualSeq++).toString(36)}`, name: l.name, key: l.key, ...(l.icon ? { icon: l.icon } : {}), count: l.count, each: l.each, side }
  edit(r => ({ ...r, manual: [...(r.manual ?? []), m] }))
}
function editManual (id: string, v: { count?: number, each?: number }) { edit(r => ({ ...r, manual: (r.manual ?? []).map(m => m.id === id ? { ...m, count: v.count ?? m.count, each: v.each ?? m.each } : m) })) }
function removeManual (id: string) { edit(r => ({ ...r, manual: (r.manual ?? []).filter(m => m.id !== id) })) }
const inSum = computed(() => rows.value.came.reduce((s, r) => s + Math.max(0, tallyVal(r)), 0) + manualIn.value.reduce((s, m) => s + m.count * m.each, 0))
const outSum = computed(() => {
  const r = shownRun.value
  const t = totals.value
  if (!r || !t) return 0
  return t.costChaos + t.onceChaos + manualOut.value.reduce((s, m) => s + m.count * m.each, 0) + rows.value.used.reduce((s, x) => s + Math.max(0, -tallyVal(x)), 0)
})
const costSub = (c: CostLine) => {
  const left = totals.value ? leftOf(c, totals.value.runs) : null
  return `${c.qty} a ${unit.value}${left != null ? ` · ${left} left` : ''}`
}
const profitTitle = computed(() => {
  const t = totals.value
  if (!t) return ''
  const parts = [`Stash change ${signed(t.stashChaos)}`]
  if (t.costChaos) parts.push(`typed costs −${amount(t.costChaos)}`)
  if (t.onceChaos) parts.push(`once-off −${amount(t.onceChaos)}`)
  if (t.takenOverChaos) parts.push(`typed items' stash change ${signed(-t.takenOverChaos)}`)
  if (t.beforeChaos) parts.push(`sold from before the run −${amount(t.beforeChaos)}`)
  if (t.editChaos) parts.push(`your edits ${signed(t.editChaos)}`)
  if (t.manualChaos) parts.push(`added by hand ${signed(t.manualChaos)}`)
  if (outside.value.leftOutCollectedChaos) parts.push(`left-out sales collected −${amount(outside.value.leftOutCollectedChaos)}`)
  return parts.join(', ') + '. Profit counts from each stash read.'
})

// ---------- time (Client.txt) and per hour ----------
const netWorthWidget = () => AppConfig().widgets.find(x => x.wmType === NET_WORTH_TYPE) as NetWorthWidget | undefined
const spent = shallowRef<RunTime | null>(null)
watch(() => shownRun.value?.id, () => { spent.value = null })
const timeEnd = computed(() => shownRun.value?.stoppedAt ?? props.points[props.points.length - 1]?.at ?? nowMinute.value)
// Over the time the Per hour setting counts (shared/rate-time.ts), up to the
// last read or Stop; the clock without Client.txt.
const perHour = computed(() => {
  const t = totals.value
  const r = shownRun.value
  if (!t || !r) return null
  const clock = r.stoppedAt == null ? Math.max(0, (props.points[props.points.length - 1]?.at ?? r.startAt) - r.startAt) : Math.max(0, r.stoppedAt - r.startAt)
  return runPerHour(t.profitChaos, clock, spent.value?.ms, rateTime())
})
const perHourTip = computed(() => spent.value ? `Per hour, ${leftOutText(rateTime())}. ${RATE_TIME_WHERE}` : 'Per hour of the whole run: Client.txt not read')
const holdKey = computed(() => { const w = netWorthWidget(); return w ? runHotkeyOf(w) : null })
function removeHeld (id: string, carried: boolean) {
  edit(r => carried ? { ...r, carried: (r.carried ?? []).filter(h => h.id !== id) } : { ...r, held: (r.held ?? []).filter(h => h.id !== id) })
}
const faustusReading = shallowRef(false)
async function readFaustusInto (r: Run): Promise<void> {
  const read = await readFaustus(props.league, r.startAt)
  await editRun(props.league, r.id, x => ({ ...x, faustus: read }), props.points, props.divine)
}
async function readListings () {
  const r = shownRun.value
  if (!r || faustusReading.value) return
  faustusReading.value = true
  try { await readFaustusInto(r) } catch (e) { toast(`Couldn't read your Faustus listings: ${(e as Error).message}`) } finally { faustusReading.value = false }
}

// Map-cost items: maps, scarabs and fragments (for cost per map).
// The tally marks them itself (runs.ts TallyLine.cost); this covers runs
// tallied before it did.
const mapCostKeys = computed(() => new Set(props.lines.filter(l => isMapCostItem(l.name, l.category)).map(l => l.key)))
const totals = computed(() => {
  const r = shownRun.value
  if (!r) return null
  const now = Math.max(nowMinute.value, props.points[props.points.length - 1]?.at ?? 0)
  // Boss fights (Client.txt) count like maps: per map is per map or fight.
  return runTotals(r, props.points, { maps: mapsIn(r, runMaps.value, now), fights: spent.value?.fights ?? r.final?.fights ?? 0 }, now, mapCostKeys.value, outside.value)
})
const unit = computed(() => totals.value ? unitOf(totals.value.maps, totals.value.fights) : 'map')
// Small sample (pick S1): few maps, or one drop over half the profit.
const top = computed(() => shownRun.value ? topDrop(shownRun.value) : null)
const sample = computed(() => totals.value ? smallSample(totals.value.runs, totals.value.profitChaos, top.value) : null)
function sampleTextOf (runs: number, profit: number, t: TopDrop | null, s: SmallSample, one: string = unit.value): string {
  const u = one === 'run' ? 'maps and fights' : `${one}s`
  const parts: string[] = []
  if (s.few) parts.push(`Only ${runs} ${u}: per ${one} can swing a lot. Over ${SAMPLE_MIN_RUNS} reads steadier.`)
  if (s.share != null && t) parts.push(`One drop (${t.name}, ${amount(t.chaos)}) is ${Math.round(s.share * 100)}% of the profit.`)
  if (t && runs > 0) parts.push(`Without it: ${signed((profit - t.chaos) / runs)} a ${one}.`)
  return parts.join(' ')
}
const sampleText = computed(() => totals.value && sample.value ? sampleTextOf(totals.value.runs, totals.value.profitChaos, top.value, sample.value) : '')
const rows = computed(() => shownRun.value ? tallyRows(shownRun.value) : { used: [], came: [] })
const usedShown = shallowRef(8)
const cameShown = shallowRef(8)
watch(() => shownRun.value?.id, () => { usedShown.value = 8; cameShown.value = 8; listedShown.value = 8; soldShown.value = 8 })

// ---------- start ----------
const name = shallowRef('')
const pastNames = computed(() => [...new Set(doc.value.done.map(r => r.name))].filter(n => n !== 'Run').slice(0, 6))
const lastPoint = computed(() => props.points[props.points.length - 1]?.at ?? null)
const startAt = computed(() => props.from ?? lastPoint.value)
const startTitle = 'Reads your Faustus listings (one trade search): what is listed now is from before the run'

// The kit (pick K1): the costs typed for the same name last time come along,
// less the ones you take off before Start.
const lastCosts = computed<CostLine[]>(() => lastCostsOf(name.value))
const dropped = shallowRef<string[]>([])
watch(name, () => { dropped.value = [] })
const kit = computed(() => lastCosts.value.filter(c => !dropped.value.includes(c.id)))
const livePrice = computed(() => kitPrice(props.lines))
const kitEach = (c: CostLine) => c.live ? (livePrice.value(c.key, c.name) ?? c.unitChaos) : c.unitChaos
const kitPerMap = computed(() => kit.value.reduce((s, c) => s + Math.max(0, c.qty) * kitEach(c), 0))
function dropKit (id: string) { dropped.value = [...dropped.value, id] }
// Start reads your Faustus listings (run-start.ts). A failed read still starts.
const starting = shallowRef(false)
async function start () {
  const at = startAt.value
  if (at == null || starting.value) return
  // What the run starts from, as it is now (the read can take a while).
  const { league, diffs, points, divine } = props
  starting.value = true
  try { await startRunAt(league, name.value, at, diffs, points, divine, kit.value, livePrice.value) } catch {} finally { starting.value = false }
  name.value = ''
  dropped.value = []
}
// Stop reads your Faustus listings first; a failed read still stops.
// The run stops at the press, whatever the read takes.
async function stop () {
  if (!live.value || faustusReading.value) return
  faustusReading.value = true
  try { await stopLiveRun(props.league, () => props.points, props.divine) } catch {} finally { faustusReading.value = false }
}
function openId (id: string) {
  opened.value = opened.value === id ? null : id
}
function removeId (id: string) {
  const r = doc.value.done.find(x => x.id === id)
  if (!r) return
  if (opened.value === id) opened.value = null
  deleteRun(props.league, id).catch(() => {})
  toast(`Deleted ${r.name}`)
}

// ---------- past runs compared (pick C2) ----------
const COLUMNS: Array<{ id: CompareSort, label: string, tip: string }> = [
  { id: 'new', label: 'Run', tip: 'Newest first' },
  { id: 'maps', label: 'Maps', tip: 'Most maps and boss fights first' },
  { id: 'profit', label: 'Profit', tip: 'Biggest profit first' },
  { id: 'perMap', label: 'Per map', tip: 'Best per map or fight first' },
  { id: 'perHour', label: 'Per hour', tip: 'Best per hour first' },
  { id: 'cost', label: 'Cost', tip: 'Cost a map: typed costs plus maps, scarabs and fragments used up. Cheapest first' },
  { id: 'noTop', label: 'No top', tip: 'Per map without the single biggest drop. Best first' }
]
const byName = shallowRef(false)
const sortBy = shallowRef<CompareSort>('new')
const pastRows = computed(() => sortCompare(compareRows(doc.value.done, rateTime(), byName.value), sortBy.value))
const pastUnit = computed(() => pastRows.value.some(r => r.fights > 0) ? (pastRows.value.some(r => r.maps > 0) ? 'run' : 'fight') : 'map')

// ---------- costs ----------
function edit (fn: (r: Run) => Run) {
  const r = shownRun.value
  if (!r) return
  editRun(props.league, r.id, fn, props.points, props.divine).catch(() => {})
}
function setCost (id: string, patch: Partial<CostLine>) {
  edit(r => ({ ...r, costs: r.costs.map(c => { if (c.id !== id) return c; const n = { ...c, ...patch }; if (n.bought == null) delete n.bought; if (!n.live) delete n.live; return n }) }))
}
function editCost (id: string, v: { count?: number, each?: number, bought?: number | null }) {
  // A typed price pins the line (it no longer follows the price).
  const was = shownRun.value?.costs.find(c => c.id === id)
  const priced = v.each != null && (was == null || Math.abs(v.each - was.unitChaos) > 1e-6)
  setCost(id, { ...(v.count != null ? { qty: v.count } : {}), ...(v.each != null ? { unitChaos: v.each } : {}), ...(priced ? { live: undefined } : {}), ...(v.bought !== undefined ? { bought: v.bought ?? undefined } : {}) })
}
function setLive (c: CostLine, on: boolean) {
  if (on) {
    const p = livePrice.value(c.key, c.name)
    setCost(c.id, { live: true, ...(p != null && p > 0 ? { unitChaos: p } : {}) })
  } else setCost(c.id, { live: undefined })
}
function removeCost (id: string) { edit(r => ({ ...r, costs: r.costs.filter(c => c.id !== id) })) }
function removeOnce (id: string) { edit(r => ({ ...r, once: r.once.filter(o => o.id !== id) })) }

const itemNames = computed(() => [...new Set([...Object.values(shownRun.value?.tally ?? {}).map(t => t.name), ...props.lines.map(l => l.name)])].slice(0, 400))
function addPerMap (l: AddedLine) {
  edit(r => addCost(r, { key: l.key, name: l.name, qty: l.count, unitChaos: l.each, ...(l.live ? { live: true as const } : {}) }))
}
</script>

<style module>
.runs { display: flex; flex-direction: column; gap: var(--w-s3); min-width: 0; }
.start, .card, .past { display: flex; flex-direction: column; gap: var(--w-s2); min-width: 0; }
.card { border: 1px solid var(--w-line); padding: var(--w-s2) var(--w-s3); gap: var(--w-s3); }
.head { display: flex; align-items: baseline; gap: var(--w-s2); min-width: 0; }
.head > :last-child:not(:first-child) { margin-left: auto; }
.headEnd { display: flex; align-items: center; gap: var(--w-s2); }
.title { font-family: var(--w-caps-face); font-weight: 600; color: var(--w-gold); min-width: 0; }
.caps { font-family: var(--w-caps-face); text-transform: var(--w-caps-case); font-size: var(--w-fs-caps); color: var(--w-dim); }
.row { display: flex; gap: var(--w-s2); align-items: center; }
.name { flex: 1; min-width: 0; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.chip { border: 1px solid var(--w-line); background: none; color: inherit; padding: 0 6px; font: inherit; font-size: var(--w-fs-xs); cursor: pointer; }
.chip.on, .chip:hover { border-color: var(--w-gold); color: var(--w-gold); }
.from { margin-left: auto; }
.link { background: none; border: 0; padding: 0; color: var(--w-accent); cursor: pointer; font: inherit; align-self: flex-start; }
.link:hover { text-decoration: underline; }
.info { color: var(--w-dim); font-size: var(--w-fs-xs); cursor: help; }
.hero { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--w-s2) calc(var(--w-s3) * 2); }
.hero > span { display: flex; flex-direction: column; }
.hero b { font-weight: 500; font-size: calc(15px * var(--w-text-scale, 1)); }
.hero b.big { font-size: calc(24px * var(--w-text-scale, 1)); line-height: 1.1; }
.cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: var(--w-s2) calc(var(--w-s3) * 1.5); align-items: start; }
.col { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.colHead { display: flex; align-items: baseline; gap: var(--w-s2); border-bottom: 1px solid var(--w-line-strong); padding-bottom: 2px; margin-bottom: 2px; }
.colTitle { font-family: var(--w-caps-face); text-transform: var(--w-caps-case); color: var(--w-gold); margin-right: auto; }
.colFoot { display: flex; flex-wrap: wrap; gap: 2px 8px; align-items: center; margin-top: 4px; }
.x { background: none; border: 0; color: var(--w-dim); cursor: pointer; padding: 0; }
.x:hover { color: var(--w-down); }
.kit { display: flex; flex-direction: column; gap: 2px; border-left: 2px solid var(--w-line-strong); padding-left: var(--w-s2); }
.kitHead { display: flex; align-items: baseline; gap: var(--w-s2); }
.kitRow { display: grid; grid-template-columns: minmax(0, 1fr) auto auto 1rem; gap: var(--w-s2); align-items: baseline; font-size: var(--w-fs-sm); }
.src { font-size: var(--w-fs-xs); border: 1px solid var(--w-line); color: var(--w-dim); padding: 0 4px; }
.src.on { border-color: var(--w-gold); color: var(--w-gold); }
.small { font-family: inherit; text-transform: none; font-size: var(--w-fs-xs); border: 1px solid var(--w-gold); color: var(--w-gold); padding: 0 4px; margin-left: 4px; cursor: help; white-space: nowrap; }
.seg { display: inline-flex; border: 1px solid var(--w-line); }
.seg button { background: none; border: 0; color: var(--w-dim); font: inherit; font-size: var(--w-fs-xs); padding: 0 8px; cursor: pointer; }
.seg button.on { background: var(--w-line-strong); color: var(--w-gold); }
.tableWrap { overflow-x: auto; min-width: 0; }
.table { width: 100%; border-collapse: collapse; font-size: var(--w-fs-sm); }
.table th { font-weight: normal; text-align: left; border-bottom: 1px solid var(--w-line-strong); padding: 2px 4px; white-space: nowrap; }
.table td { border-bottom: 1px solid var(--w-line); padding: 2px 4px; vertical-align: top; }
.table td:first-child { max-width: 14rem; }
.table .num { text-align: right; white-space: nowrap; }
.table tr.on .pastOpen { color: var(--w-gold); }
.sortBtn { background: none; border: 0; padding: 0; font: inherit; font-size: var(--w-fs-xs); color: var(--w-dim); cursor: pointer; font-family: var(--w-caps-face); text-transform: var(--w-caps-case); }
.sortBtn.on, .sortBtn:hover { color: var(--w-gold); }
.pastOpen { background: none; border: 0; padding: 0; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.pastOpen:hover { color: var(--w-gold); }
</style>
