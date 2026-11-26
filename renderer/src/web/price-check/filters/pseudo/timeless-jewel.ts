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
// the family while the Ahuana line only lists it as a matcher. Look the old
// name up by its text instead of failing the whole price check.
function resolveFamilyStat (ref: string, modType: ModifierType, category: ItemCategory | undefined): Stat | undefined {
  const byRef = tryFindAndResolveByRef(ref, modType, category)
  if (byRef) return byRef
  for (const stat of STATS_ITERATOR(ref)) {
    if (!(modType in stat.trade.ids)) continue
    if (stat.matchers.some(m => m.string === ref || m.string.startsWith(`${ref}\n`))) return stat
  }
  return undefined
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
    let calc: StatCalculated = treeSeedStat
    if (familyStatRef !== treeSeedStat.stat.ref) {
      const familyStat = resolveFamilyStat(familyStatRef, treeSeedStat.type, ctx.item.category)
      if (!familyStat || seen.has(familyStat.ref)) continue
      seen.add(familyStat.ref)
      calc = sumStatsByModType([{
        info: treeSeedStat.sources[0].modifier.info,
        stats: [{
          stat: familyStat,
          translation: familyStat.matchers[0],
          roll: calc.sources[0].stat.roll
        }]
      }])[0]
    }
    const filter = calculatedStatToFilter(calc, ctx.searchInRange, ctx.item)
    if (calc !== treeSeedStat) {
      filter.tag = FilterTag.Pseudo
      filter.disabled = true
    }
    group.stats.push(filter)
  }

  ctx.statsByType = ctx.statsByType.filter(stat => stat !== treeSeedStat)
  ctx.groups.push(group)
}
