<template>
  <!-- The score card's ruler (Guy's pick A, 2026-11-28; like Alt+F's on the
       Loot tab): one bar of the steps by points, where each starts under it,
       and a needle at the score with its points over it. -->
  <div :class="$style.ruler" data-score-ruler>
    <div :class="$style.markRow">
      <span :class="[$style.mark, at < 12 ? $style.markL : at > 88 ? $style.markR : '']" :style="{ left: `${at}%` }" data-score-needle>{{ pointsText(pts) }}</span>
    </div>
    <div ref="barEl" :class="[$style.bar, { [$style.drag]: drag }]" :title="drag ? 'Drag the needle to change the base rank' : undefined" data-score-bar
      @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="cancel">
      <span v-for="z in zones" :key="z.step" :class="[$style.seg, { [$style.cur]: z.step === step }]" :style="{ flexBasis: `${z.w}%`, background: STEP_CSS[z.step] }">{{ z.w > 11 ? STEP_SHORT[z.step] : '' }}</span>
      <i :class="$style.needle" :style="{ left: `${at}%` }" aria-hidden="true" />
    </div>
    <div :class="$style.under" aria-hidden="true">
      <span v-for="z in zones.filter(z => z.step > 0)" :key="z.step" :style="{ left: `${z.from}%` }">{{ pointsText(z.start) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { pointsText } from './weight-samples'
import { STEP_CSS, STEP_SHORT } from './score-steps'

const props = defineProps<{
  // The score, the line and where Normal, Big and Beam start, in points.
  pts: number
  line: number
  loud: readonly number[]
  step: number
  // The needle can be dragged (it emits the points it's over).
  drag?: boolean
}>()
const emit = defineEmits<{ (e: 'drag', pts: number): void, (e: 'drop', pts: number | null): void }>()

const live = computed(() => {
  const p = Number.isFinite(props.pts) ? props.pts : props.line - 30
  return { lo: Math.min(p, props.line) - 15, hi: Math.max(p, props.loud[2], props.line) + 12 }
})
// Kept while the needle is dragged, so the scale doesn't move under it.
const held = ref<{ lo: number, hi: number } | null>(null)
const range = computed(() => held.value ?? live.value)
const barEl = ref<HTMLElement | null>(null)
function ptsAt (e: PointerEvent): number {
  const b = barEl.value!.getBoundingClientRect()
  const f = Math.min(1, Math.max(0, (e.clientX - b.left) / b.width))
  return range.value.lo + f * (range.value.hi - range.value.lo)
}
function down (e: PointerEvent) {
  if (!props.drag || !barEl.value) return
  held.value = { ...live.value }
  barEl.value.setPointerCapture(e.pointerId)
  emit('drag', ptsAt(e))
}
function move (e: PointerEvent) { if (held.value) emit('drag', ptsAt(e)) }
function up (e: PointerEvent) {
  if (!held.value) return
  const p = ptsAt(e)
  held.value = null
  emit('drop', p)
}
function cancel () {
  if (!held.value) return
  held.value = null
  emit('drop', null)
}
const x = (p: number) => Math.max(0, Math.min(100, 100 * (p - range.value.lo) / (range.value.hi - range.value.lo)))
const at = computed(() => x(Number.isFinite(props.pts) ? props.pts : range.value.lo))
const zones = computed(() => {
  const l = props.line
  const starts = [range.value.lo, l, ...props.loud.map(v => Math.max(v, l)), range.value.hi]
  return [0, 1, 2, 3, 4].map(s => ({ step: s, start: starts[s], from: x(starts[s]), w: x(starts[s + 1]) - x(starts[s]) })).filter(z => z.w > 0)
})
</script>

<style module>
.ruler { display: flex; flex-direction: column; gap: 2px; }
.markRow { position: relative; height: 18px; }
.mark { position: absolute; bottom: 0; transform: translateX(-50%); font-size: var(--w-fs-sm); color: var(--w-fg); white-space: nowrap; font-variant-numeric: tabular-nums; transition: left .12s; }
.markL { transform: translateX(-6px); }
.markR { transform: translateX(calc(-100% + 6px)); }
.bar { position: relative; display: flex; height: 22px; touch-action: none; }
.bar.drag { cursor: ew-resize; }
.seg {
  display: flex; align-items: center; justify-content: center; overflow: hidden; white-space: nowrap;
  font-size: var(--w-fs-xs); font-family: var(--w-head); color: #111; opacity: .7; transition: flex-basis .12s;
}
.seg:first-child { color: #ddd; }
.seg.cur { opacity: 1; box-shadow: inset 0 0 0 1px var(--w-fg); }
.needle { position: absolute; top: -3px; bottom: -3px; width: 2px; margin-left: -1px; background: var(--w-fg); box-shadow: 0 0 0 1px rgba(0, 0, 0, .6); transition: left .12s; pointer-events: none; }
.drag .needle { width: 4px; margin-left: -2px; box-shadow: 0 0 0 2px #000; }
.under { position: relative; height: 14px; font-size: var(--w-fs-xs); color: var(--w-faint); font-variant-numeric: tabular-nums; }
.under span { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; }
</style>
