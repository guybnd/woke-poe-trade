// Stat row operations behind the price check's pseudo split and right-click
// menu. Pure (no DOM), so they can be tested.

import { toRaw } from 'vue'
import type { ParsedItem } from '@/parser'
import { applyIncr } from '@/parser/advanced-mod-desc'
import type { StatSource } from '@/parser/modifiers'
import type { FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'
import { calculatedStatToFilter } from '@/web/price-check/filters/create-stat-filters'

const isFilter = (s: FilterOrGroup): s is StatFilter => !('group' in s && s.group)

/** One filter per mod behind a pseudo total, with the mod's own roll. Mods of
 *  the same kind and stat (two prefixes both adding Fire Resistance) share one
 *  filter, summed as the price check sums them. */
export function splitFilters (pseudo: StatFilter, stats: FilterOrGroup[], item: ParsedItem, percent: number): StatFilter[] {
  const shown = new Set(stats.filter(isFilter).map(s => `${s.tag}|${s.statRef}`))
  const groups = new Map<string, StatSource[]>()
  for (const source of pseudo.sources) {
    const key = `${source.modifier.info.type}|${source.stat.stat.ref}`
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
      type: sources[0].modifier.info.type,
      sources
    }, percent, item)
    filter.disabled = false
    out.push(filter)
  }
  return out
}

/** The tier's worst roll, in the filter's own terms, for a filter from one tiered mod; else null. */
export function tierBound (f: StatFilter): number | null {
  const roll = f.roll
  if (!roll || f.sources.length !== 1 || roll.isNegated || roll.better === 0 || roll.better == null) return null
  const source = f.sources[0]
  if (source.modifier.info.tier == null) return null
  const tier = (applyIncr(source.modifier.info, source.stat) ?? source.stat).roll
  if (!tier) return null
  return roll.better === -1 ? tier.max : tier.min
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
