// woke: after a search, a tighter stat range can be checked against the
// listings already loaded, with no new trade search. Anything the old search
// couldn't have returned (a wider range, an unticked stat, any other filter)
// needs a new search. Pure functions, no Vue.
import type { ItemCategory } from '@/parser'
import type { ItemFilters, FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import type { ListingItem } from './listing-tip'
import { pickStatColumns, listingStatValue, StatColumn } from './stat-columns'

export interface LocalCheck {
  /** The live row, marked in the filters as filtering here. */
  row: StatFilter
  column: StatColumn
  min: number | null
  max: number | null
  /** Newly ticked: the trade site only returns listings that have the stat. */
  required: boolean
}

export type ResultsState =
  /** The filters search for exactly what's on screen. */
  | { kind: 'current' }
  /** Only tighter ranges: the loaded listings can be filtered here, with `fits`. */
  | { kind: 'narrowed', checks: LocalCheck[], stats: FilterOrGroup[], fits: (item: ListingItem | undefined, category: ItemCategory | undefined) => boolean }
  /** The results can't answer the filters: search again. */
  | { kind: 'stale' }

const STALE: ResultsState = { kind: 'stale' }
// Listing numbers are read from text; a filter's number can carry float noise.
const EPS = 1e-6

function query (filters: ItemFilters, stats: FilterOrGroup[]): string | null {
  try { return JSON.stringify(createTradeRequest(filters, stats)) } catch { return null }
}

const num = (v: number | '' | undefined): number | null => typeof v === 'number' && Number.isFinite(v) ? v : null

function sameRange (a: StatFilter, b: StatFilter): boolean {
  return a.disabled === b.disabled && a.roll?.min === b.roll?.min && a.roll?.max === b.roll?.max
}

// The live row with the searched row's range and tick: what the search had.
function reverted (live: StatFilter, searched: StatFilter): StatFilter {
  return {
    ...live,
    disabled: searched.disabled,
    roll: live.roll && { ...live.roll, min: searched.roll?.min, max: searched.roll?.max }
  }
}

/**
 * How the live filters relate to the search on screen.
 * searchedQuery: the trade request the search sent (made from the live rows then).
 * searchedStats: a copy of the stat rows the search was made with.
 */
export function compareToSearched (
  searchedQuery: string | null,
  searchedStats: readonly FilterOrGroup[],
  filters: ItemFilters,
  stats: FilterOrGroup[]
): ResultsState {
  const live = query(filters, stats)
  if (live == null || searchedQuery == null) return STALE
  if (live === searchedQuery) return { kind: 'current' }
  if (stats.length !== searchedStats.length) return STALE

  const changed: number[] = []
  const hybrid: FilterOrGroup[] = stats.map((row, i) => {
    const old = searchedStats[i]
    if (row.group || old.group) return row
    if (row.statRef !== old.statRef || row.tradeId.join('|') !== old.tradeId.join('|')) return row
    if (sameRange(row, old)) return row
    changed.push(i)
    return reverted(row, old)
  })
  // Anything else that differs (another filter, a group, a swap pick) needs a search.
  if (!changed.length || query(filters, hybrid) !== searchedQuery) return STALE

  const checks: LocalCheck[] = []
  for (const i of changed) {
    const row = stats[i] as StatFilter
    const old = searchedStats[i] as StatFilter
    if (row.disabled) {
      if (!old.disabled) return STALE // unticked: listings without it were never loaded
      continue
    }
    if (row.not || row.option || !row.roll) return STALE
    const min = num(row.roll.min)
    const max = num(row.roll.max)
    if (!old.disabled) {
      const oldMin = num(old.roll?.min)
      const oldMax = num(old.roll?.max)
      if (oldMin != null && (min == null || min < oldMin - EPS)) return STALE
      if (oldMax != null && (max == null || max > oldMax + EPS)) return STALE
    }
    // A number the search doesn't send (an {empty} id) can't be checked either way.
    const onlyThis = stats.map((r, j) => j === i ? reverted(row, old) : r)
    if (query(filters, onlyThis) === live) continue
    const column = pickStatColumns([row])[0]
    if (!column || column.showOnly) return STALE
    // Several ids are searched as "any one of them" at the range; a column adds them up.
    if (column.source.kind === 'mod' && !column.source.labels && row.tradeId.length > 1) return STALE
    // Newly ticked: if the search ignores its number ({empty} ids), only having the stat counts.
    const numberSent = !old.disabled ||
      query(filters, stats.map((r, j) => j === i ? { ...row, roll: { ...row.roll!, min: undefined, max: undefined } } : r)) !== live
    // The search adds a fractured mod's share back onto a total's numbers.
    const share = row.fracShare ?? 0
    checks.push({
      row,
      column,
      min: min == null || !numberSent ? null : min + share,
      max: max == null || !numberSent ? null : max + share,
      required: old.disabled
    })
  }
  // Only numbers the search ignores changed: it would return the same listings.
  if (!checks.length) return { kind: 'current' }
  return { kind: 'narrowed', checks, stats, fits: (item, category) => listingFits(item, checks, category) }
}

/** Whether a loaded listing would still come back with the tighter ranges. */
export function listingFits (item: ListingItem | undefined, checks: readonly LocalCheck[], category: ItemCategory | undefined): boolean {
  for (const check of checks) {
    const value = listingStatValue(item, check.column, category)
    if (value == null) {
      // The old search already asked for it, so an unreadable number isn't a miss.
      if (check.required) return false
      continue
    }
    if (check.min != null && value < check.min - EPS) return false
    if (check.max != null && value > check.max + EPS) return false
  }
  return true
}
