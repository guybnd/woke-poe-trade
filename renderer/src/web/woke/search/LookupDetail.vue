<template>
  <div>
    <div :class="$style.title">
      <WIcon v-if="isImageIcon(card.icon)" :src="card.icon" size="lg" />
      <i v-else :class="card.icon" />
      <span>{{ card.title ?? card.name }}</span>
    </div>
    <div v-for="(section, i) in card.sections" :key="i" :class="$style.section">
      <div v-if="section.label" :class="$style.label">{{ section.label }}</div>
      <p v-for="(t, j) in section.text ?? []" :key="'t' + j" class="w-dim" :class="$style.text">{{ t }}</p>
      <div v-for="(row, j) in section.rows ?? []" :key="'r' + j" v-item-tip="row.item ?? null" :class="$style.row">
        <span :class="$style.name">
          <WIcon v-if="row.item || hasItems(section)" :src="row.item ? rowIcon(row.item.name) : undefined" />
          <span class="w-trunc" :class="row.dim ? 'w-dim' : undefined">{{ row.label }}</span>
        </span>
        <WPrice v-if="row.chaos !== undefined" :bulk="!!row.bulk" :chaos="row.chaos" :divine="divine" />
        <span v-else-if="row.value" :class="[$style.value, row.dim ? 'w-dim' : undefined]">{{ row.value }}</span>
        <button v-if="row.action" class="w-icon-btn" :class="$style.rowAct" :title="row.action.label" :aria-label="row.action.label" @click="$emit('act', row.action)"><i :class="'trade' in row.action ? 'fas fa-search' : 'fas fa-arrow-right'" /></button>
      </div>
      <table v-if="section.table" :class="$style.table">
        <thead><tr><th v-for="h in section.table.head" :key="h" :class="h === section.table.head[section.table.priceAt ?? -1] ? $style.num : undefined">{{ h }}</th></tr></thead>
        <tbody>
          <tr v-for="(row, j) in section.table.rows" :key="j">
            <td v-for="(cell, k) in tableCells(row, section.table.priceAt)" :key="k" :class="cell === PRICE ? $style.num : (k === 0 && isNumber(cell) ? $style.first : undefined)">
              <WPrice v-if="cell === PRICE" :chaos="row.chaos ?? null" :divine="divine" />
              <template v-else-if="typeof cell === 'string'">{{ cell }}</template>
              <template v-else>{{ cell.text }}<span v-if="cell.sub" class="w-dim" :class="$style.sub">{{ cell.sub }}</span></template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="card.actions.length" :class="$style.acts">
      <WButton v-for="a in card.actions" :key="a.label" size="sm" @click="$emit('act', a)">{{ a.label }}</WButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { WButton, WIcon, WPrice, vItemTip } from '../ui'
import { itemArt } from '../ui/game-icons'
import { isImageIcon } from './lookups/types'
import type { LookupAction, LookupCard, LookupSection, LookupTableRow } from './lookups/types'

defineProps<{ card: LookupCard, divine: number | null }>()

// An item row's art, whatever kind of item it is (rows name it, not its kind).
function rowIcon (name: string): string | undefined {
  return itemArt({ name }) ?? undefined
}
// Rows without an item keep a blank icon box so the names line up.
const hasItems = (section: LookupSection) => !!section.rows?.some(r => r.item)

// The row's cells with the price slotted in where the table wants it.
const PRICE = Symbol('price')
function tableCells (row: LookupTableRow, priceAt?: number) {
  const cells: Array<LookupTableRow['cells'][number] | typeof PRICE> = [...row.cells]
  if (priceAt != null) cells.splice(priceAt, 0, PRICE)
  return cells
}
// "15–25" or "12–14 / 8–9" stays on one line; words may wrap.
const isNumber = (cell: unknown) => typeof cell === 'string' && /^[-\d.–\s/]+$/.test(cell)
defineEmits<{ (e: 'act', action: LookupAction): void }>()
</script>

<style module>
.title { display: flex; align-items: center; gap: var(--w-s2); margin-bottom: var(--w-s2); font-size: var(--w-fs-lg); }
.section { margin-top: var(--w-s2); }
.label { font-size: var(--w-fs-caps); font-weight: var(--w-caps-weight); letter-spacing: 0.05em; text-transform: var(--w-caps-case); color: var(--w-dim); font-family: var(--w-caps-face); border-bottom: 1px solid var(--w-line); padding-bottom: 2px; }
.text { margin: 4px 0; }
.row { display: flex; align-items: center; justify-content: space-between; gap: var(--w-s3); min-height: var(--w-row-h); border-bottom: 1px solid var(--w-line-soft); }
.value { text-align: right; min-width: 0; }
.rowAct { flex: none; }
.name { flex: 1 1 auto; display: flex; align-items: center; gap: var(--w-s2); min-width: 0; }
.table { width: 100%; border-collapse: collapse; margin-top: var(--w-s1); }
.table th { text-align: left; font-weight: var(--w-caps-weight); font-family: var(--w-caps-face); font-size: var(--w-fs-caps); color: var(--w-dim); border-bottom: 1px solid var(--w-line); padding: 0 var(--w-s2) 2px 0; }
.table td { border-bottom: 1px solid var(--w-line-soft); padding: 3px var(--w-s2) 3px 0; vertical-align: top; }
.table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.table .first { white-space: nowrap; font-variant-numeric: tabular-nums; }
.sub { display: block; font-size: var(--w-fs-sm); }
.acts { display: flex; flex-wrap: wrap; gap: var(--w-s1); margin-top: var(--w-s3); }
</style>
