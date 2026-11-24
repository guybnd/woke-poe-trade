<template>
  <!-- One line of a run (Runs view): its item, how many, its value. Hover
       shows edit (count and price), leave out and, where it applies, remove. -->
  <div :class="[$style.row, { [$style.out]: out }]" data-run-row>
    <img v-if="icon" :src="icon" alt="" :class="$style.icon"><span v-else :class="$style.icon" />
    <span :class="$style.name" class="w-trunc">
      <span v-item-tip="tip" :class="$style.nameText">{{ count != null && count !== 1 && !editing ? `${fmt(count)} × ` : '' }}{{ name }}</span>
      <span v-if="sub" class="w-dim text-xs" :class="$style.sub">{{ sub }}</span>
      <slot name="sub" />
    </span>
    <span class="w-num text-sm" :class="[$style.value, out ? 'w-dim' : tone]" :title="valueTitle">
      <i v-if="edited" :class="$style.dot" title="Your count or price" />{{ chaos == null ? '—' : `${sign}${amount(chaos)}` }}<Coin v-if="chaos != null" :chaos="!divine" />
    </span>
    <span :class="[$style.acts, { [$style.actsOn]: editing }]">
      <button v-if="editable && !out" type="button" :class="$style.act" :title="editTitle" :aria-label="`Edit ${name}`" data-run-edit @click="startEdit"><i class="fas fa-pen" /></button>
      <button v-if="edited && !out" type="button" :class="$style.act" title="Back to as read" :aria-label="`Reset ${name}`" @click="emit('reset')"><i class="fas fa-undo" /></button>
      <button v-if="canLeaveOut" type="button" :class="$style.act" :title="out ? 'Count it again' : 'Leave out of the run (a long shot, a lucky one-off)'" :aria-label="out ? `Count ${name} again` : `Leave out ${name}`" :aria-pressed="out" data-run-leave-out @click="emit('out', !out)"><i :class="out ? 'fas fa-undo' : 'fas fa-ban'" /></button>
      <button v-if="removable" type="button" :class="$style.act" title="Remove" :aria-label="`Remove ${name}`" @click="emit('remove')"><i class="fas fa-trash-alt" /></button>
    </span>
    <!-- The editor opens under the row, full width, each box named. -->
    <div v-if="editing" :class="$style.editor" data-run-editor @keydown.esc.stop="editing = false">
      <label :class="$style.field"><span class="w-dim text-xs">How many</span>
        <input ref="countEl" v-model.number="countDraft" type="number" min="0" step="any" class="w-input px-1 rounded" :class="$style.num" :aria-label="`${name}: how many`" @keydown.enter="save"></label>
      <label :class="$style.field"><span class="w-dim text-xs">Price each</span>
        <span :class="$style.priceBox">
          <input v-model.number="eachDraft" type="number" min="0" step="any" class="w-input px-1 rounded" :class="$style.num" :aria-label="`${name}: price each`" @keydown.enter="save">
          <span v-if="divine" :class="$style.unit" role="group" aria-label="Price in">
            <button type="button" :class="{ [$style.on]: unit === 'c' }" :aria-pressed="unit === 'c'" @click="setUnit('c')">c</button>
            <button type="button" :class="{ [$style.on]: unit === 'div' }" :aria-pressed="unit === 'div'" @click="setUnit('div')">div</button>
          </span>
          <span v-else class="w-dim text-xs">c</span>
        </span></label>
      <label v-if="bought !== undefined" :class="$style.field"><span class="w-dim text-xs">Bought (optional)</span>
        <input v-model="boughtDraft" type="number" min="0" step="1" class="w-input px-1 rounded" :class="$style.num" :aria-label="`${name}: bought`" @keydown.enter="save"></label>
      <span :class="$style.editBtns">
        <WButton size="sm" data-run-edit-save @click="save">Save</WButton>
        <WButton size="sm" variant="ghost" @click="editing = false">Cancel</WButton>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, shallowRef } from 'vue'
import { WButton, vItemTip } from '../ui'
import type { ItemTipRef } from '../ui/tooltip/item-tip'
import { formatAmount } from '../ui/format'
import Coin from './Coin.vue'

const props = withDefaults(defineProps<{
  icon?: string
  name: string
  tip: ItemTipRef | null
  // How many (null: not a count, such as a cost per map).
  count: number | null
  // Value in chaos, unsigned (null: no price).
  chaos: number | null
  sign?: '+' | '−' | ''
  sub?: string
  divine: number | null
  out?: boolean
  edited?: boolean
  editable?: boolean
  canLeaveOut?: boolean
  removable?: boolean
  // A cost line's "bought up front" (undefined: not a cost line).
  bought?: number | null
  // What one is worth, for the editor (default: value / count).
  each?: number | null
}>(), { sign: '', sub: undefined, icon: undefined, out: false, edited: false, editable: true, canLeaveOut: true, removable: false, bought: undefined, each: null })
const emit = defineEmits<{
  (e: 'edit', v: { count?: number, each?: number, bought?: number | null }): void
  (e: 'out', v: boolean): void
  (e: 'reset' | 'remove'): void
}>()

const toDiv = (chaos: number) => props.divine ? chaos / props.divine : chaos
// The editor's price: in chaos or divines, your pick (decimals both ways).
const unit = shallowRef<'c' | 'div'>('c')
const inUnit = (chaos: number) => unit.value === 'div' && props.divine ? chaos / props.divine : chaos
const fromUnit = (n: number) => unit.value === 'div' && props.divine ? n * props.divine : n
function setUnit (u: 'c' | 'div') {
  if (u === unit.value) return
  // Untouched: convert the price it opened with (no rounding drift).
  const same = Number(eachDraft.value) === round(inUnit(opened.eachChaos))
  const chaos = same ? opened.eachChaos : fromUnit(Number(eachDraft.value) || 0)
  unit.value = u
  eachDraft.value = round(inUnit(chaos))
}
const fmt = (n: number) => formatAmount(n)
const amount = (chaos: number) => { const d = toDiv(chaos); return Math.abs(d) >= 100 ? formatAmount(d) : d.toFixed(Math.abs(d) < 1 && props.divine ? 2 : 1) }
const tone = computed(() => props.sign === '+' ? 'w-up' : props.sign === '−' ? 'w-down' : '')
const valueTitle = computed(() => props.chaos != null ? `${Math.round(props.chaos)} chaos` : 'No price: edit it to count it')
const editTitle = 'Change how many and the price each'

const editing = shallowRef(false)
const countDraft = shallowRef(0)
const eachDraft = shallowRef(0)
const boughtDraft = shallowRef<string | number>('')
const countEl = shallowRef<HTMLInputElement | null>(null)
// What the editor opened with: only what you change is saved.
let opened = { count: 0, eachChaos: 0, bought: '' as string | number }
const round = (n: number) => Math.round(n * 10000) / 10000
function startEdit () {
  const n = props.count ?? 1
  const each = props.each ?? (props.chaos != null && n > 0 ? props.chaos / n : 0)
  countDraft.value = n
  // Under a divine each: chaos; else divines.
  unit.value = props.divine && each >= props.divine ? 'div' : 'c'
  eachDraft.value = round(inUnit(each))
  boughtDraft.value = props.bought ?? ''
  opened = { count: countDraft.value, eachChaos: each, bought: boughtDraft.value }
  editing.value = true
  nextTick(() => { countEl.value?.select() }).catch(() => {})
}
const valid = (v: unknown) => v !== '' && v != null && Number.isFinite(Number(v)) && Number(v) >= 0
function save () {
  // A cleared field is a mistake, not a zero.
  if (!valid(countDraft.value) || !valid(eachDraft.value)) return
  const count = Number(countDraft.value)
  const each = Number(eachDraft.value)
  const v: { count?: number, each?: number, bought?: number | null } = {}
  if (count !== opened.count) v.count = count
  // Changed only if it differs from what opened, in the unit shown now.
  if (each !== round(inUnit(opened.eachChaos))) v.each = fromUnit(each)
  if (props.bought !== undefined && String(boughtDraft.value) !== String(opened.bought)) {
    const b = boughtDraft.value === '' ? null : Number(boughtDraft.value)
    v.bought = b != null && Number.isFinite(b) && b >= 0 ? Math.round(b) : null
  }
  if (Object.keys(v).length) emit('edit', v)
  editing.value = false
}
</script>

<style module>
.row { display: grid; grid-template-columns: 18px minmax(0, 1fr) auto auto; gap: 0 6px; align-items: center; font-size: var(--w-fs-sm); min-height: 22px; }
.icon { width: 18px; height: 18px; object-fit: contain; }
.name { min-width: 0; display: flex; align-items: baseline; gap: 6px; }
.nameText { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.sub { white-space: nowrap; }
.value { text-align: right; white-space: nowrap; }
.dot { display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: var(--w-gold); margin-right: 4px; vertical-align: middle; }
.acts { display: flex; justify-content: flex-end; gap: 6px; visibility: hidden; }
.row:hover .acts, .row:focus-within .acts, .out .acts, .acts.actsOn { visibility: visible; }
.act { background: none; border: 0; padding: 0; color: var(--w-dim); cursor: pointer; font-size: var(--w-fs-xs); }
.act:hover { color: var(--w-gold); }
.out .nameText { text-decoration: line-through; color: var(--w-dim); }
.out .value { text-decoration: line-through; }
.editor { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: flex-end; gap: 4px 10px; padding: 4px 0 6px 24px; border-bottom: 1px solid var(--w-line); }
.field { display: flex; flex-direction: column; gap: 1px; }
.priceBox { display: inline-flex; align-items: center; gap: 4px; }
.unit { display: inline-flex; border: 1px solid var(--w-line); }
.unit button { background: none; border: 0; padding: 0 6px; font: inherit; font-size: var(--w-fs-xs); color: var(--w-dim); cursor: pointer; }
.unit button.on { background: var(--w-line-strong); color: var(--w-gold); }
.editBtns { display: inline-flex; gap: 4px; margin-left: auto; }
.num { width: 4.6rem; }
</style>
