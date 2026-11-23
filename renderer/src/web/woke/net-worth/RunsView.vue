<template>
  <div :class="$style.runs" data-runs-view>
    <!-- Start: a name, from the last read or the chart point you clicked. -->
    <section v-if="!live" :class="$style.start">
      <div :class="$style.head"><span :class="$style.caps">Start a run</span></div>
      <div :class="$style.row">
        <input id="run-name" v-model="name" class="w-input px-1 leading-6 rounded" :class="$style.name" placeholder="Name, e.g. Nightmare maps" maxlength="40" aria-label="Run name" @keydown.enter="start">
        <WButton size="sm" :disabled="startAt == null" @click="start">Start</WButton>
      </div>
      <div v-if="pastNames.length" :class="$style.chips">
        <button v-for="n in pastNames" :key="n" type="button" :class="[$style.chip, { [$style.on]: n === name }]" @click="name = n">{{ n }}</button>
      </div>
      <div class="w-dim text-xs">
        <template v-if="startAt == null">Refresh your stash once: a run starts from a read.</template>
        <template v-else-if="from != null">From the read at {{ clock(startAt) }}. <button type="button" :class="$style.link" @click="$emit('clear-from')">Use the last read</button></template>
        <template v-else>From the last read, {{ clock(startAt) }}. To start earlier, click a point on the chart.</template>
      </div>
      <div v-if="lastCosts.length" class="w-dim text-xs">Keeps the costs you typed for "{{ name.trim() }}" last time.</div>
    </section>

    <!-- The run going now, or a finished one you opened. -->
    <section v-if="shownRun && totals" :class="$style.card" data-run-card>
      <div :class="$style.head">
        <span :class="$style.title" class="w-trunc">{{ shownRun.name }}</span>
        <span class="w-dim w-num text-xs">{{ clock(shownRun.startAt) }} → {{ shownRun.stoppedAt ? clock(shownRun.stoppedAt) : 'now' }} · {{ span(totals.ms) }} · {{ totals.maps }} {{ totals.maps === 1 ? 'map' : 'maps' }}</span>
        <WButton v-if="shownRun === live" size="sm" @click="stop">Stop</WButton>
        <WButton v-else size="sm" variant="ghost" @click="opened = null">Close</WButton>
      </div>
      <div :class="$style.stats" class="w-num">
        <b :class="[$style.big, tone(totals.profitChaos)]" :title="inChaos(totals.profitChaos)">{{ signed(totals.profitChaos) }}<Coin :chaos="!divine" /></b>
        <span><span :class="$style.caps">Per map</span> <span :class="tone(totals.perMapChaos)">{{ totals.perMapChaos != null ? signed(totals.perMapChaos) : '—' }}</span><Coin v-if="totals.perMapChaos != null" :chaos="!divine" /></span>
        <span><span :class="$style.caps">Per hour</span> <span :class="tone(totals.perHourChaos)">{{ totals.perHourChaos != null ? signed(totals.perHourChaos) : '—' }}</span><Coin v-if="totals.perHourChaos != null" :chaos="!divine" /></span>
        <span title="Typed costs, plus what the stash says was used up of maps, scarabs and fragments, per map"><span :class="$style.caps">Cost / map</span> {{ totals.costPerMapChaos != null ? amount(totals.costPerMapChaos) : '—' }}<Coin v-if="totals.costPerMapChaos != null" :chaos="!divine" /></span>
      </div>

      <div :class="$style.sum" class="w-num text-xs">
        <span>Stash change <b :class="tone(totals.stashChaos)">{{ signed(totals.stashChaos) }}<Coin :chaos="!divine" /></b></span>
        <span v-if="totals.costChaos">Typed costs <b class="w-down">−{{ amount(totals.costChaos) }}<Coin :chaos="!divine" /></b></span>
        <span v-if="totals.takenOverChaos" title="The stash change of items with a typed cost: their typed cost counts instead">Typed items' stash change left out <b>{{ signed(-totals.takenOverChaos) }}<Coin :chaos="!divine" /></b></span>
        <span v-if="totals.onceChaos">Once-off <b class="w-down">−{{ amount(totals.onceChaos) }}<Coin :chaos="!divine" /></b></span>
      </div>

      <!-- Costs the stash can't see (C1): per map at your price, a batch bought up front. -->
      <div :class="$style.block">
        <div :class="$style.blockHead"><span :class="$style.caps">Costs the stash can't see</span><span class="w-dim text-xs">Maps bought into your inventory, a few chaos a map. A typed item's stash change stops counting. Maps bought into a stash tab during the run are already counted: don't type them too.</span></div>
        <div v-for="c in shownRun.costs" :key="c.id" :class="$style.cost">
          <span v-item-tip="tipOf(c.key, c.name)" class="w-trunc">{{ c.name }}</span>
          <label :class="$style.field">× <input :value="c.qty" type="number" min="0" step="1" class="w-input px-1 rounded" :class="$style.num" :aria-label="`${c.name} per map`" @change="setCost(c.id, { qty: num($event, c.qty) })"> a map</label>
          <label :class="$style.field">at <input :value="round4(toUnit(c.unitChaos, costUnit(c.id)))" type="number" min="0" step="any" class="w-input px-1 rounded" :class="$style.num" :aria-label="`${c.name} price each`" @change="setCost(c.id, { unitChaos: fromUnit(num($event, 0), costUnit(c.id)) })"><button type="button" :class="$style.unit" :title="'Price in ' + (costUnit(c.id) === 'c' ? 'chaos' : 'divines') + '. Click to switch'" @click="flipUnit(c.id)">{{ costUnit(c.id) }}</button></label>
          <label :class="$style.field" title="How many you bought up front (optional): the run shows how many are left">bought <input :value="c.bought ?? ''" type="number" min="0" step="1" class="w-input px-1 rounded" :class="$style.num" :aria-label="`${c.name} bought`" @change="setCost(c.id, { bought: optNum($event) })"></label>
          <span class="w-num text-xs" :class="$style.right">
            <template v-if="leftOf(c, totals.maps) != null"><span :class="leftOf(c, totals.maps) === 0 ? 'w-down' : 'w-dim'">{{ leftOf(c, totals.maps) }} left</span> · </template>
            <span :class="lineCost(c, totals.maps) > 0 ? 'w-down' : 'w-dim'">{{ lineCost(c, totals.maps) > 0 ? '−' : '' }}{{ amount(lineCost(c, totals.maps)) }}</span><Coin :chaos="!divine" />
          </span>
          <button type="button" :class="$style.x" :aria-label="`Remove ${c.name}`" title="Remove" @click="removeCost(c.id)"><i class="fas fa-times" /></button>
        </div>
        <div v-for="o in shownRun.once" :key="o.id" :class="$style.cost">
          <span class="w-trunc" data-no-item-tip="a typed once-off cost, not an item">{{ o.name }}</span>
          <span class="w-dim text-xs">once</span><span /><span />
          <span class="w-num text-xs w-down" :class="$style.right">−{{ amount(o.chaos) }}<Coin :chaos="!divine" /></span>
          <button type="button" :class="$style.x" :aria-label="`Remove ${o.name}`" title="Remove" @click="removeOnce(o.id)"><i class="fas fa-times" /></button>
        </div>
        <div :class="$style.add">
          <input id="run-cost-name" v-model="newName" list="run-cost-items" class="w-input px-1 leading-6 rounded" :class="$style.name" placeholder="Add a cost: item name" aria-label="Cost item">
          <datalist id="run-cost-items"><option v-for="n in itemNames" :key="n" :value="n" /></datalist>
          <WButton size="sm" :disabled="!newName.trim()" title="Taken off for every map, at poe.ninja's price (change it after)" @click="addPerMap">Per map</WButton>
          <label :class="$style.field">or once <input id="run-once-amount" v-model.number="onceAmount" type="number" min="0" step="any" class="w-input px-1 rounded" :class="$style.num" aria-label="Once-off amount"><button type="button" :class="$style.unit" @click="onceUnit = onceUnit === 'c' ? 'd' : 'c'">{{ onceUnit }}</button></label>
          <WButton size="sm" :disabled="!newName.trim() || !(onceAmount > 0)" @click="addOnceCost">Once</WButton>
        </div>
      </div>

      <div :class="$style.lists">
        <div>
          <div :class="$style.blockHead"><span :class="$style.caps">Used up</span><span class="w-dim text-xs">From the stash</span></div>
          <div v-for="r in rows.used.slice(0, usedShown)" :key="r.key" :class="$style.line">
            <img v-if="r.line.icon" :src="r.line.icon" alt="" :class="$style.icon"><span v-else :class="$style.icon" />
            <span v-item-tip="tipOf(r.key, r.line.name, Math.abs(r.net))" class="w-trunc">{{ r.net ? `${fmt(Math.abs(r.net))} × ` : '' }}{{ r.line.name }}</span>
            <span class="w-num w-down" :title="inChaos(r.netChaos)">−{{ amount(-r.netChaos) }}<Coin :chaos="!divine" /></span>
          </div>
          <button v-if="rows.used.length > usedShown" type="button" :class="$style.link" class="text-xs" @click="usedShown += 10">+{{ rows.used.length - usedShown }} more</button>
          <div v-if="!rows.used.length" class="w-dim text-xs">Nothing yet</div>
        </div>
        <div>
          <div :class="$style.blockHead"><span :class="$style.caps">Came in</span></div>
          <div v-for="r in rows.came.slice(0, cameShown)" :key="r.key" :class="$style.line">
            <img v-if="r.line.icon" :src="r.line.icon" alt="" :class="$style.icon"><span v-else :class="$style.icon" />
            <span v-item-tip="tipOf(r.key, r.line.name, Math.abs(r.net))" class="w-trunc">{{ r.net ? `${fmt(Math.abs(r.net))} × ` : '' }}{{ r.line.name }}</span>
            <span class="w-num w-up" :title="inChaos(r.netChaos)">+{{ amount(r.netChaos) }}<Coin :chaos="!divine" /></span>
          </div>
          <button v-if="rows.came.length > cameShown" type="button" :class="$style.link" class="text-xs" @click="cameShown += 10">+{{ rows.came.length - cameShown }} more</button>
          <div v-if="!rows.came.length" class="w-dim text-xs">Nothing yet</div>
        </div>
      </div>
      <div v-if="shownRun.tallyPartial" class="w-dim text-xs">Started in the past: reads before you pressed Start keep only their biggest changes, so these lists may miss small items<template v-if="shownRun.costs.some(c => c.key)">, and a typed item's stash change may not all be left out</template>.</div>
      <div class="w-dim text-xs">Profit counts from each stash read. Purchases count as in the rest of Net worth: buy maps into a read tab, or type their cost here.</div>
    </section>

    <!-- Finished runs, newest first. -->
    <section v-if="doc.done.length" :class="$style.past">
      <div :class="$style.head"><span :class="$style.caps">Past runs</span></div>
      <div v-for="r in doc.done.slice(0, pastShown)" :key="r.id" data-past-run :class="[$style.pastRow, { [$style.on]: opened === r.id }]">
        <button type="button" :class="$style.pastOpen" class="w-trunc" :title="`Open ${r.name}`" @click="open(r)">{{ r.name }}</button>
        <span class="w-dim w-num text-xs">{{ day(r.startAt) }} · {{ span((r.stoppedAt ?? r.startAt) - r.startAt) }}<template v-if="r.final"> · {{ r.final.maps }} {{ r.final.maps === 1 ? 'map' : 'maps' }}</template></span>
        <span class="w-num text-xs" :class="r.final ? tone(r.final.profitChaos) : 'w-dim'"><template v-if="r.final">{{ signed(r.final.profitChaos) }}<Coin :chaos="!divine" /><template v-if="r.final.perMapChaos != null"> · {{ signed(r.final.perMapChaos) }}/map</template></template></span>
        <button type="button" :class="$style.x" :aria-label="`Delete ${r.name}`" title="Delete" @click="remove(r)"><i class="fas fa-trash-alt" /></button>
      </div>
      <button v-if="doc.done.length > pastShown" type="button" :class="$style.link" class="text-xs" @click="pastShown += 10">Show older ({{ doc.done.length - pastShown }})</button>
    </section>
  </div>
</template>

<script setup lang="ts">
// Strategy runs (WOKEPOET-515), the Runs view of Net worth: start a run from
// the last read or a chart point, see profit since then with what got used
// up, type the costs the stash can't see, and look back at finished runs.
import { computed, shallowRef, watch } from 'vue'
import { WButton, vItemTip, toast } from '../ui'
import { formatAmount, nowMinute } from '../ui/format'
import { tipFor } from './tips'
import type { TipIndex } from './tips'
import { span } from './play-time'
import Coin from './Coin.vue'
import { leftOf, lineCost, mapsIn, runTotals, tallyRows } from './runs'
import type { CostLine, Run } from './runs'
import { addCost, addOnce, deleteRun, editRun, loadRuns, refreshRunMaps, runMaps, runsDoc, startRun, stopRun } from './run-store'
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

watch(() => props.league, (l) => { loadRuns(l).catch(() => {}) }, { immediate: true })
const doc = runsDoc
const live = computed(() => doc.value.live?.league === props.league ? doc.value.live : null)
const opened = shallowRef<string | null>(null)
const shownRun = computed<Run | null>(() => (opened.value ? doc.value.done.find(r => r.id === opened.value) : null) ?? live.value)
watch(() => [shownRun.value?.id, shownRun.value?.stoppedAt], () => { refreshRunMaps(shownRun.value).catch(() => {}) }, { immediate: true })
// New maps: read again with each new chart point (a read lands after maps).
watch(() => props.points.length, () => { if (shownRun.value && !shownRun.value.stoppedAt) refreshRunMaps(shownRun.value).catch(() => {}) })

// ---------- numbers ----------
const fmt = (n: number) => formatAmount(n)
const toDiv = (chaos: number) => props.divine ? chaos / props.divine : chaos
const amount = (chaos: number) => { const d = toDiv(chaos); return Math.abs(d) >= 100 ? formatAmount(d) : d.toFixed(Math.abs(d) < 1 && props.divine ? 2 : 1) }
const signed = (chaos: number) => `${chaos > 0 ? '+' : chaos < 0 ? '−' : ''}${amount(Math.abs(chaos))}`
const tone = (n: number | null | undefined) => n == null || Math.abs(n) < 0.05 ? '' : n > 0 ? 'w-up' : 'w-down'
const inChaos = (chaos: number) => `${Math.round(chaos)} chaos`
const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const day = (ms: number) => new Date(ms).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + clock(ms)
const round4 = (n: number) => Math.round(n * 10000) / 10000
const tipOf = (key: string | null, name: string, count?: number) => tipFor(props.tips, key, name, count)

// Map-cost items: maps, scarabs and fragments (for cost per map).
const mapCostKeys = computed(() => new Set(props.lines.filter(l => l.category === 'fragments' || /\bMap$/.test(l.name)).map(l => l.key)))
const totals = computed(() => {
  const r = shownRun.value
  if (!r) return null
  const now = Math.max(nowMinute.value, props.points[props.points.length - 1]?.at ?? 0)
  return runTotals(r, props.points, mapsIn(r, runMaps.value, now), now, mapCostKeys.value)
})
const rows = computed(() => shownRun.value ? tallyRows(shownRun.value) : { used: [], came: [] })
const usedShown = shallowRef(8)
const cameShown = shallowRef(8)
const pastShown = shallowRef(10)
watch(() => shownRun.value?.id, () => { usedShown.value = 8; cameShown.value = 8 })

// ---------- start ----------
const name = shallowRef('')
const pastNames = computed(() => [...new Set(doc.value.done.map(r => r.name))].slice(0, 6))
const lastPoint = computed(() => props.points[props.points.length - 1]?.at ?? null)
const startAt = computed(() => props.from ?? lastPoint.value)
// The costs typed for the same name last time come along.
const lastCosts = computed<CostLine[]>(() => (doc.value.done.find(r => r.name === name.value.trim())?.costs ?? []).map(c => { const x = { ...c }; delete x.bought; return x }))
function start () {
  if (startAt.value == null) return
  startRun(props.league, name.value || 'Run', startAt.value, props.diffs, props.points, props.divine, lastCosts.value).catch(() => {})
  name.value = ''
}
function stop () {
  stopRun(props.league, props.points, props.divine).catch(() => {})
}
function open (r: Run) {
  opened.value = opened.value === r.id ? null : r.id
}
function remove (r: Run) {
  if (opened.value === r.id) opened.value = null
  deleteRun(props.league, r.id).catch(() => {})
  toast(`Deleted ${r.name}`)
}

// ---------- costs ----------
type Unit = 'c' | 'd'
const units = shallowRef<Record<string, Unit>>({})
const costUnit = (id: string): Unit => units.value[id] ?? 'c'
const flipUnit = (id: string) => { units.value = { ...units.value, [id]: costUnit(id) === 'c' ? 'd' : 'c' } }
const toUnit = (chaos: number, u: Unit) => u === 'd' && props.divine ? chaos / props.divine : chaos
const fromUnit = (n: number, u: Unit) => u === 'd' && props.divine ? n * props.divine : n
const num = (e: Event, fallback: number) => { const n = Number((e.target as HTMLInputElement).value); return Number.isFinite(n) && n >= 0 ? n : fallback }
const optNum = (e: Event) => { const v = (e.target as HTMLInputElement).value; const n = Number(v); return v === '' || !Number.isFinite(n) || n < 0 ? undefined : Math.round(n) }

function edit (fn: (r: Run) => Run) {
  const r = shownRun.value
  if (!r) return
  editRun(props.league, r.id, fn, props.points, props.divine).catch(() => {})
}
function setCost (id: string, patch: Partial<CostLine>) {
  edit(r => ({ ...r, costs: r.costs.map(c => { if (c.id !== id) return c; const n = { ...c, ...patch }; if (n.bought == null) delete n.bought; return n }) }))
}
function removeCost (id: string) { edit(r => ({ ...r, costs: r.costs.filter(c => c.id !== id) })) }
function removeOnce (id: string) { edit(r => ({ ...r, once: r.once.filter(o => o.id !== id) })) }

const newName = shallowRef('')
const onceAmount = shallowRef(0)
const onceUnit = shallowRef<Unit>('c')
const itemNames = computed(() => [...new Set([...Object.values(shownRun.value?.tally ?? {}).map(t => t.name), ...props.lines.map(l => l.name)])].slice(0, 400))
function addPerMap () {
  const n = newName.value.trim()
  if (!n) return
  // "Strand Map" finds "Strand Map (T16)" too.
  const same = (x: string) => { const a = x.toLowerCase(); const b = n.toLowerCase(); return a === b || a.startsWith(b + ' (') }
  const line = props.lines.find(l => l.name.toLowerCase() === n.toLowerCase()) ?? props.lines.find(l => same(l.name))
  const key = line?.key ?? Object.entries(shownRun.value?.tally ?? {}).find(([, t]) => same(t.name))?.[0] ?? null
  edit(r => addCost(r, { key, name: line?.name ?? n, qty: 1, unitChaos: line?.unitChaos ?? 0 }))
  if (!line) toast(`No price for ${n}: type what you paid`)
  newName.value = ''
}
function addOnceCost () {
  const n = newName.value.trim()
  if (!n || !(onceAmount.value > 0)) return
  edit(r => addOnce(r, { name: n, chaos: fromUnit(onceAmount.value, onceUnit.value) }))
  newName.value = ''
  onceAmount.value = 0
}
</script>

<style module>
.runs { display: flex; flex-direction: column; gap: var(--w-s3); min-width: 0; }
.start, .card, .past { display: flex; flex-direction: column; gap: var(--w-s2); min-width: 0; }
.card { border: 1px solid var(--w-line); padding: var(--w-s2) var(--w-s3); }
.head { display: flex; align-items: baseline; gap: var(--w-s2); min-width: 0; }
.head > :last-child:not(:first-child) { margin-left: auto; }
.title { font-weight: 600; color: var(--w-gold); min-width: 0; }
.caps { font-family: var(--w-caps-face); text-transform: var(--w-caps-case); font-size: var(--w-fs-caps); color: var(--w-dim); }
.row { display: flex; gap: var(--w-s2); align-items: center; }
.name { flex: 1; min-width: 0; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chip { border: 1px solid var(--w-line); background: none; color: inherit; padding: 0 6px; font: inherit; font-size: var(--w-fs-xs); cursor: pointer; }
.chip.on, .chip:hover { border-color: var(--w-gold); color: var(--w-gold); }
.link { background: none; border: 0; padding: 0; color: var(--w-accent); text-decoration: underline; cursor: pointer; font: inherit; }
.stats { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px var(--w-s3); }
.big { font-size: calc(18px * var(--w-text-scale, 1)); }
.sum { display: flex; flex-wrap: wrap; gap: 2px var(--w-s3); color: var(--w-dim); }
.sum b { color: var(--w-fg); font-weight: 500; }
.block { display: flex; flex-direction: column; gap: 3px; }
.blockHead { display: flex; align-items: baseline; gap: var(--w-s2); flex-wrap: wrap; }
.cost { display: grid; grid-template-columns: minmax(6rem, 1fr) auto auto auto minmax(5rem, auto) 1.2rem; gap: var(--w-s2); align-items: center; font-size: var(--w-fs-sm); }
.field { display: inline-flex; align-items: center; gap: 3px; color: var(--w-dim); white-space: nowrap; }
.num { width: 4.2rem; }
.unit { border: 1px solid var(--w-line); background: none; color: var(--w-fg); font: inherit; font-size: var(--w-fs-xs); padding: 0 4px; cursor: pointer; }
.right { text-align: right; white-space: nowrap; }
.x { background: none; border: 0; color: var(--w-dim); cursor: pointer; padding: 0; }
.x:hover { color: var(--w-down); }
.add { display: flex; flex-wrap: wrap; gap: var(--w-s2); align-items: center; margin-top: 2px; }
.lists { display: grid; grid-template-columns: 1fr 1fr; gap: var(--w-s3); }
.line { display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; gap: 6px; align-items: center; font-size: var(--w-fs-sm); }
.icon { width: 18px; height: 18px; object-fit: contain; }
.pastRow { display: grid; grid-template-columns: minmax(0, 1fr) auto auto 1.2rem; gap: var(--w-s2); align-items: baseline; border-bottom: 1px solid var(--w-line); padding: 2px 0; }
.pastRow.on .pastOpen { color: var(--w-gold); }
.pastOpen { background: none; border: 0; padding: 0; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.pastOpen:hover { color: var(--w-gold); }
</style>
