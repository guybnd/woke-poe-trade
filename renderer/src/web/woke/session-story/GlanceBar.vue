<template>
  <Teleport to="body">
    <!-- While you're in a map: a thin bar, click-through while you play. While
         Settings is open it can be dragged anywhere (and shows even outside a map). -->
    <div v-if="map || editing" :class="[$style.bar, { [$style.editing]: editing }]" :style="place" class="w-num" data-glance-bar role="status"
      :title="editing ? 'Drag to move' : undefined" @pointerdown="startDrag">
      <template v-if="map">
        <span :class="$style.name">{{ map.name }}</span>
        <span class="w-dim">{{ tierText(map.areaLevel) }}</span>
        <span data-glance-time>{{ formatClock(elapsed) }}</span>
      </template>
      <span v-else :class="$style.name">Glance bar</span>
      <template v-if="night">
        <span :class="$style.sep" />
        <span class="w-dim">Tonight</span>
        <span>{{ night.maps.length }} {{ night.maps.length === 1 ? 'map' : 'maps' }}</span>
        <span v-if="profit != null" :class="profit >= 0 ? 'w-up' : 'w-down'">{{ profit > 0 ? '+' : '' }}{{ formatChaos(profit, night.divine) }}</span>
      </template>
      <span v-if="editing" class="w-dim" data-glance-drag><i class="fas fa-grip-vertical" /></span>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
// Settings › Sessions › "While in a map". Off unless turned on.
import { computed, onUnmounted, shallowRef } from 'vue'
import { formatChaos, formatClock } from '../ui/format'
import { tickWhile } from '../dock/dock'
import { tierText } from './map-log'
import type { MapRecord } from './map-log'
import { useNightList } from './nights'

const props = defineProps<{
  // The map you're in, as Session story's map log has it; null in hideout or town.
  map: Pick<MapRecord, 'name' | 'areaLevel'> | null
  // When you went in this time through the portal, and the map's time before that.
  since: number
  before: number
  // Settings is open: the bar takes the mouse and can be dragged.
  editing?: boolean
  // Where it sits: its top centre, as a share of the screen; null: top centre.
  pos?: { x: number, y: number } | null
}>()
const emit = defineEmits<{ move: [pos: { x: number, y: number }, done: boolean] }>()

const place = computed(() => props.pos
  ? { left: `${props.pos.x * 100}%`, top: `${props.pos.y * 100}%` }
  : undefined)
// Dragging moves its top centre with the pointer, kept on screen.
function startDrag (e: PointerEvent) {
  if (!props.editing || e.button !== 0) return
  const el = e.currentTarget as HTMLElement
  const box = el.getBoundingClientRect()
  const dx = e.clientX - (box.left + box.width / 2)
  const dy = e.clientY - box.top
  try { el.setPointerCapture(e.pointerId) } catch {}
  const at = (ev: PointerEvent) => ({
    x: Math.min(1, Math.max(0, (ev.clientX - dx) / window.innerWidth)),
    y: Math.max(0, Math.min(1 - box.height / window.innerHeight, (ev.clientY - dy) / window.innerHeight))
  })
  let last: { x: number, y: number } | null = null
  const move = (ev: PointerEvent) => { last = at(ev); emit('move', last, false) }
  // pointerup, or the capture lost (the overlay closed mid-drag): ends it either way.
  const up = () => {
    el.removeEventListener('pointermove', move)
    el.removeEventListener('pointerup', up)
    el.removeEventListener('pointercancel', up)
    el.removeEventListener('lostpointercapture', up)
    window.removeEventListener('pointerup', up)
    if (last) emit('move', last, true)
  }
  el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', up)
  el.addEventListener('pointercancel', up)
  el.addEventListener('lostpointercapture', up)
  window.addEventListener('pointerup', up)
  e.preventDefault()
}

// The map's time so far, like the after-map toast, ticking each second while the bar shows.
const now = shallowRef(Date.now())
onUnmounted(tickWhile(() => !!props.map, () => { now.value = Date.now() }, 1000))
const elapsed = computed(() => props.before + Math.max(0, now.value - props.since))
const nights = useNightList()
const night = computed(() => nights.shown.value?.live ? nights.shown.value.story : null)
const profit = computed(() => night.value ? nights.profitOf(night.value) : null)
</script>

<style module>
.bar {
  position: fixed;
  /* Below the dock's default row; the dock sits at z-index 900. */
  top: 52px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 2px 10px;
  font-size: var(--w-fs-sm);
  white-space: nowrap;
  color: var(--w-fg);
  background: color-mix(in srgb, var(--w-panel) 86%, transparent);
  border: 1px solid var(--w-line);
  pointer-events: none;
  z-index: 950;
}
.editing { pointer-events: auto; cursor: move; user-select: none; border-color: var(--w-accent); }
.name { color: var(--w-accent); }
.sep { width: 1px; align-self: stretch; background: var(--w-line); }
</style>
