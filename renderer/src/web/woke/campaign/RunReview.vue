<template>
  <div>
    <div :class="$style.sum">
      <span class="w-trunc">{{ who }} · {{ date }}</span>
      <span v-if="deaths != null">Deaths <span class="w-num">{{ deaths }}</span></span>
      <span v-if="town != null">Town <span class="w-num">{{ formatClock(town * 1000) }}</span></span>
      <span>Run <span class="w-num">{{ total != null ? formatClock(total) : '—' }}</span></span>
    </div>

    <div v-if="state === 'loading'" class="w-faint" :class="$style.pad">Loading…</div>
    <div v-else-if="state === 'rebuilding'" class="w-faint" :class="$style.pad">Reading Client.txt for this run…</div>
    <WEmpty v-else-if="state === 'none'" icon="fas fa-route">{{ noneText }}</WEmpty>

    <template v-if="state === 'ready'">
      <!-- One bar per act: each block a zone, its width the time spent. -->
      <div :class="$style.strips" @mouseleave="hover = null">
        <div v-for="s in strips" :key="s.act" :class="$style.stripRow">
          <span class="w-num w-faint">{{ s.act }}</span>
          <span :class="$style.bar">
            <span v-for="(v, i) in s.visits" :key="i"
              :class="[$style.block, v.town && $style.townBlock, v.deaths && $style.deathBlock, hover === v && $style.on]"
              :style="{ flexGrow: Math.max(v.dur ?? 0, 1) }" @mouseenter="hover = v" />
          </span>
          <span class="w-num text-right" :class="$style.stripTime">{{ fmt(actSec(run, s.act)) }}</span>
        </div>
        <div :class="$style.hoverLine" class="w-trunc">
          <template v-if="hover">
            <span style="color: var(--w-fg);">{{ hover.name }}</span>
            · <span class="w-num">{{ formatClock((hover.dur ?? 0) * 1000) }}</span>
            <template v-if="hover.level != null"> · lv {{ hover.level }}</template>
            <span v-if="hover.deaths" :class="$style.dead"> · ☠ {{ hover.deaths }}</span>
          </template>
          <template v-else>Point at a block for its zone</template>
        </div>
      </div>

      <svg v-if="chart" :class="$style.chart" viewBox="0 0 300 92" role="img" aria-label="Level over run time">
        <g v-for="g in chart.grid" :key="'g' + g.lv">
          <line x1="22" x2="298" :y1="g.y" :y2="g.y" :class="$style.gridLine" />
          <text x="18" :y="g.y + 3" text-anchor="end" :class="$style.axis">{{ g.lv }}</text>
        </g>
        <line v-for="a in chart.acts" :key="'a' + a.act" :x1="a.x" :x2="a.x" y1="4" y2="80" :class="$style.actLine" />
        <path v-if="chart.cmp" :d="chart.cmp" :class="$style.cmpPath" />
        <path :d="chart.mine" :class="$style.minePath" />
        <text x="22" y="90" :class="$style.axis">0:00</text>
        <text x="298" y="90" text-anchor="end" :class="$style.axis">{{ formatClock(chart.endSec * 1000) }}</text>
      </svg>
      <div v-if="chart" :class="$style.legend">
        <span><i :class="$style.keyMine" />Level</span>
        <span v-if="chart.cmp"><i :class="$style.keyCmp" />{{ cmpLabel }}</span>
        <span v-if="tl?.rebuilt" class="ml-auto" title="Rebuilt from Client.txt: times between act splits are estimates">rebuilt</span>
      </div>

      <div v-if="steps.length" :class="$style.viewSwitch">
        <WSegmented v-model="view" :options="[{ value: 'zones', label: 'Zones' }, { value: 'steps', label: 'Steps' }]" />
      </div>
    </template>

    <template v-if="state !== 'loading' && state !== 'rebuilding'">
      <div class="w-row w-row--head" :class="$style.grid">
        <span>{{ !acts ? 'Act' : view === 'steps' ? 'Step' : 'Zone' }}</span>
        <span class="text-right">{{ acts && view === 'zones' ? '×' : '' }}</span>
        <span class="text-right">Time</span><span class="text-right">±</span>
      </div>
      <template v-if="acts && view === 'steps'">
        <template v-for="a in stepActs" :key="a.act">
          <div class="w-row" :class="[$style.grid, $style.act]">
            <span class="w-head-font">{{ actLabel(a.act) }}</span><span />
            <span class="text-right w-num">{{ fmt(actSec(run, a.act)) }}</span>
            <span class="text-right w-num" :class="toneOf(actDelta(a.act))">{{ fmtDelta(actDelta(a.act)) }}</span>
          </div>
          <div v-for="r in a.rows" :key="r.index" class="w-row" :class="$style.grid" :title="r.text">
            <span class="w-trunc">{{ r.text }}</span><span />
            <span class="text-right w-num">{{ r.took != null ? formatClock(r.took * 1000) : '—' }}</span>
            <span class="text-right w-num" :class="toneOf(stepDelta(r))">{{ fmtDelta(stepDelta(r)) }}</span>
          </div>
        </template>
      </template>
      <template v-else-if="acts">
        <template v-for="a in acts" :key="a.act">
          <div class="w-row" :class="[$style.grid, $style.act]">
            <span class="w-head-font">{{ actLabel(a.act) }}</span><span />
            <span class="text-right w-num">{{ fmt(actSec(run, a.act)) }}</span>
            <span class="text-right w-num" :class="toneOf(actDelta(a.act))">{{ fmtDelta(actDelta(a.act)) }}</span>
          </div>
          <div v-for="z in a.zones" :key="z.areaId" class="w-row" :class="[$style.grid, z.town && 'w-faint', isNow(a.act, z.areaId) && $style.now]" :title="z.town ? 'Town or hideout' : undefined">
            <span class="w-trunc">{{ z.name }}<span v-if="isNow(a.act, z.areaId)" class="w-faint"> · now</span><span v-if="z.deaths" :class="$style.dead" :title="z.deaths === 1 ? 'Died here' : `Died here ${z.deaths} times`"> ☠{{ z.deaths > 1 ? z.deaths : '' }}</span></span>
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
import WSegmented from '../ui/WSegmented.vue'
import { actLabel } from './log-parse'
import { formatDelta, runTotal, segmentMs } from './run-timer'
import type { CampaignRun } from './run-timer'
import { deathCount, levelSteps, runEndSec, stepRows, townSec, visitsByAct, zoneVisits, zonesByAct } from './run-timeline'
import type { RunTimeline, StepRow, ZoneSum, ZoneVisit } from './run-timeline'
import { loadTimeline, rebuildFromLog, timelineMissing } from './run-timeline-store'

const props = defineProps<{
  run: CampaignRun
  cmp: CampaignRun | null
  cmpLabel: string
  // The live timeline, when this run is the one being recorded.
  live: RunTimeline | null
  // A run still going: its run time now (ms), and a counter that moves when
  // its live timeline changes.
  nowMs?: number | null
  liveRev?: number
  // The area you're in now, marked in the list.
  nowAreaId?: string | null
}>()

// Read in every view of the timeline, so a live run's view redraws.
function liveTick (): number { return props.liveRev ?? 0 }
const runEnd = computed(() => props.nowMs != null ? Math.floor(props.nowMs / 1000) : runEndSec(props.run))

// Read only while this view is open, and dropped with it.
const tl = shallowRef<RunTimeline | null>(null)
const cmpTl = shallowRef<RunTimeline | null>(null)
const state = shallowRef<'loading' | 'rebuilding' | 'ready' | 'none'>('loading')
const noneText = shallowRef('')
const view = shallowRef<'zones' | 'steps'>('zones')
const hover = shallowRef<ZoneVisit | null>(null)

// A saved timeline, or one rebuilt from Client.txt for a run saved before
// timelines existed (or while the app was closed for all of it).
async function timelineOf (run: CampaignRun, onRebuild?: () => void): Promise<RunTimeline | null> {
  const saved = await loadTimeline(run.id)
  if (saved || !run.finished || !await timelineMissing(run.id)) return saved
  onRebuild?.()
  return await rebuildFromLog(run)
}

let request = 0
watch(() => [props.run.id, props.cmp?.id, props.live != null], async () => {
  const mineReq = ++request
  state.value = 'loading'
  hover.value = null
  const run = props.run
  const cmp = props.cmp
  const mine = props.live ?? await timelineOf(run, () => { if (mineReq === request) state.value = 'rebuilding' })
  const theirs = cmp ? await timelineOf(cmp) : null
  if (mineReq !== request) return
  tl.value = mine
  cmpTl.value = theirs
  if (mine && mine.ev.length) {
    state.value = 'ready'
  } else {
    noneText.value = !run.finished ? 'Nothing recorded yet. Zones show here as you enter them.' : mine ? 'Client.txt no longer has this run. Act splits only.' : 'No timeline for this run. Act splits only.'
    state.value = 'none'
  }
}, { immediate: true })

// The live run's first zone arrives after the view opened on nothing.
watch(() => props.liveRev, () => {
  if (props.live && state.value === 'none' && props.live.ev.length) {
    tl.value = props.live
    state.value = 'ready'
  }
})

const who = computed(() => [props.run.className || 'Unknown', props.run.level].filter(x => x != null).join(' '))
const date = computed(() => new Date(props.run.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))
const total = computed(() => props.nowMs ?? runTotal(props.run) ?? (props.run.splits.length ? props.run.splits[props.run.splits.length - 1].totalMs : props.run.elapsedMs))
const visits = computed(() => liveTick() >= 0 && tl.value ? zoneVisits(tl.value, runEnd.value) : null)
const town = computed(() => visits.value ? townSec(visits.value) : null)
const deaths = computed(() => liveTick() >= 0 && tl.value ? deathCount(tl.value) : null)
const acts = computed(() => liveTick() >= 0 && state.value === 'ready' && tl.value ? zonesByAct(props.run, tl.value, props.cmp, cmpTl.value, runEnd.value) : null)
const strips = computed(() => visits.value
  ? [...visitsByAct(props.run, visits.value).entries()].sort((a, b) => a[0] - b[0]).map(([act, list]) => ({ act, visits: list }))
  : [])
const steps = computed(() => liveTick() >= 0 && tl.value ? stepRows(props.run, tl.value, props.cmp, cmpTl.value) : [])
const stepActs = computed(() => {
  const out: Array<{ act: number, rows: StepRow[] }> = []
  for (const r of steps.value) {
    const last = out[out.length - 1]
    if (last?.act === r.act) last.rows.push(r)
    else out.push({ act: r.act, rows: [r] })
  }
  return out
})

function actSec (run: CampaignRun, act: number): number | null {
  return segmentMs(run, act)
}
function actDelta (act: number): number | null {
  const mine = actSec(props.run, act)
  const theirs = props.cmp ? actSec(props.cmp, act) : null
  return mine != null && theirs != null ? mine - theirs : null
}
function zoneDelta (z: ZoneSum): number | null { return z.cmpSec == null ? null : (z.sec - z.cmpSec) * 1000 }
function stepDelta (r: StepRow): number | null { return r.took == null || r.cmpTook == null ? null : (r.took - r.cmpTook) * 1000 }
function isNow (act: number, areaId: string): boolean {
  return !!props.nowAreaId && areaId === props.nowAreaId && act === acts.value?.[acts.value.length - 1]?.act
}
function fmt (ms: number | null) { return ms == null ? '—' : formatClock(ms) }
// ms.
function fmtDelta (v: number | null) { return v == null ? '—' : formatDelta(v) }
function toneOf (v: number | null) { return v == null ? 'w-faint' : v <= 0 ? 'w-up' : 'w-down' }

// Level over run time, this run and the one it's compared with.
const chart = computed(() => {
  if (liveTick() < 0 || !tl.value) return null
  const mine = levelSteps(tl.value)
  if (!mine.length) return null
  const theirs = cmpTl.value ? levelSteps(cmpTl.value) : null
  const ends = [runEnd.value ?? mine[mine.length - 1][0], theirs?.length ? (runEndSec(props.cmp!) ?? theirs[theirs.length - 1][0]) : 0]
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
.strips { padding: 6px var(--w-pad) 2px; border-bottom: 1px solid var(--w-line); display: flex; flex-direction: column; gap: 3px; }
.stripRow { display: grid; grid-template-columns: 1.1rem minmax(0, 1fr) 3.4rem; align-items: center; gap: 6px; font-size: var(--w-fs-xs); }
.bar { display: flex; gap: 1px; height: 9px; min-width: 0; }
.block { flex-basis: 0; min-width: 1px; background: var(--w-line-strong); position: relative; }
.townBlock { background: var(--w-line); }
.deathBlock { box-shadow: inset 0 -2px 0 var(--w-down); }
.block.on { background: var(--w-accent); }
.stripTime { color: var(--w-dim); }
.hoverLine { font-size: var(--w-fs-xs); color: var(--w-faint); min-height: 1.4em; padding-top: 2px; }
.chart { display: block; width: 100%; height: auto; padding: 6px var(--w-pad) 0; box-sizing: border-box; }
.gridLine { stroke: var(--w-line); stroke-width: 0.6; }
.actLine { stroke: var(--w-line-strong); stroke-width: 0.6; stroke-dasharray: 2 3; }
.axis { fill: var(--w-faint); font-size: var(--w-fs-xs); font-family: var(--w-num); }
.minePath { fill: none; stroke: var(--w-accent); stroke-width: 1.5; }
.cmpPath { fill: none; stroke: var(--w-info); stroke-width: 1.2; }
.legend { display: flex; gap: 12px; padding: 0 var(--w-pad) 6px; font-size: var(--w-fs-xs); color: var(--w-dim); border-bottom: 1px solid var(--w-line); }
.legend i { display: inline-block; width: 10px; height: 2px; vertical-align: middle; margin-right: 4px; }
.keyMine { background: var(--w-accent); }
.keyCmp { background: var(--w-info); }
.viewSwitch { display: flex; justify-content: center; padding: 6px var(--w-pad); border-bottom: 1px solid var(--w-line); }
.grid { grid-template-columns: minmax(0, 1fr) 1.4rem 3.6rem 3.6rem; }
.act { color: var(--w-accent); }
.now { background: var(--w-accent-soft); box-shadow: inset 2px 0 0 var(--w-accent); }
.dead { color: var(--w-down); font-size: var(--w-fs-xs); }
</style>
