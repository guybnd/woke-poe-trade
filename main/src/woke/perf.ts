// Timing instrumentation for the main process. Cheap enough to leave on:
// marks are a short list, timings keep the last 50 samples per name, and the
// process sampler reads Electron's metrics every 15 seconds.
// The overlay shows all of it on Settings → Performance.
import { app } from 'electron'
import { performance } from 'perf_hooks'

const SAMPLES = 50
const PROCESS_SAMPLE_MS = 15_000
const PROCESS_SAMPLES = 40 // 10 minutes
// A long session: one reading every 5 minutes for a day, to show a slow climb.
const HISTORY_EVERY = 20
const HISTORY_SAMPLES = 288
const HISTORY_SKIP = 4

interface Series { count: number, max: number, recent: number[] }

const marks: Array<{ name: string, ms: number }> = []
const series = new Map<string, Series>()
const processSamples: ProcessSample[] = []
const history: LongSample[] = []
let samplesTaken = 0

export interface ProcessSample {
  at: number
  gameFocused: boolean
  // Summed over all of the app's processes (main, overlay, GPU, workers...).
  cpuPercent: number
  memoryMb: number
  byType: Array<{ type: string, cpuPercent: number, memoryMb: number }>
}

export interface LongSample {
  at: number
  cpuPercent: number
  memoryMb: number
  overlayMb: number
}

// Milliseconds since the main process started.
export function perfMark (name: string): void {
  if (marks.some(m => m.name === name)) return
  marks.push({ name, ms: Math.round(performance.now()) })
}

export function perfRecord (name: string, ms: number): void {
  let s = series.get(name)
  if (!s) {
    s = { count: 0, max: 0, recent: [] }
    series.set(name, s)
  }
  s.count++
  s.max = Math.max(s.max, ms)
  s.recent.push(ms)
  if (s.recent.length > SAMPLES) s.recent.shift()
}

// Wraps a promise and records how long it took (also when it fails).
export async function perfTime<T> (name: string, work: Promise<T>): Promise<T> {
  const t0 = performance.now()
  try {
    return await work
  } finally {
    perfRecord(name, performance.now() - t0)
  }
}

let sampler: ReturnType<typeof setInterval> | undefined

export function startProcessSampler (isGameFocused: () => boolean): void {
  if (sampler) return
  app.getAppMetrics() // first call sets the baseline for CPU usage
  sampler = setInterval(() => {
    const metrics = app.getAppMetrics()
    const byType = new Map<string, { cpuPercent: number, memoryMb: number }>()
    for (const m of metrics) {
      const t = byType.get(m.type) ?? { cpuPercent: 0, memoryMb: 0 }
      t.cpuPercent += m.cpu.percentCPUUsage
      // Private memory (KB) where Windows reports it: the working set also
      // counts pages shared between processes (Chromium's DLLs), so summing
      // it over every process counts those several times.
      t.memoryMb += (m.memory.privateBytes ?? m.memory.workingSetSize) / 1024
      byType.set(m.type, t)
    }
    const list = [...byType].map(([type, v]) => ({ type, cpuPercent: round1(v.cpuPercent), memoryMb: Math.round(v.memoryMb) }))
    processSamples.push({
      at: Date.now(),
      gameFocused: isGameFocused(),
      cpuPercent: round1(list.reduce((a, b) => a + b.cpuPercent, 0)),
      memoryMb: list.reduce((a, b) => a + b.memoryMb, 0),
      byType: list
    })
    if (processSamples.length > PROCESS_SAMPLES) processSamples.shift()
    // Skip the first minute: memory peaks while the app starts up.
    const n = samplesTaken++ - HISTORY_SKIP
    if (n >= 0 && n % HISTORY_EVERY === 0) {
      const newest = processSamples[processSamples.length - 1]
      history.push({
        at: newest.at,
        cpuPercent: newest.cpuPercent,
        memoryMb: newest.memoryMb,
        overlayMb: list.find(p => p.type === 'Tab')?.memoryMb ?? 0
      })
      if (history.length > HISTORY_SAMPLES) history.shift()
    }
  }, PROCESS_SAMPLE_MS)
  sampler.unref?.()
}

export interface PerfSnapshot {
  startedAt: number
  marks: Array<{ name: string, ms: number }>
  timings: Array<{ name: string, count: number, last: number, median: number, p95: number, max: number }>
  processes: ProcessSample[]
  history: LongSample[]
}

export function perfSnapshot (): PerfSnapshot {
  return {
    startedAt: Math.round(performance.timeOrigin),
    marks: [...marks],
    timings: [...series].map(([name, s]) => summarize(name, s)),
    processes: [...processSamples],
    history: [...history]
  }
}

function summarize (name: string, s: Series) {
  const sorted = [...s.recent].sort((a, b) => a - b)
  const at = (q: number) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : 0
  return {
    name,
    count: s.count,
    last: round1(s.recent[s.recent.length - 1] ?? 0),
    median: round1(at(0.5)),
    p95: round1(at(0.95)),
    max: round1(s.max)
  }
}

function round1 (n: number) { return Math.round(n * 10) / 10 }
