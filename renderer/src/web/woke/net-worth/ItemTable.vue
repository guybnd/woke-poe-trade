<template>
  <table :class="$style.table">
    <thead>
      <tr>
        <th v-for="c in COLS" :key="c.id" :class="[c.id === 'name' ? $style.left : '', sort === c.id ? $style.on : '']"
          :aria-sort="sort === c.id ? (desc ? 'descending' : 'ascending') : undefined" tabindex="0"
          @click="sortBy(c.id)" @keydown.enter.prevent="sortBy(c.id)" @keydown.space.prevent="sortBy(c.id)">
          {{ c.label }}<template v-if="sort === c.id">{{ desc ? ' ▾' : ' ▴' }}</template>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="l in shown" :key="l.key" @contextmenu.prevent="openItemMenu($event, menuOf(l))">
        <td :class="$style.left">
          <span :class="$style.name" v-item-tip="tipOf(l)">
            <img v-if="l.icon" :src="l.icon" alt="" :class="$style.icon">
            <span class="w-trunc" :style="{ color: colourOf(l) }">{{ l.name }}</span>
          </span>
        </td>
        <td class="w-num">{{ qty(l.count) }}</td>
        <td class="w-num w-dim">{{ div(l.unitChaos) }}</td>
        <td class="w-num">{{ div(l.chaos) }}</td>
        <td><span :class="$style.share"><i :style="{ width: Math.max(2, l.chaos / top * 100) + '%' }" /></span></td>
        <td class="w-num" :class="tone(changes.get(l.key))">{{ pct(changes.get(l.key)) }}</td>
        <td class="w-dim w-trunc" :class="$style.tab" :title="l.tabIds.map(nameOfTab).join(', ')">{{ tabText(l) }}</td>
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
import { computed, shallowRef } from 'vue'
import { WButton, vItemTip } from '../ui'
import { formatAmount } from '../ui/format'
import { openItemMenu } from '../ui/tooltip/item-menu'
import type { ItemMenuRef } from '../ui/tooltip/item-menu'
import type { ItemTipRef } from '../ui/tooltip/item-tip'
import type { ValuedLine } from './valuation'

const props = defineProps<{
  lines: ValuedLine[]
  divine: number | null
  // 24h change by line key (D3), from poe.ninja.
  changes: Map<string, number | null>
  tabNames: Map<string, string>
  // A filter is on: the empty row offers to clear it.
  filtered?: boolean
}>()
const emit = defineEmits<{ (e: 'clear'): void }>()

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
  // No 24h change ("—") sorts last either way.
  const missing = (x: number | string) => typeof x === 'number' && Number.isNaN(x)
  return [...props.lines].sort((a, b) => {
    const x = key(a)
    const y = key(b)
    if (missing(x) || missing(y)) return missing(x) === missing(y) ? 0 : missing(x) ? 1 : -1
    return (x < y ? -1 : x > y ? 1 : 0) * dir
  })
})
const shown = computed(() => sorted.value.slice(0, limit.value))
const more = computed(() => Math.max(0, props.lines.length - limit.value))
const top = computed(() => Math.max(1, ...props.lines.map(l => l.chaos)))

const div = (chaos: number) => {
  if (!props.divine) return `${formatAmount(chaos)}c`
  const d = chaos / props.divine
  return d >= 100 ? formatAmount(d) : d >= 1 ? d.toFixed(1) : d >= 0.01 ? d.toFixed(2) : d.toFixed(4)
}
const qty = (n: number) => formatAmount(n)
const pct = (c: number | null | undefined) => c == null ? '—' : `${c > 0 ? '+' : c < 0 ? '−' : ''}${Math.abs(c * 100).toFixed(1)}%`
const tone = (c: number | null | undefined) => c == null || Math.abs(c) < 0.0005 ? 'w-dim' : c > 0 ? 'w-up' : 'w-down'

function colourOf (l: ValuedLine) {
  switch (l.frame) {
    case 3: return 'var(--w-r-unique)'
    case 4: return 'var(--w-r-gem)'
    case 5: return 'var(--w-r-currency)'
    case 6: return 'var(--w-r-divination)'
    default: return 'var(--w-fg)'
  }
}

function tipOf (l: ValuedLine): ItemTipRef {
  const tabs = l.tabIds.map(nameOfTab)
  return { name: l.tipName, variant: l.variant, note: tabs.length ? `In ${tabs.join(', ')}` : undefined, menu: menuOf(l) }
}
function menuOf (l: ValuedLine): ItemMenuRef {
  // Gems, cards and currency: no rarity, so the menu looks them up by name.
  return { name: l.tipName, variant: l.variant, rarity: l.frame === 3 ? 'unique' : undefined }
}
</script>

<style module>
.table { width: 100%; border-collapse: collapse; font-size: var(--w-fs-sm); table-layout: fixed; }
.table th { font-family: var(--w-caps-face); text-transform: var(--w-caps-case); font-size: var(--w-fs-caps); color: var(--w-dim); font-weight: 500; text-align: right; padding: 4px 6px; border-bottom: 1px solid var(--w-line-strong); cursor: pointer; white-space: nowrap; user-select: none; }
.table th:nth-child(1) { width: 34%; }
.table th:nth-child(5) { width: 54px; }
.table th:nth-child(7) { width: 16%; }
.table td { padding: 2px 6px; text-align: right; border-bottom: 1px solid var(--w-line-soft); white-space: nowrap; }
.table tbody tr:hover td { background: var(--w-panel-2); }
.left { text-align: left !important; }
.on { color: var(--w-gold) !important; }
.name { display: flex; align-items: center; gap: 6px; min-width: 0; }
.icon { width: 18px; height: 18px; object-fit: contain; flex: none; }
.share { display: inline-block; width: 44px; height: 5px; background: var(--w-panel-3); vertical-align: middle; }
.share i { display: block; height: 100%; background: color-mix(in srgb, var(--w-gold) 70%, transparent); }
.tab { max-width: 0; overflow: hidden; text-overflow: ellipsis; }
</style>
