// The Net worth window's numbers (pick A1 "Ledger"): per-tab values, the
// chart's points, big refreshes, liquid vs locked, price moves on what you
// hold, the goal's ETA and gains grouped per map. Pure: no Vue, no requests.
import { dayOf, emptyPrefs, itemKey, priceItem } from './valuation'
import type { Category, DaySnapshot, DiffLine, PriceOf, PricePrefs, StashDiff, StashItemLike, Valuation, ValuedLine } from './valuation'

// ---------- per tab (D5) ----------

export interface TabLike { id: string, name: string, type?: string, colour?: string | null, items: StashItemLike[] }
export interface TabValue { id: string, name: string, type: string, colour: string | null, chaos: number }

// Your prices count; ignored items don't.
export function valueByTab (tabs: TabLike[], priceOf: PriceOf, prefs: PricePrefs = emptyPrefs()): TabValue[] {
  const ignored = new Set(prefs.ignored)
  return tabs.map(t => {
    let chaos = 0
    for (const item of t.items) {
      const key = itemKey(item)
      if (ignored.has(key)) continue
      const p = priceItem(item, priceOf, prefs, key)
      if (p && p.chaos > 0) chaos += p.chaos * item.stack
    }
    return { id: t.id, name: t.name, type: t.type ?? '', colour: t.colour ?? null, chaos }
  })
}

// ---------- liquid vs locked (D1) ----------

// Spendable now: currency and fragments. The rest needs selling first.
export const LIQUID: Category[] = ['currency', 'fragments']

export function liquidChaos (v: Valuation): number {
  return LIQUID.reduce((s, c) => s + v.byCategory[c], 0)
}

// ---------- chart points (B1, B2) ----------

export interface LedgerPoint {
  at: number
  chaos: number
  divine: number | null
  byCategory: Record<Category, number>
  // Against the read before (same tabs); null for the first, or after the tabs changed.
  netChaos: number | null
  // What changed most, for the hover: "12 × Divine Orb", "−4 × Maven's Writ".
  top: string[]
}

const MAX_POINTS = 3000
// Older than this, a point keeps its value but not its "what changed".
const TOP_KEPT_MS = 7 * 86_400_000
const round1 = (n: number) => Math.round(n * 10) / 10

export function topChanges (diff: StashDiff | null, n = 3): string[] {
  if (!diff) return []
  const rows = [
    ...diff.added.map(l => ({ l, sign: '' })),
    ...diff.removed.map(l => ({ l, sign: '−' }))
  ].sort((a, b) => b.l.chaos - a.l.chaos).slice(0, n)
  return rows.map(({ l, sign }) => `${sign}${l.count > 1 ? `${l.count} × ` : ''}${l.name}`)
}

// Kept small: one point per read, chaos to 0.1, old points without "top".
export function addPoint (points: LedgerPoint[], p: LedgerPoint): LedgerPoint[] {
  const small: LedgerPoint = {
    ...p,
    chaos: round1(p.chaos),
    netChaos: p.netChaos == null ? null : round1(p.netChaos),
    byCategory: Object.fromEntries(Object.entries(p.byCategory).map(([k, v]) => [k, round1(v)])) as Record<Category, number>
  }
  return [...points.filter(x => x.at !== p.at), small]
    .sort((a, b) => a.at - b.at)
    .slice(-MAX_POINTS)
    .map(x => x.top.length && p.at - x.at > TOP_KEPT_MS ? { ...x, top: [] } : x)
}

export type ChartRange = '24h' | '7d' | 'league'
const RANGE_MS: Record<ChartRange, number> = { '24h': 86_400_000, '7d': 7 * 86_400_000, 'league': Infinity }

export interface SeriesPoint {
  at: number
  div: number
  byCategory: Record<Category, number>
  netDiv: number | null
  top: string[]
  // From a day's last read, before refresh points were kept.
  daily: boolean
}

const toDiv = (chaos: number, rate: number | null, fallback: number | null) => {
  const r = rate ?? fallback
  return r ? chaos / r : chaos
}

// Refresh points in range, with days before the first one filled from the
// daily snapshots. Values in divines, each at its own day's rate.
export function seriesFor (points: LedgerPoint[], days: Record<string, DaySnapshot>, range: ChartRange, now: number, divineNow: number | null): SeriesPoint[] {
  const from = now - RANGE_MS[range]
  const firstPoint = points[0]?.at ?? Infinity
  const out: SeriesPoint[] = []
  for (const d of Object.values(days)) {
    if (d.at < from || d.at >= firstPoint) continue
    out.push({ at: d.at, div: toDiv(d.chaos, d.divine, divineNow), byCategory: catsDiv(d.byCategory, d.divine, divineNow), netDiv: null, top: [], daily: true })
  }
  for (const p of points) {
    if (p.at < from) continue
    out.push({
      at: p.at,
      div: toDiv(p.chaos, p.divine, divineNow),
      byCategory: catsDiv(p.byCategory, p.divine, divineNow),
      netDiv: p.netChaos == null ? null : toDiv(p.netChaos, p.divine, divineNow),
      top: p.top,
      daily: false
    })
  }
  return out.sort((a, b) => a.at - b.at)
}

function catsDiv (c: Record<Category, number>, rate: number | null, fallback: number | null): Record<Category, number> {
  const out = { ...c }
  for (const k of Object.keys(out) as Category[]) out[k] = toDiv(out[k], rate, fallback)
  return out
}

// Refreshes that added a lot: at least 10 div, and 3× the usual change.
export function bigGains (series: SeriesPoint[]): Set<number> {
  const nets = series.map(p => p.netDiv).filter((n): n is number => n != null)
  if (!nets.length) return new Set()
  const abs = nets.map(Math.abs).sort((a, b) => a - b)
  const median = abs[Math.floor(abs.length / 2)]
  const bar = Math.max(10, median * 3)
  return new Set(series.filter(p => p.netDiv != null && p.netDiv >= bar).map(p => p.at))
}

// ---------- goal (D6) ----------

// Days to reach the goal at the rate over the series; null when not rising
// or too little to go on (under a day of points).
export function goalEta (series: SeriesPoint[], goalDiv: number): { reached: boolean, days: number | null } {
  const last = series[series.length - 1]
  if (!last) return { reached: false, days: null }
  if (last.div >= goalDiv) return { reached: true, days: 0 }
  const first = series[0]
  const span = (last.at - first.at) / 86_400_000
  if (span < 1) return { reached: false, days: null }
  const perDay = (last.div - first.div) / span
  if (!(perDay > 0)) return { reached: false, days: null }
  return { reached: false, days: (goalDiv - last.div) / perDay }
}

// ---------- price moves on what you hold (D3) ----------

// poe.ninja's 7-day line holds the % change since its first day; the last
// step is the last day's change.
export function change24h (graph: Array<number | null> | undefined): number | null {
  const g = (graph ?? []).filter((v): v is number => v != null)
  if (g.length < 2) return null
  const a = 1 + g[g.length - 2] / 100
  const b = 1 + g[g.length - 1] / 100
  if (!(a > 0)) return null
  return b / a - 1
}

export interface PriceMove { key: string, name: string, change: number, valueChaos: number }

// What today's price moves did to what you hold: the 3 biggest, either way.
export function priceMoves (lines: Array<Pick<ValuedLine, 'key' | 'name' | 'chaos'>>, changeOf: (key: string) => number | null, n = 3): PriceMove[] {
  const out: PriceMove[] = []
  for (const l of lines) {
    const c = changeOf(l.key)
    if (c == null || c === 0 || !(c > -1)) continue
    out.push({ key: l.key, name: l.name, change: c, valueChaos: l.chaos - l.chaos / (1 + c) })
  }
  return out.sort((a, b) => Math.abs(b.valueChaos) - Math.abs(a.valueChaos)).slice(0, n)
}

// ---------- what changed (C1, C2) ----------

// Recent refreshes' changes, kept small for the change view.
export const MAX_DIFFS = 200
export const DIFF_ROWS_KEPT = 8

export function keepDiff (diffs: StashDiff[], d: StashDiff): StashDiff[] {
  const small = { ...d, added: d.added.slice(0, DIFF_ROWS_KEPT), removed: d.removed.slice(0, DIFF_ROWS_KEPT) }
  return [...diffs.filter(x => x.at !== d.at), small].sort((a, b) => a.at - b.at).slice(-MAX_DIFFS)
}

export interface ChangeGroup {
  key: string
  // "Map 9 · Crimson Temple · 4:12" or "Refresh 2:41 PM".
  title: string
  netChaos: number
  lines: Array<DiffLine & { dir: 'add' | 'remove' }>
}

export interface RunLike { name: string, enteredAt: number, mapMs: number }

const rowsOf = (diffs: StashDiff[]) => {
  const byKey = new Map<string, DiffLine & { dir: 'add' | 'remove', net: number }>()
  for (const d of diffs) {
    for (const [list, dir] of [[d.added, 1], [d.removed, -1]] as const) {
      for (const l of list) {
        const r = byKey.get(l.key) ?? { ...l, count: 0, chaos: 0, dir: 'add' as const, net: 0 }
        r.net += dir * l.count
        r.chaos += dir * l.chaos
        byKey.set(l.key, r)
      }
    }
  }
  return [...byKey.values()]
    .filter(r => r.net !== 0)
    .map(r => ({ key: r.key, name: r.name, icon: r.icon, count: Math.abs(r.net), chaos: Math.abs(r.chaos), dir: r.net > 0 ? 'add' as const : 'remove' as const }))
    .sort((a, b) => b.chaos - a.chaos)
}

const clock = (at: number) => new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const mmss = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`

// C2: inside a session, each refresh's change goes to the map run before it
// (reads happen when you enter the hideout after a map).
export function groupByRuns (diffs: StashDiff[], runs: RunLike[], sessionStart: number): ChangeGroup[] {
  const groups = new Map<number, StashDiff[]>()
  for (const d of diffs) {
    if (d.at < sessionStart) continue
    let idx = -1
    for (let i = 0; i < runs.length; i++) if (runs[i].enteredAt <= d.at) idx = i
    const list = groups.get(idx) ?? []
    list.push(d)
    groups.set(idx, list)
  }
  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([idx, ds]) => {
      const run = runs[idx]
      return {
        key: `run:${idx}`,
        title: run ? `Map ${idx + 1} · ${run.name} · ${mmss(run.mapMs)}` : 'Before the first map',
        netChaos: ds.reduce((s, d) => s + d.netChaos, 0),
        lines: rowsOf(ds)
      }
    })
}

// C1: one group per refresh, newest first.
export function groupByRefresh (diffs: StashDiff[], n = 3): ChangeGroup[] {
  return diffs.slice(-n).reverse().map(d => ({
    key: `read:${d.at}`,
    title: `Refresh ${clock(d.at)}${dayOf(d.at) === dayOf(Date.now()) ? '' : ` · ${new Date(d.at).toLocaleDateString([], { month: 'short', day: 'numeric' })}`}`,
    netChaos: d.netChaos,
    lines: rowsOf([d])
  }))
}

// ---------- table filters ----------

// tabs: the picked tab ids; none picked is every tab. A category and tabs can
// combine: the window shows each as a pill, so an empty table explains itself.
export interface TableFilter { cat: Category | 'all', tabs: string[], query: string, minChaos: number }

// A click on a tab label: adds or drops that tab; 'all' clears the pick.
export function toggleTab (tabs: string[], id: string): string[] {
  if (id === 'all') return []
  return tabs.includes(id) ? tabs.filter(t => t !== id) : [...tabs, id]
}

// Picked tabs first, then the rest (each in tab order).
export function selectedFirst<T extends { id: string }> (list: T[], picked: string[]): T[] {
  return [...list.filter(t => picked.includes(t.id)), ...list.filter(t => !picked.includes(t.id))]
}

export function filterLines<L extends { category: Category, tabIds: string[], name: string, chaos: number }> (lines: L[], f: TableFilter): L[] {
  const q = f.query.trim().toLowerCase()
  return lines.filter(l =>
    (f.cat === 'all' || l.category === f.cat) &&
    (!f.tabs.length || l.tabIds.some(t => f.tabs.includes(t))) &&
    (!q || l.name.toLowerCase().includes(q)) &&
    l.chaos >= f.minChaos)
}

// ---------- chart hover card ----------

// Where the hover card sits around a point (x, y in % of the chart): above,
// or below when the point is in the top half (the window's edge would cut
// it); centred, or opening inwards near the left and right edges.
export function tipPlacement (x: number, y: number): { below: boolean, align: 'center' | 'left' | 'right' } {
  return { below: y < 50, align: x < 25 ? 'left' : x > 75 ? 'right' : 'center' }
}
