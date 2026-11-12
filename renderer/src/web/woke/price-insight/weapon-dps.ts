// woke: a weapon's DPS by damage type, each part a StatRoll (value and the
// lowest and highest its mods could have rolled). item-property.ts builds the
// DPS filters from it; the PoE-mode stat header (StatHeader.vue) draws it.
//
// The trade site's DPS filter counts chaos (a listing's extended.dps is
// pdps + edps + chaos DPS; checked 2026-11-12 on Rebuke of the Vaal: 352.07 =
// 166.85 + 140.39 + 44.8), so the total here does too.
import { calcPropBounds, propAt20Quality, QUALITY_STATS } from '@/parser/calc-q20'
import type { ParsedItem } from '@/parser'
import { statSourcesTotal, type StatRoll, type StatSource } from '@/parser/modifiers'

export const ADDS_FIRE = 'Adds # to # Fire Damage'
export const ADDS_COLD = 'Adds # to # Cold Damage'
export const ADDS_LIGHTNING = 'Adds # to # Lightning Damage'
export const ADDS_CHAOS = 'Adds # to # Chaos Damage'

export interface WeaponDps {
  aps: StatRoll
  apsSources: StatSource[]
  /** Physical DPS at 20% quality, as the trade site searches it. */
  phys: StatRoll
  ele: StatRoll
  chaos: StatRoll
  /** phys + ele + chaos. */
  total: StatRoll
  /** Each damage type's share of the total, for the split bar (DPS, not rolls). */
  split: { phys: number, fire: number, cold: number, lightning: number, ele: number, chaos: number }
}

const ZERO: StatRoll = { value: 0, min: 0, max: 0 }

function times (a: StatRoll, b: StatRoll): StatRoll {
  return { value: a.value * b.value, min: a.min * b.min, max: a.max * b.max }
}

function plus (...rolls: StatRoll[]): StatRoll {
  return rolls.reduce((s, r) => ({ value: s.value + r.value, min: s.min + r.min, max: s.max + r.max }), ZERO)
}

/** The summed roll of every mod line with this stat (average damage for "Adds # to #"). */
function modsTotal (item: ParsedItem, ref: string): StatRoll {
  let out = ZERO
  for (const calc of item.statsByType) {
    if (calc.stat.ref !== ref) continue
    const roll = statSourcesTotal(calc.sources)
    if (roll) out = plus(out, roll)
  }
  return out
}

export function weaponDps (item: ParsedItem): WeaponDps {
  const attackSpeed = calcPropBounds(item.weaponAS ?? 0, { incr: ['#% increased Attack Speed'], flat: [] }, item)
  const aps = attackSpeed.roll
  const physQ20 = propAt20Quality(item.weaponPHYSICAL ?? 0, QUALITY_STATS.PHYSICAL_DAMAGE, undefined, item)
  const phys = times(physQ20.roll, aps)

  const eleDmg = calcPropBounds(item.weaponELEMENTAL ?? 0, {
    flat: [ADDS_LIGHTNING, ADDS_COLD, ADDS_FIRE],
    incr: []
  }, item)
  const ele = times(eleDmg.roll, aps)

  // No "Chaos Damage:" line is parsed, so chaos comes from the local mods that add it.
  // Nothing raises local chaos damage by a percentage, so the mods are all of it.
  const chaos = times(modsTotal(item, ADDS_CHAOS), aps)

  // The split bar's element colours, from the mods; whatever the mods don't
  // explain (an element on the base) stays as plain "ele".
  const fire = modsTotal(item, ADDS_FIRE).value * aps.value
  const cold = modsTotal(item, ADDS_COLD).value * aps.value
  const lightning = modsTotal(item, ADDS_LIGHTNING).value * aps.value
  const known = fire + cold + lightning
  const scale = (known > ele.value && known > 0) ? ele.value / known : 1

  return {
    aps,
    apsSources: attackSpeed.sources,
    phys,
    ele,
    chaos,
    total: plus(phys, ele, chaos),
    split: {
      phys: phys.value,
      fire: fire * scale,
      cold: cold * scale,
      lightning: lightning * scale,
      ele: Math.max(0, ele.value - known * scale),
      chaos: chaos.value
    }
  }
}

/**
 * How far a roll got from its lowest to its highest, 0 to 1, or null when
 * nothing on the item can change it (min equals max): the bar is drawn grey.
 */
export function rollFill (roll: { value: number, min: number, max: number }): number | null {
  if (!(roll.max > roll.min)) return null
  const f = (roll.value - roll.min) / (roll.max - roll.min)
  return Math.min(1, Math.max(0, f))
}
