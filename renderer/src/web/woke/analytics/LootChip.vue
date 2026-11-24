<template>
  <!-- A map's loot line, the shared profit line (ui/line-item.ts) in chip form:
       click to move it to another map; right-click (or Enter, Delete when
       focused) for your price and leave out. Left out: struck, not counted.
       Your price: a gold pin. -->
  <span v-if="editing" :class="[$style.loot, 'w-line']" :style="{ color }">
    <WIcon :src="art" fallback="fas fa-coins" class="mr-1" /><span v-item-tip="line">{{ line.name }}</span>
    <input ref="box" v-model="draft" type="number" min="0" step="any" class="w-input px-1 rounded" :class="$style.box"
      :aria-label="`Your price for one ${line.name}, in chaos`" title="Your price for one, in chaos. Enter keeps it, Esc cancels"
      @keydown.enter.prevent="save" @keydown.esc.prevent.stop="editing = false" @blur="save">
  </span>
  <button v-else type="button" :style="{ color }" :class="[$style.loot, 'w-line', { 'w-line-out': line.out, [$style.out]: line.out, [$style.moving]: moving }]"
    :title="title" v-item-tip="line" data-loot-line
    @click="emit('pick')" @contextmenu="onMenu" @keydown="onKeys"><i v-if="mine && !line.out" class="fas fa-thumbtack" :class="$style.pin" aria-hidden="true" /><WIcon :src="art" fallback="fas fa-coins" class="mr-1 w-line-name" /><span class="w-line-name">{{ line.name }}<template v-if="line.qty > 1"> ×{{ line.qty }}</template></span></button>
</template>

<script setup lang="ts">
import { computed, nextTick, shallowRef } from 'vue'
import { WIcon, lineKeys, lineMenu, openMenu, vItemTip } from '../ui'
import { ninjaIcon } from '../ui/game-icons'
import { itemMenuHead } from '../ui/tooltip/item-menu'
import type { SavedLoot } from './types'

const props = defineProps<{
  line: SavedLoot
  color: string
  // Its worth, as the list shows it ("12.5 div", "no price").
  worth: string
  moving?: boolean
}>()
const emit = defineEmits<{
  pick: []
  // Your price for one, in chaos; null: poe.ninja's again.
  price: [chaos: number | null]
  out: [on: boolean]
}>()

const art = computed(() => ninjaIcon(props.line.type, props.line.name) ?? undefined)
const mine = computed(() => props.line.read !== undefined)
const title = computed(() => {
  const bits = [props.line.out ? `Left out (${props.worth})` : mine.value ? `Your price: ${props.worth}` : props.worth]
  bits.push('Click to move to another map. Right-click for your price or leave out.')
  return bits.join('. ')
})

const editing = shallowRef(false)
const draft = shallowRef<string | number>('')
const box = shallowRef<HTMLInputElement | null>(null)
let opened = ''
function startEdit () {
  const each = props.line.chaos
  draft.value = opened = each != null && each > 0 ? String(Number(each.toPrecision(6))) : ''
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

const state = computed(() => ({ out: props.line.out, edited: mine.value, editable: true, canLeaveOut: true }))
const handlers = {
  edit: startEdit,
  reset: () => { emit('price', null) },
  out: (on: boolean) => { emit('out', on) }
}
const entries = computed(() => lineMenu(state.value, handlers, { edit: mine.value ? 'Change my price…' : 'Set my price…', reset: "Back to poe.ninja's price" },
  [{ label: 'Move to another map', icon: 'fas fa-arrows-alt', keys: 'Enter', action: () => { emit('pick') } }])
  // Enter on the chip moves it, so your price is F2 here.
  .map(x => 'keys' in x && x.keys === 'Enter' && x.label !== 'Move to another map' ? { ...x, keys: 'F2' } : x))
function onMenu (e: MouseEvent) {
  openMenu(e, entries.value, itemMenuHead({ name: props.line.name, type: props.line.type, variant: props.line.variant }, e) ?? undefined)
}
function onKeys (e: KeyboardEvent) {
  // Enter on a button clicks it (move); Delete leaves out, F2 sets your price.
  if (e.key === 'F2' && !props.line.out) { e.preventDefault(); startEdit(); return }
  if (e.key === 'Delete') lineKeys(e, state.value, handlers)
}
</script>

<style module>
.loot {
  font-size: var(--w-fs-xs);
  padding: 0 6px;
  border-radius: var(--w-r-sm);
  background: var(--w-panel-3);
  border: 1px solid transparent;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
}
.loot:hover { border-color: var(--w-line-strong); }
.out { text-decoration: line-through; }
.moving { border-color: var(--w-accent); }
.pin { color: var(--w-gold); font-size: 0.75em; margin-right: 3px; }
.box { width: 4.4rem; margin-left: 4px; }
</style>
