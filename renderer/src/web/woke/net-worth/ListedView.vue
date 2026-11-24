<template>
  <div :class="$style.body" data-listed>
    <!-- The quiet refresh, said where it acts (Guy: "should be clear on the page"). -->
    <section :class="$style.autoLine">
      <WToggle :model-value="auto" title="On entering your hideout, at most every 30 min: one trade search on your account. Starts after your first Refresh. Never while you stay put or AFK." @update:model-value="emit('auto', $event)">
        <span class="text-xs">Auto-refresh in hideout · every 30 min</span>
      </WToggle>
      <span class="w-dim text-xs">{{ doc ? `Read ${agoPhrase(doc.readAt)}` : 'Not read yet' }}</span>
    </section>
  <WEmpty v-if="!doc" icon="fas fa-store">
    {{ reading ? 'Reading your Faustus listings…' : 'Press Refresh to read your Faustus listings (one trade search).' }}
  </WEmpty>
  <template v-else>
    <section :class="$style.head">
      <span :class="$style.total" class="w-num" :title="headTitle" data-listed-total>{{ div(head.askChaos) }}<Coin :chaos="!divine" /></span>
      <span class="w-dim text-xs">
        asking<template v-if="filterLabel"> for <span class="w-accent" data-listed-filtered>{{ filterLabel }}</span></template> · {{ head.count }} {{ head.count === 1 ? 'listing' : 'listings' }}<template v-if="head.worthChaos !== head.askChaos"> · worth about {{ div(head.worthChaos) }} {{ unit }}</template>
        <template v-if="head.stale && filter !== 'stale'"> · <span class="w-warn" data-listed-stale>{{ head.stale }} unsold {{ staleDays }}d+</span></template>
        <template v-if="head.unpriced"> · {{ head.unpriced }} in a currency without a price</template>
      </span>
      <label :class="$style.days" class="w-dim text-xs" title="A listing unsold this many days counts as stale: the dock icon counts them">
        Stale after <input v-model.number="daysInput" type="number" min="1" max="30" step="1" aria-label="Stale after days" :class="$style.daysIn"> d
      </label>
    </section>

    <section v-if="rows.length" :class="$style.chips">
      <WChip v-if="sum.stale" clickable :active="filter === 'stale'" :title="`Unsold ${staleDays} days or more`" @click="toggle('stale')"><span class="w-warn">Stale {{ sum.stale }}</span></WChip>
      <WChip v-if="undercut" clickable :active="filter === 'undercut'" title="Your last Check found someone cheaper" @click="toggle('undercut')"><span class="w-down">Undercut {{ undercut }}</span></WChip>
      <WChip v-if="over" clickable :active="filter === 'over'" title="Asking 10% or more over poe.ninja's price" @click="toggle('over')">Overpriced {{ over }}</WChip>
      <WChip v-for="t in types" :key="t.id" clickable :active="filter === t.id" @click="toggle(t.id)">{{ t.label }} {{ t.count }}</WChip>
    </section>
    <WEmpty v-if="!rows.length" icon="fas fa-check">Nothing listed that hasn't sold.</WEmpty>
    <div v-else :class="$style.scroll">
      <table :class="$style.table">
        <thead>
          <tr>
            <th :class="$style.left">Item</th>
            <th>Asking</th>
            <th title="poe.ninja's price now, for the whole stack. ~ is rough: its rolls, corruption or a thin market move the price">Suggest</th>
            <th title="Your asking price against poe.ninja's">vs ninja</th>
            <th title="Still cheapest? One trade search on a click: where your price ranks among other instant buyout listings of it">Cheapest?</th>
            <th :title="`Since you first listed it (a reprice doesn't reset it). Orange: ${staleDays} days or more`">Listed</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in shown.slice(0, limit)" :key="r.item.id" data-listed-row>
            <td :class="$style.left">
              <span :class="$style.name"><img v-if="r.item.icon" :src="r.item.icon" alt="" :class="$style.icon"><span v-item-tip="saleTip(r.item)" class="w-trunc" :style="{ color: colourOf(r.item.frameType) }">{{ saleName(r.item) }}</span></span>
            </td>
            <td class="w-num" :class="$style.ask">{{ fmt(r.item.price.amount) }} {{ r.item.price.currency }}</td>
            <td class="w-num" :class="r.confidence === 'rough' ? 'w-dim' : ''" :title="suggestTitle(r)">{{ suggestText(r) }}</td>
            <td class="w-num" :class="vsTone(r)">{{ vsText(r) }}</td>
            <td :class="$style.check" data-listed-check>
              <span v-if="!canCheck(r.item)" class="w-dim" title="Rare gear: a search by name can't compare it. Price check it in game">—</span>
              <span v-else-if="busy.has(r.item.id)" class="w-dim">Checking…</span>
              <WButton v-else-if="checkOf(r)" size="sm" variant="ghost" :class="checkOf(r)!.cheaper ? 'w-down' : 'w-up'" :title="checkTitle(r)" @click="check(r)">{{ checkText(r) }}</WButton>
              <WButton v-else size="sm" variant="ghost" :class="errors[r.item.id] ? 'w-down' : ''" :title="errors[r.item.id] ? `Check failed: ${errors[r.item.id]}. Click to try again` : 'One trade search: where your price ranks among other instant buyout listings of it'" @click="check(r)">{{ errors[r.item.id] ? 'Retry' : 'Check' }}</WButton>
            </td>
            <td class="w-num" :class="r.stale ? 'w-warn' : 'w-dim'" :title="new Date(r.firstAt).toLocaleString()">{{ ageText(r.ageMs) }}</td>
          </tr>
          <tr v-if="shown.length > limit"><td colspan="6" :class="$style.left"><WButton size="sm" variant="ghost" @click="limit += 100">{{ shown.length - limit }} more</WButton></td></tr>
        </tbody>
      </table>
    </div>
    <div v-if="doc.more" class="w-dim text-xs" :class="$style.note">Shows your newest 100 listings.</div>
  </template>
  </div>
</template>

<script setup lang="ts">
// Sales › Listed (pending.ts): what's at Faustus and not sold, its asking
// price against poe.ninja, and how long it has sat.
import { computed, shallowRef, watch } from 'vue'
import { WButton, WChip, WEmpty, WToggle, vItemTip } from '../ui'
import { agoPhrase, formatAmount, nowMinute } from '../ui/format'
import Coin from './Coin.vue'
import { saleTip } from './sale-tip'
import { saleName, saleType, SALE_TYPES } from './sales'
import type { SaleType } from './sales'
import { ninjaPriced, rates, sales } from './sales-store'
import { canCheck, checkFor, rankText } from './cheapest'
import { cheapestBusy, cheapestDoc, cheapestErrors, checkCheapest, loadCheapest } from './cheapest-store'
import { loadPending, pendingDoc, pendingReading } from './pending-store'
import { ageText, pendingRows, pendingTotals, sortPending, DEFAULT_STALE_DAYS } from './pending'
import type { PendingRow } from './pending'

const props = defineProps<{ league: string, divine: number | null, staleDays?: number, auto: boolean }>()
const emit = defineEmits<{ 'stale-days': [d: number], 'auto': [on: boolean] }>()

watch(() => props.league, (l) => { loadPending(l).catch(() => {}); loadCheapest(l) }, { immediate: true })

const doc = computed(() => pendingDoc.value?.league === props.league ? pendingDoc.value : null)
const reading = pendingReading
const staleDays = computed(() => props.staleDays ?? DEFAULT_STALE_DAYS)
const daysInput = computed<number>({
  get: () => staleDays.value,
  set: (d) => { if (Number.isFinite(d) && d >= 1 && d <= 30) emit('stale-days', Math.round(d)) }
})
const rows = computed(() => pendingRows(doc.value, sales.value, rates.value, ninjaPriced, Math.max(nowMinute.value, Date.now()), staleDays.value))
const sorted = computed(() => sortPending(rows.value))
const sum = computed(() => pendingTotals(rows.value))
const limit = shallowRef(100)

// Filter chips: stale, overpriced, or one type.
type Filter = 'stale' | 'over' | 'undercut' | SaleType
const filter = shallowRef<Filter | null>(null)
const OVER = 0.1
const isOver = (r: PendingRow) => r.vs != null && r.vs >= OVER
const over = computed(() => rows.value.filter(isOver).length)
const isUndercut = (r: PendingRow) => (checkOf(r)?.cheaper ?? 0) > 0
const undercut = computed(() => rows.value.filter(isUndercut).length)
const types = computed(() => SALE_TYPES.map(t => ({ ...t, count: rows.value.filter(r => saleType(r.item) === t.id).length })).filter(t => t.count > 0))
function toggle (f: Filter) { filter.value = filter.value === f ? null : f; limit.value = 100 }
const shown = computed(() => {
  const f = filter.value
  if (!f) return sorted.value
  return sorted.value.filter(r => f === 'stale' ? r.stale : f === 'over' ? isOver(r) : f === 'undercut' ? isUndercut(r) : saleType(r.item) === f)
})
// The head's numbers: the rows the chip picked, or all of them.
const head = computed(() => filter.value ? pendingTotals(shown.value) : sum.value)
const filterLabel = computed(() => {
  const f = filter.value
  if (!f) return ''
  return f === 'stale' ? 'stale' : f === 'over' ? 'overpriced' : f === 'undercut' ? 'undercut' : SALE_TYPES.find(t => t.id === f)?.label.toLowerCase() ?? ''
})
const headTitle = computed(() => filter.value
  ? `Asking ${inChaos(head.value.askChaos)} for the picked chip (all ${sum.value.count}: ${inChaos(sum.value.askChaos)}). Click the chip again for all`
  : `Asking ${inChaos(sum.value.askChaos)}`)
// A filter that has nothing left drops.
watch(shown, (list) => { if (filter.value && !list.length) filter.value = null })

const fmt = (n: number) => formatAmount(n)
const inChaos = (chaos: number) => `${formatAmount(Math.round(chaos))} chaos`
const unit = computed(() => props.divine ? 'd' : 'c')
const div = (chaos: number) => {
  const d = props.divine ? chaos / props.divine : chaos
  return d >= 100 ? formatAmount(d) : d >= 1 ? d.toFixed(1) : d.toFixed(2)
}
// A price as the trade site would take it: divines from 1 div up, else chaos.
function priceText (chaos: number) {
  if (props.divine && chaos >= props.divine) return `${(chaos / props.divine).toFixed(chaos >= props.divine * 10 ? 0 : 1)} div`
  return `${Math.max(1, Math.round(chaos))}c`
}
function suggestText (r: PendingRow) {
  if (r.ninja == null) return '—'
  return `${r.confidence === 'rough' ? '~' : ''}${priceText(r.ninja)}`
}
function suggestTitle (r: PendingRow) {
  if (r.ninja == null) return 'No poe.ninja price for this one: price check it in game'
  return r.confidence === 'rough'
    ? "Rough: poe.ninja prices the name, and this one's rolls, corruption or a thin market change it"
    : `poe.ninja: ${inChaos(r.ninja)}${r.item.stack > 1 ? ` for ${r.item.stack}` : ''}`
}
function vsText (r: PendingRow) {
  if (r.vs == null) return '—'
  if (Math.abs(r.vs) < 0.03) return 'at market'
  return `${r.vs > 0 ? '+' : '−'}${Math.round(Math.abs(r.vs) * 100)}%`
}
// Over poe.ninja is what keeps it from selling: red; under: green.
function vsTone (r: PendingRow) {
  return r.vs == null || Math.abs(r.vs) < 0.03 ? 'w-dim' : r.vs > 0 ? 'w-down' : 'w-up'
}
// Still cheapest? (cheapest.ts): one trade search per click.
const busy = cheapestBusy
const errors = cheapestErrors
const checkDoc = computed(() => cheapestDoc.value?.league === props.league ? cheapestDoc.value : null)
function checkOf (r: PendingRow) { return checkFor(checkDoc.value, r.item) }
function check (r: PendingRow) { checkCheapest(props.league, r.item, rates.value).catch(() => {}) }
function checkText (r: PendingRow) {
  const c = checkOf(r)!
  return c.cheaper || c.more ? `${rankText(c)} · ${priceText(c.asks[0])}${r.item.stack > 1 ? ' each' : ''}` : `${rankText(c)} ✓`
}
function checkTitle (r: PendingRow) {
  const c = checkOf(r)!
  const lines = [
    c.total === 0
      ? 'Nobody else lists it for instant buyout'
      : c.cheaper ? `${c.cheaper}${c.more ? '+' : ''} cheaper than your ${fmt(r.item.price.amount)} ${r.item.price.currency}` : 'Nobody asks less than you',
    ...(c.asks.length ? [`Cheapest${r.item.stack > 1 ? ', each' : ''}: ${c.asks.map(priceText).join(' · ')}`] : []),
    `${c.total} other instant buyout ${c.total === 1 ? 'listing' : 'listings'} · checked ${agoPhrase(c.at)}`,
    ...(c.rough ? ['Rough: its rolls, corruption or mods change the price'] : []),
    'Click to check again (one trade search)'
  ]
  return lines.join('\n')
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
</script>

<style module>
.body { display: flex; flex-direction: column; min-height: 0; }
.head { display: flex; align-items: baseline; gap: var(--w-s3); padding: 6px var(--w-pad); border-bottom: 1px solid var(--w-line); flex-wrap: wrap; }
.total { font-size: calc(20px * var(--w-text-scale, 1)); color: var(--w-gold); line-height: 1.1; }
.days { margin-left: auto; display: inline-flex; align-items: baseline; gap: 4px; }
.daysIn { width: 3em; background: var(--w-panel-2); border: 1px solid var(--w-line); color: var(--w-fg); text-align: right; font: inherit; padding: 0 3px; }
.scroll { max-height: 420px; overflow-y: auto; overscroll-behavior: contain; }
.table { width: 100%; border-collapse: collapse; font-size: var(--w-fs-sm); table-layout: fixed; }
.table th { font-family: var(--w-caps-face); text-transform: var(--w-caps-case); font-size: var(--w-fs-caps); color: var(--w-dim); font-weight: 500; text-align: right; padding: 4px 6px; border-bottom: 1px solid var(--w-line-strong); white-space: nowrap; position: sticky; top: 0; background: var(--w-panel-solid); }
.table th:nth-child(1) { width: 34%; }
.table td { padding: 2px 6px; text-align: right; border-bottom: 1px solid var(--w-line-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.table tbody tr:hover td { background: var(--w-panel-2); }
.left { text-align: left !important; }
.name { display: flex; align-items: center; gap: 6px; min-width: 0; }
.icon { width: 18px; height: 18px; object-fit: contain; flex: none; }
.ask { color: var(--w-gold); }
.check { text-align: right; }
.note { padding: 4px var(--w-pad); }
.autoLine { display: flex; align-items: center; gap: var(--w-s3); padding: 6px var(--w-pad); border-bottom: 1px solid var(--w-line); flex-wrap: wrap; justify-content: space-between; }
.chips { display: flex; gap: var(--w-s1); padding: 6px var(--w-pad); flex-wrap: wrap; align-items: center; border-bottom: 1px solid var(--w-line); }
</style>
