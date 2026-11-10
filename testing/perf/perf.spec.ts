// Performance checks: the toolkit with every module on, on the fake game.
//
// Measures startup, memory, and what the overlay does while you play a map
// (timers, messages, layouts, main-thread time), then compares the numbers
// with budgets.json. Counts and sizes are the same on every machine, so they
// fail the run when they go over budget; times depend on the machine, so they
// are reported, with a loose budget that only catches big regressions.
//
// Results: perf-results/perf.json and perf-results/perf.md (also written to
// the GitHub job summary in CI). `WOKE_PERF_UPDATE=1` rewrites budgets.json
// from this run (with headroom), after an intended change.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { CDPSession } from '@playwright/test'
import { test, expect, logFixture } from '../e2e/harness'
import { MODULES } from '../e2e/woke-modules'
import { installProbe, resetProbe, readProbe, total } from './probe'

const here = path.dirname(fileURLToPath(import.meta.url))
const RESULTS = path.resolve(here, '../perf-results')
const BUDGETS = path.join(here, 'budgets.json')
const RENDERER_DIST = path.resolve(here, '../../renderer/dist')

const WINDOW_MS = 10_000
const MOUSE_HZ = 125

interface Metric {
  value: number
  unit: string
  // 'count' and 'size': the same on any machine; over budget fails the run.
  // 'time': machine dependent; over its loose budget is a warning.
  // 'info': reported only.
  kind: 'count' | 'size' | 'time' | 'info'
  label: string
}

const results: Record<string, Metric> = {}
const details: Record<string, unknown> = {}

function record (key: string, label: string, value: number, unit: string, kind: Metric['kind']) {
  results[key] = { label, value: Math.round(value * 10) / 10, unit, kind }
}

async function cdpMetrics (cdp: CDPSession): Promise<Record<string, number>> {
  const { metrics } = await cdp.send('Performance.getMetrics')
  return Object.fromEntries(metrics.map((m: { name: string, value: number }) => [m.name, m.value]))
}

async function heapAfterGc (cdp: CDPSession): Promise<number> {
  await cdp.send('HeapProfiler.collectGarbage')
  await cdp.send('HeapProfiler.collectGarbage')
  const { usedSize } = await cdp.send('Runtime.getHeapUsage')
  return usedSize / 1024 / 1024
}

const WIDGET_TYPES = MODULES.flatMap(m => m.widgetTypes)

test.describe.configure({ mode: 'serial' })

test('every module on: startup, a map, a price check, memory', async ({ overlay, fakeApp }) => {
  test.setTimeout(120_000)
  const page = overlay.page
  await installProbe(page)

  // ---- bundle ----
  const assets = fs.readdirSync(path.join(RENDERER_DIST, 'assets'))
  const jsKb = (re: RegExp) => assets.filter(f => re.test(f)).reduce((a, f) => a + fs.statSync(path.join(RENDERER_DIST, 'assets', f)).size, 0) / 1024
  record('bundle.startupJs', 'JS loaded at startup', jsKb(/^index-.*\.js$/), 'KB', 'size')
  record('bundle.allJs', 'All JS (incl. loaded later)', jsKb(/\.js$/), 'KB', 'size')

  // ---- startup ----
  // Every module's widget placed (hidden, as after the first-run setup with
  // "Everything"), the game focused.
  const t0 = Date.now()
  await overlay.boot({
    patch: (c) => {
      let id = Math.max(0, ...c.widgets.map((w: { wmId: number }) => w.wmId)) + 1
      for (const wmType of WIDGET_TYPES) {
        if (c.widgets.some((w: { wmType: string }) => w.wmType === wmType)) continue
        c.widgets.push({ wmId: id++, wmType, wmTitle: '', wmWants: 'hide', wmZorder: null, wmFlags: ['uninitialized'] })
      }
      details.widgets = Object.fromEntries(c.widgets.map((w: { wmId: number, wmType: string }) => [`widget-${w.wmId}`, w.wmType]))
    }
  })
  const bootMs = Date.now() - t0
  const startup = await page.evaluate(() => (window as unknown as { __wokePerf: () => { startup: Array<{ name: string, ms: number }> } }).__wokePerf().startup)
  details.startup = startup
  const mark = (name: string) => startup.find(m => m.name === name)?.ms ?? NaN
  record('startup.bundle', 'Startup: bundle evaluated', mark('Bundle evaluated'), 'ms', 'time')
  record('startup.mounted', 'Startup: app on screen', mark('App mounted'), 'ms', 'time')
  record('startup.ready', 'Startup: page load → hotkeys registered', bootMs, 'ms', 'time')

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable', { timeDomain: 'threadTicks' })

  // ---- in a map ----
  const lines = logFixture('client-logs/mapping-session.txt')
  await overlay.log(lines.slice(0, lines.findIndex(l => l.includes('You have entered Strand.')) + 1))
  // Let startup work (price downloads, idle-time saves) finish.
  await fakeApp.settled(1000, 15_000)
  await page.waitForTimeout(3000)

  async function measureWindow (key: string, label: string, moveMouse: boolean) {
    await resetProbe(page)
    const before = await cdpMetrics(cdp)
    let mouse: ReturnType<typeof setInterval> | undefined
    if (moveMouse) {
      // Circles in the middle of the screen, away from the dock, like
      // moving around a map with a 125 Hz mouse.
      let step = 0
      mouse = setInterval(() => {
        step++
        const a = step / 20
        fakeApp.moveMouse(Math.round(960 + 300 * Math.cos(a)), Math.round(540 + 200 * Math.sin(a)))
      }, 1000 / MOUSE_HZ)
    }
    const cpu0 = process.cpuUsage()
    await page.waitForTimeout(WINDOW_MS)
    const cpu = process.cpuUsage(cpu0)
    if (mouse) clearInterval(mouse)
    const after = await cdpMetrics(cdp)
    const probe = await readProbe(page)
    const per10s = (n: number) => n * 10_000 / WINDOW_MS
    const d = (name: string) => (after[name] ?? 0) - (before[name] ?? 0)
    record(`${key}.wakeups`, `${label}: timer callbacks / 10 s`, per10s(probe.timeouts + probe.intervals + probe.idleCallbacks), '', 'count')
    // A few frames can come from something finishing as the window starts;
    // an animation loop would be hundreds.
    record(`${key}.frames`, `${label}: animation frames / 10 s`, per10s(probe.frames), '', 'count')
    record(`${key}.messages`, `${label}: messages app ↔ overlay / 10 s`, per10s(total(probe.sent) + total(probe.received)), '', 'count')
    record(`${key}.layouts`, `${label}: layouts / 10 s`, per10s(d('LayoutCount')), '', 'count')
    record(`${key}.styles`, `${label}: style recalcs / 10 s`, per10s(d('RecalcStyleCount')), '', 'count')
    record(`${key}.overlayCpu`, `${label}: overlay main thread busy`, d('TaskDuration') * 1000 / WINDOW_MS * 100 / 1000, '% of a core', 'time')
    record(`${key}.appCpu`, `${label}: app process CPU (fake app + test runner)`, (cpu.user + cpu.system) / 1000 / WINDOW_MS * 100, '% of a core', 'info')
    details[key] = probe
  }

  await measureWindow('map.still', 'In a map, mouse still', false)
  await measureWindow('map.moving', 'In a map, mouse moving', true)

  // ---- opening the overlay (Shift+Space): every panel comes on screen ----
  {
    const before = await cdpMetrics(cdp)
    await overlay.pressHotkey(overlay.config.overlayKey)
    await page.waitForTimeout(1000)
    const after = await cdpMetrics(cdp)
    const d = (name: string) => ((after[name] ?? 0) - (before[name] ?? 0)) * 1000
    record('overlayOpen.work', 'Open the overlay: main thread work', d('TaskDuration'), 'ms', 'time')
    record('overlayOpen.styleLayout', 'Open the overlay: style + layout', d('RecalcStyleDuration') + d('LayoutDuration'), 'ms', 'time')
    // Back to the game.
    fakeApp.focusGame(true)
    await page.waitForTimeout(500)
  }

  // ---- price check ----
  for (let i = 0; i < 5; i++) {
    await overlay.copyItem('items/rare-ring.txt')
    // The rare's title: its category (the Generic/Base label went with the one-row header).
    await expect(overlay.widget('price-check')).toContainText('Ring')
    await overlay.pressHotkey('Escape').catch(() => {})
    fakeApp.focusGame(true)
    await page.waitForTimeout(300)
  }
  const timings = await page.evaluate(() => (window as unknown as { __wokePerf: () => { timings: Array<{ name: string, median: number }> } }).__wokePerf().timings)
  details.timings = timings
  const drawn = timings.find(t => t.name === 'Item text → price-check drawn')
  record('priceCheck.drawn', 'Price check: item text → panel drawn (median)', drawn?.median ?? NaN, 'ms', 'time')

  // ---- memory ----
  fakeApp.focusGame(true)
  await page.waitForTimeout(500)
  // Map scan, essence scan and death recap load theirs on first use.
  record('memory.ocrWorkers', 'OCR workers loaded (no scan used yet)', fakeApp.ocrWorkers(), '', 'count')
  record('memory.heap', 'Overlay JS heap after GC', await heapAfterGc(cdp), 'MB', 'size')
  const m = await cdpMetrics(cdp)
  record('memory.nodes', 'DOM nodes', m.Nodes, '', 'count')
  // Which widgets hold them (shown or not).
  details.nodesByWidget = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[id^="widget-"]')]
    .map(el => [el.id, el.getElementsByTagName('*').length])))
  record('memory.listeners', 'Event listeners', m.JSEventListeners, '', 'count')

  report()
})

function report () {
  fs.mkdirSync(RESULTS, { recursive: true })
  const budgets: Record<string, number> = fs.existsSync(BUDGETS) ? JSON.parse(fs.readFileSync(BUDGETS, 'utf8')) : {}
  const over: string[] = []
  const slow: string[] = []
  const rows = Object.entries(results).map(([key, m]) => {
    const budget = m.kind === 'info' ? undefined : budgets[key]
    const ok = budget == null || !(m.value > budget)
    const line = `${m.label}: ${m.value} ${m.unit} (budget ${budget})`
    if (!ok) (m.kind === 'time' ? slow : over).push(line)
    return `| ${m.label} | ${m.value} ${m.unit} | ${budget ?? '—'} | ${ok ? '✅' : m.kind === 'time' ? '⚠️' : '❌'} |`
  })
  const md = [
    '## Toolkit performance (every module on)',
    '',
    '| Measure | This run | Budget | |',
    '| --- | --- | --- | --- |',
    ...rows,
    '',
    'Counts and sizes are the same on any machine and fail the run when over budget (❌). Times depend on the machine: over budget is a warning (⚠️). See testing/perf/README.md.'
  ].join('\n')
  fs.writeFileSync(path.join(RESULTS, 'perf.md'), md + '\n')
  fs.writeFileSync(path.join(RESULTS, 'perf.json'), JSON.stringify({ results, details }, null, 2))
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n')
  console.log(md)

  if (process.env.WOKE_PERF_UPDATE) {
    const next: Record<string, number> = {}
    for (const [key, m] of Object.entries(results)) {
      if (!Number.isFinite(m.value) || m.kind === 'info') continue
      // Counts and sizes: 15% headroom. Times: 3x, since CI machines vary.
      const factor = m.kind === 'time' ? 3 : 1.15
      next[key] = Math.ceil(Math.max(m.value * factor, m.value + 2))
      if (key.endsWith('.frames')) next[key] = Math.max(next[key], 30)
      // No headroom: any OCR worker loaded before a scan is a regression.
      if (key === 'memory.ocrWorkers') next[key] = m.value
    }
    fs.writeFileSync(BUDGETS, JSON.stringify(next, null, 2) + '\n')
    return
  }
  // Times vary between machines: a warning on the PR, not a failure.
  for (const line of slow) console.log(`::warning title=Slower than budget::${line}`)
  expect(over, 'over budget (see perf-results/perf.md and testing/perf/README.md)').toEqual([])
}
