<template>
  <!-- A number chip as price check has: the label switches it, the number (dashed
       underline) types or scrolls, and changing the number switches it on. -->
  <span :class="[$style.chip, { [$style.on]: on, [$style.idle]: on && idle }]" :title="title" @wheel.prevent="onWheel">
    <button type="button" :class="$style.label" :aria-pressed="on" @click="emit('on', !on)">Hide &lt;</button>
    <input :class="$style.num" type="number" min="0" step="any" :value="text" :aria-label="`Hide items worth less than this many ${chaos ? 'chaos' : 'divines'}`"
      :style="{ width: `${0.8 + Math.max(text.length, 1)}ch` }"
      @focus="($event.target as HTMLInputElement).select()" @change="typed" @keydown.enter="($event.target as HTMLInputElement).blur()">
    <Coin :chaos="chaos" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { nudgeHide } from './widget'
import Coin from './Coin.vue'

const props = defineProps<{
  value: number
  on: boolean
  chaos?: boolean
  // On, but the other chip's higher threshold is the one hiding rows.
  idle?: boolean
  title?: string
}>()
const emit = defineEmits<{ (e: 'on', v: boolean): void, (e: 'value', v: number): void }>()

const text = computed(() => String(props.value))

function set (n: number) {
  emit('value', n)
  emit('on', true)
}
// An emptied or bad number puts the old one back and changes nothing.
function typed (e: Event) {
  const el = e.target as HTMLInputElement
  const n = Number(el.value)
  if (el.value.trim() !== '' && Number.isFinite(n) && n >= 0) set(n)
  else el.value = text.value
}
function onWheel (e: WheelEvent) {
  if (e.deltaY === 0) return
  set(nudgeHide(props.value, e.deltaY < 0 ? 1 : -1, !!props.chaos))
}
</script>

<style module>
.chip { display: inline-flex; align-items: center; gap: 3px; padding: 1px 7px; border: 1px solid var(--w-line); border-radius: var(--w-r-sm); color: var(--w-dim); font-size: var(--w-fs-xs); white-space: nowrap; }
.on { color: var(--w-fg); border-color: var(--w-gold); background: color-mix(in srgb, var(--w-gold) 12%, transparent); }
.idle { opacity: .55; border-style: dashed; }
.label { font-family: var(--w-caps-face); text-transform: var(--w-caps-case); cursor: pointer; color: inherit; }
.num { font: inherit; font-family: var(--w-num); color: inherit; background: transparent; text-align: center; border: 0; border-bottom: 1px dashed currentColor; padding: 0; cursor: ns-resize; -moz-appearance: textfield; }
.num:focus { cursor: text; outline: none; background: var(--w-panel-3); }
.num::-webkit-inner-spin-button, .num::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
</style>
