<template>
  <Teleport to="body">
    <!-- While you're in a map: a thin bar at the top. It never takes the mouse. -->
    <div v-if="map" :class="$style.bar" class="w-num" data-glance-bar role="status">
      <span :class="$style.name">{{ map.name }}</span>
      <span class="w-dim">{{ tierText(map.areaLevel) }}</span>
      <span>{{ minutes }}m</span>
      <template v-if="night">
        <span :class="$style.sep" />
        <span class="w-dim">Tonight</span>
        <span>{{ night.maps.length }} {{ night.maps.length === 1 ? 'map' : 'maps' }}</span>
        <span v-if="profit != null" :class="profit >= 0 ? 'w-up' : 'w-down'">{{ profit > 0 ? '+' : '' }}{{ formatChaos(profit, night.divine) }}</span>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
// Settings › Farming & sessions › "While in a map". Off unless turned on.
import { computed } from 'vue'
import { formatChaos, nowMinute } from '../ui/format'
import { tierText } from './map-log'
import type { MapRecord } from './map-log'
import { useNightList } from './nights'

const props = defineProps<{
  // The map you're in, as Session story's map log has it; null in hideout or town.
  map: Pick<MapRecord, 'name' | 'areaLevel'> | null
  // When you went in (this time through the portal).
  since: number
}>()

// Minutes only: the shared half-minute clock, so the bar adds no timer of its own.
const minutes = computed(() => Math.max(0, Math.floor((nowMinute.value - props.since) / 60_000)))
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
.name { color: var(--w-accent); }
.sep { width: 1px; align-self: stretch; background: var(--w-line); }
</style>
