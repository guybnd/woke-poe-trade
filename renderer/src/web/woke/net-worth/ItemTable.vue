<template>
  <table :class="$style.table">
    <thead>
      <tr>
        <th v-for="c in COLS" :key="c.id" :class="[c.id === 'name' ? $style.left : '', sort === c.id ? $style.on : '']"
          :aria-sort="sort === c.id ? (desc ? 'descending' : 'ascending') : undefined" tabindex="0"
          @click="sortBy(c.id)" @keydown.enter.prevent="sortBy(c.id)" @keydown.space.prevent="sortBy(c.id)">
          {{ c.label }}<button v-if="(c.id === 'unit' || c.id === 'chaos') && divine" type="button" :class="$style.unitBtn"
            :title="`In ${inChaos(c.id) ? 'chaos' : 'divines'}. Click for ${inChaos(c.id) ? 'divines' : 'chaos'}`"
            @click.stop="swap(c.id)" @keydown.enter.stop @keydown.space.stop><Coin :chaos="inChaos(c.id)" /></button><Coin v-else-if="c.id === 'unit' || c.id === 'chaos'" chaos /><template v-if="sort === c.id">{{ desc ? ' ▾' : ' ▴' }}</template>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="l in shown" :key="l.key" :class="['w-line', { [$style.dim]: l.state === 'unpriced', 'w-line-out': l.state === 'ignored' }]" tabindex="0" data-nw-row
        @contextmenu="rowMenu($event, l)" @keydown="lineKeys($event, stateOf(l), handlersOf(l))">
        <td :class="$style.left">
          <span :class="$style.name" v-item-tip="tipOf(l)">
            <img v-if="l.icon" :src="l.icon" alt="" :class="$style.icon">
            <span class="w-trunc w-line-name" :style="{ color: colourOf(l) }">{{ l.name }}</span>
          </span>
          <span v-if="l.state === 'ignored'" class="w-line-tag" :class="$style.tag">left out</span>
        </td>
        <td class="w-num">{{ qty(l.count) }}</td>
        <td v-if="editing === l.key" :class="$style.editCell">
          <span :class="$style.edit">
            <input :ref="focusEdit" v-model="draft" type="number" min="0" step="any" :class="$style.editInput" :aria-label="`Your price for one ${l.name}`"
              @keydown.enter.prevent="save(l)" @keydown.esc.prevent="editing = null" @blur="onBlur">
            <button v-if="divine" type="button" :class="$style.unitBtn" :title="`In ${draftUnit === 'c' ? 'chaos' : 'divines'}. Click for ${draftUnit === 'c' ? 'divines' : 'chaos'}`"
              @mousedown.prevent @click="flipDraft" @blur="onBlur"><Coin :chaos="draftUnit === 'c'" /></button>
          </span>
        </td>
        <td v-else class="w-num" :class="l.mine ? '' : 'w-dim'">
          <i v-if="!l.mine && l.heldSince != null" class="fas fa-pause-circle" :class="$style.held" /><WLineNum :mine="l.mine" :out="l.state === 'ignored'" :title="unitTitle(l)" :label="`${l.mine ? 'Change my' : 'Set my'} price for one ${l.name}`" data-nw-price @edit="startEdit(l)">{{ l.state === 'unpriced' ? '—' : show('unit', l.unitChaos) }}</WLineNum>
        </td>
        <td class="w-num" :class="{ [$style.struck]: l.state === 'ignored' }" :title="l.state === 'unpriced' ? undefined : other('chaos', l.chaos)">{{ l.state === 'unpriced' ? '—' : show('chaos', l.chaos) }}</td>
        <td :class="$style.shareCell" :title="l.state ? undefined : `${shareText(l.chaos)} of your net worth`">
          <template v-if="!l.state"><span class="w-num w-dim" :class="$style.pctText">{{ shareText(l.chaos) }}</span><span :class="$style.share"><i :style="{ width: Math.min(100, Math.max(2, share(l.chaos) * 100)) + '%' }" /></span></template>
        </td>
        <td class="w-num" :class="tone(changes.get(l.key))">{{ pct(changes.get(l.key)) }}</td>
        <td class="w-dim w-trunc" :class="$style.tab" :title="l.tabIds.length > 1 ? l.tabIds.map(nameOfTab).join(', ') : undefined">{{ tabText(l) }}<WLineActs :name="l.name" :out="l.state === 'ignored'" :entries="entriesOf(l)" :head="e => itemMenuHead(menuOf(l), e)" @out="handlersOf(l).out($event)" /></td>
      </tr>
      <tr v-if="!lines.length">
        <td colspan="7" class="w-dim" :class="$style.left">
          Nothing matches.<WButton v-if="filtered" size="sm" variant="ghost" @click="emit('clear')">Show all</WButton>
        </td>
      </tr>
      <tr v-if="more > 0"><td colspan="7" :class="$style.left"><WButton size="sm" variant="ghost" @click="limit += 200">{{ more }} more</WButton></td></tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
// The item table (A1): sortable, the game tooltip on hover (with the tabs that
// hold it, and poe.ninja's 7-day line), the item menu on right-click.
import { computed, nextTick, shallowRef } from 'vue'
import { WButton, WLineActs, WLineNum, lineKeys, lineMenu, openMenu, vItemTip } from '../ui'
import type { MenuEntry } from '../ui/layer'
import { formatAmount } from '../ui/format'
import { itemMenuHead } from '../ui/tooltip/item-menu'
import type { ItemMenuRef } from '../ui/tooltip/item-menu'
import type { ItemTipRef } from '../ui/tooltip/item-tip'
import type { ValuedLine } from './valuation'
import Coin from './Coin.vue'
import { heldNote, lineTip } from './tips'
import { HOLD_RATIO, isUniqueFrame } from './valuation'

const props = defineProps<{
  lines: ValuedLine[]
  divine: number | null
  // 24h change by line key (D3), from poe.ninja.
  changes: Map<string, number | null>
  tabNames: Map<string, string>
  // A filter is on: the empty row offers to clear it.
  filtered?: boolean
  // Net worth in chaos: Share is a row's part of it. Without it, of the rows given.
  total?: number
  // Each and Total in divines or chaos: a click on the header's icon swaps.
  units?: { each?: 'd' | 'c', total?: 'd' | 'c' }
}>()
const emit = defineEmits<{
  (e: 'clear'): void
  (e: 'units', v: { each: 'd' | 'c', total: 'd' | 'c' }): void
  // Your price for one, in chaos; null: poe.ninja's again.
  (e: 'price', key: string, chaos: number | null): void
  (e: 'ignore', key: string, name: string, on: boolean): void
}>()

const unitOf = (col: Col) => (col === 'unit' ? props.units?.each : props.units?.total) ?? 'd'
const inChaos = (col: Col) => !props.divine || unitOf(col) === 'c'
function swap (col: Col) {
  const next = { each: unitOf('unit'), total: unitOf('chaos') }
  if (col === 'unit') next.each = next.each === 'c' ? 'd' : 'c'
  else next.total = next.total === 'c' ? 'd' : 'c'
  emit('units', next)
}
// Big chaos figures shortened ("360k"); the hover gives the exact one in divines.
const chaosText = (chaos: number) => chaos >= 100_000 ? `${Math.round(chaos / 1000)}k` : chaos >= 10_000 ? `${(chaos / 1000).toFixed(1)}k` : chaos >= 100 ? formatAmount(Math.round(chaos)) : chaos >= 1 ? chaos.toFixed(1) : chaos.toFixed(2)
const show = (col: Col, chaos: number) => inChaos(col) ? chaosText(chaos) : div(chaos)
// The hover gives the other unit.
const other = (col: Col, chaos: number) => !props.divine ? undefined : inChaos(col) ? `${div(chaos)} div` : `${chaosText(chaos)} chaos`

type Col = 'name' | 'count' | 'unit' | 'chaos' | 'share' | 'change' | 'tab'
const COLS: Array<{ id: Col, label: string }> = [
  { id: 'name', label: 'Item' },
  { id: 'count', label: 'Qty' },
  { id: 'unit', label: 'Each' },
  { id: 'chaos', label: 'Total' },
  { id: 'share', label: 'Share' },
  { id: 'change', label: '24h' },
  { id: 'tab', label: 'Tab' }
]

const sort = shallowRef<Col>('chaos')
const desc = shallowRef(true)
const limit = shallowRef(200)

function sortBy (c: Col) {
  if (sort.value === c) desc.value = !desc.value
  else { sort.value = c; desc.value = c !== 'name' && c !== 'tab' }
}

const nameOfTab = (id: string) => props.tabNames.get(id) ?? '?'
const tabText = (l: ValuedLine) => l.tabIds.length > 1 ? `${nameOfTab(l.tabIds[0])} +${l.tabIds.length - 1}` : nameOfTab(l.tabIds[0] ?? '')

const sorted = computed(() => {
  const key = (l: ValuedLine): number | string => {
    switch (sort.value) {
      case 'name': return l.name.toLowerCase()
      case 'count': return l.count
      case 'unit': return l.unitChaos
      case 'change': return props.changes.get(l.key) ?? NaN
      case 'tab': return tabText(l).toLowerCase()
      default: return l.chaos
    }
  }
  const dir = desc.value ? -1 : 1
  // Unpriced rows stay under the rest; left-out ones keep their place (pick S1).
  // No 24h change ("—") sorts last either way.
  const missing = (x: number | string) => typeof x === 'number' && Number.isNaN(x)
  return [...props.lines].sort((a, b) => {
    const ua = a.state === 'unpriced'
    if (ua !== (b.state === 'unpriced')) return ua ? 1 : -1
    const x = key(a)
    const y = key(b)
    if (missing(x) || missing(y)) return missing(x) === missing(y) ? 0 : missing(x) ? 1 : -1
    return (x < y ? -1 : x > y ? 1 : 0) * dir
  })
})
// Unpriced rows (asked for in the footer) always show, under the rest.
const shown = computed(() => {
  const all = sorted.value
  const priced = all.filter(l => l.state !== 'unpriced')
  return [...priced.slice(0, limit.value), ...all.filter(l => l.state === 'unpriced')]
})
const more = computed(() => Math.max(0, props.lines.filter(l => l.state !== 'unpriced').length - limit.value))
// Share: a row's part of the whole net worth, so it stays put while filters change.
const whole = computed(() => props.total ?? props.lines.reduce((x, l) => l.state ? x : x + l.chaos, 0))
const share = (chaos: number) => whole.value > 0 ? chaos / whole.value : 0
function shareText (chaos: number) {
  const p = share(chaos) * 100
  return p >= 10 ? `${Math.round(p)}%` : p >= 0.1 ? `${p.toFixed(1)}%` : p > 0 ? '<0.1%' : '0%'
}

const div = (chaos: number) => {
  // The unit is in the column header.
  if (!props.divine) return formatAmount(chaos)
  const d = chaos / props.divine
  return d >= 100 ? formatAmount(d) : d >= 1 ? d.toFixed(1) : d >= 0.01 ? d.toFixed(2) : d.toFixed(4)
}
const qty = (n: number) => formatAmount(n)
const pct = (c: number | null | undefined) => c == null ? '—' : `${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(c * 100).toFixed(1)}%`
const tone = (c: number | null | undefined) => c == null || Math.abs(c) < 0.0005 ? 'w-dim' : c > 0 ? 'w-up' : 'w-down'

function colourOf (l: ValuedLine) {
  switch (l.frame) {
    case 1: return 'var(--w-r-magic)'
    case 2: return 'var(--w-r-rare)'
    case 3: return 'var(--w-r-unique)'
    case 4: return 'var(--w-r-gem)'
    case 5: return 'var(--w-r-currency)'
    case 6: return 'var(--w-r-divination)'
    default: return 'var(--w-fg)'
  }
}

function tipOf (l: ValuedLine): ItemTipRef {
  const tabs = l.tabIds.map(nameOfTab)
  const ninja = l.ninjaChaos != null ? `${show('unit', l.ninjaChaos)} ${inChaos('unit') ? 'c' : 'd'}` : ''
  const held = l.heldSince == null || l.ninjaChaos == null
    ? undefined
    : l.heldKind === 'one-day'
      ? `${l.unitChaos > 0 ? 'Price held' : 'Not counted'}: poe.ninja's ${ninja} is from only one day this week`
      : l.heldKind === 'spike'
        ? `Price held: poe.ninja's ${ninja} is ${HOLD_RATIO}× or more its usual price this week`
        : `Price held: poe.ninja's jumped to ${ninja} in a thin market`
  const note = [tabs.length ? `In ${tabs.join(', ')}` : '', held ?? ''].filter(Boolean).join('. ')
  return lineTip(l, l.count, note || undefined)
}
// ---------- your price, ignore (the row menu) ----------
const editing = shallowRef<string | null>(null)
const draft = shallowRef<string | number>('')
const draftUnit = shallowRef<'d' | 'c'>('d')
// What the input opened with: Enter on it unchanged keeps the price as it is.
let opened = ''
let openedChaos = 0
// Enough digits that a small price survives the trip (3c is 0.015 div at 200).
const asText = (n: number, unit: 'd' | 'c') => String(Number(n.toPrecision(unit === 'd' ? 4 : 6)))

function startEdit (l: ValuedLine) {
  // In the Each column's unit.
  draftUnit.value = inChaos('unit') ? 'c' : 'd'
  const now = l.state === 'unpriced' ? 0 : l.unitChaos
  openedChaos = now
  draft.value = opened = now > 0 ? asText(draftUnit.value === 'd' && props.divine ? now / props.divine : now, draftUnit.value) : ''
  focusPending = true
  editing.value = l.key
}
// The input gets focus and its text selected once, as it appears (a function
// ref runs on every render).
let focusPending = false
function focusEdit (el: unknown) {
  if (!(el instanceof HTMLInputElement) || !focusPending) return
  focusPending = false
  nextTick(() => { el.focus(); el.select() })
}
// Leaving the editor cancels it; moving between its input and unit button doesn't.
function onBlur (e: FocusEvent) {
  const to = e.relatedTarget as Node | null
  const box = (e.currentTarget as HTMLElement).closest('td')
  if (to && box?.contains(to)) return
  editing.value = null
}
function flipDraft () {
  const n = Number(draft.value)
  const d = props.divine
  const next = draftUnit.value === 'd' ? 'c' : 'd'
  // Untouched: from the price itself, so 14c doesn't come back as 14.0033.
  const untouched = String(draft.value).trim() === opened && openedChaos > 0
  if (d && untouched) draft.value = opened = asText(next === 'c' ? openedChaos : openedChaos / d, next)
  else if (d && String(draft.value).trim() !== '' && Number.isFinite(n)) draft.value = asText(next === 'c' ? n * d : n / d, next)
  draftUnit.value = next
}
function save (l: ValuedLine) {
  const text = String(draft.value).trim()
  const n = Number(text)
  editing.value = null
  if (text === '' || !Number.isFinite(n) || n < 0) return
  if (text === opened && !l.state) return
  emit('price', l.key, draftUnit.value === 'd' && props.divine ? n * props.divine : n)
}
// The hover on Each: whose price it is.
function unitTitle (l: ValuedLine) {
  if (l.mine) return `Your price (poe.ninja: ${l.ninjaChaos != null ? `${show('unit', l.ninjaChaos)} ${inChaos('unit') ? 'c' : 'd'}` : 'none'})`
  if (l.state === 'unpriced') return 'No poe.ninja price. Right-click to set yours'
  const held = heldNote(l, c => `${show('unit', c)} ${inChaos('unit') ? 'c' : 'd'}`)
  if (held) return held
  return other('unit', l.unitChaos)
}

// The shared profit line (ui/line-item.ts): the same menu on ⋯, right-click
// and the row's keys (Enter: your price, Delete: leave out).
const stateOf = (l: ValuedLine) => ({ out: l.state === 'ignored', edited: !!l.mine })
const handlersOf = (l: ValuedLine) => ({
  edit: () => { startEdit(l) },
  reset: () => { emit('price', l.key, null) },
  out: (on: boolean) => { emit('ignore', l.key, l.name, on) }
})
const entriesOf = (l: ValuedLine): MenuEntry[] => lineMenu(stateOf(l), handlersOf(l), { edit: l.mine ? 'Change my price…' : 'Set my price…', reset: "Back to poe.ninja's price" })
function rowMenu (e: MouseEvent, l: ValuedLine) {
  if ((e.target as Element).closest('input')) return
  openMenu(e, entriesOf(l), itemMenuHead(menuOf(l), e) ?? undefined)
}

function menuOf (l: ValuedLine): ItemMenuRef {
  // Gems, cards and currency: no rarity, so the menu looks them up by name.
  return { name: l.tipName, variant: l.variant, rarity: isUniqueFrame(l.frame) ? 'unique' : undefined }
}
</script>

<style module>
.table { width: 100%; border-collapse: collapse; font-size: var(--w-fs-sm); table-layout: fixed; }
.table th { font-family: var(--w-caps-face); text-transform: var(--w-caps-case); font-size: var(--w-fs-caps); color: var(--w-dim); font-weight: 500; text-align: right; padding: 4px 6px; border-bottom: 1px solid var(--w-line-strong); cursor: pointer; white-space: nowrap; user-select: none; }
.table th:nth-child(1) { width: 34%; }
.table th:nth-child(5) { width: calc(52px + 3.6em); }
.table th:nth-child(7) { width: 16%; }
.table td { padding: 2px 6px; text-align: right; border-bottom: 1px solid var(--w-line-soft); white-space: nowrap; }
.table tbody tr:hover td { background: var(--w-panel-2); }
.left { text-align: left !important; }
.on { color: var(--w-gold) !important; }
.name { display: flex; align-items: center; gap: 6px; min-width: 0; }
.icon { width: 18px; height: 18px; object-fit: contain; flex: none; }
.shareCell { white-space: nowrap; }
.pctText { display: inline-block; min-width: 3.2em; margin-right: 6px; font-size: var(--w-fs-sm); text-align: right; }
.share { display: inline-block; width: 40px; height: 5px; background: var(--w-panel-3); vertical-align: middle; }
.share i { display: block; height: 100%; background: color-mix(in srgb, var(--w-gold) 70%, transparent); }
.unitBtn { cursor: pointer; padding: 0; border-radius: var(--w-r-sm); }
.unitBtn:hover { box-shadow: 0 0 0 1px var(--w-gold); }
.unitBtn:focus-visible { outline: 1px solid var(--w-accent); }
.dim td { opacity: .55; }
.held { font-size: calc(9px * var(--w-text-scale, 1)); color: var(--w-warn); margin-right: 4px; }
.editCell { padding: 0 2px !important; }
.edit { display: inline-flex; align-items: center; gap: 2px; justify-content: flex-end; width: 100%; }
.editInput { width: 100%; min-width: 0; max-width: 64px; font: inherit; font-family: var(--w-num); text-align: right; color: var(--w-fg); background: var(--w-panel-3); border: 1px solid var(--w-gold); border-radius: var(--w-r-sm); padding: 0 3px; }
.struck { text-decoration: line-through; color: var(--w-dim); }
.tag { flex: none; }
.tab { max-width: 0; overflow: hidden; text-overflow: ellipsis; }
</style>
