<template>
  <!-- One card of a deck session, the shared profit line (ui/line-item.ts):
       click the value to set your price, hover for leave out and ⋯,
       right-click for the same menu. -->
  <div :class="[$style.row, 'w-line', { 'w-line-out': row.out, [$style.cheap]: cheap }]" :tabindex="editable ? 0 : undefined"
    @contextmenu="onMenu" @keydown="onKeys">
    <WIcon :src="art" fallback="fas fa-clone" class="w-line-name" />
    <span :class="$style.name"><span v-item-tip="{ type: 'DivinationCard', name: row.name }" class="w-trunc w-line-name">{{ row.name }}</span><span v-if="row.out" class="w-line-tag">left out</span></span>
    <span class="w-num" :class="cheap ? '' : 'w-dim'">×{{ row.qty }}</span>
    <span class="w-num text-right" :data-held="held && !row.mine ? '' : undefined" :title="held && !row.mine ? valueTitle : undefined">
      <input v-if="editing" ref="box" v-model="draft" type="number" min="0" step="any" class="w-input px-1 rounded" :class="$style.box"
        :aria-label="`Your price for one ${row.name}, in chaos`" title="Your price for one, in chaos. Enter keeps it, Esc cancels"
        @keydown.enter.prevent="save" @keydown.esc.prevent.stop="editing = false" @blur="save">
      <template v-else><i v-if="held && !row.mine" class="fas fa-pause-circle w-dim" :class="$style.held" /><WLineNum :editable="editable" :mine="row.mine" :out="row.out" :title="valueTitle" :label="`${row.mine ? 'Change your' : 'Set your'} price for ${row.name}`" data-deck-price @edit="startEdit">{{ row.each != null ? money(row.total) : '—' }}</WLineNum></template>
    </span>
    <WLineActs v-if="editable" :name="row.name" :out="!!row.out" :entries="entries" @out="emit('out', $event)" /><span v-else />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, shallowRef } from 'vue'
import { WIcon, WLineActs, WLineNum, lineKeys, lineMenu, openMenu, vItemTip } from '../ui'
import { formatChaos } from '../ui/format'
import { ninjaIcon } from '../ui/game-icons'
import type { CardRow } from './deck'
import type { HeldPrice } from './prices'

const props = withDefaults(defineProps<{
  row: CardRow
  divine: number | null
  held?: HeldPrice | null
  // poe.ninja's line for the value's hover (unpriced, fake price).
  title?: string
  cheap?: boolean
  editable?: boolean
}>(), { held: null, title: undefined, cheap: false, editable: false })
const emit = defineEmits<{
  // Your price for one, in chaos; null: poe.ninja's again.
  (e: 'price', chaos: number | null): void
  (e: 'out', on: boolean): void
}>()

const art = computed(() => ninjaIcon('DivinationCard', props.row.name) ?? undefined)
const money = (chaos: number) => formatChaos(chaos, props.divine)
const valueTitle = computed(() => {
  const each = props.row.each != null ? `${money(props.row.each)} each` : ''
  if (props.row.mine) return `Your price: ${each}`
  return [props.title, each].filter(Boolean).join('. ') || undefined
})

const editing = shallowRef(false)
const draft = shallowRef<string | number>('')
const box = shallowRef<HTMLInputElement | null>(null)
let opened = ''
function startEdit () {
  if (editing.value) { box.value?.focus(); return }
  const each = props.row.each
  draft.value = opened = each != null && each > 0 ? String(Number(each.toPrecision(6))) : ''
  editing.value = true
  nextTick(() => { box.value?.focus(); box.value?.select() }).catch(() => {})
}
function save () {
  if (!editing.value) return
  editing.value = false
  const text = String(draft.value).trim()
  const n = Number(text)
  // Unchanged, emptied or not a number: nothing changes.
  if (text === opened || text === '' || !Number.isFinite(n) || n < 0) return
  emit('price', n)
}

const state = computed(() => ({ out: props.row.out, edited: props.row.mine, editable: props.editable, canLeaveOut: props.editable }))
const handlers = {
  edit: startEdit,
  reset: () => { emit('price', null) },
  out: (on: boolean) => { emit('out', on) }
}
const entries = computed(() => lineMenu(state.value, handlers, { edit: props.row.mine ? 'Change my price…' : 'Set my price…', reset: "Back to poe.ninja's price" }))
function onMenu (e: MouseEvent) {
  if (!props.editable || (e.target as Element).closest('input')) return
  openMenu(e, entries.value)
}
function onKeys (e: KeyboardEvent) { if (props.editable) lineKeys(e, state.value, handlers) }
</script>

<style module>
.row { display: grid; grid-template-columns: var(--w-icon, 16px) minmax(0, 1fr) auto 4.5rem 2.6em; gap: 6px; align-items: center; min-height: 22px; }
.name { min-width: 0; display: flex; align-items: baseline; gap: 6px; }
.held { margin-right: 3px; font-size: 0.85em; }
.cheap { color: var(--w-faint); }
.box { width: 4.4rem; text-align: right; }
</style>
