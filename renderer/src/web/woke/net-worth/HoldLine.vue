<template>
  <!-- An item of Holdings outside its table (the session list's changes, Price
       moves today), the shared profit line (ui/line-item.ts): click the number
       to set your price for one, hover for leave out and ⋯, right-click for
       the same menu. Both act on the item, as in the table. -->
  <div :class="[$style.row, 'w-line', { 'w-line-out': out }]" tabindex="0" data-hold-line @contextmenu="onMenu" @keydown="onKeys">
    <img v-if="icon" :src="icon" alt="" :class="$style.icon" class="w-line-name"><span v-else :class="$style.icon" />
    <span :class="$style.name"><span v-item-tip="tip" class="w-trunc w-line-name">{{ text }}</span><span v-if="out" class="w-line-tag">left out</span></span>
    <span class="w-num" :class="$style.value">
      <input v-if="editing" ref="box" v-model="draft" type="number" min="0" step="any" class="w-input px-1 rounded" :class="$style.box"
        :aria-label="`Your price for one ${name}, in chaos`" title="Your price for one, in chaos. Enter keeps it, Esc cancels"
        @keydown.enter.prevent="save" @keydown.esc.prevent.stop="editing = false" @blur="save">
      <WLineNum v-else :mine="mine" :out="out" :title="title" :label="`${mine ? 'Change my' : 'Set my'} price for one ${name}`" data-hold-price @edit="startEdit"><slot /></WLineNum>
    </span>
    <WLineActs :name="name" :out="out" :entries="entries" :head="headOf" @out="emit('out', $event)" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, shallowRef } from 'vue'
import { WLineActs, WLineNum, lineKeys, lineMenu, openMenu, vItemTip } from '../ui'
import type { ItemTipRef } from '../ui/tooltip/item-tip'
import { itemMenuHead } from '../ui/tooltip/item-menu'

const props = withDefaults(defineProps<{
  icon?: string
  // The item's name, and the row's text ("3 × Divine Orb").
  name: string
  text: string
  tip: ItemTipRef | null
  mine?: boolean
  out?: boolean
  // What one is worth now, in chaos (the editor opens on it).
  each?: number | null
  title?: string
}>(), { icon: undefined, mine: false, out: false, each: null, title: undefined })
const emit = defineEmits<{
  // Your price for one, in chaos; null: poe.ninja's again.
  price: [chaos: number | null]
  out: [on: boolean]
}>()

const editing = shallowRef(false)
const draft = shallowRef<string | number>('')
const box = shallowRef<HTMLInputElement | null>(null)
let opened = ''
function startEdit () {
  const v = props.each
  draft.value = opened = v != null && v > 0 ? String(Number(v.toPrecision(6))) : ''
  editing.value = true
  nextTick(() => { box.value?.focus(); box.value?.select() }).catch(() => {})
}
function save () {
  if (!editing.value) return
  editing.value = false
  const text = String(draft.value).trim()
  const n = Number(text)
  if (text === opened || text === '' || !Number.isFinite(n) || n < 0) return
  emit('price', n)
}

const state = computed(() => ({ out: props.out, edited: props.mine }))
const handlers = {
  edit: () => { startEdit() },
  reset: () => { emit('price', null) },
  out: (on: boolean) => { emit('out', on) }
}
const entries = computed(() => lineMenu(state.value, handlers, { edit: props.mine ? 'Change my price…' : 'Set my price…', reset: "Back to poe.ninja's price" }))
const headOf = (e: MouseEvent) => {
  const t = props.tip
  return t ? itemMenuHead(t.menu ?? { name: t.name, type: t.type, variant: t.variant }, e) : null
}
function onMenu (e: MouseEvent) {
  if ((e.target as Element).closest('input')) return
  openMenu(e, entries.value, headOf(e) ?? undefined)
}
function onKeys (e: KeyboardEvent) { lineKeys(e, state.value, handlers) }
</script>

<style module>
.row { display: grid; grid-template-columns: 16px minmax(0, 1fr) auto; gap: 6px; align-items: center; font-size: var(--w-fs-sm); min-height: 20px; }
/* The hover actions lie over the end of the name, not the value: the value
   is clicked to change it. */
/* Each cell on row 1 by hand: the actions share the name's cell. */
.row > :nth-child(1) { grid-area: 1 / 1; } .row > :nth-child(2) { grid-area: 1 / 2; } .row > :nth-child(3) { grid-area: 1 / 3; }
.row > :global(.w-line-acts) { position: relative; top: auto; transform: none; grid-column: 2; grid-row: 1; justify-self: end; }
.icon { width: 16px; height: 16px; object-fit: contain; flex: none; }
.name { min-width: 0; display: flex; align-items: baseline; gap: 6px; }
.value { text-align: right; white-space: nowrap; }
.box { width: 4.4rem; text-align: right; }
</style>
