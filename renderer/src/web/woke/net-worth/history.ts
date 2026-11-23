// The app's own saved poe.ninja prices (market history, one per item per UTC
// day) for the items in your stash: what each was worth on the days before
// today, in chaos. poe.ninja's own 7-day line is only % change, and on a thin
// card it can be fake end to end (Rain Tempter: 1c every day here, while
// poe.ninja's line ran from 818c to 20,140c), so this is the price a spike is
// checked against (valuation.ts graphStep).
import { shallowRef } from 'vue'
import { hostRequest } from '../shared/host'
import { namespaceForType, utcDate } from '../market/types'

export const HISTORY_DAYS = 14
// Saved prices count only while the newest is at most this many days old:
// the collector saves only while a market widget runs, and an old price
// would hold a real rise since.
export const HISTORY_FRESH_DAYS = 2

const empty = new Map<string, Array<number | null>>()
// Bumped when new history arrives, so valuations read it again.
export const historyRev = shallowRef(0)
let loaded: { league: string, before: string, names: string } | null = null
let byKey = empty
let byLeague: string | null = null
let pending: Promise<void> | null = null

const keyOf = (ns: string, name: string, variant?: string) => `${ns}\u0000${name}\u0000${variant ?? ''}`

// Saved days before today, oldest first (null: not saved for it that day).
// undefined: none, or its newest is too old to trust.
export function priceHistory (ns: string, name: string, variant?: string): Array<number | null> | undefined {
  return byKey.get(keyOf(ns, name, variant))
}

// The rows whose newest saved price is on or after `freshFrom` (YYYY-MM-DD).
// Two types folding into one key (a relic and its unique): neither is kept.
export function historyMap (dates: string[], rows: Record<string, Array<number | null>>, freshFrom: string): Map<string, Array<number | null>> {
  const out = new Map<string, Array<number | null>>()
  const clash = new Set<string>()
  for (const [key, row] of Object.entries(rows)) {
    const [type, name, variant] = key.split('\u0000')
    const k = keyOf(namespaceForType(type), name, variant)
    if (out.has(k) || clash.has(k)) { out.delete(k); clash.add(k); continue }
    let newest = -1
    row.forEach((v, i) => { if (typeof v === 'number' && v > 0) newest = i })
    if (newest < 0 || (dates[newest] ?? '') < freshFrom) continue
    out.set(k, row)
  }
  return out
}

// Loads the history of these item names, once per UTC day and set of names.
export function loadPriceHistory (league: string, names: string[], now = Date.now()): Promise<void> {
  const before = utcDate(now)
  const list = [...new Set(names)].sort()
  const want = { league, before, names: list.join('\n') }
  if (loaded && loaded.league === want.league && loaded.before === want.before && loaded.names === want.names) return pending ?? Promise.resolve()
  // Another league's prices never stand in for this one's.
  if (league !== byLeague) {
    byKey = empty
    byLeague = league
    historyRev.value++
  }
  loaded = want
  pending = (async () => {
    try {
      const res = await hostRequest('market-daily-prices', { league, names: list, days: HISTORY_DAYS, before }, 30_000)
      if (loaded !== want) return
      byKey = historyMap(res.dates, res.rows, utcDate(now - HISTORY_FRESH_DAYS * 86_400_000))
      historyRev.value++
    } catch {
      // No history (the collector never ran): poe.ninja's line is used instead.
      if (loaded === want) loaded = null
    }
  })()
  return pending
}

// For tests.
export function setPriceHistory (rows: Record<string, Array<number | null>>): void {
  byKey = new Map(Object.entries(rows))
  loaded = null
  historyRev.value++
}
