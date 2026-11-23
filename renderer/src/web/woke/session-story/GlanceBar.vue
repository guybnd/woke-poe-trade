<template>
  <Teleport to="body">
    <!-- While you're in a map: a thin bar, click-through while you play. With the
         overlay open it can be dragged anywhere; while Settings is open it also
         shows outside a map, so it can be placed before one. -->
    <div v-if="map || editing" :class="[$style.bar, { [$style.movable]: movable || editing, [$style.editing]: editing }]" :style="place" class="w-num" data-glance-bar role="status"
      :title="movable || editing ? 'Drag to move' : undefined" @pointerdown="startDrag">
      <template v-if="map">
        <span :class="$style.name">{{ map.name }}</span>
        <span class="w-dim">{{ tierText(map.areaLevel) }}</span>
        <span data-glance-time>{{ formatClock(elapsed) }}</span>
      </template>
      <span v-else :class="$style.name">Glance bar</span>
      <!-- A strategy run going (Net worth › Runs): its maps and profit instead of tonight's. -->
      <template v-if="run">
        <span :class="$style.sep" />
        <span class="w-dim" data-glance-run>Run</span>
        <span>{{ run.maps }} {{ run.maps === 1 ? 'map' : 'maps' }}</span>
        <span :class="run.profitChaos >= 0 ? 'w-up' : 'w-down'">{{ run.profitChaos > 0 ? '+' : '' }}{{ formatChaos(run.profitChaos, run.divine) }}</span>
      </template>
      <template v-else-if="night">
        <span :class="$style.sep" />
        <span class="w-dim">Tonight</span>
        <span>{{ night.maps.length }} {{ night.maps.length === 1 ? 'map' : 'maps' }}</span>
        <span v-if="profit != null" :class="profit >= 0 ? 'w-up' : 'w-down'">{{ profit > 0 ? '+' : '' }}{{ formatChaos(profit, night.divine) }}</span>
      </template>
      <span :class="[$style.grip, { [$style.gripOn]: movable || editing }]" class="w-dim" data-glance-drag><i class="fas fa-grip-vertical" /></span>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
// Settings › Sessions › "While in a map". Off unless turned on.
import { computed, onUnmounted, shallowRef, watch } from 'vue'
import { AppConfig } from '@/web/Config'
import { hostRequest } from '../shared/host'
import { formatChaos, formatClock } from '../ui/format'
import { tickWhile } from '../dock/dock'
import { tierText } from './map-log'
import { dragSpot } from '../ui/drag-spot'
import type { MapRecord } from './map-log'
import { useNightList } from './nights'

const props = defineProps<{
  // The map you're in, as Session story's map log has it; null in hideout or town.
  map: Pick<MapRecord, 'name' | 'areaLevel'> | null
  // When you went in this time through the portal, and the map's time before that.
  since: number
  before: number
  // Settings is open: the bar shows even outside a map, outlined, to be placed.
  editing?: boolean
  // The overlay is open: the bar takes the mouse and can be dragged by any part.
  movable?: boolean
  // Where it sits: its top centre, as a share of the screen; null: top centre.
  pos?: { x: number, y: number } | null
}>()
const emit = defineEmits<{ move: [pos: { x: number, y: number }, done: boolean] }>()

const place = computed(() => props.pos
  ? { left: `${props.pos.x * 100}%`, top: `${props.pos.y * 100}%` }
  : undefined)
// Dragging moves its top centre with the pointer, kept on screen (drag-spot.ts).
function startDrag (e: PointerEvent) {
  if (!props.movable && !props.editing) return
  dragSpot(e, e.currentTarget as HTMLElement, (spot, done) => emit('move', spot, done))
}

// The map's time so far, like the after-map toast, ticking each second while the bar shows.
const now = shallowRef(Date.now())
onUnmounted(tickWhile(() => !!props.map, () => { now.value = Date.now() }, 1000))
const elapsed = computed(() => props.before + Math.max(0, now.value - props.since))
const nights = useNightList()
const night = computed(() => nights.shown.value?.live ? nights.shown.value.story : null)
const profit = computed(() => night.value ? nights.profitOf(night.value) : null)

// The strategy run's saved glance (net-worth/runs.ts RunGlance), read each
// time you go into a map: it changes only with a stash read.
interface RunNumbers { name: string, maps: number, profitChaos: number, divine: number | null }
const run = shallowRef<RunNumbers | null>(null)
watch(() => props.map ? props.since : null, (since) => {
  const league = AppConfig().leagueId
  if (since == null || !league) return
  hostRequest('doc-get', { collection: 'net-worth', key: `${league}-run-glance` })
    .then((g) => {
      const o = g as Partial<RunNumbers> & { league?: string } | null
      run.value = o && o.league === league && typeof o.profitChaos === 'number' && Number.isFinite(o.profitChaos) && typeof o.maps === 'number'
        ? { name: String(o.name ?? ''), maps: o.maps, profitChaos: o.profitChaos, divine: typeof o.divine === 'number' ? o.divine : null }
        : null
    })
    .catch(() => {})
}, { immediate: true })
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
/* With the overlay open: takes the mouse, grip on hover only (it can sit over a price check). */
.movable { pointer-events: auto; cursor: move; user-select: none; }
.grip { visibility: hidden; }
.movable:hover .gripOn, .editing .gripOn { visibility: visible; }
.movable:hover, .editing { border-color: var(--w-accent); }
.name { color: var(--w-accent); }
.sep { width: 1px; align-self: stretch; background: var(--w-line); }
</style>
