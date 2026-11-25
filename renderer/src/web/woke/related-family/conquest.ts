// The keystone each conqueror gives, for the price check's side list. A
// Timeless jewel's conqueror always turns keystones in its ring into the same
// keystone, whatever the jewel's number (the number only picks the notables).
// The Abyss conquest jewels (Eye jewels) have one lord each, so one keystone.
// Names and stat lines from poedb.tw (2026-11-25).
import { conquerorIdOf } from './conquest-pick'
export { CONQUEST_TRADE_PREFIX } from './conquest-pick'

export interface Keystone {
  name: string
  stats: string[]
}

export interface Conqueror {
  // As the trade site's id names it: explicit.pseudo_timeless_jewel_<id>.
  id: string
  name: string
  keystone: Keystone | null
}

const k = (name: string, ...stats: string[]): Keystone => ({ name, stats })

// Each Timeless jewel's conquerors, in the game's order.
export const TIMELESS: Record<string, Conqueror[]> = {
  'Glorious Vanity': [
    { id: 'xibaqua', name: 'Xibaqua', keystone: k('Divine Flesh', 'All Damage taken bypasses Energy Shield', '50% of Elemental Damage taken as Chaos Damage', '+5% to maximum Chaos Resistance') },
    { id: 'ahuana', name: 'Ahuana', keystone: k('Immortal Ambition', 'Energy Shield starts at zero', 'Cannot Recharge or Regenerate Energy Shield', 'Lose 5% of Energy Shield per second', 'Life Leech effects are not removed when Unreserved Life is Filled', 'Life Leech effects Recover Energy Shield instead while on Full Life') },
    { id: 'doryani', name: 'Doryani', keystone: k('Corrupted Soul', '50% of Non-Chaos Damage taken bypasses Energy Shield', 'Gain 15% of Maximum Life as Extra Maximum Energy Shield') }
  ],
  'Lethal Pride': [
    { id: 'kaom', name: 'Kaom', keystone: k('Strength of Blood', 'Life Recovery from Non-Instant Leech is not applied', '2% additional Physical Damage Reduction for every 3% Life Recovery per second from Leech') },
    { id: 'rakiata', name: 'Rakiata', keystone: k('Tempered by War', '50% of Cold and Lightning Damage taken as Fire Damage', '50% less Cold Resistance', '50% less Lightning Resistance') },
    { id: 'akoya', name: 'Akoya', keystone: k('Chainbreaker', 'Mana Recovery from Regeneration is not applied', '1 Rage Regenerated for every 25 Mana Regeneration per Second', 'Does not delay Inherent Loss of Rage', 'Skills Cost +3 Rage') }
  ],
  'Brutal Restraint': [
    { id: 'balbala', name: 'Balbala', keystone: k('The Traitor', 'Flasks Gain 4 Charges per empty Flask Slot every 5 seconds') },
    { id: 'asenath', name: 'Asenath', keystone: k('Dance with Death', "Can't use Helmets", 'Your Critical Strike Chance is Lucky', 'Your Damage with Critical Strikes is Lucky', "Enemies' Damage with Critical Strikes against you is Lucky") },
    { id: 'nasima', name: 'Nasima', keystone: k('Second Sight', 'You are Blind', 'Blind does not affect your Light Radius', '25% more Melee Critical Strike Chance while Blinded') }
  ],
  'Militant Faith': [
    { id: 'maxarius', name: 'Maxarius', keystone: k('Transcendence', 'Armour applies to Fire, Cold and Lightning Damage taken from Hits instead of Physical Damage', '-15% to all maximum Elemental Resistances') },
    { id: 'dominus', name: 'Dominus', keystone: k('Inner Conviction', '3% more Spell Damage per Power Charge', 'Gain Power Charges instead of Frenzy Charges') },
    { id: 'avarius', name: 'Avarius', keystone: k('Power of Purpose', '80% of Maximum Mana is Converted to twice that much Armour') }
  ],
  'Elegant Hubris': [
    { id: 'cadiro', name: 'Cadiro', keystone: k('Supreme Decadence', 'Life Recovery from Flasks also applies to Energy Shield', '30% less Life Recovery from Flasks') },
    { id: 'victario', name: 'Victario', keystone: k('Supreme Grandstanding', 'Nearby Allies and Enemies Share Charges with you', 'Enemies Hitting you have 10% chance to gain an Endurance, Frenzy or Power Charge') },
    { id: 'caspiro', name: 'Caspiro', keystone: k('Supreme Ostentation', 'Ignore Attribute Requirements', 'Gain no inherent bonuses from Attributes') }
  ],
  'Heroic Tragedy': [
    { id: 'vorana', name: 'Vorana', keystone: k('Black Scythe Training', 'Removes all Energy Shield', 'Chance to Evade Hits is based off of 200% of your Ward instead of your Evasion Rating', 'Physical Damage Reduction from Hits is based off of 200% of your Ward instead of your Armour') },
    { id: 'uhtred', name: 'Uhtred', keystone: k('Celestial Mathematics', 'While you have Unbroken Ward, your next non-channelling Attack you Use yourself breaks your Ward to gain Added Cold Damage equal to 25% of Ward') },
    { id: 'medved', name: 'Medved', keystone: k('The Unbreaking Circle', '40% less Ward', 'Ward has a 60% chance to not Break') }
  ]
}

// The Legion emblems: each opens the Domain of Timeless Conflict, where the
// Timeless jewels drop, its faction's jewel among them. Heroic Tragedy has no
// emblem (no Kalguuran legion), so it lists none.
export const EMBLEMS: Array<{ emblem: string, jewel: string }> = [
  { emblem: 'Timeless Karui Emblem', jewel: 'Lethal Pride' },
  { emblem: 'Timeless Maraketh Emblem', jewel: 'Brutal Restraint' },
  { emblem: 'Timeless Eternal Emblem', jewel: 'Elegant Hubris' },
  { emblem: 'Timeless Templar Emblem', jewel: 'Militant Faith' },
  { emblem: 'Timeless Vaal Emblem', jewel: 'Glorious Vanity' }
]

// The Abyss conquest jewels: one lord each. poedb names no keystone for
// Zorath (Reclaimed Malevolence), so its row shows the lord only.
export const ABYSS: Array<{ jewel: string } & Conqueror> = [
  { jewel: 'Baleful Dominion', id: 'kurgal', name: 'Kurgal', keystone: k('Reconstructed Essence', 'Life Recoup also recovers Mana', '50% less recovery from Recoup') },
  { jewel: 'Destructive Aspiration', id: 'amanamu', name: 'Amanamu', keystone: k('The Loyal Few', 'Minions take 10% less Damage while you have a Zombie', 'Minions deal 10% more Damage while you have a Skeleton', 'Minions gain 10% of Non-Chaos Damage as extra Chaos Damage while you have a Spectre', 'Maximum number of raised Spectres, Skeletons and Zombies is 1') },
  { jewel: 'Extinguishing Grasp', id: 'ulaman', name: 'Ulaman', keystone: k('Weighted Exchange', 'Take 15% more damage from Non-Critical Strikes', 'Take 30% less damage from Critical Strikes') },
  { jewel: 'Festering Vengeance', id: 'tecrod', name: 'Tecrod', keystone: k('Overwhelming Hate', '20% less maximum Life', 'Increases and reductions to Maximum Life also apply to Maximum Rage at 20% Value') },
  { jewel: 'Reclaimed Malevolence', id: 'zorath', name: 'Zorath', keystone: null }
]

export const isAbyssConquest = (refName: string) => ABYSS.some(a => a.jewel === refName)

// The conqueror of the jewel being checked, from its mods' trade ids.
export function ownConquerorId (stats: ReadonlyArray<{ stat: { trade: { ids: Record<string, string[] | undefined> } } }>): string | null {
  for (const calc of stats) {
    const id = conquerorIdOf(Object.values(calc.stat.trade.ids).flatMap(ids => ids ?? []))
    if (id) return id
  }
  return null
}
