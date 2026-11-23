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

const empty = new Map<string, Array<number | null>>()
// Bumped when new history arrives, so valuations read it again.
export const historyRev = shallowRef(0)
let loaded: { league: string, before: string, names: string } | null = null
let byKey = empty
let pending: Promise<void> | null = null

const keyOf = (ns: string, name: string, variant?: string) => `${ns}\u0000${name}\u0000${variant ?? ''}`

// Days before today, oldest first (null: not saved that day). undefined: none.
export function priceHistory (ns: string, name: string, variant?: string): Array<number | null> | undefined {
  return byKey.get(keyOf(ns, name, variant))
}

// Loads the history of these item names, once per UTC day and set of names.
export function loadPriceHistory (league: string, names: string[], now = Date.now()): Promise<void> {
  const before = utcDate(now)
  const list = [...new Set(names)].sort()
  const want = { league, before, names: list.join('\n') }
  if (loaded && loaded.league === want.league && loaded.before === want.before && loaded.names === want.names) return pending ?? Promise.resolve()
  loaded = want
  pending = (async () => {
    try {
      const res = await hostRequest('market-daily-prices', { league, names: list, days: HISTORY_DAYS, before }, 30_000)
      if (loaded !== want) return
      const next = new Map<string, Array<number | null>>()
      for (const [key, row] of Object.entries(res.rows)) {
        const [type, name, variant] = key.split('\u0000')
        next.set(keyOf(namespaceForType(type), name, variant), row)
      }
      byKey = next
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
