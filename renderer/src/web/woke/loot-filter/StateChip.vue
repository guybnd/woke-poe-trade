<template>
  <!-- One quiet chip per row in place of a row of plates (Guy's S1, W1, X1,
       L2, R1, 2026-11-28): a dot and the state's word; a click opens a small
       menu with each choice and what it does, and, where the row has one, a
       Price bias slider (Penalty / none / Bonus) applied on release. -->
  <span :class="$style.wrap" @click.stop @keydown.stop>
    <button ref="btn" type="button" :class="[$style.chip, { [$style.moved]: moved }]" class="w-focusable"
      :aria-label="`${title}: ${cur?.label ?? ''}${biasText ? `, price bias ${biasText}` : ''}`" aria-haspopup="menu" :aria-expanded="open"
      @click="toggle">
      <i :class="$style.dot" :style="dotStyle(cur)" aria-hidden="true" />
      <span :class="$style.word">{{ cur?.label }}</span>
      <span v-if="biasText" :class="$style.bias">· {{ biasText }}</span>
      <i class="fas fa-caret-down" :class="$style.car" aria-hidden="true" />
    </button>
    <Teleport to="body">
      <div v-if="open" ref="pop" data-w-popup :class="$style.pop" :style="popStyle" role="menu" :aria-label="title" data-state-chip-menu @click.stop @keydown.esc.stop="close(true)">
        <div :class="$style.head">{{ title }}</div>
        <button v-for="o in options" :key="o.value" type="button" role="menuitemradio" :aria-checked="o.value === modelValue" :class="$style.opt"
          @click="pick(o.value)">
          <i :class="$style.dot" :style="dotStyle(o)" aria-hidden="true" />
          <span><b>{{ o.label }}</b><span v-if="o.desc" :class="$style.desc">{{ o.desc }}</span></span>
        </button>
        <div v-if="bias !== undefined" :class="[$style.biasBox, { [$style.dead]: biasOff }]">
          <div :class="$style.biasTop"><span title="Every item in this section; an item's own price or Worth × is set on its row">Price bias, whole section</span><b>{{ pctText(dragBias ?? bias) }}</b></div>
          <input type="range" :min="-NUDGE_MAX" :max="NUDGE_MAX" step="1" :value="-(dragBias ?? bias)" :disabled="biasOff" :class="$style.range" aria-label="Price bias"
            data-state-chip-bias
            @input="dragBias = -Number(($event.target as HTMLInputElement).value)"
            @change="commitBias(-Number(($event.target as HTMLInputElement).value))">
          <div :class="$style.ticks"><span>Penalty</span><span>none</span><span>Bonus</span></div>
          <div :class="$style.desc">{{ biasOff ? `Not used while ${cur?.label ?? 'off'}.` : biasLine(dragBias ?? bias) }}</div>
          <button v-if="bias !== 0" type="button" :class="$style.reset" @click="commitBias(0)">No bias</button>
        </div>
      </div>
    </Teleport>
  </span>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { NUDGE_MAX } from './currency-settings'
import { tipZoom } from '../ui/popup-zoom'

export interface ChipOption { value: string, label: string, desc?: string, dot?: string, hollow?: boolean, glow?: boolean }

const props = defineProps<{
  modelValue: string
  options: ChipOption[]
  // The row's name: the menu's heading and the chip's label for screen readers.
  title: string
  // The value a row starts on; any other shows as moved (gold edge).
  dflt?: string
  // A section's own strictness as notches (×1.25 on its step prices per
  // notch); shown as a price bias. Left out: no slider.
  bias?: number
  // The mode the bias does nothing in (Hide); it counts in every other.
  noBiasIn?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [v: string], 'update:bias': [n: number] }>()

const open = ref(false)
const btn = ref<HTMLElement | null>(null)
const pop = ref<HTMLElement | null>(null)
const popStyle = ref<Record<string, string>>({})
const dragBias = ref<number | null>(null)

const cur = computed(() => props.options.find(o => o.value === props.modelValue))
const biasOff = computed(() => props.noBiasIn != null && props.modelValue === props.noBiasIn)
// A notch up makes every step cost ×1.25: the items count at 1/1.25 of their price.
function pct (n: number) { return Math.round((1.25 ** -n - 1) * 100) }
function pctText (n: number) { const p = pct(n); return p === 0 ? 'none' : `${p > 0 ? '+' : '−'}${Math.abs(p)}%` }
function biasLine (n: number) {
  const p = pct(n)
  return p === 0 ? 'Priced as poe.ninja says.' : `Every item here counts at ${100 + p}% of its price, so it shows ${p < 0 ? 'less' : 'more'}.`
}
const biasText = computed(() => props.bias && !biasOff.value ? pctText(props.bias) : '')
const moved = computed(() => (props.dflt != null && props.modelValue !== props.dflt) || !!biasText.value)

function dotStyle (o?: ChipOption) {
  const c = o?.dot ?? 'var(--w-gold)'
  return o?.hollow ? { border: `1px solid ${c}` } : { background: c, boxShadow: o?.glow ? `0 0 5px ${c}` : undefined }
}

// As big as the window the chip is in (popup-zoom.ts); with CSS zoom, left
// and top are in zoomed units.
const W = 270
function place () {
  const r = btn.value?.getBoundingClientRect()
  if (!r) return
  const z = btn.value ? tipZoom(btn.value) : 1
  const w = W * z
  const h = pop.value?.getBoundingClientRect().height ?? 260 * z
  const left = Math.max(4, Math.min(r.right - w, window.innerWidth - w - 4))
  const below = r.bottom + 4 + h <= window.innerHeight - 4 || r.top - 4 - h < 4
  const top = below ? Math.min(r.bottom + 4, Math.max(4, window.innerHeight - 4 - h)) : r.top - 4 - h
  popStyle.value = { zoom: String(z), left: `${left / z}px`, top: `${top / z}px`, width: `${W}px` }
}
function onDoc (e: MouseEvent) {
  const t = e.target as Node
  if (pop.value?.contains(t) || btn.value?.contains(t)) return
  close(false)
}
function onKey (e: KeyboardEvent) { if (e.key === 'Escape') close(true) }
// The menu follows its chip on a scroll, and closes once the chip scrolls out
// of its list (it would float over other rows).
function onScroll (e: Event) {
  if (pop.value?.contains(e.target as Node)) return
  const r = btn.value?.getBoundingClientRect()
  let box: Element | null = btn.value?.parentElement ?? null
  while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement
  const v = box?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight }
  if (!r || r.bottom < v.top || r.top > v.bottom) close(false)
  else place()
}
async function toggle () {
  if (open.value) { close(false); return }
  open.value = true
  dragBias.value = null
  // Measured at its real width, hidden, then placed.
  popStyle.value = { width: `${W}px`, left: '0', top: '0', visibility: 'hidden', zoom: String(btn.value ? tipZoom(btn.value) : 1) }
  await nextTick()
  place()
  document.addEventListener('mousedown', onDoc, true)
  document.addEventListener('keydown', onKey, true)
  window.addEventListener('scroll', onScroll, true)
  ;(pop.value?.querySelector('[aria-checked="true"]') as HTMLElement | null)?.focus()
}
function close (focus: boolean) {
  if (!open.value) return
  open.value = false
  document.removeEventListener('mousedown', onDoc, true)
  document.removeEventListener('keydown', onKey, true)
  window.removeEventListener('scroll', onScroll, true)
  if (focus) btn.value?.focus()
}
function pick (v: string) {
  if (v !== props.modelValue) emit('update:modelValue', v)
  // Keep the menu open when there's a bias to set next; close otherwise.
  if (props.bias === undefined) close(true)
  else nextTick(place)
}
function commitBias (n: number) {
  dragBias.value = null
  if (n !== props.bias) emit('update:bias', n)
}
onBeforeUnmount(() => close(false))
</script>

<style module>
.wrap { display: inline-flex; flex: none; }
.chip { display: inline-flex; align-items: center; gap: 6px; min-height: calc(22px * var(--w-text-scale, 1)); padding: 0 7px; border: 1px solid transparent; border-radius: var(--w-r-sm); background: none; color: var(--w-dim); font-size: var(--w-fs-sm); white-space: nowrap; cursor: pointer; }
.chip:hover, .chip[aria-expanded='true'] { border-color: var(--w-line); background: var(--w-panel-2); color: var(--w-fg); }
.moved { border-color: var(--w-frame); }
.word { font-family: var(--w-label); font-size: var(--w-fs-md); color: var(--w-gold); letter-spacing: 0.02em; }
.bias { font-variant-numeric: tabular-nums; }
.moved .bias { color: var(--w-gold-hi); }
.car { font-size: var(--w-fs-xs); opacity: 0.6; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex: none; display: inline-block; box-sizing: border-box; }
.pop { position: fixed; z-index: 1000; background: var(--w-bevel); border: 1px solid var(--w-frame); border-radius: var(--w-r-sm); box-shadow: 0 0 0 1px #000, 0 8px 22px rgba(0, 0, 0, 0.7); font-size: var(--w-fs-sm); color: var(--w-fg); }
.head { font-family: var(--w-label); color: var(--w-gold); padding: 4px 10px; border-bottom: 1px solid var(--w-line); font-size: var(--w-fs-md); }
.opt { display: flex; gap: 8px; align-items: flex-start; width: 100%; padding: 5px 10px; border: none; background: none; color: var(--w-fg); text-align: left; cursor: pointer; font-size: var(--w-fs-sm); line-height: 1.35; }
.opt:hover, .opt:focus-visible { background: var(--w-panel-2); outline: none; }
.opt[aria-checked='true'] { background: var(--w-panel-2); }
.opt .dot { margin-top: 4px; }
.opt b { display: block; font-weight: 400; font-family: var(--w-label); font-size: var(--w-fs-md); color: var(--w-gold); }
.opt[aria-checked='true'] b { color: var(--w-gold-hi); }
.desc { display: block; color: var(--w-dim); }
.biasBox { border-top: 1px solid var(--w-line); padding: 6px 10px 8px; display: flex; flex-direction: column; gap: 4px; }
.dead { opacity: 0.45; }
.biasTop { display: flex; justify-content: space-between; align-items: baseline; color: var(--w-dim); }
.biasTop b { font-weight: 400; color: var(--w-gold-hi); font-size: var(--w-fs-md); font-variant-numeric: tabular-nums; }
.range { width: 100%; accent-color: var(--w-accent); }
.ticks { display: flex; justify-content: space-between; color: var(--w-faint); font-size: var(--w-fs-xs); }
.reset { align-self: flex-start; padding: 0; border: none; background: none; color: var(--w-dim); text-decoration: underline; cursor: pointer; font-size: var(--w-fs-xs); }
</style>
