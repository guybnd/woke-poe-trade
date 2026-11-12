<template>
  <div :class="[$style.spot, { [$style.under]: wm?.active.value }]" :style="{ left: `min(${spot.x}%, calc(100% - ${size.w}px))`, top: `min(${spot.y}%, calc(100% - ${size.h}px))` }">
    <div ref="el" :class="[$style.pin, { [$style.dragging]: dragging }]" data-w-panel :data-pin="pin.id"
      :style="{ opacity: solid ? 1 : pin.opacity / 100, zoom: pinScale / 100 }">
      <div :class="$style.head" title="Drag to move. It keeps one spot in towns and hideouts and another everywhere else."
        @pointerdown="startDrag">
        <i :class="pin.icon" class="w-accent" />
        <span class="w-head-font w-accent w-trunc" :class="$style.title">{{ pin.title }}</span>
        <button type="button" :class="$style.btn" class="w-focusable" data-pin-fade
          :title="`See-through: ${pin.opacity}%. Scroll to change`" :aria-label="`See-through ${pin.opacity}%`"
          @pointerdown.stop @wheel.prevent="fade" @keydown.up.prevent="nudge(5)" @keydown.down.prevent="nudge(-5)">
          <i class="fas fa-adjust" /> <span class="w-num">{{ pin.opacity }}%</span>
        </button>
        <button type="button" :class="$style.btn" class="w-focusable" data-pin-close title="Unpin" aria-label="Unpin"
          @pointerdown.stop @click="removePin(pin.id)"><i class="fas fa-thumbtack" /></button>
      </div>
      <div :class="$style.body" class="w-scroll"><slot /></div>
    </div>
  </div>
</template>

<script setup lang="ts">
// One pinned thing: drag it by its head, scroll over the half-moon to make it
// more or less see-through, click the pin to let it go. Solid while the mouse
// is on it, so its details stay readable.
import { computed, inject, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import type { WidgetManager } from '@/web/overlay/interfaces'
import { hoverZonesMoved, useHoverZone } from '../shared/hover'
import { movePin, pinScale, place, removePin, setPinOpacity, spotOf } from './pins'
import type { Pin } from './pins'

const props = defineProps<{ pin: Pin, index: number }>()

// With the overlay open, the windows you're using go over the pins.
const wm = inject<WidgetManager | null>('wm', null)

const el = shallowRef<HTMLElement | null>(null)
// Takes the mouse while it's over the pin, even with the game in focus, so
// the head drags and the body scrolls instead of walking your character there.
// Only after the mouse rests on it, so sweeping past a see-through pin still
// walks your character there.
const rested = shallowRef(false)
const dragging = shallowRef(false)
const hovered = useHoverZone(el, { enabled: () => true, activate: () => rested.value || dragging.value })
const REST_MS = 250
let restTimer: ReturnType<typeof setTimeout> | null = null
watch(hovered, (on) => {
  if (restTimer) { clearTimeout(restTimer); restTimer = null }
  if (!on) { rested.value = false; return }
  restTimer = setTimeout(() => { rested.value = true }, REST_MS)
})
const solid = computed(() => hovered.value || dragging.value)

const spot = computed(() => live.value ?? spotOf(props.pin, place.value, props.index))

function nudge (by: number) {
  setPinOpacity(props.pin.id, props.pin.opacity + by)
}
function fade (e: WheelEvent) {
  nudge(e.deltaY > 0 ? -5 : 5)
}

// While dragging, the spot lives here; it's saved once, on letting go.
const live = shallowRef<{ x: number, y: number } | null>(null)
let grab: { dx: number, dy: number } | null = null
function startDrag (e: PointerEvent) {
  if (e.button !== 0) return
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
  grab = { dx: e.clientX - r.left, dy: e.clientY - r.top }
  dragging.value = true
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', endDrag)
  e.preventDefault()
}
function onMove (e: PointerEvent) {
  if (!grab) return
  // Let go somewhere that never told us.
  if (!e.buttons) { endDrag(); return }
  live.value = {
    x: Math.min(98, Math.max(0, (e.clientX - grab.dx) / window.innerWidth * 100)),
    y: Math.min(98, Math.max(0, (e.clientY - grab.dy) / window.innerHeight * 100))
  }
  // The mouse zone moves along, or main gives the game back the mouse
  // as soon as the cursor leaves where the pin started.
  if (!zoneFrame) zoneFrame = requestAnimationFrame(() => { zoneFrame = 0; hoverZonesMoved() })
}
let zoneFrame = 0
function endDrag () {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', endDrag)
  if (live.value) movePin(props.pin.id, { x: Math.round(live.value.x * 10) / 10, y: Math.round(live.value.y * 10) / 10 })
  live.value = null
  grab = null
  dragging.value = false
  hoverZonesMoved()
}
// Kept whole on screen: a spot near the edge, or a smaller window, pulls it in.
const size = shallowRef({ w: 0, h: 0 })
let observer: ResizeObserver | null = null
onMounted(() => {
  observer = new ResizeObserver(() => {
    const r = el.value?.getBoundingClientRect()
    if (r) size.value = { w: Math.ceil(r.width), h: Math.min(Math.ceil(r.height), 40) }
  })
  if (el.value) observer.observe(el.value)
})
onUnmounted(() => {
  if (restTimer) clearTimeout(restTimer)
  if (zoneFrame) cancelAnimationFrame(zoneFrame)
  endDrag()
  observer?.disconnect()
})
</script>

<style module>
.spot { position: absolute; z-index: 880; }
.under { z-index: 0; }
.pin {
  display: flex;
  flex-direction: column;
  max-height: 70vh;
  min-width: 12rem;
  max-width: 40rem;
  background: var(--w-panel);
  border: 1px solid var(--w-line-strong, var(--w-line));
  border-radius: var(--w-radius);
  box-shadow: var(--w-shadow);
  color: var(--w-fg);
  font-family: var(--w-body);
  font-size: var(--w-fs-md);
  transition: opacity .12s;
}
.dragging { transition: none; }
.head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 4px 4px var(--w-pad);
  border-bottom: 1px solid var(--w-line);
  cursor: grab;
  user-select: none;
}
.dragging .head { cursor: grabbing; }
.title { flex: 1; min-width: 0; }
.btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: var(--w-radius-sm);
  color: var(--w-dim);
  font-size: var(--w-fs-xs);
  cursor: pointer;
}
.btn:hover { color: var(--w-fg); background: var(--w-hover, rgba(255, 255, 255, .06)); }
.body { min-height: 0; overflow: auto; }
@media (prefers-reduced-motion: reduce) { .pin { transition: none; } }
</style>
