<template>
  <!-- A best drop in the run summary, the shared profit line (ui/line-item.ts):
       click the value to set your price each, hover for leave out and ⋯,
       right-click for the same menu. -->
  <div :class="[$style.drop, 'w-line', { 'w-line-out': drop.out }]" tabindex="0" data-summary-drop
    @contextmenu="onMenu" @keydown="onKeys">
    <img v-if="drop.icon && !badArt" :src="drop.icon" alt="" :class="$style.art" class="w-line-name" @error="badArt = true"><span v-else :class="$style.art" />
    <span :class="$style.text">
      <span v-item-tip="tip" class="w-trunc w-line-name">{{ drop.name }}</span>
      <span class="w-dim w-num text-xs" :class="$style.sub">
        <span v-if="drop.count > 1">{{ drop.count }} × ·</span>
        <input v-if="editing" ref="box" v-model="draft" type="number" min="0" step="any" class="w-input px-1 rounded" :class="$style.box"
          :aria-label="`Your price for one ${drop.name}, in chaos`" title="Your price for one, in chaos. Enter keeps it, Esc cancels"
          @keydown.enter.prevent="save" @keydown.esc.prevent.stop="editing = false" @blur="save">
        <WLineNum v-else :mine="drop.edited" :out="drop.out" :title="`${money(each)} each`" :label="`${drop.edited ? 'Change your' : 'Set your'} price for ${drop.name}`" data-summary-price @edit="startEdit">{{ money(drop.chaos) }}</WLineNum>
        <span v-if="drop.out" class="w-line-tag">left out</span>
      </span>
    </span>
    <WLineActs :name="drop.name" :out="!!drop.out" :can-leave-out="!drop.manualId" :entries="entries" :head="headOf" @out="emit('out', $event)" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, shallowRef } from 'vue'
import { WLineActs, WLineNum, lineKeys, lineMenu, openMenu, vItemTip } from '../ui'
import type { ItemTipRef } from '../ui'
import { formatChaos } from '../ui/format'
import { itemMenuHead } from '../ui/tooltip/item-menu'
import type { SummaryDrop } from './run-summary'

const props = defineProps<{ drop: SummaryDrop, tip: ItemTipRef, divine: number | null }>()
const emit = defineEmits<{
  // Your price for one, in chaos; null: back to as read.
  (e: 'price', chaos: number | null): void
  (e: 'out', on: boolean): void
  (e: 'remove'): void
}>()

const money = (chaos: number) => formatChaos(chaos, props.divine)
const each = computed(() => props.drop.chaos / Math.max(1, props.drop.count))
const badArt = shallowRef(false)

const editing = shallowRef(false)
const draft = shallowRef<string | number>('')
const box = shallowRef<HTMLInputElement | null>(null)
let opened = ''
function startEdit () {
  if (editing.value) { box.value?.focus(); return }
  draft.value = opened = String(Number(each.value.toPrecision(6)))
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

const state = computed(() => ({ out: props.drop.out, edited: props.drop.edited, editable: true, canLeaveOut: !props.drop.manualId, removable: !!props.drop.manualId }))
const handlers = {
  edit: startEdit,
  reset: () => { emit('price', null) },
  out: (on: boolean) => { emit('out', on) },
  remove: () => { emit('remove') }
}
const entries = computed(() => lineMenu(state.value, handlers, { edit: props.drop.edited ? 'Change my price…' : 'Set my price…' }))
const headOf = (e: MouseEvent) => itemMenuHead({ name: props.tip.name, type: props.tip.type, variant: props.tip.variant }, e)
function onMenu (e: MouseEvent) {
  if ((e.target as Element).closest('input')) return
  openMenu(e, entries.value, headOf(e) ?? undefined)
}
function onKeys (e: KeyboardEvent) { lineKeys(e, state.value, handlers) }
</script>

<style module>
.drop { display: flex; gap: 6px; align-items: center; border: 1px solid var(--w-line); padding: 3px 4px; min-width: 0; }
.art { width: 32px; height: 32px; flex: none; object-fit: contain; }
.text { display: flex; flex-direction: column; min-width: 0; flex: 1; font-size: var(--w-fs-sm); }
.sub { display: flex; align-items: baseline; gap: 4px; }
.box { width: 4.4rem; }
</style>
