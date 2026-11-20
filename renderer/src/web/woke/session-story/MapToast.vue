<template>
  <Teleport to="body">
    <!-- Centred by the outer box, so the opening motion (which sets transform) can't move it. -->
    <div v-if="chip" :class="$style.place">
    <div ref="el" :class="[$style.toast, 'w-enter']" data-map-toast role="status">
      <div :class="$style.top">
        <div :class="$style.lead">
          <div :class="$style.name">{{ chip.rec.name }} <span :class="$style.tier">{{ tierText(chip.rec.areaLevel) }}</span></div>
          <div :class="$style.time" class="w-num">{{ formatClock(chip.rec.mapMs) }}</div>
          <div v-if="headDiff != null" class="w-num" :class="[$style.delta, tone(headDiff)]">{{ signed(headDiff) }} <span :class="$style.vs">{{ headLabel }}</span></div>
        </div>
        <div v-if="chip.cmp.runs.length > 1" :class="$style.bars">
          <i v-for="(ms, i) in chip.cmp.runs" :key="i" :class="{ [$style.now]: i === chip.cmp.runs.length - 1 }"
            :style="{ height: `${Math.max(8, ms / barTop * 100)}%` }" />
          <span v-if="chip.cmp.hourAvg != null" :class="$style.avg" :style="{ bottom: `${chip.cmp.hourAvg / barTop * 100}%` }" />
        </div>
        <div :class="$style.rows" class="w-num">
          <div v-if="chip.cmp.hourAvg != null"><span>1h avg ({{ chip.cmp.hourRuns }})</span><span>{{ formatClock(chip.cmp.hourAvg) }}</span></div>
          <div v-else-if="chip.cmp.usual != null"><span>Usual</span><span>{{ formatClock(chip.cmp.usual) }}</span></div>
          <div v-if="chip.cmp.prev">
            <span>Last<template v-if="chip.cmp.prev.name !== chip.rec.name"> ({{ chip.cmp.prev.name }})</template></span>
            <span>{{ formatClock(chip.cmp.prev.mapMs) }} <b :class="tone(chip.rec.mapMs - chip.cmp.prev.mapMs)">{{ signed(chip.rec.mapMs - chip.cmp.prev.mapMs) }}</b></span>
          </div>
          <div v-if="chip.cmp.runs.length > 1"><span>Best this hour</span><span>{{ formatClock(chip.cmp.best) }}</span></div>
        </div>
      </div>
      <div v-if="tags.length" :class="$style.tags">
        <span v-for="t in tags" :key="t.text" :class="[$style.tag, t.tone && $style[t.tone]]">{{ t.text }}</span>
      </div>
    </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
// The line about a map you just left, in the middle of the screen: the time
// big, then against the hour and the run before, then what happened. It never
// takes the mouse: a click on it (with "Click closes it") reaches the game too.
import { computed, shallowRef } from 'vue'
import { formatClock } from '../ui/format'
import { useHoverZone } from '../shared/hover'
import { tierText } from './map-log'
import type { MapRecord } from './map-log'
import type { MapCompare } from './chip'

const props = defineProps<{ chip: { rec: MapRecord, cmp: MapCompare } | null, clickToClose: boolean }>()
const emit = defineEmits<{ close: [] }>()

const el = shallowRef<HTMLElement | null>(null)
useHoverZone(el, { enabled: () => !!props.chip && props.clickToClose, activate: () => false, onClick: () => emit('close') })

const headDiff = computed(() => {
  const c = props.chip
  if (!c) return null
  const base = c.cmp.hourAvg ?? c.cmp.usual
  return base != null ? c.rec.mapMs - base : null
})
const headLabel = computed(() => props.chip?.cmp.hourAvg != null ? 'vs 1h avg' : 'vs usual')
const barTop = computed(() => Math.max(1, ...(props.chip?.cmp.runs ?? [1]), props.chip?.cmp.hourAvg ?? 0) * 1.05)

const tags = computed(() => {
  const r = props.chip?.rec
  if (!r) return []
  const out: Array<{ text: string, tone?: 'bad' | 'good' }> = []
  if (r.deaths) out.push({ text: `${r.deaths} ${r.deaths === 1 ? 'death' : 'deaths'}`, tone: 'bad' })
  for (const n of r.npcs) out.push({ text: n })
  if (r.levelsGained && r.charLevel != null) out.push({ text: `Level ${r.charLevel + r.levelsGained}`, tone: 'good' })
  return out
})

function signed (diff: number): string {
  if (Math.abs(diff) < 1000) return '±0:00'
  return `${diff < 0 ? '−' : '+'}${formatClock(Math.abs(diff))}`
}
function tone (diff: number): string {
  return Math.abs(diff) < 1000 ? 'w-dim' : diff < 0 ? 'w-up' : 'w-down'
}
</script>

<style module>
.place {
  position: fixed; z-index: 1002; left: 0; right: 0; top: 30%;
  display: flex; justify-content: center; pointer-events: none;
}
.toast {
  min-width: 300px; max-width: 420px; padding: 9px 12px 8px;
  background: var(--w-panel-3); border: 1px solid var(--w-line-strong); border-radius: var(--w-r-md);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5); color: var(--w-fg); font-family: var(--w-body);
  pointer-events: none; zoom: var(--w-ui-scale, 1);
}
.top { display: flex; align-items: flex-end; gap: 14px; }
.lead { flex: none; }
.name { font-family: var(--w-label); color: var(--w-accent); font-size: 1.05em; }
.tier { font-family: var(--w-small); color: var(--w-dim); font-size: 0.75em; }
.time { font-family: var(--w-label); font-size: 2.3em; line-height: 1; color: var(--w-accent); }
.delta { font-weight: 600; font-size: 0.9em; margin-top: 2px; }
.vs { font-weight: 400; color: var(--w-dim); font-size: 0.85em; }
.bars { position: relative; display: flex; align-items: flex-end; gap: 3px; height: 44px; flex: none; }
.bars i { display: block; width: 10px; background: var(--w-line-strong); }
.bars i.now { background: var(--w-accent); }
.avg { position: absolute; left: -2px; right: -2px; border-top: 1px dashed var(--w-frame-hi, var(--w-accent)); }
.rows { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; font-size: 0.85em; }
.rows > div { display: flex; justify-content: space-between; gap: 10px; }
.rows > div > span:first-child { color: var(--w-dim); }
.rows b { font-weight: 600; }
.tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 7px; }
.tag { font-size: 0.8em; padding: 0 6px; border: 1px solid var(--w-line); border-radius: var(--w-r-sm); color: var(--w-dim); }
.bad { color: var(--w-down); border-color: var(--w-bad-line, var(--w-down)); }
.good { color: var(--w-accent); }
</style>
