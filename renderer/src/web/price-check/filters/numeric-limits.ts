import type { FilterNumeric } from './interfaces'

// Highest values the game has. An item can still show more than these (see filterCeiling).
export const NUMERIC_LIMITS = {
  links: 6,
  sockets: 6,
  mapTier: 17,
  areaLevel: 86,
  itemLevel: 100,
  gemLevel: 21,
  quality: 30
} as const

const ceilings = new WeakMap<object, number>()

// The item in hand always fits: a limit must never change a value the filter started with.
// Kept per filter, so lowering a value above the limit doesn't lose the way back to it.
export function filterCeiling (limit: number | undefined, filter: Pick<FilterNumeric, 'value' | 'max'>): number {
  if (limit == null) return Infinity
  const ceiling = ceilings.get(filter) ?? Math.max(limit, filter.value, filter.max ?? 0)
  ceilings.set(filter, ceiling)
  return ceiling
}

export function clampToLimit (value: number, ceiling: number): number {
  return Math.min(Math.max(value, 0), ceiling)
}
