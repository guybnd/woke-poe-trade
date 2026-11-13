// Stat row operations behind the price check's pseudo split and right-click
// menu. Pure (no DOM), so they can be tested.

import { toRaw } from 'vue'
import type { ParsedItem } from '@/parser'
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
    // every item with the same mod rolled.
    let type = source.modifier.info.type
    if (anyCopy(type) && source.stat.stat.trade.ids[ModifierType.Explicit]) type = ModifierType.Explicit
    const key = `${type}|${source.stat.stat.ref}`
    if (shown.has(key)) continue
    const roll = (applyIncr(source.modifier.info, source.stat) ?? source.stat).roll
    const own: StatSource = {
      modifier: source.modifier,
      stat: source.stat,
      contributes: roll && { value: roll.value, min: roll.min, max: roll.max }
    }
    groups.set(key, [...(groups.get(key) ?? []), own])
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
export function tierBound (f: StatFilter): number | null {
  const roll = f.roll
  // A property row (Attacks per Second, Energy Shield) is the item's number, not its mod's.
  if (!roll || f.tag === FilterTag.Property || f.sources.length !== 1 || roll.isNegated || roll.better === 0 || roll.better == null) return null
  const source = f.sources[0]
  if (source.modifier.info.tier == null) return null
  const tier = source.stat.roll
  if (!tier) return null
  // A pseudo total counts its mod more than once (all resistances count three
  // times): scale by its share of the total, as rollWithoutCatalyst does.
  const scaled = (applyIncr(source.modifier.info, source.stat) ?? source.stat).roll
  const share = source.contributes
  const multi = (!share || !scaled)
    ? 1
    : (scaled.max !== 0) ? share.max / scaled.max : (scaled.min !== 0) ? share.min / scaled.min : 1
  const bound = Math.round((roll.better === -1 ? tier.max : tier.min) * multi * 1e6) / 1e6
  if (roll.dp) return bound
  // Rounded the way that still clears every copy at the tier.
  return roll.better === -1 ? Math.ceil(bound) : Math.floor(bound)
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
