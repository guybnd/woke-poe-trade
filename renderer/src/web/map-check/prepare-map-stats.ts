import { StatCalculated, statSourcesTotal, translateStatWithRoll } from '@/parser/modifiers'
import { roundRoll } from '../price-check/filters/util'

export interface PreparedStat {
  matcher: string
  roll?: number
}

export function prepareMapStat (calc: StatCalculated): PreparedStat {
  const roll = statSourcesTotal(calc.sources)
  const translation = translateStatWithRoll(calc, roll)

  // woke: a mod with no number goes by the wording the map shows ("Area
  // contains a Mirror of Delirium"), not its stat's first one ("Areas contain").
  const own = roll ? undefined : calc.sources[0]?.stat.translation.string

  const prepared = {
    matcher: own ?? translation.string,
    roll: roll && roundRoll(roll.value, translation.dp ?? false)
  }

  if (translation.negate) {
    if (prepared.roll != null) {
      prepared.roll = -1 * prepared.roll
    }
  }

  return prepared
}
