<template>
  <WEmpty v-if="!all.length" icon="fas fa-coins">
    {{ reading ? 'Reading your sales…' : 'No sales read yet. Press Refresh.' }}
  </WEmpty>
  <div v-else :class="$style.body">
    <section :class="$style.head">
      <span :class="$style.total" class="w-num" :title="inChaos(sum.chaos)">{{ div(sum.chaos) }}<Coin :chaos="!divine" /></span>
      <span class="w-dim text-xs">{{ sum.count }} {{ sum.count === 1 ? 'sale' : 'sales' }}<template v-if="sum.unpriced"> · {{ sum.unpriced }} in a currency without a price</template></span>
      <TextTabs v-model="range" :options="RANGES" :class="$style.range" />
    </section>

    <!-- Layout 1, ranked bars: one row per type, biggest first; a click filters the table. -->
    <section v-if="types.length" :class="$style.bars">
      <button v-for="t in types" :key="t.id" type="button" :class="[$style.bar, { [$style.on]: type === t.id }]" :aria-pressed="type === t.id"
        :title="typeTip(t)" @click="type = type === t.id ? null : t.id">
        <span class="w-trunc">{{ t.label }}</span>
        <i :style="{ width: Math.max(2, t.share * 100) + '%' }" />
        <b class="w-num">{{ div(t.chaos) }}<Coin :chaos="!divine" /></b>
        <span class="w-num w-dim">{{ t.count }}</span>
      </button>
    </section>
    <div v-else class="w-dim text-xs" :class="$style.none">No sales in this range.</div>

    <section :class="$style.chips">
      <WField v-model="query" type="search" icon="fas fa-search" placeholder="Search sales" :class="$style.search" />
      <WChip v-if="type" clickable active :title="`Only ${typeLabel}. Click to show every type`" @click="type = null">{{ typeLabel }} ×</WChip>
    </section>

    <div :class="$style.scroll">
      <table :class="$style.table">
        <thead>
          <tr>
            <th v-for="c in COLS" :key="c.key" :class="{ [$style.left]: c.key === 'item' }" :aria-sort="sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'">
              <button type="button" :class="[$style.sortBtn, { [$style.sorted]: sort.key === c.key }]" :title="c.tip" :aria-label="c.key === 'value' ? 'Sold for' : undefined" @click="sortBy(c.key)">
                <Coin v-if="c.key === 'value'" :chaos="!divine" /><template v-else>{{ c.label }}</template>
                <i v-if="sort.key === c.key" :class="['fas', sort.dir === 'asc' ? 'fa-caret-up' : 'fa-caret-down']" aria-hidden="true" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in sorted.slice(0, limit)" :key="s.id">
            <td :class="$style.left">
              <span :class="$style.name"><img v-if="s.icon" :src="s.icon" alt="" :class="$style.icon"><span v-item-tip="saleTip(s)" class="w-trunc" :style="{ color: colourOf(s.frameType) }">{{ saleName(s) }}</span></span>
            </td>
            <td class="w-num w-dim">{{ fmt(s.price.amount) }} {{ s.price.currency }}</td>
            <td class="w-num" :class="$style.sale">{{ chaosOf(s) == null ? '—' : div(chaosOf(s)!) }}</td>
            <td class="w-num" :class="marketTone(s)">{{ marketText(marketOf(s)) || '—' }}</td>
            <td class="w-num w-dim" :title="new Date(s.at).toLocaleString()">{{ when(s.at) }}</td>
          </tr>
          <tr v-if="!rows.length"><td colspan="5" class="w-dim" :class="$style.left">Nothing matches.</td></tr>
          <tr v-if="rows.length > limit"><td colspan="5" :class="$style.left"><WButton size="sm" variant="ghost" @click="limit += 100">{{ rows.length - limit }} more</WButton></td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
// The Sales view (pick C): your sales for a range, a ranked bar per type that
// filters the table under it, and every sale kept.
import { computed, shallowRef, watch } from 'vue'
import { WButton, WChip, WEmpty, WField, vItemTip } from '../ui'
import { saleTip } from './sale-tip'
import { formatAmount, nowMinute } from '../ui/format'
import TextTabs from './TextTabs.vue'
import Coin from './Coin.vue'
import { byType, inRange, marketText, nextSaleSort, saleChaos, saleName, saleSortOf, saleType, sortSales, totals, SALE_TYPES } from './sales'
import type { Sale, SaleRange, SaleSort, SaleSortKey, SaleType, TypeRow } from './sales'
import { marketOf, rates, sales, salesReading } from './sales-store'

const props = defineProps<{ divine: number | null, range?: SaleRange, sort?: SaleSort }>()
const emit = defineEmits<{ range: [r: SaleRange], sort: [s: SaleSort] }>()

const RANGES = [{ value: 'today', label: 'Today' }, { value: '7d', label: '7d' }, { value: '30d', label: '30d' }, { value: 'league', label: 'League' }]
const range = computed<SaleRange>({
  get: () => props.range ?? '7d',
  set: (r) => { emit('range', r) }
})
const type = shallowRef<SaleType | null>(null)
const query = shallowRef('')
const limit = shallowRef(100)
watch([range, type, query, () => props.sort], () => { limit.value = 100 })

const reading = salesReading
const all = sales
// Moves with the minute clock, so Today rolls over at midnight.
const inR = computed(() => inRange(all.value, range.value, Math.max(nowMinute.value, Date.now())))
const sum = computed(() => totals(inR.value, rates.value))
const types = computed(() => byType(inR.value, rates.value))
const typeLabel = computed(() => SALE_TYPES.find(t => t.id === type.value)?.label ?? '')
const rows = computed(() => {
  const words = query.value.toLowerCase().split(/\s+/).filter(Boolean)
  return inR.value.filter(s => (!type.value || saleType(s) === type.value) &&
    words.every(w => `${s.name} ${s.typeLine}`.toLowerCase().includes(w)))
})

const COLS: Array<{ key: SaleSortKey, label: string, tip: string }> = [
  { key: 'item', label: 'Item', tip: 'Sort by item name' },
  { key: 'price', label: 'Price', tip: 'Sort by price, compared by chaos value' },
  { key: 'value', label: '', tip: 'Sort by what it sold for' },
  { key: 'market', label: 'vs ninja', tip: "Sort by price against poe.ninja's price for it now" },
  { key: 'when', label: 'When', tip: 'Sort by when it sold' }
]
const sort = computed(() => saleSortOf(props.sort))
function sortBy (key: SaleSortKey) { emit('sort', nextSaleSort(sort.value, key)) }
const sorted = computed(() => sortSales(rows.value, sort.value, rates.value, marketOf))

const chaosOf = (s: Sale) => saleChaos(s, rates.value)
const fmt = (n: number) => formatAmount(n)
const inChaos = (chaos: number) => `${formatAmount(Math.round(chaos))} chaos`
const toDiv = (chaos: number) => props.divine ? chaos / props.divine : chaos
const div = (chaos: number) => {
  const d = toDiv(chaos)
  return d >= 100 ? formatAmount(d) : d >= 1 ? d.toFixed(1) : d.toFixed(2)
}
const unit = computed(() => props.divine ? 'd' : 'c')
function typeTip (t: TypeRow) {
  const priced = t.count - t.unpriced
  const lines = [`${t.label}: ${div(t.chaos)} ${unit.value} from ${t.count} ${t.count === 1 ? 'sale' : 'sales'}`]
  if (priced) lines.push(`Average ${div(t.chaos / priced)} ${unit.value}`)
  if (t.best) lines.push(`Best: ${saleName(t.best)} ${div(t.bestChaos)} ${unit.value}`)
  const vs = inR.value.filter(s => saleType(s) === t.id).map(marketOf).filter((x): x is number => x != null)
  if (vs.length) {
    const avg = vs.reduce((a, b) => a + b, 0) / vs.length
    lines.push(`Against poe.ninja: ${marketText(avg)} on average`)
  }
  return lines.join('\n')
}
function marketTone (s: Sale) {
  const v = marketOf(s)
  return v == null || Math.abs(v) < 0.03 ? 'w-dim' : v < 0 ? 'w-down' : 'w-up'
}
function when (at: number) {
  const d = new Date(at)
  const t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return d.toDateString() === new Date().toDateString() ? t : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${t}`
}
function colourOf (frame: number) {
  switch (frame) {
    case 1: return 'var(--w-r-magic)'
    case 2: return 'var(--w-r-rare)'
    case 3: return 'var(--w-r-unique)'
    case 4: return 'var(--w-r-gem)'
    case 5: return 'var(--w-r-currency)'
    case 6: return 'var(--w-r-divination)'
    default: return 'var(--w-fg)'
  }
}
// A type that's gone from the range drops its filter.
watch(types, (list) => { if (type.value && !list.some(t => t.id === type.value)) type.value = null })
</script>

<style module>
.body { display: flex; flex-direction: column; min-height: 0; }
.head { display: flex; align-items: baseline; gap: var(--w-s3); padding: 6px var(--w-pad); border-bottom: 1px solid var(--w-line); flex-wrap: wrap; }
.total { font-size: calc(20px * var(--w-text-scale, 1)); color: var(--w-gold); line-height: 1.1; }
.range { margin-left: auto; }
.bars { display: flex; flex-direction: column; padding: 4px var(--w-pad); border-bottom: 1px solid var(--w-line); }
.bar { display: grid; grid-template-columns: 10em minmax(0, 1fr) 5.5em 2.5em; gap: 8px; align-items: center; width: 100%; padding: 2px 4px; font-size: var(--w-fs-sm); color: var(--w-fg); text-align: left; border-radius: var(--w-r-sm); cursor: pointer; }
.bar:hover { background: var(--w-panel-2); }
.bar i { display: block; height: 8px; min-width: 2px; background: linear-gradient(90deg, color-mix(in srgb, var(--w-gold) 50%, transparent), var(--w-gold)); }
.bar b { text-align: right; font-weight: 500; color: var(--w-gold); }
.bar > span:last-child { text-align: right; }
.on { background: var(--w-panel-3); box-shadow: inset 2px 0 var(--w-gold); }
.none { padding: 8px var(--w-pad); border-bottom: 1px solid var(--w-line); }
.chips { display: flex; gap: var(--w-s1); padding: 6px var(--w-pad); flex-wrap: wrap; align-items: center; border-bottom: 1px solid var(--w-line); }
.search { min-width: 150px; flex: 0 1 220px; }
.scroll { max-height: 420px; overflow-y: auto; overscroll-behavior: contain; }
.table { width: 100%; border-collapse: collapse; font-size: var(--w-fs-sm); table-layout: fixed; }
.table th { font-family: var(--w-caps-face); text-transform: var(--w-caps-case); font-size: var(--w-fs-caps); color: var(--w-dim); font-weight: 500; text-align: right; padding: 4px 6px; border-bottom: 1px solid var(--w-line-strong); white-space: nowrap; position: sticky; top: 0; background: var(--w-panel-solid); }
.table th:nth-child(1) { width: 42%; }
.table td { padding: 2px 6px; text-align: right; border-bottom: 1px solid var(--w-line-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.table tbody tr:hover td { background: var(--w-panel-2); }
.left { text-align: left !important; }
.sortBtn { display: inline-flex; align-items: center; gap: 3px; font: inherit; color: inherit; text-transform: inherit; cursor: pointer; border-radius: var(--w-r-sm); }
.sortBtn:hover, .sorted { color: var(--w-fg); }
.sortBtn:focus-visible { outline: 1px solid var(--w-gold); }
.name { display: flex; align-items: center; gap: 6px; min-width: 0; }
.icon { width: 18px; height: 18px; object-fit: contain; flex: none; }
.sale { color: var(--w-gold); }
</style>
