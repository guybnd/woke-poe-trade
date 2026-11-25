<template>
  <!-- The price check's one-off tour (tour-steps.ts): a small card under
       what it explains, inside the window so it stays clickable. -->
  <teleport to="body">
    <div v-if="hint.show.value && step && box" :class="$style.card" :style="box.above ? { left: `${box.x}px`, bottom: `${box.y}px` } : { left: `${box.x}px`, top: `${box.y}px` }"
      data-pc-tour :data-step="step.id" role="dialog" :aria-label="`Price check tour, ${step.title}`" data-no-item-tip="The tour's own text">
      <span :class="[$style.arrow, { [$style.up]: box.above }]" :style="{ left: `${box.arrow}px` }" aria-hidden="true" />
      <div :class="$style.head">
        <span>{{ place.at }} of {{ place.of }} · {{ step.title }}</span>
        <button type="button" :class="$style.close" title="End the tour" aria-label="End the tour" @click="end">×</button>
      </div>
      <div :class="$style.text">
        <template v-for="(b, i) in step.text" :key="i"><WKbd v-if="typeof b !== 'string'" :keys="b.kbd" /><template v-else>{{ b }}</template></template>
      </div>
      <div :class="$style.foot">
        <WButton size="sm" variant="ghost" data-pc-tour-done @click="end">Got it</WButton>
        <WButton v-if="later >= 0" size="sm" data-pc-tour-next @click="next">Next</WButton>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import { tourUp, useHint } from '../shared/hints'
import { WButton, WKbd } from '../ui'
import { PRICE_CHECK_TOUR, TOUR_STEPS, nextStep } from './tour-steps'
import type { TourStep } from './tour-steps'

const CARD_W = 260
const GAP = 8

// What each step points at, found again as the window fills in (listings
// come after the price).
const found = shallowRef<Record<string, DOMRect | null>>({})
function look () {
  const out: Record<string, DOMRect | null> = {}
  for (const s of TOUR_STEPS) {
    const el = document.querySelector<HTMLElement>(s.target)
    const r = el?.getBoundingClientRect()
    out[s.id] = r && r.width > 0 && r.height > 0 ? r : null
  }
  found.value = out
}
look()
const timer = window.setInterval(look, 300)
onBeforeUnmount(() => window.clearInterval(timer))

const seen = (s: TourStep) => found.value[s.id] != null
// The step on screen: the first one there, then each Next.
const index = shallowRef(-1)
watch(found, () => { if (index.value < 0) index.value = nextStep(0, seen) }, { immediate: true })
const step = computed(() => index.value >= 0 ? TOUR_STEPS[index.value] : null)
// Counted among the steps this check has (an exchange item has no mod rows).
const place = computed(() => {
  const there = TOUR_STEPS.map((s, i) => i <= index.value || seen(s))
  return { at: there.slice(0, index.value + 1).filter(Boolean).length, of: there.filter(Boolean).length }
})
const later = computed(() => index.value < 0 ? -1 : nextStep(index.value + 1, seen))

// Shown twice at most if it's never finished (a check closed mid-tour).
const hint = useHint(PRICE_CHECK_TOUR, { shows: 2, slot: false, when: () => step.value != null && seen(step.value) })
watch(() => hint.show.value, on => { tourUp.value = on }, { immediate: true })
onBeforeUnmount(() => { tourUp.value = false })

// Under the target, kept inside the price window (where clicks reach it).
const box = computed(() => {
  const r = step.value ? found.value[step.value.id] : null
  if (!r) return null
  const win = document.getElementById('price-window')?.getBoundingClientRect()
  const left = win ? win.left + GAP : GAP
  const right = win ? win.right - GAP : window.innerWidth - GAP
  const x = Math.max(left, Math.min(r.left + Math.min(r.width, 120) / 2 - 24, right - CARD_W))
  const below = r.bottom + GAP
  const above = win != null && below + 120 > win.bottom
  // Above: y is the distance from the viewport's foot.
  const y = above ? window.innerHeight - (r.top - GAP) : below
  const arrow = Math.max(12, Math.min(r.left + Math.min(r.width, 120) / 2 - x, CARD_W - 20))
  return { x, y, arrow, above }
})

function next () {
  if (later.value >= 0) index.value = later.value
}
function end () {
  hint.retire()
}
</script>

<style module>
.card {
  position: fixed;
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
.text { margin: 3px 0 4px; }
.text :global(.w-kbd) { margin: 0 1px; }
.foot { display: flex; justify-content: flex-end; gap: 4px; }
</style>
