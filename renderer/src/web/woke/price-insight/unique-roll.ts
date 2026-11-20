// How high a unique's mod lines rolled within their ranges (Guy's pick A,
// WOKEPOET-420). The % sits in PoE mode's tier column, where rares show T1, and
// a "High roll" chip on the name row says the copy beats the average one that
// poe.ninja prices.

import type { ParsedItem } from '@/parser'
import { ItemRarity } from '@/parser'
import { FilterTag } from '@/web/price-check/filters/interfaces'
import type { FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'
import { rollPair } from './roll-pair'

/** A line at or above this % reads gold, as a T1 does. */
export const TOP_LINE_PCT = 90
/** The chip shows when the rolling lines average at least this %. */
export const HIGH_ITEM_PCT = 75
/** ...and only with this many rolling lines, so one lucky line isn't "a high roll". */
export const HIGH_ITEM_MIN_LINES = 2

function isUniqueModLine (filter: StatFilter): boolean {
  if (!filter.sources.length) return false
  const tag = String(filter.tag)
  return tag === FilterTag.Explicit || tag === FilterTag.Implicit || tag === 'foulborn' || tag.startsWith('explicit-')
}

/** This line's roll as 0-100 up its range, best end 100; undefined when it doesn't roll. */
export function uniqueRollPct (filter: StatFilter, item: ParsedItem): number | undefined {
  if (item.rarity !== ItemRarity.Unique || item.rollsFromData) return undefined
  const roll = filter.roll
  // No bounds: a fixed line (min = max) or one with no better end.
  if (!roll?.bounds || roll.goodness == null || !isUniqueModLine(filter)) return undefined
  // A catalyst can push a line past its range: clamp.
  return Math.round(Math.min(1, Math.max(0, roll.goodness)) * 100)
}

/** Hover text for the % column. */
export function uniqueRollTitle (filter: StatFilter, pct: number): string {
  const b = filter.roll!.bounds!
  if (rollPair(filter)) return `${pct}% up its range (both numbers, averaged).`
  return `${pct}% up its range: ${filter.roll!.value} of ${b.min}–${b.max}.`
}

export interface HighRoll { pct: number, lines: StatFilter[] }

/** The copy's average roll, when it's high enough to be worth a real trade search. */
export function highRoll (stats: FilterOrGroup[], item: ParsedItem): HighRoll | undefined {
  const lines: StatFilter[] = []
  const pcts: number[] = []
  for (const f of stats) {
    if (f.group) continue
    const pct = uniqueRollPct(f, item)
    if (pct == null) continue
    lines.push(f)
    pcts.push(pct)
  }
  if (lines.length < HIGH_ITEM_MIN_LINES) return undefined
  const pct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
  return pct >= HIGH_ITEM_PCT ? { pct, lines } : undefined
}
