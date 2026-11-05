<template>
  <div ref="root" :class="$style.scale" role="group" aria-label="Stack sizes">
    <div :class="$style.bar">
      <div v-for="b in bands" :key="b.tier ?? 'floor'" :class="$style.band" :style="{ width: `${b.width}%`, background: b.colour }" :title="b.title" />
    </div>
    <div v-for="(s, i) in ladder.steps" :key="s.tier" :class="$style.line" :style="{ left: `${scalePct(s.size, max)}%` }"
      role="slider" tabindex="0" :aria-label="`${nameOf(s.tier)} starts at`" :aria-valuenow="s.size" :aria-valuemin="1" :aria-valuemax="STACK_MAX"
      :title="nameOf(s.tier)" @pointerdown="start($event, i)" @keydown="nudge($event, i)">
      <span :class="$style.value">{{ s.size.toLocaleString('en-US') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { STACK_MAX, scaleMax, scalePct, scaleSize } from './stack'
import type { StackLadder } from './stack'

const props = defineProps<{
  ladder: StackLadder
  colourOf: (tier: string) => string
  nameOf: (tier: string) => string
}>()

const emit = defineEmits<{
  // While dragging: redraw, nothing saved.
  (e: 'preview' | 'commit', tier: string, size: number): void
}>()

const root = ref<HTMLElement | null>(null)
// Held still while dragging, or the scale would move under the mouse.
const heldMax = ref<number | null>(null)
const max = computed(() => heldMax.value ?? scaleMax(props.ladder.steps))

const bands = computed(() => {
  const steps = [...props.ladder.steps].reverse()
  const out = steps.map((s, i) => {
    const to = i + 1 < steps.length ? scalePct(steps[i + 1].size, max.value) : 100
    return { tier: s.tier, width: to - scalePct(s.size, max.value), colour: props.colourOf(s.tier), title: props.nameOf(s.tier) }
  })
  const floor = props.ladder.floor
  out.unshift({
    tier: floor ?? '',
    width: scalePct(steps[0].size, max.value),
    colour: floor ? props.colourOf(floor) : 'var(--w-line-soft)',
    title: floor ? props.nameOf(floor) : 'Smaller stacks: the next rule that matches'
  })
  return out
})

// A line stops at its neighbours, so a tier can't end up behind another. Tiers you
// typed to the same number aren't neighbours: either can still move off.
function limits (i: number) {
  const steps = props.ladder.steps
  const size = steps[i].size
  const below = steps.slice(i + 1).find(s => s.size < size)?.size ?? 0
  const above = steps.slice(0, i).reverse().find(s => s.size > size)?.size ?? STACK_MAX + 1
  return { low: below + 1, high: above - 1 }
}

function start (e: PointerEvent, i: number) {
  const el = e.currentTarget as HTMLElement
  const { tier } = props.ladder.steps[i]
  const { low, high } = limits(i)
  heldMax.value = max.value
  el.focus()
  el.setPointerCapture(e.pointerId)
  let size = props.ladder.steps[i].size
  // Where on the line you took hold, so a press doesn't jump it.
  const box = el.getBoundingClientRect()
  const grabbed = e.clientX - (box.left + box.width / 2)
  const startX = e.clientX
  const move = (ev: PointerEvent) => {
    if (ev.clientX === startX) return
    const bar = root.value!.getBoundingClientRect()
    size = Math.max(low, Math.min(high, scaleSize((ev.clientX - grabbed - bar.left) / bar.width * 100, heldMax.value!)))
    emit('preview', tier, size)
  }
  const end = () => {
    el.removeEventListener('pointermove', move)
    el.removeEventListener('pointerup', end)
    el.removeEventListener('pointercancel', end)
    heldMax.value = null
    emit('commit', tier, size)
  }
  el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', end)
  el.addEventListener('pointercancel', end)
  e.preventDefault()
}

function nudge (e: KeyboardEvent, i: number) {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
  e.preventDefault()
  e.stopPropagation()
  const { tier, size } = props.ladder.steps[i]
  const { low, high } = limits(i)
  const by = Math.max(1, Math.round(size * 0.1))
  emit('commit', tier, Math.max(low, Math.min(high, size + (e.key === 'ArrowRight' ? by : -by))))
}
</script>

<style module>
.scale {
  position: relative;
  margin: 18px 8px 8px;
  height: 22px;
  touch-action: none;
}
.bar {
  display: flex;
  height: 100%;
  border-radius: var(--w-r-sm);
  overflow: hidden;
  border: 1px solid var(--w-line);
}
.band { height: 100%; flex: none; }
.line {
  position: absolute;
  top: -4px;
  bottom: -4px;
  width: 12px;
  margin-left: -6px;
  cursor: ew-resize;
  outline: none;
}
.line::before {
  content: "";
  position: absolute;
  left: 5px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--w-fg);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
}
.line:hover::before, .line:focus-visible::before { background: var(--w-accent); }
.value {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  font-size: var(--w-fs-xs);
  font-variant-numeric: tabular-nums;
  color: var(--w-dim);
  white-space: nowrap;
}
.line:hover .value, .line:focus-visible .value { color: var(--w-fg); }
</style>
