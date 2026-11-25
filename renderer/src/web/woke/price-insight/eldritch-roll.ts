// An eldritch implicit's roll range on the price check. The game's advanced copy
// gives these lines no "(min-max)", so the row had no bar: the ranges come from
// the game's mod data instead (implicit-sources.json "shown", built by
// scripts/gen-implicit-sources.py), per altar, tier and item class.
//
// A tier that rolls a range (Fortify 6-7%) spans that range, as any other
// mod's row does. A tier with one fixed number (an Endurance Charge every 14
// seconds) spans every tier of its altar instead, so the bar shows where the
// item sits from Lesser to the best tier.
import { ItemCategory } from '@/parser'
import type { StatSource, StatRoll } from '@/parser/modifiers'
import { implicitTable, loadImplicitTable } from './eldritch-listing'

/** [altar (0 Exarch, 1 Eater), rank (1 Lesser … 6 Perfect), low, high, item class bits] */
export type ShownRow = [number, number, number, number, number]

const CLASS_BIT: Partial<Record<ItemCategory, number>> = {
  [ItemCategory.Helmet]: 1,
  [ItemCategory.Gloves]: 2,
  [ItemCategory.Boots]: 4,
  [ItemCategory.BodyArmour]: 8,
  [ItemCategory.Amulet]: 16
}

export const ELDRITCH_TIERS = ['Lesser', 'Greater', 'Grand', 'Exceptional', 'Exquisite', 'Perfect']

export interface EldritchStep {
  rank: number
  min: number
  max: number
}

/** The stat's trade number: "implicit.stat_2555092341" -> "2555092341". */
function statNumber (source: StatSource): string | undefined {
  const id = source.stat.stat.trade.ids.implicit?.[0]
  return id ? /stat_(\d+)$/.exec(id)?.[1] : undefined
}

/** Every tier of the eldritch implicit on this item class, Lesser first, with the
 *  item's own tier among them. Null when the row isn't one, or the data has no
 *  single answer. */
export function eldritchSteps (
  source: StatSource,
  category: ItemCategory | undefined,
  rows: Record<string, ShownRow[]> | undefined
): { steps: EldritchStep[], mine: EldritchStep } | null {
  const { eldritch, rank } = source.modifier.info
  if (!eldritch || rank == null || !rows) return null
  // One number per line: an "Adds # to #" roll is an average, not a tier's range.
  if ((source.stat.translation.string.match(/#/g) ?? []).length !== 1) return null
  const stat = statNumber(source)
  const altar = eldritch === 'exarch' ? 0 : 1
  const bit = category ? CLASS_BIT[category] : undefined
  const mineRows = (stat ? rows[stat] ?? [] : []).filter(r => r[0] === altar && (bit == null || (r[4] & bit)))
  const steps: EldritchStep[] = []
  for (let r = 1; r <= 6; r++) {
    const at = mineRows.filter(row => row[1] === r)
    // Two ranges for one tier (no item class to pick by): no telling which.
    if (at.length > 1) return null
    if (at.length) steps.push({ rank: r, min: at[0][2], max: at[0][3] })
  }
  const mine = steps.find(s => s.rank === rank)
  if (!mine) return null
  return { steps, mine }
}

/** A filled-in roll. `fixedTier`: the tier is one number, so the search keeps to it and
 *  the range is only the bar's. `countsDown`: better tiers have lower numbers (an Endurance
 *  Charge every 10 seconds beats every 15), whatever the stat data says. */
export type EldritchRoll = StatRoll & { fixedTier?: boolean, countsDown?: boolean }

/** The row's roll with its range filled in, when the item gave none. */
export function eldritchRoll (
  sources: StatSource[],
  roll: StatRoll | undefined,
  category: ItemCategory | undefined
): EldritchRoll | undefined {
  if (!roll || roll.min !== roll.max || sources.length !== 1) return roll
  if (!sources[0].modifier.info.eldritch) return roll
  // The first check starts the read; eldritch-refill.ts fills the rows in once it's back.
  if (!implicitTable.value) loadImplicitTable().catch(() => {})
  const found = eldritchSteps(sources[0], category, implicitTable.value?.shown)
  if (!found) return roll
  const { steps, mine } = found
  const [low, high] = (mine.min !== mine.max)
    ? [mine.min, mine.max]
    : [Math.min(...steps.map(s => s.min)), Math.max(...steps.map(s => s.max))]
  const abs = Math.abs(roll.value)
  // The data disagrees with the item (a changed mod): leave the row as it was.
  if (abs < mine.min || abs > mine.max || low === high) return roll
  const fixedTier = mine.min === mine.max
  const first = steps[0]
  const last = steps[steps.length - 1]
  const countsDown = last.rank > first.rank && last.max < first.min
  return roll.value >= 0
    ? { value: roll.value, min: low, max: high, fixedTier, countsDown }
    : { value: roll.value, min: -high, max: -low, fixedTier, countsDown }
}
