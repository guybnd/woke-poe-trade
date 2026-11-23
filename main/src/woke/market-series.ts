// Short-range price lines for the Market window's Prices tab (3 hours to 2
// days). poe.ninja's feed has one price a day, so anything shorter comes from
// the snapshots this app saves about every 30 minutes (market-store.ts).
//
// A snapshot file holds every item (~1.4 MB), but a line needs one category,
// so each snapshot read keeps only a small array of prices, indexed by item.

// What the overlay gets: the snapshot times used (oldest first) and, per item
// of the category ("name\0variant"), its price at each of them (null: none).
export interface PriceSeries {
  times: number[]
  rows: Record<string, Array<number | null>>
}

interface SnapItem { type?: unknown, name?: unknown, variant?: unknown, chaos?: unknown }

const HALF_HOUR = 30 * 60 * 1000
const MAX_POINTS = 13
const MAX_TOLERANCE = 40 * 60 * 1000

// Points along the line: one per half hour, at most 13.
export function seriesPoints (span: number): number {
  return Math.max(2, Math.min(MAX_POINTS, Math.round(span / HALF_HOUR) + 1))
}

// How far a snapshot may sit from the moment it stands for.
export function seriesTolerance (span: number): number {
  return Math.min(MAX_TOLERANCE, span / 6)
}

// The snapshots to read for a line over the last `span` ms: the nearest one to
// each evenly spaced moment, within the tolerance, each used once. Empty when
// none is near the start, since the change would then cover less than asked.
export function pickTimes (times: number[], now: number, span: number): number[] {
  const asc = [...times].sort((a, b) => a - b)
  const tol = seriesTolerance(span)
  const n = seriesPoints(span)
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const target = now - span + (span * i) / (n - 1)
    let best: number | null = null
    for (const t of asc) {
      if (Math.abs(t - target) <= tol && (best == null || Math.abs(t - target) < Math.abs(best - target))) best = t
    }
    if (i === 0 && best == null) return []
    if (best != null && best !== out[out.length - 1] && (out.length === 0 || best > out[out.length - 1])) out.push(best)
  }
  return out
}

// Prices of every item, per snapshot, kept as numbers only.
class LeaguePrices {
  private index = new Map<string, number>()
  private byType = new Map<string, Array<{ key: string, at: number }>>()
  private snaps = new Map<number, Float32Array>()

  constructor (private readonly keep: number) {}

  has (ts: number): boolean {
    return this.snaps.has(ts)
  }

  add (ts: number, items: unknown[]): void {
    const prices: number[] = []
    for (const raw of items) {
      const it = raw as SnapItem
      if (typeof it?.type !== 'string' || typeof it.name !== 'string' || typeof it.chaos !== 'number') continue
      const variant = typeof it.variant === 'string' ? it.variant : ''
      const full = `${it.type}\u0000${it.name}\u0000${variant}`
      let at = this.index.get(full)
      if (at == null) {
        at = this.index.size
        this.index.set(full, at)
        const list = this.byType.get(it.type) ?? []
        list.push({ key: `${it.name}\u0000${variant}`, at })
        this.byType.set(it.type, list)
      }
      prices[at] = it.chaos
    }
    const arr = new Float32Array(this.index.size).fill(NaN)
    prices.forEach((v, i) => { arr[i] = v })
    this.snaps.set(ts, arr)
  }

  // Over the limit, drop the oldest reads that the line being drawn doesn't use.
  trim (inUse: number[]): void {
    if (this.snaps.size <= this.keep) return
    const keep = new Set(inUse)
    const spare = [...this.snaps.keys()].filter(t => !keep.has(t)).sort((a, b) => a - b)
    for (const t of spare) {
      if (this.snaps.size <= this.keep) break
      this.snaps.delete(t)
    }
  }

  series (type: string, times: number[], names?: Set<string>): PriceSeries {
    const rows: PriceSeries['rows'] = {}
    const used = times.filter(t => this.snaps.has(t))
    for (const { key, at } of this.byType.get(type) ?? []) {
      if (names && !names.has(key.slice(0, key.indexOf('\u0000')))) continue
      const line = used.map(t => {
        const v = this.snaps.get(t)![at]
        return v == null || Number.isNaN(v) ? null : v
      })
      if (line.some(v => v != null)) rows[key] = line
    }
    return { times: used, rows }
  }
}

// Up to 3 days of half-hourly snapshots (~150) of ~12k prices each: ~7 MB.
const leagues = new Map<string, LeaguePrices>()
// Reads in progress, so two asks at once don't parse the same file twice.
const reading = new Map<string, Promise<void>>()

export async function priceSeries (
  league: string,
  type: string,
  span: number,
  now: number,
  read: { times: () => Promise<number[]>, snapshot: (ts: number) => Promise<{ items: unknown[] } | null> },
  names?: string[]
): Promise<PriceSeries> {
  const wanted = pickTimes(await read.times(), now, span)
  if (!wanted.length) return { times: [], rows: {} }
  let prices = leagues.get(league)
  if (!prices) {
    prices = new LeaguePrices(160)
    leagues.set(league, prices)
  }
  const into = prices
  for (const ts of wanted) {
    if (into.has(ts)) continue
    const id = `${league}\u0000${ts}`
    let p = reading.get(id)
    if (!p) {
      p = (async () => {
        const snap = await read.snapshot(ts)
        if (snap && Array.isArray(snap.items)) into.add(ts, snap.items)
      })().finally(() => { reading.delete(id) })
      reading.set(id, p)
    }
    await p
  }
  prices.trim(wanted)
  return prices.series(type, wanted, names?.length ? new Set(names) : undefined)
}

// For tests.
export function resetSeriesCache (): void {
  leagues.clear()
  reading.clear()
}
