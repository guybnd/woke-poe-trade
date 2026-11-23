<template>
  <!-- Where a run's time went (Client.txt): maps, hideout and town, away. -->
  <div v-if="parts" :class="$style.wrap" data-run-time>
    <div :class="$style.bar">
      <i v-for="p in parts" :key="p.id" :class="$style[p.id]" :style="{ flexGrow: p.ms }" :title="`${p.label}: ${formatDuration(p.ms)}`" />
    </div>
    <div :class="$style.key" class="w-dim w-num text-xs">
      <span v-for="p in parts" :key="p.id"><i :class="[$style.dot, $style[p.id]]" />{{ p.label }} {{ formatDuration(p.ms) }}</span>
      <span v-if="perMap" :title="unit === 'map' ? 'Time in maps per map' : 'Time in maps and boss fights, per map or fight'">{{ perMap }} a {{ unit }}</span>
      <WToggle :model-value="withHub" :class="$style.toggle" title="Count hideout and town time in per hour" data-run-hub @update:model-value="emit('with-hub', $event)">Count hideout</WToggle>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { WToggle } from '../ui'
import { formatDuration } from '../ui/format'
import { runTimeIn } from './run-time'
import type { RunTime } from './run-time'

const props = defineProps<{
  startAt: number
  // The end of the stretch: the last stash read (or Stop).
  end: number
  // Maps and boss fights.
  maps: number
  unit?: 'map' | 'fight' | 'run'
  withHub: boolean
}>()
const emit = defineEmits<{ (e: 'with-hub', on: boolean): void, (e: 'spent', t: RunTime | null): void }>()

const spent = shallowRef<RunTime | null>(null)
watch(() => [props.startAt, props.end] as const, ([from, to]) => {
  runTimeIn(from, to).then((t) => {
    if (props.startAt !== from || props.end !== to) return
    spent.value = t
    emit('spent', t)
  }).catch(() => {})
}, { immediate: true })

const parts = computed(() => {
  const t = spent.value?.ms
  if (!t) return null
  const all = [
    { id: 'map', label: 'Maps', ms: t.map + t.play },
    { id: 'hub', label: 'Hideout', ms: t.hub },
    { id: 'off', label: 'Away', ms: t.off }
  ].filter(p => p.ms >= 60_000)
  return all.length ? all : null
})
const perMap = computed(() => spent.value && props.maps > 0 ? formatDuration((spent.value.ms.map + spent.value.ms.play) / props.maps) : null)
</script>

<style module>
.wrap { display: flex; flex-direction: column; gap: 3px; }
.bar { display: flex; height: 6px; gap: 1px; border-radius: var(--w-r-sm); overflow: hidden; }
.bar i { display: block; min-width: 2px; }
.map { background: var(--w-up); }
.hub { background: var(--w-gold); }
.off { background: var(--w-line-strong); }
.key { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 12px; }
.dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 4px; }
.toggle { margin-left: auto; }
</style>
