<template>
  <!-- The price check's one-off tour (tour-steps.ts): a small card by what it
       explains, inside the price window, so it keeps the window's look and
       stays where clicks reach the overlay. -->
  <div v-if="shown" ref="card" :class="$style.card" :style="box ? { left: `${box.x}px`, top: `${box.y}px` } : { visibility: 'hidden' }"
    data-pc-tour :data-step="step!.id" role="dialog" :aria-label="`Price check tour, ${step!.title}`" data-no-item-tip="The tour's own text"
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
      <WButton size="sm" variant="ghost" data-pc-tour-done @click="end">Got it</WButton>
      <WButton v-if="later >= 0" size="sm" data-pc-tour-next @click="next">Next</WButton>
    </div>
  </div>
</template>

<script setup lang="ts">
// Mounted by PriceCheckWindow only while the window shows and the tour may
// still run; one mount per check. A showing counts once per check (not per
// overlay open, as window tips do): checks from the hotkey don't open it.
import { computed, nextTick, onBeforeUnmount, shallowRef, watch } from 'vue'
import { AppConfig } from '@/web/Config'
import { hintPlaceOk, hintsOff, isHintDone, retireHint, tourHeld, tourUp } from '../shared/hints'
import { WButton, WKbd } from '../ui'
import { PRICE_CHECK_TOUR, TOUR_SHOWS, TOUR_STEPS, nextStep } from './tour-steps'
import type { TourStep } from './tour-steps'

const GAP = 8

// A sample check from What's new: not now.
const held = tourHeld()

const card = shallowRef<HTMLElement>()
// The card's size, measured after it draws (each step's text differs).
const size = shallowRef({ w: 0, h: 0 })
function measure () {
  const el = card.value
  if (el && (el.offsetWidth !== size.value.w || el.offsetHeight !== size.value.h)) size.value = { w: el.offsetWidth, h: el.offsetHeight }
}

// What each step points at, found again as the window fills in (listings
// come after the price). Polled only while this check's tour may show.
const found = shallowRef<Record<string, DOMRect | null>>({})
function look () {
  const out: Record<string, DOMRect | null> = {}
  let same = true
  for (const s of TOUR_STEPS) {
    const there = document.querySelector<HTMLElement>(s.target)?.getBoundingClientRect()
    const r = there && s.anchor ? document.querySelector<HTMLElement>(s.anchor)?.getBoundingClientRect() : there
    out[s.id] = r && r.width > 0 && r.height > 0 ? r : null
    const was = found.value[s.id]
    if (was?.top !== out[s.id]?.top || was?.left !== out[s.id]?.left || was?.bottom !== out[s.id]?.bottom) same = false
  }
  if (!same) found.value = out
  measure()
}
let timer = 0
function stopLooking () { if (timer) { window.clearInterval(timer); timer = 0 } }
if (!held) {
  look()
  timer = window.setInterval(look, 300)
}

const seen = (s: TourStep) => found.value[s.id] != null
const index = shallowRef(-1)
watch(found, () => { if (index.value < 0) index.value = nextStep(0, seen) }, { immediate: true })
const step = computed(() => index.value >= 0 ? TOUR_STEPS[index.value] : null)
const later = computed(() => index.value < 0 ? -1 : nextStep(index.value + 1, seen))
// Counted among the steps this check has (an exchange item has no mod rows).
const place = computed(() => {
  const there = TOUR_STEPS.map((s, i) => i <= index.value || seen(s))
  return { at: there.slice(0, index.value + 1).filter(Boolean).length, of: there.filter(Boolean).length }
})

const done = shallowRef(false)
const shown = computed(() => !held && !done.value && !hintsOff() && !isHintDone(PRICE_CHECK_TOUR) && hintPlaceOk() &&
  step.value != null && seen(step.value))
watch(shown, on => { tourUp.value = on }, { immediate: true })

// One showing per check; after TOUR_SHOWS checks it stops coming.
let counted = false
watch(shown, (on) => {
  if (!on || counted) return
  counted = true
  const woke = AppConfig().woke
  if (!woke) return
  woke.hints ??= {}
  woke.hints.shows = { ...woke.hints.shows, [PRICE_CHECK_TOUR]: Math.min(TOUR_SHOWS, (woke.hints.shows?.[PRICE_CHECK_TOUR] ?? 0) + 1) }
}, { immediate: true })

// Reached the last card: the tour is done once this check closes.
const reachedEnd = computed(() => shown.value && later.value < 0 && index.value > 0)
let sawEnd = false
watch(reachedEnd, (on) => { if (on) sawEnd = true })

onBeforeUnmount(() => {
  stopLooking()
  tourUp.value = false
  if (sawEnd) retireHint(PRICE_CHECK_TOUR)
})

watch([card, step], () => nextTick(measure), { immediate: true })
// By the target, inside the price window: under it, or over it when the step
// asks (`above`) or the card wouldn't fit below. Coordinates are the window's own.
const box = computed(() => {
  const r = step.value ? found.value[step.value.id] : null
  const win = (card.value?.offsetParent as HTMLElement | null)?.getBoundingClientRect()
  const { w, h } = size.value
  if (!r || !win || !w) return null
  const aim = r.left + Math.min(r.width, 120) / 2 - win.left
  const x = Math.max(GAP, Math.min(aim - 24, win.width - w - GAP))
  const below = r.bottom - win.top + GAP
  const roomAbove = r.top - win.top - GAP - h >= GAP
  const above = roomAbove && (step.value!.above === true || below + h > win.height - GAP)
  const y = above ? r.top - win.top - GAP - h : Math.min(below, win.height - h - GAP)
  const arrow = Math.max(12, Math.min(aim - x, w - 20))
  return { x, y, arrow, above }
})

function next () {
  if (later.value >= 0) index.value = later.value
}
function end () {
  done.value = true
  stopLooking()
  retireHint(PRICE_CHECK_TOUR)
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
.up { color: var(--w-up); }
.down { color: var(--w-down); }
.foot { display: flex; justify-content: flex-end; gap: 4px; }
</style>
