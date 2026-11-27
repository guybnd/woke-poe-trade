<template>
  <!-- The steps as one price ruler (Guy's pick B): a log bar coloured by step,
       a handle where each step starts, its name in its look over it. Hover a
       name for the pencil; click it for that step's look and switch. -->
  <div :class="$style.ruler" role="group" aria-label="Where each step starts" data-currency-ruler>
    <div :class="$style.names">
      <span v-for="s in STEPS" :key="s" :class="[$style.name, { [$style.off]: isOff(s), [$style.cur]: edit === s }]"
        :style="{ left: `min(${at(s)}%, calc(100% - 4.5rem))`, top: s % 2 ? '0' : '26px' }">
        <button type="button" :class="$style.nameBtn" :title="title(s)" :aria-label="s === 0 ? 'Faint settings' : `${CSTEP_NAMES[s]} look and sound`" :aria-expanded="edit === s"
          :data-currency-step="s" @click="emit('edit', edit === s ? null : s)">
          <LabelPreview :text="s === 0 ? 'Faint' : CSTEP_NAMES[s]" :style-override="look(s)" visibility="Show" :extras="false" :scale="0.72" />
          <i class="fas fa-pen" :class="$style.pen" aria-hidden="true" />
        </button>
      </span>
    </div>

    <div ref="bar" :class="$style.bar">
      <span v-for="seg in segs" :key="seg.s" :class="[$style.seg, { [$style.segOff]: isOff(seg.s) }]" :style="{ left: `${seg.a}%`, width: `${seg.b - seg.a}%`, '--c': seg.css }" />
      <i v-for="t in ticks" :key="t" :class="$style.tick" :style="{ left: `${x(t)}%` }" />
      <button v-for="(v, i) in vals" :key="i" type="button" role="slider" :class="[$style.handle, { [$style.drag]: drag?.i === i }]" :style="{ left: `${x(v)}%` }"
        :aria-label="`${CSTEP_NAMES[i + 1]} starts at`" :aria-valuenow="v" :aria-valuetext="chaosText(v)" :title="`${CSTEP_NAMES[i + 1]} from ${chaosText(v)}: drag, or arrow keys`"
        @pointerdown="startDrag(i, $event)" @pointermove="moveDrag" @pointerup="endDrag" @pointercancel="drag = null"
        @keydown.right.prevent="bump(i, 1)" @keydown.up.prevent="bump(i, 1)" @keydown.left.prevent="bump(i, -1)" @keydown.down.prevent="bump(i, -1)" />
    </div>
    <div :class="$style.scale" aria-hidden="true">
      <span v-for="t in ticks" :key="t" :style="{ left: `${x(t)}%` }">{{ chaosText(t) }}</span>
    </div>
    <div :class="$style.vals">
      <label v-for="(v, i) in vals" :key="i" :class="$style.val" :style="{ left: `${x(v)}%` }">
        <input :value="round(v)" type="number" min="0.01" step="any" :class="$style.num" :aria-label="`${CSTEP_NAMES[i + 1]} from this many chaos`"
          @change="typed(i, $event.target as HTMLInputElement)">c
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import LabelPreview from './LabelPreview.vue'
import { CSTEP_NAMES, currencyFullLook, catColour } from './currency-weights'
import type { CStep } from './currency-weights'
import type { CurrencySettings } from './currency-settings'
import type { Colour, StylePatch } from './edits'
import { cssColour } from './label-style'

const props = defineProps<{
  // Your settings and the same after Strictness (the prices the ruler shows).
  c: CurrencySettings
  eff: CurrencySettings
  cat: string
  faintLook: StylePatch
  faintOn: boolean
  edit: CStep | null
  samples: Record<number, string>
}>()
// Prices come back as shown (after Strictness); the tab turns them into yours.
const emit = defineEmits<{ edit: [CStep | null], set: [step: number, chaos: number] }>()

const STEPS: CStep[] = [0, 1, 2, 3, 4, 5]
const isOff = (s: CStep) => s === 0 ? !props.faintOn : props.c.off.includes(s)
// Faint's own text is too see-through to read as a name: a bit stronger here.
const look = (s: CStep): StylePatch => s === 0
  ? { ...props.faintLook, text: props.faintLook.text && [props.faintLook.text[0], props.faintLook.text[1], props.faintLook.text[2], 170] }
  : currencyFullLook(s, props.cat, props.c)
const title = (s: CStep) => s === 0
  ? 'Faint: piles under the line, small and see-through'
  : `${CSTEP_NAMES[s]}${props.samples[s] ? `, e.g. ${props.samples[s]}` : ''}${isOff(s) ? ' (off)' : ''}`

const drag = ref<{ i: number, v: number, id: number } | null>(null)
const shown = computed(() => [props.eff.line, ...props.eff.from])
const vals = computed(() => shown.value.map((v, i) => drag.value?.i === i ? drag.value.v : v))

// Log scale, wide enough for the line and Tink with room either side.
const lo = computed(() => Math.log10(Math.min(0.1, vals.value[0] / 2)))
const hi = computed(() => Math.log10(Math.max(150, vals.value[4] * 1.6)))
const x = (v: number) => (Math.log10(Math.max(v, 1e-3)) - lo.value) / (hi.value - lo.value) * 100
const ticks = computed(() => [0.1, 1, 10, 100, 1000, 10000].filter(t => x(t) >= 0 && x(t) <= 100))
const at = (s: CStep) => s === 0 ? 0 : x(vals.value[s - 1])

function segColour (s: CStep): string {
  const l = look(s)
  if (s === 0) return cssColour([...catColour(props.cat, props.c).rgb, 70] as Colour)
  const bg = l.background
  const lum = bg ? (bg[0] * 0.3 + bg[1] * 0.59 + bg[2] * 0.11) : 0
  return cssColour((s < 5 && bg && lum > 90 ? bg : l.text ?? [200, 200, 200, 255]) as Colour)
}
const segs = computed(() => STEPS.map(s => ({ s, a: at(s), b: s === 5 ? 100 : at((s + 1) as CStep), css: segColour(s) })))

// Two significant figures under 10c, whole chaos above.
function round (v: number): number {
  if (v >= 10) return Math.round(v)
  return Number(v.toPrecision(2))
}
function clampAt (i: number, v: number): number {
  const lo = i > 0 ? shown.value[i - 1] : 0.01
  const hi = i < 4 ? shown.value[i + 1] : 1e6
  return Math.min(hi, Math.max(lo, v))
}
const bar = ref<HTMLElement | null>(null)
function valueAt (clientX: number): number {
  const r = bar.value!.getBoundingClientRect()
  const p = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
  return round(10 ** (lo.value + p * (hi.value - lo.value)))
}
// The scale stays put while you drag; the price applies when you let go.
function startDrag (i: number, e: PointerEvent) {
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  drag.value = { i, v: shown.value[i], id: e.pointerId }
}
function moveDrag (e: PointerEvent) {
  if (!drag.value || e.pointerId !== drag.value.id) return
  drag.value = { ...drag.value, v: clampAt(drag.value.i, valueAt(e.clientX)) }
}
function endDrag () {
  const d = drag.value
  drag.value = null
  if (d && d.v !== shown.value[d.i]) emit('set', d.i, d.v)
}
function bump (i: number, dir: 1 | -1) {
  const v = shown.value[i]
  emit('set', i, clampAt(i, round(dir > 0 ? Math.max(v * 1.1, v + 0.01) : Math.min(v / 1.1, v - 0.01))))
}
function typed (i: number, el: HTMLInputElement) {
  const n = Number(el.value)
  el.value = String(round(shown.value[i]))
  if (el.value.trim() && Number.isFinite(n) && n > 0) emit('set', i, n)
}

const chaosText = (v: number) => v >= 1000 ? `${Math.round(v / 1000)}kc` : `${round(v)}c`
</script>

<style module>
.ruler { display: flex; flex-direction: column; padding: 2px 10px 4px; min-width: 34rem; }
.names { position: relative; height: 50px; }
.name { position: absolute; white-space: nowrap; }
.nameBtn { display: inline-flex; align-items: center; gap: 4px; background: none; border: 0; padding: 0; cursor: pointer; }
.pen { font-size: var(--w-fs-xs); color: var(--w-accent, #c8a565); opacity: 0; transition: opacity .12s; }
.nameBtn:hover .pen, .nameBtn:focus-visible .pen, .cur .pen { opacity: 1; }
.off { opacity: .35; text-decoration: line-through; }
.bar { position: relative; height: 14px; margin-top: 2px; }
.seg { position: absolute; top: 0; bottom: 0; background: var(--c); border-right: 1px solid #000; }
.segOff { background: repeating-linear-gradient(45deg, #2a2620 0 4px, #15130f 4px 8px); }
.tick { position: absolute; top: 9px; bottom: 0; width: 1px; background: rgba(0, 0, 0, .55); }
.handle {
  position: absolute; top: -4px; width: 8px; height: 22px; margin-left: -4px; padding: 0;
  background: #e8dcc0; border: 1px solid #000; border-radius: 2px; cursor: ew-resize; touch-action: none;
}
.handle:hover, .handle:focus-visible, .drag { background: #fff; box-shadow: 0 0 0 2px var(--w-accent, #c8a565); }
.scale { position: relative; height: 14px; font-size: var(--w-fs-xs); color: var(--w-faint); }
.scale span { position: absolute; transform: translateX(-50%); }
.vals { position: relative; height: 22px; }
.val { position: absolute; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 1px; font-size: var(--w-fs-xs); color: var(--w-dim); white-space: nowrap; }
.num {
  width: 3.4em; font-size: var(--w-fs-xs); text-align: right; font-variant-numeric: tabular-nums;
  background: var(--w-panel); border: 1px solid var(--w-line); border-radius: var(--w-r-sm); color: inherit; padding: 0 3px;
}
</style>
