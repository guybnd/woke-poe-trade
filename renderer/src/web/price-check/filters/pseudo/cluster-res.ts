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

/** What adds up to the row, for reading a listing's total (stat columns). */
export const CLUSTER_RES_STATS = LINES.map(({ ref, multiplier }) => ({ ref, multiplier }))

/** The line search ids, each scaled so its own number is compared with the total. */
export const CLUSTER_RES_TRADE_IDS = LINES.map(l => l.multiplier === 1 ? l.tradeId : `{div_by_${l.multiplier}}${l.tradeId}`)

const CHANGEABLE = new Set<string>([ModifierType.Explicit, ModifierType.Fractured])

/** A row made by addClusterResPseudo. */
export function isClusterResTotal (filter: StatFilter): boolean {
  return filter.tag === ModifierType.Pseudo && filter.tradeId.length === CLUSTER_RES_TRADE_IDS.length &&
    filter.tradeId.every((id, i) => id === CLUSTER_RES_TRADE_IDS[i])
}

export function addClusterResPseudo (filters: StatFilter[], item: ParsedItem, percent: number): void {
  const lines = filters.filter(f => CHANGEABLE.has(f.tag) && LINES.some(l => l.ref === f.statRef))
  if (lines.length !== 1) return
  const plain = lines[0]
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
  total.disabled = plain.disabled
  plain.disabled = true
  filters.splice(filters.indexOf(plain), 0, total)
}
