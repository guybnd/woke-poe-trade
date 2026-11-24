<template>
  <!-- A stopped run's summary (pick W1 + T1): against your other runs of the
       same name, best drops, map times, spent against kept, and tips. -->
  <div :class="$style.wrap" data-run-summary>
    <div :class="$style.panel" data-summary-vs>
      <div :class="$style.ph"><span>Vs your {{ run.name }} runs</span>
        <span v-if="s.usual" :class="$style.phr" class="w-num">{{ s.usual.count }} earlier {{ s.usual.count === 1 ? 'run' : 'runs' }} · {{ countLabel(s.usual.maps, s.usual.fights) }}</span></div>
      <template v-if="s.usual">
        <div v-for="v in vsRows" :key="v.label" :class="$style.vs" data-summary-vs-row>
          <span class="w-dim">{{ v.label }}</span>
          <span :class="$style.trk" :title="`Your usual: ${v.usualText}. This run: ${v.text}`"><span :style="{ width: `${v.usualPct}%` }" /><span :class="$style.me" :style="{ width: `${v.mePct}%` }" /></span>
          <span class="w-num">{{ v.text }}</span>
          <span class="w-num text-xs" :class="v.tone">{{ v.delta }}</span>
        </div>
        <div v-if="vsRows.length" class="w-dim text-xs">Dark bar: your usual. Gold: this run.</div>
        <div v-else class="w-dim text-xs">No maps to compare per map or per hour yet.</div>
      </template>
      <div v-else class="w-dim text-xs">Your first {{ run.name }} run. The next one with this name is compared to it.</div>
    </div>

    <div :class="$style.panel" data-summary-drops>
      <div :class="$style.ph"><span>Best drops</span></div>
      <div v-if="s.drops.length" :class="$style.drops">
        <div v-for="d in s.drops" :key="d.key" :class="$style.drop" data-summary-drop>
          <img v-if="d.icon && !badArt.has(d.key)" :src="d.icon" alt="" :class="$style.art" @error="badArt = new Set([...badArt, d.key])"><span v-else :class="$style.art" />
          <span :class="$style.dropText">
            <span v-item-tip="tipFor(tips, d.key.startsWith('manual:') ? null : d.key, d.name, d.count)" class="w-trunc">{{ d.name }}</span>
            <span class="w-dim w-num text-xs">{{ d.count > 1 ? `${d.count} × · ` : '' }}{{ money(d.chaos) }}</span>
          </span>
        </div>
      </div>
      <div v-else class="w-dim text-xs">Nothing but currency came in.</div>
      <div v-if="sampleNote" :class="$style.note" class="text-xs" data-summary-sample>{{ sampleNote }}</div>
    </div>

    <div :class="$style.panel" data-summary-maps>
      <div :class="$style.ph"><span>Map times</span>
        <span v-if="s.avgMapMs != null" :class="$style.phr" class="w-num">avg {{ clockOf(s.avgMapMs) }} · {{ s.deaths }} {{ s.deaths === 1 ? 'death' : 'deaths' }}</span></div>
      <template v-if="s.maps.length">
        <div :class="$style.bars" role="img" :aria-label="`Time in each of ${s.maps.length} maps`">
          <span v-if="avgPct != null" :class="$style.avg" :style="{ bottom: `${avgPct}%` }" />
          <i v-for="m in s.maps" :key="m.enteredAt" :class="{ [$style.slow]: slowMs != null && m.mapMs > slowMs }" :style="{ height: `${Math.max(4, (m.mapMs / maxMs) * 100)}%` }" :title="barTitle(m)" data-summary-bar>
            <b v-if="m.deaths" :class="$style.death" />
          </i>
        </div>
        <div class="w-dim text-xs">Each bar is a map, oldest first. Red dot: a death.</div>
      </template>
      <div v-else class="w-dim text-xs">No map times: Client.txt didn't cover this run.</div>
    </div>

    <div :class="$style.panel" data-summary-spend>
      <div :class="$style.ph"><span>Spent and kept</span></div>
      <template v-if="s.spentChaos > 0">
        <div :class="$style.stack"><span :class="$style.spent" :style="{ flexGrow: s.spentChaos }" /><span v-if="totals.profitChaos > 0" :class="$style.kept" :style="{ flexGrow: totals.profitChaos }" /></div>
        <div :class="$style.legend" class="text-xs w-num">
          <span><i :class="[$style.sw, $style.spent]" />Spent {{ money(s.spentChaos) }}<template v-if="s.spentOn.length"> ({{ s.spentOn.join(', ') }})</template></span>
          <span><i :class="[$style.sw, $style.kept]" />Kept {{ money(totals.profitChaos) }}</span>
        </div>
        <div v-if="s.returnPerChaos != null" class="w-dim text-xs w-num">It brought back {{ s.returnPerChaos.toFixed(1) }}× what it spent.</div>
        <div v-else-if="totals.profitChaos <= 0" class="w-dim text-xs">The run didn't make back what it spent.</div>
      </template>
      <div v-else class="w-dim text-xs">Nothing spent that the stash or your kit shows.</div>
    </div>

    <div :class="[$style.panel, $style.full]" data-summary-tips>
      <div :class="$style.ph"><span>Worth a look</span><span :class="$style.phr">only what the numbers back</span></div>
      <div v-for="t in s.tips" :key="t.id" :class="$style.tip" data-summary-tip><b>{{ t.lead }}.</b> {{ t.text }}</div>
      <div v-if="!s.tips.length" class="w-dim text-xs">Nothing stood out: steady pace, no slow maps, kit at its usual price.</div>
      <button type="button" :class="$style.link" class="text-xs" @click="emit('details')">See every item in and out</button>
    </div>
  </div>
</template>

<script setup lang="ts">
// The run summary (pick W1 + T1), in the Runs view of a stopped run. The
// numbers come from run-summary.ts; map times from Client.txt's map log.
import { computed, shallowRef, watch } from 'vue'
import { vItemTip } from '../ui'
import { formatChaos } from '../ui/format'
import { hostRequest } from '../shared/host'
import { rateTime } from '../shared/rate-time-now'
import { tipFor } from './tips'
import type { TipIndex } from './tips'
import { countLabel, smallSample, topDrop, unitOf } from './runs'
import type { Run, RunTotals } from './runs'
import type { RunTime } from './run-time'
import { readRunMapRecords, runsDoc } from './run-store'
import { clockOf, lastRunKey, summarize, SLOW_FACTOR } from './run-summary'
import type { LastRun, SummaryMap } from './run-summary'

const props = defineProps<{
  run: Run
  done: readonly Run[]
  totals: RunTotals
  perHour: number | null
  spent: RunTime | null
  tips: TipIndex
  divine: number | null
  mapCostKeys: ReadonlySet<string>
  league: string
}>()
const emit = defineEmits<{ details: [] }>()

const money = (chaos: number) => formatChaos(chaos, props.divine)
const badArt = shallowRef(new Set<string>())
const unit = computed(() => unitOf(props.totals.maps, props.totals.fights))
const signedMoney = (chaos: number) => `${chaos > 0 ? '+' : chaos < 0 ? '−' : ''}${money(Math.abs(chaos))}`

// The run's maps, whole (deaths, NPCs), from the map log.
const maps = shallowRef<SummaryMap[]>([])
const mapsLoading = shallowRef(true)
watch(() => [props.run.id, props.run.stoppedAt], () => {
  const r = props.run
  maps.value = []
  mapsLoading.value = true
  readRunMapRecords(r, r.stoppedAt ?? Date.now())
    .then((list) => { if (props.run.id === r.id) maps.value = list.map(m => ({ name: m.name, enteredAt: m.enteredAt, mapMs: m.mapMs, deaths: m.deaths, npcs: m.npcs })) })
    .catch(() => { if (props.run.id === r.id) maps.value = [] })
    .finally(() => { if (props.run.id === r.id) mapsLoading.value = false })
}, { immediate: true })

const s = computed(() => summarize({
  run: props.run,
  done: props.done,
  maps: maps.value,
  profitChaos: props.totals.profitChaos,
  perMapChaos: props.totals.perMapChaos,
  perHourChaos: props.perHour,
  costPerMapChaos: props.totals.costPerMapChaos,
  runs: props.totals.runs,
  time: props.spent?.ms ?? props.run.final?.time ?? null,
  rateTime: rateTime(),
  mapCostKeys: props.mapCostKeys,
  fmt: money
}))

// ---------- against your usual ----------
interface VsRow { label: string, text: string, usualText: string, delta: string, tone: string, mePct: number, usualPct: number }
const vsRows = computed<VsRow[]>(() => {
  const u = s.value.usual
  if (!u) return []
  const t = props.totals
  const rows: Array<{ label: string, me: number | null, usual: number | null, lowerBetter?: boolean, unit?: string }> = [
    { label: `Per ${unit.value}`, me: t.perMapChaos, usual: u.perMapChaos },
    { label: 'Per hour', me: props.perHour, usual: u.perHourChaos },
    { label: `Cost a ${unit.value}`, me: t.costPerMapChaos, usual: u.costPerMapChaos, lowerBetter: true }
  ]
  return rows.filter(r => r.me != null && r.usual != null).map((r) => {
    const me = r.me!
    const usual = r.usual!
    const top = Math.max(Math.abs(me), Math.abs(usual), 1e-9)
    const diff = me - usual
    const share = Math.abs(usual) > 1e-9 ? diff / Math.abs(usual) : null
    const good = r.lowerBetter ? diff < 0 : diff > 0
    const small = Math.abs(diff) < 0.05 || (share != null && Math.abs(share) < 0.02)
    return {
      label: r.label,
      text: money(me),
      usualText: money(usual),
      delta: small ? 'as usual' : `${diff > 0 ? '▲' : '▼'} ${money(Math.abs(diff))}${share != null && Math.abs(share) < 10 ? ` (${Math.round(Math.abs(share) * 100)}%)` : ''}`,
      tone: small ? 'w-dim' : good ? 'w-up' : 'w-down',
      mePct: Math.max(0, (me / top) * 100),
      usualPct: Math.max(0, (usual / top) * 100)
    }
  })
})

// ---------- the small-sample note ----------
const sampleNote = computed(() => {
  const t = props.totals
  const top = topDrop(props.run)
  const sm = smallSample(t.runs, t.profitChaos, top)
  if (!top || t.runs <= 0 || t.profitChaos <= 0) return null
  const share = Math.round(Math.min(1, top.chaos / t.profitChaos) * 100)
  const without = signedMoney((t.profitChaos - top.chaos) / t.runs)
  const u = unit.value
  const many = u === 'run' ? 'maps and fights' : `${u}s`
  if (sm?.share != null) return `${top.name} is ${share}% of the profit. Without it: ${without} a ${u}.`
  if (sm?.few) return `Only ${t.runs} ${many}, so per ${u} can swing a lot. Without ${top.name}: ${without} a ${u}.`
  return `The top drop is ${share}% of the profit: per ${u} holds up without it (${without}).`
})

// ---------- map times ----------
const maxMs = computed(() => Math.max(1, ...s.value.maps.map(m => m.mapMs)))
const avgPct = computed(() => s.value.avgMapMs != null ? (s.value.avgMapMs / maxMs.value) * 100 : null)
const slowMs = computed(() => s.value.medianMapMs != null && s.value.maps.length >= 6 ? s.value.medianMapMs * SLOW_FACTOR : null)
const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
function barTitle (m: SummaryMap): string {
  const bits = [`${m.name} · ${clockOf(m.mapMs)} · entered ${clock(m.enteredAt)}`]
  if (m.deaths) bits.push(`${m.deaths} ${m.deaths === 1 ? 'death' : 'deaths'}`)
  if (m.npcs.length) bits.push(m.npcs.join(', '))
  return bits.join(' · ')
}

// ---------- the last run, for Ctrl+Space ----------
let savedFor = ''
watch(s, (sum) => {
  const r = props.run
  // The newest finished run only, once its maps are in.
  if (r.stoppedAt == null || mapsLoading.value || runsDoc.value.done[0]?.id !== r.id) return
  const last: LastRun = {
    league: props.league,
    id: r.id,
    name: r.name,
    startAt: r.startAt,
    stoppedAt: r.stoppedAt,
    profitChaos: props.totals.profitChaos,
    maps: props.totals.maps,
    ...(props.totals.fights ? { fights: props.totals.fights } : {}),
    perMapChaos: props.totals.perMapChaos,
    usualPerMapChaos: sum.usual?.perMapChaos ?? null,
    ...(sum.drops[0] ? { best: { name: sum.drops[0].name, chaos: sum.drops[0].chaos } } : {}),
    tips: sum.tips.map(t => ({ lead: t.lead, text: t.text }))
  }
  const json = JSON.stringify(last)
  if (json === savedFor) return
  savedFor = json
  hostRequest('doc-put', { collection: 'net-worth', key: lastRunKey(props.league), value: last }).catch(() => { savedFor = '' })
}, { immediate: true })
</script>

<style module>
.wrap { display: grid; grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr)); gap: var(--w-s2); min-width: 0; }
.panel { border: 1px solid var(--w-line); padding: var(--w-s2); display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.full { grid-column: 1 / -1; }
.ph { display: flex; align-items: baseline; gap: var(--w-s2); font-family: var(--w-caps-face); text-transform: var(--w-caps-case); font-size: var(--w-fs-caps); color: var(--w-gold); }
.phr { margin-left: auto; font-family: inherit; text-transform: none; color: var(--w-dim); font-size: var(--w-fs-xs); }
.vs { display: grid; grid-template-columns: 5.5rem minmax(3rem, 1fr) auto 5.5rem; gap: 6px; align-items: center; font-size: var(--w-fs-sm); }
.vs > :nth-child(3), .vs > :nth-child(4) { text-align: right; white-space: nowrap; }
.trk { height: 8px; background: var(--w-line); position: relative; }
.trk > span { position: absolute; left: 0; top: 0; bottom: 0; background: var(--w-line-strong); }
.trk > span.me { background: var(--w-gold); opacity: 0.6; top: 2px; bottom: 2px; }
.drops { display: grid; grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr)); gap: 4px; }
.drop { display: flex; gap: 6px; align-items: center; border: 1px solid var(--w-line); padding: 3px 4px; min-width: 0; }
.art { width: 32px; height: 32px; flex: none; object-fit: contain; }
.dropText { display: flex; flex-direction: column; min-width: 0; font-size: var(--w-fs-sm); }
.note { color: var(--w-dim); border-left: 2px solid var(--w-line-strong); padding-left: 6px; }
.bars { display: flex; align-items: flex-end; gap: 2px; height: 64px; border-bottom: 1px solid var(--w-line-strong); position: relative; }
.bars i { flex: 1; min-width: 2px; background: var(--w-line-strong); position: relative; cursor: help; }
.bars i.slow { background: var(--w-gold); opacity: 0.7; }
.bars i:hover { background: var(--w-gold); opacity: 1; }
.death { position: absolute; top: -6px; left: 50%; transform: translateX(-50%); width: 4px; height: 4px; border-radius: 50%; background: var(--w-down); }
.avg { position: absolute; left: 0; right: 0; border-top: 1px dashed var(--w-dim); pointer-events: none; }
.stack { display: flex; height: 12px; border: 1px solid var(--w-line-strong); }
.stack > span { display: block; }
.spent { background: var(--w-down); opacity: 0.7; }
.kept { background: var(--w-up); opacity: 0.7; }
.legend { display: flex; flex-wrap: wrap; gap: 2px 12px; color: var(--w-dim); }
.sw { display: inline-block; width: 9px; height: 9px; margin-right: 4px; vertical-align: -1px; }
.tip { font-size: var(--w-fs-sm); }
.tip b { font-weight: 600; }
.link { background: none; border: 0; padding: 0; color: var(--w-accent); cursor: pointer; font: inherit; align-self: flex-start; }
.link:hover { text-decoration: underline; }
</style>
