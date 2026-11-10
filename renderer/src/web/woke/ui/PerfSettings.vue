<template>
  <div class="p-2 flex flex-col gap-4 max-w-2xl">
    <div class="flex items-center gap-2">
      <span :class="[$style.dot, $style[health.level]]" />
      <div class="flex-1">{{ health.text }}</div>
      <label class="flex items-center gap-1 text-sm w-dim">
        <input v-model="advanced" type="checkbox"> Advanced
      </label>
    </div>

    <div v-if="error" class="text-red-400 text-sm">Couldn't read the app's numbers: {{ error }}</div>

    <template v-if="advanced">
    <div class="flex items-center gap-2">
      <div class="flex-1 w-dim text-sm flex items-center gap-2">
        This session
        <w-info text="Timings from this session. Updates every few seconds while this page is open. Use Copy report and paste it in the project chat to share the numbers." />
      </div>
      <button class="btn" @click="copyReport">{{ copied ? 'Copied' : 'Copy report' }}</button>
    </div>

    <section>
      <div class="mb-1 flex items-center gap-2">Startup <w-info text="Milliseconds after the app was launched." /></div>
      <table :class="$style.table">
        <tr v-for="row in startupRows" :key="row.where + row.name">
          <td>{{ row.name }}</td>
          <td :class="$style.where">{{ row.where }}</td>
          <td :class="$style.num">{{ row.ms != null ? fmt(row.ms) : '–' }}</td>
        </tr>
      </table>
    </section>

    <section>
      <div class="mb-1 flex items-center gap-2">Timings <w-info text="Milliseconds. &quot;p95&quot; is the slowest of the usual cases (95th percentile of the last 50)." /></div>
      <table :class="$style.table">
        <tr :class="$style.head">
          <td>What</td><td :class="$style.num">times</td><td :class="$style.num">last</td>
          <td :class="$style.num">median</td><td :class="$style.num">p95</td><td :class="$style.num">max</td>
        </tr>
        <tr v-for="row in timingRows" :key="row.name">
          <td>{{ row.name }}</td>
          <td :class="$style.num">{{ row.count }}</td>
          <td :class="$style.num">{{ fmt(row.last) }}</td>
          <td :class="$style.num">{{ fmt(row.median) }}</td>
          <td :class="$style.num">{{ fmt(row.p95) }}</td>
          <td :class="$style.num">{{ fmt(row.max) }}</td>
        </tr>
        <tr v-if="!timingRows.length"><td class="w-dim">Nothing measured yet. Price check an item or use a tool, then come back.</td></tr>
      </table>
    </section>

    <section>
      <div class="mb-1 flex items-center gap-2">Overlay hiccups <w-info text="Moments the overlay was busy for 50 ms or more (it can't react during them)." /></div>
      <div class="text-sm">
        {{ renderer.freezes.count }} this session<template v-if="renderer.freezes.startupCount"> (plus {{ renderer.freezes.startupCount }} while starting up)</template><template v-if="renderer.freezes.recent.length">; latest:
          <span v-for="f in renderer.freezes.recent.slice(-6).reverse()" :key="f.at" :class="$style.chip">{{ f.ms }} ms, {{ ago(f.at) }}</span>
        </template>
      </div>
    </section>

    <section>
      <div class="mb-1 flex items-center gap-2">CPU and memory <w-info text="Sampled every 15 seconds. CPU is percent of one core, summed over the app's processes. Memory is private memory, also summed." /></div>
      <div v-if="!main?.processes.length" class="text-sm w-dim">First sample comes 15 seconds after launch.</div>
      <template v-else>
        <div class="text-sm mb-1">
          While playing (game focused): <b>{{ cpuWhilePlaying ?? '–' }}</b>% CPU on average over the last {{ minutesSampled }} min.
          Now: {{ latest!.cpuPercent }}% CPU, {{ latest!.memoryMb }} MB<template v-if="renderer.heapMb != null"> (overlay JS heap {{ renderer.heapMb }} MB)</template>.
        </div>
        <div v-if="sessionTrend" class="text-sm mb-1">
          Over this session ({{ sessionTrend.hours }} h): {{ sessionTrend.fromMb }} MB to {{ sessionTrend.toMb }} MB.
        </div>
        <table :class="$style.table">
          <tr :class="$style.head"><td>Process</td><td :class="$style.num">CPU %</td><td :class="$style.num">MB</td></tr>
          <tr v-for="p in latest!.byType" :key="p.type">
            <td>{{ p.type }}</td><td :class="$style.num">{{ p.cpuPercent }}</td><td :class="$style.num">{{ p.memoryMb }}</td>
          </tr>
        </table>
      </template>
    </section>
    </template>
  </div>
</template>

<script lang="ts">
export default {
  name: 'Performance'
}
</script>

<script setup lang="ts">
import WInfo from './WInfo.vue'
import { useCopy } from './copy'
import { computed, onUnmounted, shallowRef, watch } from 'vue'
import { hostRequest } from '../shared/host'
import { rendererPerf } from '../shared/perf'
import type { TimingRow } from '../shared/perf'

interface MainPerf {
  startedAt: number
  marks: Array<{ name: string, ms: number }>
  timings: TimingRow[]
  processes: Array<{
    at: number
    gameFocused: boolean
    cpuPercent: number
    memoryMb: number
    byType: Array<{ type: string, cpuPercent: number, memoryMb: number }>
  }>
  history?: Array<{ at: number, cpuPercent: number, memoryMb: number, overlayMb: number }>
}

const ADVANCED_KEY = 'woke.perfAdvanced'
const advanced = shallowRef(false)
try { advanced.value = localStorage.getItem(ADVANCED_KEY) === '1' } catch {}
watch(advanced, v => { try { localStorage.setItem(ADVANCED_KEY, v ? '1' : '0') } catch {} })

const main = shallowRef<MainPerf | null>(null)
const renderer = shallowRef(rendererPerf())
const error = shallowRef('')
const { copied, copy } = useCopy(1500)

async function refresh () {
  renderer.value = rendererPerf()
  try {
    main.value = await hostRequest<MainPerf>('perf-stats', null, 5000)
    error.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  }
}
refresh()
const timer = setInterval(refresh, 3000)
onUnmounted(() => { clearInterval(timer) })

const startupRows = computed(() => {
  const rows: Array<{ name: string, where: string, ms: number | null }> = []
  const m = main.value
  for (const mark of m?.marks ?? []) rows.push({ name: mark.name, where: 'app', ms: mark.ms })
  // The overlay page has its own clock; shift it onto the app's.
  const offset = m ? renderer.value.timeOrigin - m.startedAt : null
  for (const mark of renderer.value.startup) {
    rows.push({ name: mark.name, where: 'overlay', ms: offset != null ? offset + mark.ms : null })
  }
  return rows.sort((a, b) => (a.ms ?? Infinity) - (b.ms ?? Infinity))
})

const timingRows = computed(() => [
  ...(main.value?.timings ?? []),
  ...renderer.value.timings
].sort((a, b) => a.name.localeCompare(b.name)))

// A slow climb over hours shows here; the tables only reach back 10 minutes.
const sessionTrend = computed(() => {
  const history = main.value?.history ?? []
  if (history.length < 2) return null
  const first = history[0]
  const last = history[history.length - 1]
  return { hours: Math.round((last.at - first.at) / 360_000) / 10, fromMb: first.memoryMb, toMb: last.memoryMb }
})

const latest = computed(() => main.value?.processes[main.value.processes.length - 1] ?? null)
const minutesSampled = computed(() => Math.max(1, Math.round((main.value?.processes.length ?? 0) * 15 / 60)))
const cpuWhilePlaying = computed(() => {
  const playing = (main.value?.processes ?? []).filter(p => p.gameFocused)
  if (!playing.length) return null
  return Math.round(playing.reduce((a, p) => a + p.cpuPercent, 0) / playing.length * 10) / 10
})

// One line for everyone; the tables are under Advanced.
const health = computed<{ level: 'good' | 'warn' | 'bad' | 'unknown', text: string }>(() => {
  const cpu = cpuWhilePlaying.value ?? latest.value?.cpuPercent ?? null
  if (cpu == null) return { level: 'unknown', text: 'Measuring… the first reading comes 15 seconds after launch.' }
  const hiccups = renderer.value.freezes.count
  const mb = latest.value?.memoryMb
  const where = cpuWhilePlaying.value != null ? 'while you play' : 'right now'
  const text = `Overlay using ${cpu}% CPU ${where}${mb ? `, ${mb} MB` : ''}.` +
    (hiccups ? ` ${hiccups} short freeze${hiccups > 1 ? 's' : ''} this session.` : '')
  const level = cpu >= 15 || hiccups >= 20 ? 'bad' : cpu >= 5 || hiccups >= 5 ? 'warn' : 'good'
  return { level, text: level === 'good' ? `${text} All good.` : text }
})

function fmt (ms: number) {
  return ms >= 100 ? String(Math.round(ms)) : ms.toFixed(1)
}

function ago (at: number) {
  const s = Math.round((Date.now() - at) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  return `${Math.round(s / 3600)}h ago`
}

function reportText () {
  const lines: string[] = ['Poetools performance report', new Date().toISOString(), '']
  lines.push('Startup (ms after launch)')
  for (const r of startupRows.value) lines.push(`  ${r.name} [${r.where}]: ${r.ms ?? '-'}`)
  lines.push('', 'Timings (ms): times / last / median / p95 / max')
  for (const r of timingRows.value) lines.push(`  ${r.name}: ${r.count} / ${fmt(r.last)} / ${fmt(r.median)} / ${fmt(r.p95)} / ${fmt(r.max)}`)
  lines.push('', `Overlay hiccups: ${renderer.value.freezes.count}` +
    (renderer.value.freezes.recent.length ? ` (latest ms: ${renderer.value.freezes.recent.map(f => f.ms).join(', ')})` : ''))
  if (latest.value) {
    lines.push('', `CPU while playing: ${cpuWhilePlaying.value ?? '-'}% avg; now ${latest.value.cpuPercent}%, ${latest.value.memoryMb} MB`)
    for (const p of latest.value.byType) lines.push(`  ${p.type}: ${p.cpuPercent}% / ${p.memoryMb} MB`)
  }
  if (renderer.value.heapMb != null) lines.push(`Overlay JS heap: ${renderer.value.heapMb} MB`)
  return lines.join('\n')
}

async function copyReport () {
  if (!await copy(reportText())) error.value = 'Copy failed: the clipboard refused it'
}
</script>

<style module>
.table { width: 100%; border-collapse: collapse; font-size: calc(0.875rem * var(--w-text-scale, 1)); }
.table td { padding: 2px 6px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
.head td { color: rgb(160, 174, 192); }
.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.where { color: rgb(113, 128, 150); width: 1%; white-space: nowrap; }
.chip { margin-left: 6px; white-space: nowrap; }
.dot { width: 10px; height: 10px; border-radius: 50%; flex: none; background: rgb(113, 128, 150); }
.dot.good { background: rgb(72, 187, 120); }
.dot.warn { background: rgb(236, 201, 75); }
.dot.bad { background: rgb(245, 101, 101); }
</style>
