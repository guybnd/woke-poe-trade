<template>
  <!-- Where a run's time went (Client.txt): maps, hideout and town, away.
       Shared: the Runs card and the run summary use this one. -->
  <div v-if="parts" :class="$style.wrap" data-run-time>
    <div :class="$style.head">
      <span :class="$style.caps">Time</span>
      <span v-if="perMap" class="w-num text-xs" :title="unit === 'map' ? 'Time in maps per map' : 'Time in maps and boss fights, per map or fight'" data-run-time-per>{{ perMap }} a {{ unit }}</span>
      <RateTimePick :class="$style.pick" />
    </div>
    <div :class="$style.bar" role="img" :aria-label="parts.map(p => `${p.label} ${p.pct}%`).join(', ')">
      <i v-for="p in parts" :key="p.id" :class="$style[p.id]" :style="{ flexGrow: p.ms }" :title="`${p.label}: ${formatDuration(p.ms)} (${p.pct}%)`" />
    </div>
    <div :class="$style.key" class="w-num text-xs">
      <span v-for="p in parts" :key="p.id" :data-run-time-part="p.id"><i :class="[$style.dot, $style[p.id]]" /><span class="w-dim">{{ p.label }}</span> {{ formatDuration(p.ms) }} <span class="w-dim">{{ p.pct }}%</span></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { formatDuration } from '../ui/format'
import RateTimePick from '../shared/RateTimePick.vue'
import { runTimeIn, timeOrKept } from './run-time'
import type { RunTime } from './run-time'
import type { TimeSplit } from '../shared/rate-time'

const props = defineProps<{
  startAt: number
  // The end of the stretch: the last stash read (or Stop).
  end: number
  // Maps and boss fights.
  maps: number
  unit?: 'map' | 'fight' | 'run'
  // What Stop saved (a past run): shown when Client.txt no longer covers it.
  kept?: TimeSplit
}>()
const emit = defineEmits<{ (e: 'spent', t: RunTime | null): void }>()

const spent = shallowRef<RunTime | null>(null)
watch(() => [props.startAt, props.end] as const, ([from, to]) => {
  runTimeIn(from, to).then((read) => {
    if (props.startAt !== from || props.end !== to) return
    // kept is only ever what Stop saved.
    const t = timeOrKept(read, props.kept, true)
    spent.value = t
    emit('spent', t)
  }).catch(() => {})
}, { immediate: true })

const hasTime = (t: TimeSplit | undefined | null): t is TimeSplit => t != null && Object.values(t).some(ms => ms > 0)
const split = computed<TimeSplit | null>(() => hasTime(spent.value?.ms) ? spent.value!.ms : hasTime(props.kept) ? props.kept : null)

const parts = computed(() => {
  const t = split.value
  if (!t) return null
  const all = [
    { id: 'map', label: 'Maps', ms: t.map },
    { id: 'play', label: 'Other zones', ms: t.play },
    { id: 'hub', label: 'Hideout and town', ms: t.hub },
    { id: 'off', label: 'Away', ms: t.off }
  ].filter(p => p.ms >= 60_000)
  const sum = all.reduce((s, p) => s + p.ms, 0)
  return all.length ? all.map(p => ({ ...p, pct: Math.round(p.ms / sum * 100) })) : null
})
const perMap = computed(() => split.value && props.maps > 0 ? formatDuration((split.value.map + split.value.play) / props.maps) : null)
</script>

<style module>
.wrap { display: flex; flex-direction: column; gap: 4px; }
.head { display: flex; align-items: baseline; gap: 10px; }
.caps { font-size: calc(0.7rem * var(--w-text-scale, 1)); text-transform: uppercase; letter-spacing: 0.06em; color: var(--w-dim); }
.pick { margin-left: auto; }
.bar { display: flex; height: 10px; gap: 2px; border-radius: var(--w-r-sm); overflow: hidden; }
.bar i { display: block; min-width: 3px; }
.map { background: var(--w-up); }
.play { background: var(--w-info); }
.hub { background: var(--w-gold); }
.off { background: var(--w-line-strong); }
.key { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 14px; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
</style>
