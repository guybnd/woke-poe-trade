<template>
  <!-- A session's loot line, the shared profit line (ui/line-item.ts): click
       the count or the value to change it, hover for leave out and ⋯,
       right-click for the same menu. -->
  <div :class="[$style.row, 'w-line', { 'w-line-out': line.out }]" tabindex="0" data-farm-loot
    @contextmenu="onMenu" @keydown="onKeys">
    <span v-item-tip="line" class="w-trunc flex items-center gap-1 w-line-name"><WIcon :src="art" fallback="fas fa-coins" />{{ line.name }}<span v-if="line.variant" class="w-dim ml-1">{{ line.variant }}</span><span v-if="line.out" class="w-line-tag">left out</span></span>
    <span class="w-num text-right">
      <input v-if="editing === 'qty'" ref="box" v-model="draft" type="number" min="0" step="1" class="w-input px-1 rounded" :class="$style.box"
        :aria-label="`How many ${line.name}`" title="How many. Enter keeps it, Esc cancels" @keydown.enter.prevent="save" @keydown.esc.prevent.stop="editing = null" @blur="save">
      <WLineNum v-else :out="line.out" :label="`Change how many ${line.name}`" title="How many: click to change" data-farm-qty @edit="startEdit('qty')">×{{ line.qty }}</WLineNum>
    </span>
    <span class="w-num text-right">
      <input v-if="editing === 'each'" ref="box" v-model="draft" type="number" min="0" step="any" class="w-input px-1 rounded" :class="$style.box"
        :aria-label="`Your price for one ${line.name}, in chaos`" title="Your price for one, in chaos. Enter keeps it, Esc cancels" @keydown.enter.prevent="save" @keydown.esc.prevent.stop="editing = null" @blur="save">
      <WLineNum v-else :mine="line.each != null" :out="line.out" :title="valueTitle" :label="`${line.each != null ? 'Change your' : 'Set your'} price for ${line.name}`" data-farm-price @edit="startEdit('each')">{{ valueText }}</WLineNum>
    </span>
    <WLineActs :name="line.name" :out="!!line.out" :entries="entries" :head="headOf" @out="emit('out', $event)" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, shallowRef } from 'vue'
import { WIcon, WLineActs, WLineNum, lineKeys, lineMenu, openMenu, vItemTip } from '../ui'
import { ninjaIcon } from '../ui/game-icons'
import { itemMenuHead } from '../ui/tooltip/item-menu'
import type { LootLine } from './farming'

const props = defineProps<{
  line: LootLine
  // Sell value of one as read (after the bulk discount and junk rule); null: no price.
  sell: number | null
  fmt: (chaos: number) => string
}>()
const emit = defineEmits<{
  qty: [n: number]
  // Your price for one, in chaos; null: poe.ninja's again.
  price: [chaos: number | null]
  out: [on: boolean]
  remove: []
}>()

const art = computed(() => ninjaIcon(props.line.type, props.line.name) ?? undefined)
const each = computed(() => props.line.each ?? props.sell)
const valueText = computed(() => {
  const e = each.value
  if (e == null) return 'no price'
  if (e === 0 && props.line.each == null) return 'junk'
  return props.fmt(e * props.line.qty)
})
const valueTitle = computed(() => {
  const e = each.value
  const one = e != null ? `${props.fmt(e)} each` : 'No price: click to set yours'
  if (props.line.each != null) return `Your price: ${one}${props.sell != null ? ` (poe.ninja: ${props.fmt(props.sell)})` : ''}`
  return one
})

const editing = shallowRef<'qty' | 'each' | null>(null)
const draft = shallowRef<string | number>('')
const box = shallowRef<HTMLInputElement | null>(null)
let opened = ''
function startEdit (what: 'qty' | 'each') {
  const v = what === 'qty' ? props.line.qty : each.value
  draft.value = opened = v != null && v > 0 ? String(Number(v.toPrecision(6))) : ''
  editing.value = what
  nextTick(() => { box.value?.focus(); box.value?.select() }).catch(() => {})
}
function save () {
  const what = editing.value
  if (!what) return
  editing.value = null
  const text = String(draft.value).trim()
  const n = Number(text)
  if (text === opened || text === '' || !Number.isFinite(n) || n < 0) return
  if (what === 'qty') emit('qty', Math.round(n))
  else emit('price', n)
}

const state = computed(() => ({ out: props.line.out, edited: props.line.each != null, editable: true, canLeaveOut: true, removable: true }))
const handlers = {
  edit: () => { startEdit('each') },
  reset: () => { emit('price', null) },
  out: (on: boolean) => { emit('out', on) },
  remove: () => { emit('remove') }
}
const entries = computed(() => lineMenu(state.value, handlers, { edit: props.line.each != null ? 'Change my price…' : 'Set my price…', reset: "Back to poe.ninja's price" },
  props.line.out ? [] : [{ label: 'Change how many…', icon: 'fas fa-hashtag', action: () => { startEdit('qty') } }]))
const headOf = (e: MouseEvent) => itemMenuHead({ name: props.line.name, type: props.line.type, variant: props.line.variant }, e)
function onMenu (e: MouseEvent) {
  if ((e.target as Element).closest('input')) return
  openMenu(e, entries.value, headOf(e) ?? undefined)
}
function onKeys (e: KeyboardEvent) { lineKeys(e, state.value, handlers) }
</script>

<style module>
.row { display: grid; grid-template-columns: minmax(0, 1fr) 3.2rem 4.8rem 2.6em; gap: 4px; align-items: center; min-height: 24px; }
.box { width: 100%; text-align: right; }
</style>
