// woke: a cluster jewel's "Added Small Passive Skills also grant: +#% to Fire
// Resistance" as a total Elemental Resistance row, so a Fire jewel is priced
// with the Cold and Lightning ones, the way resistances on gear are.
//
// The trade site's pseudo totals don't count these lines (checked 2026-11-09:
// a cluster Fire line plus pseudo total Fire Resistance >= 1 finds nothing),
// and a weighted sum is refused without a trade login. So the row searches
// "any one of the lines" at the total: right for a jewel with one resistance
// line, which is the only kind it's made for.

import { pseudoStatByRef, stat } from '@/assets/data'
import type { ParsedItem } from '@/parser'
import { ModifierType } from '@/parser/modifiers'
import { calculatedStatToFilter } from '../create-stat-filters'
import type { StatFilter } from '../interfaces'

const PREFIX = 'Added Small Passive Skills also grant: '

// Resistance lines and how much of the total each counts for.
const LINES: Array<{ ref: string, tradeId: string, multiplier: number }> = [
  { ref: stat(`${PREFIX}+#% to Fire Resistance`), tradeId: 'explicit.stat_1790411851', multiplier: 1 },
  { ref: stat(`${PREFIX}+#% to Cold Resistance`), tradeId: 'explicit.stat_2709692542', multiplier: 1 },
  { ref: stat(`${PREFIX}+#% to Lightning Resistance`), tradeId: 'explicit.stat_2250780084', multiplier: 1 },
  { ref: stat(`${PREFIX}+#% to all Elemental Resistances`), tradeId: 'explicit.stat_2669029667', multiplier: 3 }
]

/** What adds up to the total row, for reading a listing's total (stat columns). */
export const CLUSTER_RES_STATS = LINES.map(({ ref, multiplier }) => ({ ref, multiplier }))
const ELEMENT_STATS = CLUSTER_RES_STATS.filter(l => l.multiplier === 1)

/** The line search ids, each scaled so its own number is compared with the total. */
export const CLUSTER_RES_TRADE_IDS = LINES.map(l => l.multiplier === 1 ? l.tradeId : `{div_by_${l.multiplier}}${l.tradeId}`)
const ELEMENT_TRADE_IDS = LINES.filter(l => l.multiplier === 1).map(l => l.tradeId)

const CHANGEABLE = new Set<string>([ModifierType.Explicit, ModifierType.Fractured])

const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i])

/** For a row made here, the lines a listing's number is read from (stat columns); else null. */
export function clusterResColumnStats (filter: StatFilter): Array<{ ref: string, multiplier: number }> | null {
  if (filter.tag !== ModifierType.Pseudo) return null
  if (sameIds(filter.tradeId, CLUSTER_RES_TRADE_IDS)) return CLUSTER_RES_STATS
  if (sameIds(filter.tradeId, ELEMENT_TRADE_IDS)) return ELEMENT_STATS
  return null
}

// Only for the item's own preset: the base-item preset keeps a fractured line as
// it is, since that's what makes the base.
//
// One element line: a total Elemental Resistance row (any element, or all-res
// at a third). One element line and an all-res line: they can't be summed
// logged out, so the element line becomes "any one element" and both are
// ticked, which asks for the same two lines in any element.
export function addClusterResPseudo (filters: StatFilter[], item: ParsedItem, percent: number): void {
  const lines = filters.filter(f => CHANGEABLE.has(f.tag) && LINES.some(l => l.ref === f.statRef))
  // An uncorrupted fractured mod is listed twice, as explicit and (hidden) as
  // fractured: count each line once, preferring the explicit copy.
  const byRef = new Map<string, StatFilter>()
  for (const f of lines) {
    if (!byRef.has(f.statRef) || f.tag === ModifierType.Explicit) byRef.set(f.statRef, f)
  }
  const unique = [...byRef.values()]
  const singles = unique.filter(f => LINES.find(l => l.ref === f.statRef)!.multiplier === 1)
  const allRes = unique.filter(f => LINES.find(l => l.ref === f.statRef)!.multiplier !== 1)
  if (singles.length > 1 || allRes.length > 1 || !unique.length) return

  if (singles.length === 1 && allRes.length === 1) {
    const plain = singles[0]
    if (plain.sources.length !== 1 || !plain.roll) return
    const any: StatFilter = {
      ...plain,
      text: 'Added Small Passive Skills also grant: +#% to Fire, Cold or Lightning Resistance',
      tag: ModifierType.Pseudo,
      tradeId: [...ELEMENT_TRADE_IDS],
      roll: structuredClone(plain.roll),
      disabled: false
    }
    allRes[0].disabled = false
    // The line itself folds under the row; its Pseudo chip opens it again.
    filters.splice(filters.indexOf(plain), 1, any)
    return
  }

  const plain = unique[0]
  if (plain.sources.length !== 1) return
  const info = LINES.find(l => l.ref === plain.statRef)!
  const source = plain.sources[0]
  if (!source.contributes) return

  const multi = info.multiplier
  const total = calculatedStatToFilter({
    stat: pseudoStatByRef(stat('+#% total Elemental Resistance'))!,
    type: ModifierType.Pseudo,
    sources: [{
      ...source,
      contributes: {
        value: source.contributes.value * multi,
        min: source.contributes.min * multi,
        max: source.contributes.max * multi
      }
    }]
  }, percent, item)
  total.tradeId = [...CLUSTER_RES_TRADE_IDS]
  // Ticked like total resistance on other gear. The line folds under the row;
  // its Pseudo chip opens it again.
  total.disabled = false
  filters.splice(filters.indexOf(plain), 1, total)
}
