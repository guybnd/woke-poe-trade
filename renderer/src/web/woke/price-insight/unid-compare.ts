// Identify it or sell it unidentified, for uniques whose roll sets the price
// (Watcher's Eye, Forbidden Flame and Flesh, Timeless jewels...): the unid
// price beside the spread of identified versions poe.ninja lists
// (WOKEPOET-542). poe.ninja lists only versions that trade, each once, not by
// how often they roll, so the median runs high: the read says it's rough.
// Pure: no Vue or IO.

export interface IdentifiedSpread { low: number, high: number, median: number, count: number }

/** poe.ninja's identified versions of one unique, or null with fewer than 2. */
export function identifiedSpread (rows: ReadonlyArray<{ chaos: number }>): IdentifiedSpread | null {
  const v = rows.map(r => r.chaos).filter(c => c > 0).sort((a, b) => a - b)
  if (v.length < 2) return null
  const mid = v.length >> 1
  return { low: v[0], high: v[v.length - 1], median: v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2, count: v.length }
}

/**
 * "50c to 2.5 div" reads as 50 div: both ends in one unit, divines when the
 * top is a divine or more (as ninjaTotal switches), else chaos.
 */
export function rangeText (low: number, high: number, rate: number | null | undefined, num: (v: number) => string): string {
  if (rate && high >= rate * 0.94) return `${num(low / rate)} to ${num(high / rate)} div`
  return `${num(low)} to ${num(high)}c`
}

export type UnidRead = 'identify' | 'unid' | 'even'

// Past this ratio either way, one side reads as worth more.
const GAP = 1.5

/** Which way the numbers point: the identified median against the unid price. */
export function unidRead (unid: number, spread: IdentifiedSpread): UnidRead {
  if (spread.median >= unid * GAP) return 'identify'
  if (unid >= spread.median * GAP) return 'unid'
  return 'even'
}

export const UNID_READ_TEXT: Record<UnidRead, string> = {
  identify: 'The identified median is higher, but it counts every version once, not by how often it rolls: rough',
  unid: 'Unid sells for more than the identified median: selling unid looks better',
  even: 'Unid and the identified median are about the same: identify only if you want the gamble'
}
