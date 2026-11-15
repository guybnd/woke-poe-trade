// A weapon's damage block, worked out from its base and its local mods, for
// items that come without the game's own numbers (a PoB build's items, your
// character's read). The price search gets these from the trade site; this
// gives the same lines: damage by type, crit, attacks per second and DPS.
import type { TipBase } from './tip-content'

export type DamageType = 'physical' | 'fire' | 'cold' | 'lightning' | 'chaos'
export type Hit = [number, number]

export interface WeaponStats {
  damage: Partial<Record<DamageType, Hit>>
  crit: number
  aps: number
  pdps: number
  edps: number
  cdps: number
  dps: number
  // Changed by the item's mods or quality: the game shows those in blue.
  aug: { physical: boolean, crit: boolean, aps: boolean }
}

const NUM = '(\\d+(?:\\.\\d+)?)'
// Local on a weapon: no "to Attacks", no "to Spells".
const RE_ADDS = new RegExp(`^Adds ${NUM} to ${NUM} (Physical|Fire|Cold|Lightning|Chaos) Damage$`)
const RE_INC = new RegExp(`^${NUM}% (increased|reduced) (Physical Damage|Attack Speed|Critical Strike Chance)$`)
const RE_CRIT_FLAT = new RegExp(`^\\+${NUM}% to Critical Strike Chance$`)

// The weapon base inside a magic or "Superior" item's name ("Heavy Rusted
// Sword of Needling"): the longest weapon base name it contains.
export function weaponBaseIn (name: string, bases: Record<string, TipBase> | null | undefined): string | null {
  if (!bases) return null
  if (bases[name]?.ph) return name
  let best: string | null = null
  for (const [key, b] of Object.entries(bases)) {
    if (b.ph && name.includes(key) && (!best || key.length > best.length)) best = key
  }
  return best
}

// null for anything that isn't a weapon base.
export function weaponStats (base: TipBase | undefined, mods: string[], quality = 0): WeaponStats | null {
  if (!base?.ph || !base.at) return null
  const added: Partial<Record<DamageType, Hit>> = {}
  let incPhys = 0
  let incSpeed = 0
  let incCrit = 0
  let flatCrit = 0
  let noPhys = false
  for (const mod of mods) {
    const adds = RE_ADDS.exec(mod)
    if (adds) {
      const type = adds[3].toLowerCase() as DamageType
      const was = added[type] ?? [0, 0]
      added[type] = [was[0] + Number(adds[1]), was[1] + Number(adds[2])]
      continue
    }
    const inc = RE_INC.exec(mod)
    if (inc) {
      const v = Number(inc[1]) * (inc[2] === 'reduced' ? -1 : 1)
      if (inc[3] === 'Physical Damage') incPhys += v
      else if (inc[3] === 'Attack Speed') incSpeed += v
      else incCrit += v
      continue
    }
    const crit = RE_CRIT_FLAT.exec(mod)
    if (crit) { flatCrit += Number(crit[1]); continue }
    if (mod === 'No Physical Damage') noPhys = true
  }

  // Quality adds to increased physical damage, as in the game.
  const physMore = 1 + (incPhys + quality) / 100
  const physAdded = added.physical ?? [0, 0]
  const damage: Partial<Record<DamageType, Hit>> = {}
  if (!noPhys) {
    damage.physical = [
      Math.round((base.ph[0] + physAdded[0]) * physMore),
      Math.round((base.ph[1] + physAdded[1]) * physMore)
    ]
  }
  for (const type of ['fire', 'cold', 'lightning', 'chaos'] as const) {
    const hit = added[type]
    if (hit) damage[type] = hit
  }

  // The base rate to 2 decimals first, as PoB and the game hold it (bases.json
  // keeps attack time in whole milliseconds: 1.45 is 690).
  const baseRate = Math.round(100000 / base.at) / 100
  const aps = Math.round(baseRate * (1 + incSpeed / 100) * 100) / 100
  const crit = Math.round(((base.cr ?? 0) / 100 + flatCrit) * (1 + incCrit / 100) * 100) / 100
  const avg = (h: Hit | undefined) => h ? (h[0] + h[1]) / 2 : 0
  const pdps = avg(damage.physical) * aps
  const edps = (avg(damage.fire) + avg(damage.cold) + avg(damage.lightning)) * aps
  const cdps = avg(damage.chaos) * aps
  const r1 = (n: number) => Math.round(n * 10) / 10
  const aug = { physical: !!added.physical || incPhys !== 0 || quality > 0, crit: incCrit !== 0 || flatCrit !== 0, aps: incSpeed !== 0 }
  return { damage, crit, aps, pdps: r1(pdps), edps: r1(edps), cdps: r1(cdps), dps: r1(pdps + edps + cdps), aug }
}
