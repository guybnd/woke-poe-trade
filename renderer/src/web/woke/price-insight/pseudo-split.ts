// Stat row operations behind the price check's pseudo split and right-click
// menu. Pure (no DOM), so they can be tested.

import { toRaw } from 'vue'
import { ItemRarity, type ParsedItem } from '@/parser'
import { applyIncr } from '@/parser/advanced-mod-desc'
import { ModifierType, StatSource } from '@/parser/modifiers'
import type { ParsedModifier } from '@/parser/advanced-mod-desc'
import type { FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'
import { FilterTag } from '@/web/price-check/filters/interfaces'
import { calculatedStatToFilter } from '@/web/price-check/filters/create-stat-filters'

const isFilter = (s: FilterOrGroup): s is StatFilter => !('group' in s && s.group)

const anyCopy = (type: ModifierType) => type === ModifierType.Fractured || type === ModifierType.Crafted

/** One filter per mod behind a pseudo total, with the mod's own roll. Mods of
 *  the same kind and stat (two prefixes both adding Fire Resistance) share one
 *  filter, summed as the price check sums them. */
export function splitFilters (pseudo: StatFilter, stats: FilterOrGroup[], item: ParsedItem, percent: number): StatFilter[] {
  // A hidden row (the unticked Fractured twin of a fractured mod) doesn't list the mod.
  const shown = new Set(stats.filter(isFilter).filter(s => !s.hidden).map(s => `${s.tag}|${s.statRef}`))
  const groups = new Map<string, StatSource[]>()
  for (const source of pseudo.sources) {
    // A fractured mod searches any copy, as the total did (and as splitByMod does).
    // A crafted one too: the total counted it, and a crafted-only search misses
    // every item with the same mod rolled (it also searches the crafted id, below).
    let type = source.modifier.info.type
    if (anyCopy(type) && source.stat.stat.trade.ids[ModifierType.Explicit]) type = ModifierType.Explicit
    const key = `${type}|${source.stat.stat.ref}`
    if (shown.has(key)) continue
    // A fractured mod keeps a row of its own (not summed with a same-stat mod),
    // so PoE mode can offer "Fractured only" on it.
    const group = source.modifier.info.type === ModifierType.Fractured ? `${key}|fractured` : key
    const roll = (applyIncr(source.modifier.info, source.stat) ?? source.stat).roll
    const own: StatSource = {
      modifier: source.modifier,
      stat: source.stat,
      contributes: roll && { value: roll.value, min: roll.min, max: roll.max }
    }
    groups.set(group, [...(groups.get(group) ?? []), own])
  }
  const out: StatFilter[] = []
  for (const sources of groups.values()) {
    const filter = calculatedStatToFilter({
      stat: sources[0].stat.stat,
      type: (anyCopy(sources[0].modifier.info.type) && sources[0].stat.stat.trade.ids[ModifierType.Explicit])
        ? ModifierType.Explicit
        : sources[0].modifier.info.type,
      sources
    }, percent, item)
    // A crafted mod searched as the explicit stat would miss items that have it
    // crafted too: search either (two ids make an "any of" group).
    const crafted = sources[0].stat.stat.trade.ids[ModifierType.Crafted]
    if (crafted && filter.tag !== ModifierType.Crafted && sources.some(src => src.modifier.info.type === ModifierType.Crafted)) {
      filter.tradeId = [...filter.tradeId, ...crafted.filter(id => !filter.tradeId.includes(id))]
    }
    filter.disabled = false
    out.push(filter)
  }
  return out
}

/** One row per mod behind a line that sums the same local stat from two or more
 *  mods (120% and 42% increased Energy Shield read as 162%). Each row keeps the
 *  line's kind (unticked rows stay unticked) and is a local mod in the total. */
export function splitByMod (line: StatFilter, item: ParsedItem, percent: number): StatFilter[] {
  return line.sources.map(source => {
    const roll = (applyIncr(source.modifier.info, source.stat) ?? source.stat).roll
    const own: StatSource = {
      modifier: source.modifier,
      stat: source.stat,
      contributes: roll && { value: roll.value, min: roll.min, max: roll.max }
    }
    // A fractured mod searches any copy, as the line did; Fractured only is on the row.
    let type = source.modifier.info.type
    if (type === ModifierType.Fractured && source.stat.stat.trade.ids[ModifierType.Explicit]) type = ModifierType.Explicit
    const filter = calculatedStatToFilter({ stat: source.stat.stat, type, sources: [own] }, percent, item)
    filter.disabled = line.disabled
    filter.hidden = undefined
    filter.inTotal = true
    return filter
  })
}

/** A mod with two or more stat lines (Seraphim's: increased Energy Shield and Stun and Block Recovery). */
export function isHybrid (mod: ParsedModifier): boolean {
  return mod.stats.length >= 2
}

/** The one mod behind a row, when the row is that mod's alone. */
export function soleMod (f: StatFilter): ParsedModifier | undefined {
  return f.sources.length === 1 ? toRaw(f.sources[0].modifier) : undefined
}

/** Picks a row at its tier's worst roll (its own roll without a tier): the
 *  bar any copy of the mod at that tier clears. */
export function pickAtTier (f: StatFilter) {
  // An excluded line is searched as having the mod again.
  if (f.not) include(f)
  const roll = f.roll
  f.disabled = false
  if (!roll) return
  const bound = tierBound(f) ?? roll.value
  if (roll.better === -1) { roll.max = bound; roll.min = '' } else { roll.min = bound; roll.max = '' }
}

/** The tier's worst roll, in the filter's own terms, for a filter from one tiered mod; else null.
 *  Uncatalysed, so copies without catalyst quality clear it too. */
/** What one unit of the row's one mod counts for in the row: a pseudo total
 *  counts its mod more than once (all resistances count three times). */
export function shareScale (f: StatFilter): number {
  const source = f.sources[0]
  const scaled = (applyIncr(source.modifier.info, source.stat) ?? source.stat).roll
  const share = source.contributes
  return (!share || !scaled)
    ? 1
    : (scaled.max !== 0) ? share.max / scaled.max : (scaled.min !== 0) ? share.min / scaled.min : 1
}

/** A tier's bound in the row's units, rounded the way that still clears every
 *  copy at the tier: its worst roll, the max where lower is better. */
export function boundAt (f: StatFilter, min: number, max: number): number {
  const roll = f.roll!
  const bound = Math.round((roll.better === -1 ? max : min) * shareScale(f) * 1e6) / 1e6
  if (roll.dp) return bound
  return roll.better === -1 ? Math.ceil(bound) : Math.floor(bound)
}

export function tierBound (f: StatFilter): number | null {
  const roll = f.roll
  // A property row (Attacks per Second, Energy Shield) is the item's number, not its mod's.
  if (!roll || f.tag === FilterTag.Property || f.sources.length !== 1 || roll.isNegated || roll.better === 0 || roll.better == null) return null
  const source = f.sources[0]
  if (source.modifier.info.tier == null) return null
  const tier = source.stat.roll
  if (!tier) return null
  return boundAt(f, tier.min, tier.max)
}

// What a row was before Exclude it, put back by Include it again.
const beforeExclude = new WeakMap<StatFilter, { min: number | '' | undefined, max: number | '' | undefined, disabled: boolean }>()

export function exclude (f: StatFilter) {
  beforeExclude.set(toRaw(f), { min: f.roll?.min, max: f.roll?.max, disabled: f.disabled })
  // Without a range: "items without the mod", not "without a good roll of it".
  if (f.roll) { f.roll.min = ''; f.roll.max = '' }
  f.not = true
  f.disabled = false
}

export function include (f: StatFilter) {
  const was = beforeExclude.get(toRaw(f))
  f.not = undefined
  if (was) {
    if (f.roll) { f.roll.min = was.min; f.roll.max = was.max }
    f.disabled = was.disabled
    beforeExclude.delete(toRaw(f))
  }
}

// "Fractured only" from the right-click menu, on any explicit mod: the row
// searches the fractured copy of its mod. What it searched before, put back.
const beforeFractured = new WeakMap<StatFilter, string[]>()

/** The trade ids of the fractured copy of the row's one mod, when the row can
 *  switch to them: an explicit row (a mechanic's explicit tag too) of one mod,
 *  not excluded, on an item that can be fractured. */
export function fracturedOnlyIds (f: StatFilter, item: ParsedItem): string[] | undefined {
  const explicit = f.tag === FilterTag.Explicit || String(f.tag).startsWith('explicit-')
  if (!explicit || f.not || f.sources.length !== 1 || item.rarity === ItemRarity.Unique) return undefined
  return f.sources[0].stat.stat.trade.ids[ModifierType.Fractured]
}

export function isFracturedOnly (f: StatFilter, item: ParsedItem): boolean {
  const ids = fracturedOnlyIds(f, item)
  return ids != null && f.tradeId.join() === ids.join()
}

export function setFracturedOnly (f: StatFilter, item: ParsedItem, on: boolean) {
  const ids = fracturedOnlyIds(f, item)
  if (!ids || on === isFracturedOnly(f, item)) return
  const raw = toRaw(f)
  if (on) {
    beforeFractured.set(raw, f.tradeId)
    f.tradeId = ids
    f.disabled = false
  } else {
    f.tradeId = beforeFractured.get(raw) ?? f.sources[0].stat.stat.trade.ids[ModifierType.Explicit] ?? f.tradeId
    beforeFractured.delete(raw)
  }
}

/** A min (or, where lower is better, a max) a tenth looser than the roll:
 *  rounded the way that still lets the roll itself match. None when that is
 *  the roll itself or 0 (a roll of 1, which would read "any"). */
export function looseBound (f: StatFilter): number | null {
  const roll = f.roll
  if (!roll || roll.better == null || roll.better === 0 || !roll.value) return null
  // Looser by a tenth of its size, so a negative roll (-12% Fire Resistance) moves away from zero too.
  const delta = Math.abs(roll.value) * 0.1
  // Rounded first: 50 * 1.1 is 55.000000000000007, which ceil makes 56.
  const v = Math.round((roll.better === -1 ? roll.value + delta : roll.value - delta) * 1e6) / 1e6
  const step = roll.dp ? 10 : 1
  const out = roll.better === -1 ? Math.ceil(v * step) / step : Math.floor(v * step) / step
  return (out === roll.value || out === 0) ? null : out
}

/** Text for the game's stash search box that finds items with this mod: the
 *  longest run of words in the mod text, quoted, within the box's 50 characters. */
export function stashSearch (text: string): string | null {
  const runs = text.split(/[#\d.+\-%()]+/).map(s => s.trim().replace(/\s+/g, ' ')).filter(s => /[a-z]/i.test(s))
  if (!runs.length) return null
  let best = runs.reduce((a, b) => (b.length > a.length ? b : a)).toLowerCase()
  if (best.length > 48) best = best.slice(0, 48).replace(/\s+\S*$/, '')
  return `"${best}"`
}
