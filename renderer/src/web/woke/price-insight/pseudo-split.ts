// Splitting a pseudo total into the mods behind it. Pure, so it can be tested.

import type { ParsedItem } from '@/parser'
import { applyIncr } from '@/parser/advanced-mod-desc'
import type { FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'
import { calculatedStatToFilter } from '@/web/price-check/filters/create-stat-filters'

const isFilter = (s: FilterOrGroup): s is StatFilter => !('group' in s && s.group)

/** One filter per mod behind a pseudo total, each with that mod's own roll. */
export function splitFilters (pseudo: StatFilter, stats: FilterOrGroup[], item: ParsedItem, percent: number): StatFilter[] {
  const shown = new Set(stats.filter(isFilter).map(s => `${s.tag}|${s.statRef}`))
  const out: StatFilter[] = []
  for (const source of pseudo.sources) {
    const type = source.modifier.info.type
    if (shown.has(`${type}|${source.stat.stat.ref}`)) continue
    const roll = (applyIncr(source.modifier.info, source.stat) ?? source.stat).roll
    const filter = calculatedStatToFilter({
      stat: source.stat.stat,
      type,
      sources: [{
        modifier: source.modifier,
        stat: source.stat,
        contributes: roll && { value: roll.value, min: roll.min, max: roll.max }
      }]
    }, percent, item)
    filter.disabled = false
    shown.add(`${type}|${source.stat.stat.ref}`)
    out.push(filter)
  }
  return out
}
