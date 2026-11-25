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
        <template v-if="outCount"> · <span data-listed-left-out>{{ outCount }} left out</span></template>
      </span>
      <label :class="$style.days" class="w-dim text-xs" title="A listing unsold this many days counts as stale: the dock icon counts them">
        Stale after <input v-model.number="daysInput" type="number" min="1" max="30" step="1" aria-label="Stale after days" :class="$style.daysIn"> d
      </label>
    </section>

    <section v-if="rows.length" :class="$style.chips">
      <WChip v-if="sum.stale" data-goto-spot="stale" clickable :active="filter === 'stale'" :title="`Unsold ${staleDays} days or more`" @click="toggle('stale')"><span class="w-warn">Stale {{ sum.stale }}</span></WChip>
      <WChip v-if="toReprice" clickable :active="filter === 'reprice'" title="Listings you set a new price on from the price check: reprice them at Faustus" @click="toggle('reprice')"><span class="w-warn">To reprice {{ toReprice }}</span></WChip>
      <WChip v-if="undercut" clickable :active="filter === 'undercut'" title="Your last Check found someone cheaper" @click="toggle('undercut')"><span class="w-down">Undercut {{ undercut }}</span></WChip>
      <WChip v-if="over" clickable :active="filter === 'over'" title="Asking 10% or more over poe.ninja's price" @click="toggle('over')">Overpriced {{ over }}</WChip>
      <WChip v-for="t in types" :key="t.id" clickable :active="filter === t.id" @click="toggle(t.id)">{{ t.label }} {{ t.count }}</WChip>
      <WChip v-if="outCount" clickable :active="filter === 'changed'" title="Only the listings you left out of the total" data-listed-changed @click="toggle('changed')">Changed {{ outCount }}</WChip>
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
            <th data-goto-spot="still-cheapest" title="Still cheapest? Price check a listing with its own mods (your filters) to rank your price, then set a new one at the foot. The bolt is a quick search by name">Cheapest?</th>
            <th :title="`Since you first listed it (a reprice doesn't reset it). Orange: ${staleDays} days or more`">Listed</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in shown.slice(0, limit)" :key="r.item.id" :class="['w-line', { 'w-line-out': isOut(r) }]" tabindex="0" data-listed-row
            @contextmenu="onMenu($event, r)" @keydown="onKeys($event, r)">
            <td :class="$style.left">
              <span :class="$style.name"><img v-if="r.item.icon" :src="r.item.icon" alt="" :class="$style.icon"><span v-item-tip="saleTip(r.item)" class="w-trunc w-line-name" :style="{ color: saleColour(r.item.frameType) }">{{ saleName(r.item) }}</span><span v-if="isOut(r)" class="w-line-tag">left out</span></span>
            </td>
            <td class="w-num" :class="[$style.ask, { [$style.struck]: isOut(r) }]">
              {{ fmt(r.item.price.amount) }} {{ r.item.price.currency }}<span v-if="targetOf(r)" class="w-warn" :title="`You set ${priceLabel(targetOf(r)!)} from the price check: reprice it at Faustus. It clears once a Refresh sees that price`" data-listed-target> → {{ priceLabel(targetOf(r)!) }}</span>
            </td>
            <td class="w-num" :class="r.confidence === 'rough' ? 'w-dim' : ''" :title="suggestTitle(r)">{{ suggestText(r) }}</td>
            <td class="w-num" :class="vsTone(r)">{{ vsText(r) }}</td>
            <td :class="$style.check" data-listed-check>
              <span v-if="busy.has(r.item.id)" class="w-dim">Checking…</span>
              <template v-else-if="canReprice(r.item)">
                <WButton v-if="canCheck(r.item)" size="sm" variant="ghost" :class="[$style.quick, errors[r.item.id] ? `w-down ${$style.failed}` : '']" :title="errors[r.item.id] ? `Quick rank failed: ${errors[r.item.id]}. Click to try again` : 'Quick rank: one trade search by name, instant buyout only. It ignores the rolls'" aria-label="Quick rank" data-listed-quick @click="check(r)"><i class="fas fa-bolt" /></WButton>
                <WButton size="sm" variant="ghost" :class="checkOf(r) ? (checkOf(r)!.cheaper ? 'w-down' : 'w-up') : ''" :title="checkOf(r) ? `${checkTitle(r)}\nClick to price check it again` : 'Price check this listing with its own mods: tune the filters, then set a new price at the foot'" data-listed-reprice @click="reprice(r, $event)">{{ checkOf(r) ? checkText(r) : 'Price check' }}</WButton>
              </template>
              <span v-else-if="!canCheck(r.item)" class="w-dim" title="Rare gear read before its mods were kept: Refresh, or price check it in game">—</span>
              <WButton v-else-if="checkOf(r)" size="sm" variant="ghost" :class="checkOf(r)!.cheaper ? 'w-down' : 'w-up'" :title="checkTitle(r)" @click="check(r)">{{ checkText(r) }}</WButton>
              <WButton v-else size="sm" variant="ghost" :class="errors[r.item.id] ? 'w-down' : ''" :title="errors[r.item.id] ? `Check failed: ${errors[r.item.id]}. Click to try again` : 'One trade search: where your price ranks among other instant buyout listings of it'" @click="check(r)">{{ errors[r.item.id] ? 'Retry' : 'Check' }}</WButton>
            </td>
            <td class="w-num" :class="r.stale && !isOut(r) ? 'w-warn' : 'w-dim'" :title="new Date(r.firstAt).toLocaleString()">{{ ageText(r.ageMs) }}<WLineActs :name="saleName(r.item)" :out="isOut(r)" :entries="entriesOf(r)" :head="e => itemMenuHead(saleMenuRef(r.item), e)" @out="leaveOut(r, $event)" /></td>
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
import { WButton, WChip, WEmpty, WLineActs, WToggle, lineKeys, lineMenu, lineToast, openMenu, toast, vItemTip } from '../ui'
import type { MenuEntry } from '../ui'
import { itemMenuHead } from '../ui/tooltip/item-menu'
import { lineOutDoc, loadLineOut, outIdsOf, setLineOut } from './line-out-store'
import { agoPhrase, formatAmount, nowMinute } from '../ui/format'
import Coin from './Coin.vue'
import { saleMenuRef, saleTip } from './sale-tip'
import { saleColour, saleName, saleType, SALE_TYPES } from './sales'
import type { SaleType } from './sales'
import { ninjaPriced, rates, sales } from './sales-store'
import { canCheck, checkFor, rankText } from './cheapest'
import { cheapestBusy, cheapestDoc, cheapestErrors, checkCheapest, loadCheapest, repricing } from './cheapest-store'
import { priceLabel, targetOpen } from './listed-target'
import { saleItem } from './sale-tip'
import type { Listing } from './faustus'
import { loadPending, pendingDoc, pendingReading } from './pending-store'
import { hasListedAsk, takeListedAsk } from './listed-ask'
import { ageText, pendingRows, pendingTotals, sortPending, DEFAULT_STALE_DAYS } from './pending'
import { listedOpenStale } from './pending-glance'
import type { PendingRow } from './pending'

const props = defineProps<{ wmId: number, league: string, divine: number | null, staleDays?: number, auto: boolean }>()
const emit = defineEmits<{ 'stale-days': [d: number], 'auto': [on: boolean] }>()

watch(() => props.league, (l) => { loadPending(l).catch(() => {}); loadCheapest(l); loadLineOut(l).catch(() => {}) }, { immediate: true })

const doc = computed(() => pendingDoc.value?.league === props.league ? pendingDoc.value : null)
const reading = pendingReading
const staleDays = computed(() => props.staleDays ?? DEFAULT_STALE_DAYS)
const daysInput = computed<number>({
  get: () => staleDays.value,
  set: (d) => { if (Number.isFinite(d) && d >= 1 && d <= 30) emit('stale-days', Math.round(d)) }
})
const rows = computed(() => pendingRows(doc.value, sales.value, rates.value, ninjaPriced, Math.max(nowMinute.value, Date.now()), staleDays.value))
const sorted = computed(() => sortPending(rows.value))
// The shared line item (ui/line-item.ts): a listing left out stays listed,
// struck, and leaves the totals and the stale count.
const outIds = computed(() => outIdsOf(lineOutDoc.value, props.league, 'listed'))
const isOut = (r: PendingRow) => outIds.value.has(r.item.id)
const outCount = computed(() => rows.value.filter(isOut).length)
const sum = computed(() => pendingTotals(rows.value.filter(r => !isOut(r))))
function leaveOut (r: PendingRow, out: boolean) {
  const l = props.league
  const id = r.item.id
  setLineOut(l, 'listed', id, out).catch(failed)
  lineToast(out ? 'out' : 'in', saleName(r.item), () => { setLineOut(l, 'listed', id, !out).catch(failed) })
}
const failed = (e: Error) => { toast(e.message) }
const handlersOf = (r: PendingRow) => ({ out: (on: boolean) => { leaveOut(r, on) } })
const stateOf = (r: PendingRow) => ({ out: isOut(r), editable: false })
const entriesOf = (r: PendingRow): MenuEntry[] => lineMenu(stateOf(r), handlersOf(r))
function onMenu (e: MouseEvent, r: PendingRow) {
  // The row's buttons keep their own clicks; the menu is for the row.
  if ((e.target as Element).closest('input')) return
  openMenu(e, entriesOf(r), itemMenuHead(saleMenuRef(r.item), e) ?? undefined)
}
function onKeys (e: KeyboardEvent, r: PendingRow) { lineKeys(e, stateOf(r), handlersOf(r)) }
const limit = shallowRef(100)

// Filter chips: stale, overpriced, or one type.
type Filter = 'stale' | 'over' | 'undercut' | 'reprice' | 'changed' | SaleType
const filter = shallowRef<Filter | null>(null)
const OVER = 0.1
const isOver = (r: PendingRow) => r.vs != null && r.vs >= OVER
const over = computed(() => rows.value.filter(isOver).length)
const isUndercut = (r: PendingRow) => (checkOf(r)?.cheaper ?? 0) > 0
const undercut = computed(() => rows.value.filter(isUndercut).length)
const toReprice = computed(() => rows.value.filter(r => targetOf(r) != null).length)
const types = computed(() => SALE_TYPES.map(t => ({ ...t, count: rows.value.filter(r => saleType(r.item) === t.id).length })).filter(t => t.count > 0))
watch(listedOpenStale, (on) => {
  if (!on) return
  listedOpenStale.value = false
  filter.value = 'stale'
  limit.value = 100
}, { immediate: true })
function toggle (f: Filter) { filter.value = filter.value === f ? null : f; limit.value = 100 }
// What's new's Show me asks this window for a chip (listed-ask.ts). Only
// picked when it has rows: an empty pick would hide the chip that undoes it.
watch(() => hasListedAsk(props.wmId), has => {
  if (!has) return
  const f = takeListedAsk(props.wmId)
  if (f === 'stale' && sum.value.stale) { filter.value = f; limit.value = 100 }
}, { immediate: true })
const shown = computed(() => {
  const f = filter.value
  if (!f) return sorted.value
  return sorted.value.filter(r => f === 'changed' ? isOut(r) : f === 'stale' ? r.stale && !isOut(r) : f === 'over' ? isOver(r) : f === 'undercut' ? isUndercut(r) : f === 'reprice' ? targetOf(r) != null : saleType(r.item) === f)
})
// The head's numbers: the rows the chip picked, or all of them.
// Changed: what the left-out ones ask; any other chip, the counted ones.
const head = computed(() => filter.value === 'changed' ? pendingTotals(shown.value) : filter.value ? pendingTotals(shown.value.filter(r => !isOut(r))) : sum.value)
const filterLabel = computed(() => {
  const f = filter.value
  if (!f) return ''
  return f === 'changed' ? 'left out' : f === 'stale' ? 'stale' : f === 'over' ? 'overpriced' : f === 'undercut' ? 'undercut' : f === 'reprice' ? 'to reprice' : SALE_TYPES.find(t => t.id === f)?.label.toLowerCase() ?? ''
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
      ? (c.priceCheck ? 'Nobody else in your price check' : 'Nobody else lists it for instant buyout')
      : c.cheaper ? `${c.cheaper}${c.more ? '+' : ''} cheaper than your ${fmt(r.item.price.amount)} ${r.item.price.currency}` : 'Nobody asks less than you',
    ...(c.asks.length ? [`Cheapest${r.item.stack > 1 ? ', each' : ''}: ${c.asks.map(priceText).join(' · ')}`] : []),
    c.priceCheck
      ? `${c.total} other ${c.total === 1 ? 'listing' : 'listings'} in your price check ${agoPhrase(c.at)}`
      : `${c.total} other instant buyout ${c.total === 1 ? 'listing' : 'listings'} · checked ${agoPhrase(c.at)}`,
    ...(c.rough ? ['Rough: its rolls, corruption or mods change the price'] : []),
    ...(canReprice(r.item) ? [] : ['Click to check again (one trade search)'])
  ]
  return lines.join('\n')
}
// Reprice (Guy's R1): the price check opens on the listing, and its foot
// sets a new price, shown here until a read sees it.
function targetOf (r: PendingRow) {
  const t = checkDoc.value?.targets?.[r.item.id]
  return targetOpen(t, r.item) ? t : null
}
// Rares only with their mods (a read after #815 keeps them).
function canReprice (l: Listing) {
  return !(l.frameType === 1 || l.frameType === 2) || l.tip != null
}
async function reprice (r: PendingRow, e: MouseEvent) {
  const l = r.item
  repricing.value = { league: props.league, id: l.id, at: Date.now() }
  // Read before the await: currentTarget is gone after it.
  const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const at = { x: window.screenX + box.x + box.width / 2, y: window.screenY + box.y + box.height / 2 }
  const [{ openPriceCheck }, { pobMenuRef }] = await Promise.all([import('../ui/tooltip/item-price-check'), import('../pob-builds/item-menu-ref')])
  const unique = l.frameType === 3 || l.frameType === 9
  const ref = pobMenuRef(saleItem(l)) ?? { name: l.name || l.typeLine, ...(unique ? { rarity: 'unique' as const } : {}) }
  const opened = await openPriceCheck(ref, at).catch(() => false)
  if (!opened) { repricing.value = null; toast("Can't price check this one by name: Ctrl+D it at Faustus in game") }
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
.table th { font-family: var(--w-caps-face); text-transform: var(--w-caps-case); font-size: var(--w-fs-caps); color: var(--w-dim); font-weight: 500; text-align: right; padding: 4px 6px; border-bottom: 1px solid var(--w-line-strong); white-space: nowrap; position: sticky; top: 0; z-index: 3; background: var(--w-panel-solid); }
/* The last cell is wide enough for the hover actions laid over it. */
.table td:last-child { min-width: 4.6em; }
.table th:nth-child(1) { width: 26%; }
.table th:nth-child(5) { width: 20%; }
.table td { padding: 2px 6px; text-align: right; border-bottom: 1px solid var(--w-line-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.table tbody tr:hover td { background: var(--w-panel-2); }
.left { text-align: left !important; }
.struck { text-decoration: line-through; color: var(--w-dim); }
.name { display: flex; align-items: center; gap: 6px; min-width: 0; }
.icon { width: 18px; height: 18px; object-fit: contain; flex: none; }
.ask { color: var(--w-gold); }
.check { text-align: right; }
.quick { opacity: 0; padding-inline: 2px; }
.table tbody tr:hover .quick, .quick:focus-visible, .quick.failed { opacity: 1; }
.note { padding: 4px var(--w-pad); }
.autoLine { display: flex; align-items: center; gap: var(--w-s3); padding: 6px var(--w-pad); border-bottom: 1px solid var(--w-line); flex-wrap: wrap; justify-content: space-between; }
.chips { display: flex; gap: var(--w-s1); padding: 6px var(--w-pad); flex-wrap: wrap; align-items: center; border-bottom: 1px solid var(--w-line); }
</style>
