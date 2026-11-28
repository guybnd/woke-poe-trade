// What a gear base's tooltip adds (Guy's pick I7 in the tooltip audit,
// 2026-11-25): the item level its best tiers of the mods players care about
// need, from public/data/mod-tiers.json. The uniques on the base are listed
// by item-tip.ts. Pure; loaded on the first base hover.
import type { TierData } from './mod-tiers'
import type { TipLine, TipPart } from './tip-content'
import type { TipBaseUnique } from './tooltip'

const part = (text: string, tone: TipPart['tone']): TipPart => ({ text, tone })

// The data's mod families players look at, by a short name. Families that
// share a name (the three resistances) count as one.
const KEY_FAMILIES: Record<string, string> = {
  IncreasedLife: 'Life',
  IncreasedEnergyShield: 'Energy Shield',
  DefencesPercent: 'Defences %',
  EnergyShieldPercent: 'Energy Shield %',
  FireResistance: 'Resistances',
  ColdResistance: 'Resistances',
  LightningResistance: 'Resistances',
  ChaosResistance: 'Chaos Res',
  AllResistances: 'All Res',
  MovementVelocity: 'Movement Speed',
  ChanceToSuppressSpells: 'Suppression',
  IncreasedAttackSpeed: 'Attack Speed',
  IncreasedCastSpeed: 'Cast Speed',
  LocalPhysicalDamagePercent: 'Physical %',
  CriticalStrikeMultiplier: 'Crit Multi',
  CriticalStrikeChanceIncrease: 'Crit Chance',
  GlobalSkillGemLevel: '+1 Gems',
  IncreaseSocketedGemLevel: 'Socketed Gems',
  IncreasedWeaponElementalDamagePercent: 'Elemental Damage',
  WeaponCasterDamagePrefix: 'Spell Damage',
  SpellDamage: 'Spell Damage',
  GlobalDamageOverTimeMultiplier: 'DoT Multi',
  AllAttributes: 'All Attributes'
}

/** "Best tiers need item level 86 Movement Speed · 85 Suppression · 84 Resistances",
 *  the three highest levels; null when the data doesn't know the class. */
export function topTierLine (data: TierData, key: string): TipLine | null {
  const rows = data.classes[key]
  if (!rows) return null
  const top = new Map<string, number>()
  for (const [, family, , level] of rows) {
    const name = KEY_FAMILIES[family]
    if (name) top.set(name, Math.max(top.get(name) ?? 0, level))
  }
  const byLevel = new Map<number, string[]>()
  for (const [name, level] of top) byLevel.set(level, [...(byLevel.get(level) ?? []), name])
  const levels = [...byLevel.keys()].sort((a, b) => b - a).slice(0, 3)
  if (!levels.length) return null
  const line: TipLine = [part('Best tiers need item level ', 'label')]
  levels.forEach((level, i) => {
    if (i) line.push(part(' · ', 'label'))
    line.push(part(String(level), 'value'), part(` ${byLevel.get(level)!.slice(0, 3).join(', ')}`, 'label'))
  })
  return line
}

// The game's words for the drop tiers T0..T5 (loot-filter/drop-tier.ts).
const RARITY_WORD = ['extremely rare', 'very rare', 'very rare', 'rare', 'uncommon', 'common']

// Each unique on a base says how often it turns up, and a very or extremely
// rare one worth 1 div or more says "chase": the Loot tab leaves it out of
// the base's average-drop price and shows the base as a chase base.
export function rarityLabels (list: TipBaseUnique[], tiers: Record<string, number> | undefined, divine: number): TipBaseUnique[] {
  if (!tiers) return list
  return list.map(u => {
    const t = tiers[u.name]
    if (t == null) return u
    const chase = t <= 2 && u.chaos != null && u.chaos >= divine
    return { ...u, grade: chase ? 'high' : 'unknown', label: chase ? 'chase' : RARITY_WORD[t] ?? '' }
  })
}
