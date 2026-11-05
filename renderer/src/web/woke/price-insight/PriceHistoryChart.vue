<template>
  <div :class="$style.box">
    <div :class="$style.head">
      <w-segmented v-if="ranges.length > 1" :model-value="range" :options="options" @update:model-value="pick" />
      <span v-else class="w-dim text-xs">{{ RANGE_LABEL[range] }}</span>
      <span class="flex-1" />
      <span v-if="change != null" class="text-xs w-num" :class="change >= 0 ? 'w-up' : 'w-down'">
        {{ change >= 0 ? '+' : '' }}{{ Math.round(change * 100) }}%
      </span>
    </div>
    <svg v-if="geo" :viewBox="`0 0 ${W} ${H}`" :class="$style.chart" role="img"
      :aria-label="`Price history, ${RANGE_LABEL[range]}`">
      <line v-for="t in geo.yTicks" :key="'g' + t.y" :x1="34" :x2="W - 6" :y1="t.y" :y2="t.y" :class="$style.grid" />
      <text v-for="t in geo.yTicks" :key="'y' + t.y" x="30" :y="t.y + 3" text-anchor="end" :class="$style.lab">{{ fmt(t.chaos) }}</text>
      <text v-for="(t, i) in geo.xTicks" :key="'x' + i" :x="t.x" :y="H - 3" :text-anchor="i ? 'end' : 'start'" :class="$style.lab">{{ t.label }}</text>
      <path :d="geo.area" :class="$style.area" />
      <path :d="geo.path" :class="$style.line" />
      <circle v-for="(d, i) in shownDots" :key="i" :cx="d.x" :cy="d.y" :r="i === shownDots.length - 1 ? 3.2 : 2.2" :class="$style.pt">
        <title>{{ fmt(d.chaos) }} · {{ new Date(d.ts).toLocaleString() }}</title>
      </circle>
    </svg>
    <div v-else class="w-faint text-xs" :class="$style.empty">{{ emptyText }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { WSegmented } from '../ui'
import { formatChaos } from '../ui/format'
import { chartGeometry, HistoryPoint, HistoryRange, RANGE_LABEL, seriesChange } from './history'

const props = defineProps<{
  ranges: HistoryRange[]
  series: (r: HistoryRange) => HistoryPoint[]
  divine: number | undefined
  loading: boolean
}>()
const emit = defineEmits<{ (e: 'range', r: HistoryRange): void }>()

const W = 400
const H = 88

const range = shallowRef<HistoryRange>(props.ranges[0] ?? 'mine')
watch(() => props.ranges, (r) => {
  if (r.length && !r.includes(range.value)) range.value = r[0]
}, { immediate: true })
watch(range, (r) => emit('range', r), { immediate: true })

const options = computed(() => props.ranges.map(r => ({ value: r, label: RANGE_LABEL[r] })))
function pick (v: string) { range.value = v as HistoryRange }

const points = computed(() => props.series(range.value))
const geo = computed(() => chartGeometry(points.value, W, H))
const change = computed(() => seriesChange(points.value))
// Dots only where they mean single readings (your checks) or a short series.
const shownDots = computed(() => {
  const d = geo.value?.dots ?? []
  return range.value === 'mine' || d.length <= 10 ? d : d.slice(-1)
})

const unitDiv = computed(() => Boolean(props.divine && points.value.some(p => p.chaos >= props.divine!)))
function fmt (chaos: number) {
  return formatChaos(chaos, props.divine, unitDiv.value ? 'div' : 'chaos')
}

const emptyText = computed(() => {
  if (props.loading) return 'Reading saved prices…'
  if (range.value === 'league') return 'No league history on this PC yet. Turn on the Market tracker module to save poe.ninja prices daily.'
  if (range.value === 'mine') return 'Check this search again later to build up its history.'
  return 'Not enough points to draw.'
})
</script>

<style module>
.box { display: flex; flex-direction: column; gap: 4px; padding-top: 6px; border-top: 1px solid var(--w-line-soft); }
.head { display: flex; align-items: center; gap: 6px; }
.chart { display: block; width: 100%; height: auto; }
.grid { stroke: var(--w-line-soft, var(--w-line)); stroke-width: 1; }
.lab { fill: var(--w-faint); font-family: var(--w-num); font-size: var(--w-fs-xs); }
.area { fill: var(--w-accent); opacity: 0.12; }
.line { fill: none; stroke: var(--w-accent); stroke-width: 1.6; stroke-linejoin: round; }
.pt { fill: var(--w-accent); }
.empty { padding: 6px 0; }
</style>
