// How high a unique's mod lines rolled within their ranges (WOKEPOET-420).
// Guy's pick C: PoE mode's lines carry each number's range as the game's Alt
// view does ("42(30-46)%"), the number gold near the top, and a "High roll"
// chip on the name row says the copy beats the average one poe.ninja prices.

import type { ParsedItem } from '@/parser'
import { ItemRarity } from '@/parser'
import { FilterTag } from '@/web/price-check/filters/interfaces'
import type { FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'

/** A line at or above this % up its range reads gold, as a T1 does. */
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
  return Math.round(Math.min(1, Math.max(0, roll.goodness)) * 100)
}

export interface LineRanges {
  /** One per # in the line's text, in order; null where that number doesn't roll. */
  ranges: Array<{ min: number, max: number } | null>
  /** The line rolled near the top of its range. */
  top: boolean
  pct: number
}

/** Each number's range for the line's text, as the game's Alt view shows them. */
export function uniqueLineRanges (filter: StatFilter, item: ParsedItem): LineRanges | undefined {
  const pct = uniqueRollPct(filter, item)
  if (pct == null) return undefined
  // A total of several mods, or a "reduced" line shown flipped, has no one range to show.
  if (filter.sources.length !== 1 || filter.roll!.isNegated) return undefined
  const src = filter.sources[0]
  const raw = src.stat.roll
  if (!raw?.ranges || src.stat.translation.negate) return undefined
  // A catalyst scaled the line: the copy's ranges are the unscaled ones.
  if (src.contributes && src.contributes.value !== raw.value) return undefined
  const slots = (filter.text.match(/(?<![#])[+-]?[#]/g) ?? []).length
  if (slots !== raw.ranges.length) return undefined
  return {
    ranges: raw.ranges.map(r => (r.min === r.max) ? null : r),
    top: pct >= TOP_LINE_PCT,
    pct
  }
}

export interface HighRoll { pct: number, lines: StatFilter[] }

/** The copy's average roll, when it's high enough to be worth a real trade search. */
export function highRoll (stats: FilterOrGroup[], item: ParsedItem): HighRoll | undefined {
  const lines: StatFilter[] = []
  const pcts: number[] = []
  // A total split into its mods lists both: count the total only, or the click
  // would search one stat twice with two windows and find nothing.
  const key = (s: StatFilter['sources'][number]) => `${s.stat.stat.ref}|${s.stat.roll?.value}|${s.modifier.info.type}`
  const inTotals = new Set<string>()
  for (const f of stats) {
    if (!f.group && f.sources.length > 1) f.sources.forEach(s => inTotals.add(key(s)))
  }
  for (const f of stats) {
    // Hidden rows (a unique's base implicit) aren't what the copy is priced on.
    if (f.group || f.hidden) continue
    if (f.sources.length === 1 && inTotals.has(key(f.sources[0]))) continue
    const pct = uniqueRollPct(f, item)
    if (pct == null) continue
    lines.push(f)
    pcts.push(pct)
  }
  if (lines.length < HIGH_ITEM_MIN_LINES) return undefined
  const pct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
  return pct >= HIGH_ITEM_PCT ? { pct, lines } : undefined
}
