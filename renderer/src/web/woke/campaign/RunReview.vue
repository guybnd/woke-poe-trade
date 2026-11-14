<template>
  <div>
    <div :class="$style.sum">
      <span class="w-trunc">{{ run.className || 'Unknown' }}<template v-if="run.level != null"> {{ run.level }}</template> · {{ date }}</span>
      <span v-if="deaths != null">Deaths <span class="w-num">{{ deaths }}</span></span>
      <span v-if="town != null">Town <span class="w-num">{{ formatClock(town * 1000) }}</span></span>
      <span>Run <span class="w-num">{{ total != null ? formatClock(total) : '—' }}</span></span>
    </div>

    <WEmpty v-if="state === 'none'" icon="fas fa-route">No timeline. Runs before this update only have act splits.</WEmpty>
    <div v-else-if="state === 'loading'" class="w-faint" :class="$style.pad">Loading…</div>

    <template v-if="state === 'ready' && chart">
      <svg :class="$style.chart" viewBox="0 0 300 92" role="img" aria-label="Level over run time">
        <g v-for="g in chart.grid" :key="'g' + g.lv">
          <line x1="22" x2="298" :y1="g.y" :y2="g.y" :class="$style.gridLine" />
          <text x="18" :y="g.y + 3" text-anchor="end" :class="$style.axis">{{ g.lv }}</text>
        </g>
        <g v-for="a in chart.acts" :key="'a' + a.act">
          <line :x1="a.x" :x2="a.x" y1="4" y2="80" :class="$style.actLine" />
          <text :x="a.x - 2" y="10" text-anchor="end" :class="$style.axis">{{ a.act }}</text>
        </g>
        <path v-if="chart.cmp" :d="chart.cmp" :class="$style.cmpPath" />
        <path :d="chart.mine" :class="$style.minePath" />
        <text x="22" y="90" :class="$style.axis">0:00</text>
        <text x="298" y="90" text-anchor="end" :class="$style.axis">{{ formatClock(chart.endSec * 1000) }}</text>
      </svg>
      <div v-if="chart.cmp" :class="$style.legend">
        <span><i :class="$style.keyMine" />This run</span>
        <span><i :class="$style.keyCmp" />vs {{ cmpLabel }}</span>
      </div>
    </template>

    <template v-if="state !== 'loading'">
      <div class="w-row w-row--head" :class="$style.grid">
        <span>{{ acts ? 'Zone' : 'Act' }}</span><span class="text-right">{{ acts ? '×' : '' }}</span><span class="text-right">Time</span><span class="text-right">±</span>
      </div>
      <template v-if="acts">
        <template v-for="a in acts" :key="a.act">
          <div class="w-row" :class="[$style.grid, $style.act]">
            <span class="w-head-font">{{ actLabel(a.act) }}</span><span />
            <span class="text-right w-num">{{ fmt(actSec(run, a.act)) }}</span>
            <span class="text-right w-num" :class="toneOf(actDelta(a.act))">{{ fmtDelta(actDelta(a.act)) }}</span>
          </div>
          <div v-for="z in a.zones" :key="z.areaId" class="w-row" :class="[$style.grid, z.town && 'w-faint']" :title="z.town ? 'Town or hideout' : undefined">
            <span class="w-trunc">{{ z.name }}<span v-if="z.deaths" :class="$style.dead" :title="z.deaths === 1 ? 'Died here' : `Died here ${z.deaths} times`"> ☠{{ z.deaths > 1 ? z.deaths : '' }}</span></span>
            <span class="text-right w-num w-faint">{{ z.visits > 1 ? z.visits : '' }}</span>
            <span class="text-right w-num">{{ formatClock(z.sec * 1000) }}</span>
            <span class="text-right w-num" :class="toneOf(zoneDelta(z))">{{ fmtDelta(zoneDelta(z)) }}</span>
          </div>
        </template>
      </template>
      <template v-else>
        <div v-for="s in run.splits" :key="s.act" class="w-row" :class="$style.grid">
          <span>{{ actLabel(s.act) }}<span v-if="s.level != null" class="w-faint"> lv {{ s.level }}</span></span><span />
          <span class="text-right w-num">{{ fmt(actSec(run, s.act)) }}</span>
          <span class="text-right w-num" :class="toneOf(actDelta(s.act))">{{ fmtDelta(actDelta(s.act)) }}</span>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { formatClock } from '../ui/format'
import WEmpty from '../ui/WEmpty.vue'
import { actLabel } from './log-parse'
import { formatDelta, runTotal, segmentMs } from './run-timer'
import type { CampaignRun } from './run-timer'
import { deathCount, levelSteps, runEndSec, townSec, zoneVisits, zonesByAct } from './run-timeline'
import type { RunTimeline, ZoneSum } from './run-timeline'
import { loadTimeline } from './run-timeline-store'

const props = defineProps<{
  run: CampaignRun
  cmp: CampaignRun | null
  cmpLabel: string
  // The live timeline, when this run is the one being recorded.
  live: RunTimeline | null
}>()

// Read only while this view is open, and dropped with it.
const tl = shallowRef<RunTimeline | null>(null)
const cmpTl = shallowRef<RunTimeline | null>(null)
const state = shallowRef<'loading' | 'ready' | 'none'>('loading')

watch(() => [props.run.id, props.cmp?.id], async () => {
  state.value = 'loading'
  const runId = props.run.id
  const [mine, theirs] = await Promise.all([
    props.live ?? loadTimeline(runId),
    props.cmp ? loadTimeline(props.cmp.id) : null
  ])
  if (props.run.id !== runId) return
  tl.value = mine
  cmpTl.value = theirs
  state.value = mine && mine.ev.length ? 'ready' : 'none'
}, { immediate: true })

const date = computed(() => new Date(props.run.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))
const total = computed(() => runTotal(props.run) ?? (props.run.splits.length ? props.run.splits[props.run.splits.length - 1].totalMs : props.run.elapsedMs))
const visits = computed(() => tl.value ? zoneVisits(tl.value, runEndSec(props.run)) : null)
const town = computed(() => visits.value ? townSec(visits.value) : null)
const deaths = computed(() => tl.value ? deathCount(tl.value) : null)
const acts = computed(() => state.value === 'ready' && tl.value ? zonesByAct(props.run, tl.value, props.cmp, cmpTl.value) : null)

function actSec (run: CampaignRun, act: number): number | null {
  return segmentMs(run, act)
}
function actDelta (act: number): number | null {
  const mine = actSec(props.run, act)
  const theirs = props.cmp ? actSec(props.cmp, act) : null
  return mine != null && theirs != null ? mine - theirs : null
}
function zoneDelta (z: ZoneSum): number | null { return z.cmpSec == null ? null : (z.sec - z.cmpSec) * 1000 }
function fmt (ms: number | null) { return ms == null ? '—' : formatClock(ms) }
// ms.
function fmtDelta (v: number | null) { return v == null ? '—' : formatDelta(v) }
function toneOf (v: number | null) { return v == null ? 'w-faint' : v <= 0 ? 'w-up' : 'w-down' }

// Level over run time, this run and the one it's compared with.
const chart = computed(() => {
  if (!tl.value) return null
  const mine = levelSteps(tl.value)
  if (!mine.length) return null
  const theirs = cmpTl.value ? levelSteps(cmpTl.value) : null
  const ends = [runEndSec(props.run) ?? mine[mine.length - 1][0], theirs?.length ? (runEndSec(props.cmp!) ?? theirs[theirs.length - 1][0]) : 0]
  const endSec = Math.max(1, ...ends)
  const top = Math.max(10, ...mine.map(s => s[1]), ...(theirs ?? []).map(s => s[1]))
  const maxLv = Math.ceil(top / 10) * 10
  const X = (t: number) => 22 + Math.min(1, t / endSec) * 276
  const Y = (lv: number) => 80 - lv / maxLv * 74
  const path = (steps: Array<[number, number]>, end: number) => {
    let d = `M${X(0).toFixed(1)},${Y(1).toFixed(1)}`
    for (const [t, lv] of steps) d += `H${X(t).toFixed(1)}V${Y(lv).toFixed(1)}`
    return d + `H${X(end).toFixed(1)}`
  }
  const grid = []
  for (let lv = maxLv / 2; lv <= maxLv; lv += maxLv / 2) grid.push({ lv, y: Y(lv) })
  return {
    endSec,
    grid,
    acts: props.run.splits.filter(s => s.act < 10).map(s => ({ act: s.act + 1, x: X(s.totalMs / 1000) })),
    mine: path(mine, ends[0]),
    cmp: theirs?.length ? path(theirs, ends[1]) : null
  }
})
</script>

<style module>
.sum {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 6px var(--w-pad);
  border-bottom: 1px solid var(--w-line);
  font-size: var(--w-fs-sm);
  color: var(--w-dim);
  white-space: nowrap;
}
.sum > span:first-child { min-width: 0; }
.pad { padding: 8px var(--w-pad); }
.chart { display: block; width: 100%; height: auto; padding: 6px var(--w-pad) 0; box-sizing: border-box; }
.gridLine { stroke: var(--w-line); stroke-width: 0.6; }
.actLine { stroke: var(--w-line-strong); stroke-width: 0.6; stroke-dasharray: 2 3; }
.axis { fill: var(--w-faint); font-size: 8px; font-family: var(--w-num); }
.minePath { fill: none; stroke: var(--w-accent); stroke-width: 1.5; }
.cmpPath { fill: none; stroke: var(--w-info); stroke-width: 1.2; }
.legend { display: flex; gap: 12px; padding: 0 var(--w-pad) 6px; font-size: var(--w-fs-xs); color: var(--w-dim); border-bottom: 1px solid var(--w-line); }
.legend i { display: inline-block; width: 10px; height: 2px; vertical-align: middle; margin-right: 4px; }
.keyMine { background: var(--w-accent); }
.keyCmp { background: var(--w-info); }
.grid { grid-template-columns: minmax(0, 1fr) 1.4rem 3.6rem 3.6rem; }
.act { color: var(--w-accent); }
.dead { color: var(--w-down); font-size: var(--w-fs-xs); }
</style>
