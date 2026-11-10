// Timing instrumentation for the overlay. Shown with the main process numbers
// on Settings → Performance. Imported first thing by woke/index.ts, so its
// "bundle evaluated" mark is close to when the app's JS finished loading.
import { MainProcess } from '@/web/background/IPC'

const SAMPLES = 50
const FREEZES_KEPT = 20

interface Series { count: number, max: number, recent: number[] }

export interface TimingRow { name: string, count: number, last: number, median: number, p95: number, max: number }

const marks: Array<{ name: string, ms: number }> = []
const series = new Map<string, Series>()
const freezes: Array<{ at: number, ms: number }> = []
let freezeCount = 0
// Long tasks while the overlay loads (parsing data, first draw) are expected;
// they're counted apart so the headline only counts freezes after that.
const STARTUP_MS = 20_000
let startupFreezeCount = 0

export function perfMark (name: string): void {
  if (marks.some(m => m.name === name)) return
  marks.push({ name, ms: Math.round(performance.now()) })
  // Also a User Timing mark, so DevTools and the perf tests see it.
  try { performance.mark(`woke: ${name}`) } catch {}
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

export function perfTime<T> (name: string, fn: () => T): T {
  const t0 = performance.now()
  try {
    return fn()
  } finally {
    perfRecord(name, performance.now() - t0)
  }
}

export async function perfTimeAsync<T> (name: string, work: Promise<T>): Promise<T> {
  const t0 = performance.now()
  try {
    return await work
  } finally {
    perfRecord(name, performance.now() - t0)
  }
}

// Runs `fn` when the overlay is idle (or after `timeout` ms at the latest),
// so background work doesn't land in the middle of a price check.
export function whenIdle (fn: () => void, timeout = 5000): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => fn(), { timeout })
  } else {
    setTimeout(fn, 50)
  }
}

export function rendererPerf () {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  const paint = performance.getEntriesByType('paint')
  const startup = [
    ...(nav ? [
      { name: 'Page HTML loaded', ms: Math.round(nav.responseEnd) },
      { name: 'Page DOM ready', ms: Math.round(nav.domContentLoadedEventEnd) }
    ] : []),
    ...marks,
    ...paint.map(p => ({ name: p.name === 'first-contentful-paint' ? 'First content painted' : 'First paint', ms: Math.round(p.startTime) }))
  ].sort((a, b) => a.ms - b.ms)
  return {
    timeOrigin: Math.round(performance.timeOrigin),
    startup,
    timings: [...series].map(([name, s]) => summarize(name, s)),
    freezes: { count: freezeCount, startupCount: startupFreezeCount, recent: [...freezes] },
    heapMb: heapMb()
  }
}

function heapMb (): number | null {
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
  return mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : null
}

export function summarize (name: string, s: Series): TimingRow {
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

// --- Always-on probes -------------------------------------------------------

perfMark('Bundle evaluated')

// For the perf tests (testing/perf) and a look from DevTools.
;(window as unknown as { __wokePerf?: unknown }).__wokePerf = rendererPerf

// Anything that blocks the overlay's main thread for 50 ms or more: these are
// the moments the overlay would feel stuck.
try {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.startTime < STARTUP_MS) {
        startupFreezeCount++
        continue
      }
      freezeCount++
      perfRecord('Overlay busy (blocks ≥ 50 ms)', entry.duration)
      freezes.push({ at: Math.round(performance.timeOrigin + entry.startTime), ms: Math.round(entry.duration) })
      if (freezes.length > FREEZES_KEPT) freezes.shift()
    }
  }).observe({ type: 'longtask', buffered: true })
} catch {}

// From the item text arriving to the next frame on screen: covers parsing the
// item and drawing the price check (not the trade search, which is network).
MainProcess.onEvent('MAIN->CLIENT::item-text', (e) => {
  const t0 = performance.now()
  requestAnimationFrame(() => {
    setTimeout(() => {
      perfRecord(`Item text → ${e.target} drawn`, performance.now() - t0)
    }, 0)
  })
})
