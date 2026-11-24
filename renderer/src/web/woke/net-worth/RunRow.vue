<template>
  <!-- One line of a run (Runs view), the shared profit line (ui/line-item.ts):
       click the count or the value to change it, hover for leave out and ⋯,
       right-click for the same menu. -->
  <div :class="[$style.row, 'w-line', { 'w-line-out': out }]" data-run-row tabindex="0" @contextmenu="onMenu" @keydown="onKeys">
    <img v-if="icon" :src="icon" alt="" :class="$style.icon" class="w-line-name"><span v-else :class="$style.icon" />
    <span :class="$style.name" class="w-trunc">
      <span :class="$style.nameText" class="w-line-name"><template v-if="count != null && count !== 1 && !editing"><WLineNum :editable="editable" :mine="edited" :out="out" :label="`Change how many ${name}`" @edit="startEdit('count')">{{ fmt(count) }}</WLineNum> × </template><span v-item-tip="tip">{{ name }}</span></span>
      <span v-if="out" class="w-line-tag">left out</span>
      <span v-else-if="sub" class="w-dim text-xs" :class="$style.sub">{{ sub }}</span>
      <slot name="sub" />
    </span>
    <span class="w-num text-sm" :class="[$style.value, out ? 'w-dim' : tone]">
      <WLineNum :editable="editable" :mine="edited" :out="out" :title="valueTitle" :label="`Change the price of ${name}`" data-run-edit @edit="startEdit('each')">{{ chaos == null ? '—' : `${sign}${amount(chaos)}` }}</WLineNum><Coin v-if="chaos != null" :chaos="!divine" />
    </span>
    <WLineActs :name="name" :out="out" :can-leave-out="canLeaveOut" :entries="entries" :head="headOf" @out="emit('out', $event)" />
    <!-- The editor opens under the row, full width, each box named. -->
    <div v-if="editing" :class="$style.editor" data-run-editor @keydown.esc.stop="editing = false">
      <label :class="$style.field"><span class="w-dim text-xs">How many</span>
        <input ref="countEl" v-model.number="countDraft" type="number" min="0" step="any" class="w-input px-1 rounded" :class="$style.num" :aria-label="`${name}: how many`" @keydown.enter="save"></label>
      <label :class="$style.field"><span class="w-dim text-xs">Price each</span>
        <span :class="$style.priceBox">
          <input ref="eachEl" v-model.number="eachDraft" type="number" min="0" step="any" class="w-input px-1 rounded" :class="$style.num" :aria-label="`${name}: price each`" @keydown.enter="save">
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
import { WButton, WLineActs, WLineNum, lineKeys, lineMenu, openMenu, vItemTip } from '../ui'
import type { ItemTipRef } from '../ui/tooltip/item-tip'
import { itemMenuHead } from '../ui/tooltip/item-menu'
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
const valueTitle = computed(() => props.chaos == null ? 'No price: click to set one' : `${Math.round(props.chaos)} chaos${props.edited ? '. Your count or price' : ''}`)

// The shared line's menu: ⋯, right-click and the keys all do the same.
const state = computed(() => ({ out: props.out, edited: props.edited, editable: props.editable, canLeaveOut: props.canLeaveOut, removable: props.removable }))
const handlers = {
  edit: () => { startEdit('count') },
  reset: () => { emit('reset') },
  out: (on: boolean) => { emit('out', on) },
  remove: () => { emit('remove') }
}
const entries = computed(() => lineMenu(state.value, handlers))
// The item header over the menu, as the item's own right-click shows it.
const headOf = (e: MouseEvent) => props.tip ? itemMenuHead({ name: props.tip.name, type: props.tip.type, variant: props.tip.variant }, e) : null
function onMenu (e: MouseEvent) {
  // The open editor's own boxes and buttons keep the browser's menu.
  if (!entries.value.length || (e.target as Element).closest('input, [data-run-editor]')) return
  openMenu(e, entries.value, headOf(e) ?? undefined)
}
function onKeys (e: KeyboardEvent) { lineKeys(e, state.value, handlers) }

const editing = shallowRef(false)
const countDraft = shallowRef(0)
const eachDraft = shallowRef(0)
const boughtDraft = shallowRef<string | number>('')
const countEl = shallowRef<HTMLInputElement | null>(null)
const eachEl = shallowRef<HTMLInputElement | null>(null)
// What the editor opened with: only what you change is saved.
let opened = { count: 0, eachChaos: 0, bought: '' as string | number }
const round = (n: number) => Math.round(n * 10000) / 10000
function startEdit (field: 'count' | 'each' = 'count') {
  // Already open: keep what you typed, just move to the box.
  if (editing.value) { (field === 'each' ? eachEl.value : countEl.value)?.focus(); return }
  const n = props.count ?? 1
  const each = props.each ?? (props.chaos != null && n > 0 ? props.chaos / n : 0)
  countDraft.value = n
  // Under a divine each: chaos; else divines.
  unit.value = props.divine && each >= props.divine ? 'div' : 'c'
  eachDraft.value = round(inUnit(each))
  boughtDraft.value = props.bought ?? ''
  opened = { count: countDraft.value, eachChaos: each, bought: boughtDraft.value }
  editing.value = true
  // The box you clicked gets the cursor (a cost per map has no count to click).
  nextTick(() => { (field === 'each' ? eachEl.value : countEl.value)?.select() }).catch(() => {})
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
.row { display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; gap: 0 6px; align-items: center; font-size: var(--w-fs-sm); min-height: 22px; }
/* The hover actions lie over the end of the name, not the value: the value
   is clicked to change it. */
/* Each cell on row 1 by hand: the actions share the name's cell. */
.row > :nth-child(1) { grid-area: 1 / 1; } .row > :nth-child(2) { grid-area: 1 / 2; } .row > :nth-child(3) { grid-area: 1 / 3; }
/* Hovered, the name makes room for them, so the chips in it (live, before)
   stay clickable. */
.row:hover > .name, .row:focus-within > .name { padding-right: 3.6em; }
.row > :global(.w-line-acts) { position: relative; top: auto; transform: none; grid-column: 2; grid-row: 1; justify-self: end; }
.icon { width: 18px; height: 18px; object-fit: contain; }
.name { min-width: 0; display: flex; align-items: baseline; gap: 6px; }
.nameText { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.sub { white-space: nowrap; }
.value { text-align: right; white-space: nowrap; }
.editor { grid-column: 1 / -1; grid-row: 2; display: flex; flex-wrap: wrap; align-items: flex-end; gap: 4px 10px; padding: 4px 0 6px 24px; border-bottom: 1px solid var(--w-line); }
.field { display: flex; flex-direction: column; gap: 1px; }
.priceBox { display: inline-flex; align-items: center; gap: 4px; }
.unit { display: inline-flex; border: 1px solid var(--w-line); }
.unit button { background: none; border: 0; padding: 0 6px; font: inherit; font-size: var(--w-fs-xs); color: var(--w-dim); cursor: pointer; }
.unit button.on { background: var(--w-line-strong); color: var(--w-gold); }
.editBtns { display: inline-flex; gap: 4px; margin-left: auto; }
.num { width: 4.6rem; }
</style>
