import { calculatedStatToFilter, FiltersCreationContext } from '../create-stat-filters'
import { sumStatsByModType } from '@/parser/modifiers'
import { FilterTag, FilterGroup } from '../interfaces'
import { tryFindAndResolveByRef, metaCountOneFilter } from './utils'
import { StatBetter, STATS_ITERATOR } from '@/assets/data'
import type { Stat } from '@/assets/data'
import type { ModifierType, StatCalculated } from '@/parser/modifiers'
import type { ItemCategory } from '@/parser'

// A family entry can name a ref the stat data no longer has: Glorious
// Vanity's "Mazcotl" was renamed Ahuana, and the data keeps the old name in
// the family while the Ahuana line isn't in it. A missing ref stands for the
// lines that share the family but aren't named in it (matched by the family,
// not by text, so it works in every language) instead of failing the check.
function resolveFamilyStats (ref: string, family: readonly string[], modType: ModifierType, category: ItemCategory | undefined): Stat[] {
  const byRef = tryFindAndResolveByRef(ref, modType, category)
  if (byRef) return [byRef]
  const key = JSON.stringify(family)
  const found: Stat[] = []
  for (const stat of STATS_ITERATOR(ref)) {
    if (!(modType in stat.trade.ids)) continue
    if (stat.modFamily == null || JSON.stringify(stat.modFamily) !== key) continue
    if (!family.includes(stat.ref)) found.push(stat)
  }
  return found
}

export function filterTimelessJewelKeystones (ctx: FiltersCreationContext) {
  const treeSeedStat = ctx.statsByType.find(calc =>
    calc.stat.better === StatBetter.NotComparable &&
    calc.stat.modFamily != null)
  if (!treeSeedStat) return

  const group: FilterGroup = {
    group: 'one',
    expanded: true,
    meta: metaCountOneFilter({ disabled: false }),
    stats: []
  }

  const seen = new Set<string>([treeSeedStat.stat.ref])
  const family = treeSeedStat.stat.modFamily!.includes(treeSeedStat.stat.ref)
    ? treeSeedStat.stat.modFamily!
    : [treeSeedStat.stat.ref, ...treeSeedStat.stat.modFamily!]
  for (const familyStatRef of family) {
    if (familyStatRef !== treeSeedStat.stat.ref) {
      for (const familyStat of resolveFamilyStats(familyStatRef, treeSeedStat.stat.modFamily!, treeSeedStat.type, ctx.item.category)) {
        if (seen.has(familyStat.ref)) continue
        seen.add(familyStat.ref)
        const calc: StatCalculated = sumStatsByModType([{
          info: treeSeedStat.sources[0].modifier.info,
          stats: [{
            stat: familyStat,
            translation: familyStat.matchers[0],
            roll: treeSeedStat.sources[0].stat.roll
          }]
        }])[0]
        const filter = calculatedStatToFilter(calc, ctx.searchInRange, ctx.item)
        filter.tag = FilterTag.Pseudo
        filter.disabled = true
        group.stats.push(filter)
      }
      continue
    }
    group.stats.push(calculatedStatToFilter(treeSeedStat, ctx.searchInRange, ctx.item))
  }

  ctx.statsByType = ctx.statsByType.filter(stat => stat !== treeSeedStat)
  ctx.groups.push(group)
}
