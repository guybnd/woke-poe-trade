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

// The item in hand always fits: a limit must never change a value the filter started with.
export function filterCeiling (limit: number | undefined, filter: Pick<FilterNumeric, 'value' | 'max'>): number {
  return (limit == null) ? Infinity : Math.max(limit, filter.value, filter.max ?? 0)
}

export function clampToLimit (value: number, ceiling: number): number {
  return Math.min(Math.max(value, 0), ceiling)
}
