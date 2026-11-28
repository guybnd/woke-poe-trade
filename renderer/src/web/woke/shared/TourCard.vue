<template>
  <!-- A one-off tour (tour.ts): a small card by what it explains, inside the
       window it explains (its positioned frame), so it keeps the window's look
       and stays where clicks reach the overlay. Used by the price check's tour
       and the loot filter's. -->
  <div v-if="shown && spot && ring" :class="$style.ring" :style="ring" aria-hidden="true" data-tour-ring />
  <div v-if="shown" ref="card" v-bind="$attrs" :class="$style.card" :style="box ? { left: `${box.x}px`, top: `${box.y}px` } : { visibility: 'hidden' }"
    data-tour-card :data-tour="tour" :data-step="step!.id" role="dialog" :aria-label="`${label}, ${step!.title}`" data-no-item-tip="Tutorial text"
    @mousedown.stop>
    <span v-if="box" :class="[$style.arrow, { [$style.up]: box.above }]" :style="{ left: `${box.arrow}px` }" aria-hidden="true" />
    <div :class="$style.head">
      <span>{{ place.at }} of {{ place.of }} · {{ step!.title }}</span>
      <button type="button" :class="$style.close" title="End the tour" aria-label="End the tour" @click="end">×</button>
    </div>
    <div :class="$style.text">
      <template v-for="(b, i) in step!.text" :key="i"><template v-if="typeof b === 'string'">{{ b }}</template><WKbd v-else-if="'kbd' in b" :keys="b.kbd" /><span v-else :class="$style[b.tone]" :data-tone="b.tone">{{ b.text }}</span></template>
    </div>
    <div :class="$style.foot">
      <WButton size="sm" variant="ghost" data-tour-done @click="end">Got it</WButton>
      <WButton v-if="later >= 0" size="sm" data-tour-next @click="next">Next</WButton>
    </div>
  </div>
</template>

<script setup lang="ts">
// Shows while its steps' targets are on screen; one mount is one run. Got it,
// × or reaching the last card retires the tour for good (shared/hints.ts).
import { computed, nextTick, onBeforeUnmount, shallowRef, watch } from 'vue'
import { hintPlaceOk, hintsOff, isHintDone, retireHint, tourUp } from './hints'
import { WButton, WKbd } from '../ui'
import { nextTourStep, targetsOf, tourPlace } from './tour'
import type { TourStep } from './tour'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  steps: readonly TourStep[]
  // The hint id it retires.
  tour: string
  // Read out before each step's title ("Price check tour").
  label: string
  // Put in front of every target (a window's own "#widget-3 ").
  scope?: string
  // Not now (a sample check from What's new).
  held?: boolean
  // Played again by hand (the filter's Replay tour): shows even if retired.
  replay?: boolean
  // A gold ring round what the card is about, the rest shaded.
  spot?: boolean
  // Starts only once the first step is on screen (the Alt+F card with no rule path is no place for it).
  needFirst?: boolean
}>()
const emit = defineEmits<{ (e: 'shown' | 'end'): void }>()

const GAP = 8

// Retired before this run started: it never shows (unless played by hand).
const startedDone = !props.replay && isHintDone(props.tour)

const card = shallowRef<HTMLElement>()
// The card's size, measured after it draws (each step's text differs).
const size = shallowRef({ w: 0, h: 0 })
function measure () {
  const el = card.value
  if (el && (el.offsetWidth !== size.value.w || el.offsetHeight !== size.value.h)) size.value = { w: el.offsetWidth, h: el.offsetHeight }
}

function rectOf (sel: string): DOMRect | null {
  const el = document.querySelector<HTMLElement>(`${props.scope ?? ''}${sel}`)
  const r = el?.getBoundingClientRect()
  return r && r.width > 0 && r.height > 0 ? r : null
}

// What each step points at, found again as the window fills in. Polled only
// while this run may show.
const found = shallowRef<Record<string, DOMRect | null>>({})
function look () {
  const out: Record<string, DOMRect | null> = {}
  let same = true
  for (const s of props.steps) {
    let there: DOMRect | null = null
    for (const t of targetsOf(s)) { there = rectOf(t); if (there) break }
    out[s.id] = there && s.anchor ? rectOf(s.anchor) : there
    const was = found.value[s.id]
    if (was?.top !== out[s.id]?.top || was?.left !== out[s.id]?.left || was?.bottom !== out[s.id]?.bottom || was?.right !== out[s.id]?.right) same = false
  }
  if (!same) found.value = out
  measure()
}
let timer = 0
function stopLooking () { if (timer) { window.clearInterval(timer); timer = 0 } }
if (!props.held && !startedDone) {
  look()
  timer = window.setInterval(look, 300)
}

const seen = (s: TourStep) => found.value[s.id] != null
const index = shallowRef(-1)
watch(found, () => {
  if (index.value >= 0) return
  if (props.needFirst && !seen(props.steps[0])) return
  index.value = nextTourStep(props.steps, 0, seen)
}, { immediate: true })
const step = computed(() => index.value >= 0 ? props.steps[index.value] : null)
const later = computed(() => index.value < 0 ? -1 : nextTourStep(props.steps, index.value + 1, seen))
// The steps this run has shown, for "2 of 5".
const passed = shallowRef<ReadonlySet<string>>(new Set())
watch(step, (s) => { if (s && !passed.value.has(s.id)) passed.value = new Set([...passed.value, s.id]) }, { immediate: true })
const place = computed(() => tourPlace(props.steps, index.value, seen, passed.value))

const done = shallowRef(false)
const shown = computed(() => !props.held && !done.value && !startedDone &&
  (props.replay || (!hintsOff() && hintPlaceOk())) &&
  step.value != null && seen(step.value))
watch(shown, on => { tourUp.value = on }, { immediate: true })

let counted = false
watch(shown, (on) => {
  if (!on || counted) return
  counted = true
  emit('shown')
}, { immediate: true })

// Reached the last card: done for good once this run ends (the window or
// check closes), so the card stays up until then.
let sawEnd = false
watch(() => shown.value && later.value < 0 && index.value > 0, (on) => { if (on) sawEnd = true })

onBeforeUnmount(() => {
  stopLooking()
  tourUp.value = false
  if (sawEnd) retireHint(props.tour)
})

watch([card, step], () => nextTick(measure), { immediate: true })
// The window's frame in its own CSS pixels: panels are zoomed (UI size), and
// a rect is in screen pixels, so each is divided by the zoom.
function frame () {
  const el = card.value?.offsetParent as (HTMLElement & { currentCSSZoom?: number }) | null
  if (!el) return null
  const r = el.getBoundingClientRect()
  const z = typeof el.currentCSSZoom === 'number' && el.currentCSSZoom > 0 ? el.currentCSSZoom : 1
  return { left: r.left, top: r.top, width: r.width / z, height: r.height / z, z }
}
// The target, in the frame's own pixels.
function local (r: DOMRect, win: NonNullable<ReturnType<typeof frame>>) {
  return { left: (r.left - win.left) / win.z, top: (r.top - win.top) / win.z, width: r.width / win.z, height: r.height / win.z }
}
// By the target, inside its window: under it, or over it when the step asks
// (`above`) or the card wouldn't fit below. Coordinates are the window's own.
const box = computed(() => {
  const found1 = step.value ? found.value[step.value.id] : null
  const win = frame()
  const { w, h } = size.value
  if (!found1 || !win || !w) return null
  const r = local(found1, win)
  const aim = r.left + Math.min(r.width, 120) / 2
  const x = Math.max(GAP, Math.min(aim - 24, win.width - w - GAP))
  const below = r.top + r.height + GAP
  const roomAbove = r.top - GAP - h >= GAP
  const above = roomAbove && (step.value!.above === true || below + h > win.height - GAP)
  const y = above ? r.top - GAP - h : Math.min(below, win.height - h - GAP)
  const arrow = Math.max(12, Math.min(aim - x, w - 20))
  return { x, y, arrow, above }
})
const ring = computed(() => {
  const found1 = step.value ? found.value[step.value.id] : null
  const win = box.value ? frame() : null
  if (!found1 || !win) return null
  const r = local(found1, win)
  return { left: `${r.left - 3}px`, top: `${r.top - 3}px`, width: `${r.width + 6}px`, height: `${r.height + 6}px` }
})

function next () {
  if (later.value >= 0) index.value = later.value
}
function end () {
  done.value = true
  tourUp.value = false
  stopLooking()
  retireHint(props.tour)
  emit('end')
}
</script>

<style module>
.card {
  position: absolute;
  z-index: 60;
  width: 260px;
  padding: 6px var(--w-pad) 6px;
  background: var(--w-panel);
  border: 1px solid var(--w-accent);
  box-shadow: 0 4px 14px rgba(0, 0, 0, .55);
  color: var(--w-fg);
  font-size: var(--w-fs-xs);
  line-height: 1.5;
  pointer-events: auto;
}
.ring {
  position: absolute;
  z-index: 59;
  border: 2px solid var(--w-accent);
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, .45);
  pointer-events: none;
  transition: left .2s ease, top .2s ease, width .2s ease, height .2s ease;
}
@media (prefers-reduced-motion: reduce) { .ring { transition: none; } }
.arrow {
  position: absolute;
  top: -5px;
  width: 8px;
  height: 8px;
  background: var(--w-panel);
  border-left: 1px solid var(--w-accent);
  border-top: 1px solid var(--w-accent);
  transform: rotate(45deg);
}
.up { top: auto; bottom: -5px; transform: rotate(225deg); }
.head { display: flex; align-items: center; justify-content: space-between; gap: 6px; color: var(--w-accent); font-family: var(--w-head); letter-spacing: var(--w-head-track); }
.close { padding: 0 4px; color: var(--w-dim); }
.close:hover { color: var(--w-fg); }
.text { margin: 3px 0 4px; font-family: var(--w-body); font-variant: normal; text-transform: none; letter-spacing: 0; }
.text :global(.w-kbd) { margin: 0 1px; }
.accent { color: var(--w-accent); }
.dim { color: var(--w-dim); }
.text .up { color: var(--w-up); }
.down { color: var(--w-down); }
.foot { display: flex; justify-content: flex-end; gap: 4px; }
</style>
