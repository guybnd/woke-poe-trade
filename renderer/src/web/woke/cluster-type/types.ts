// Cluster jewel types by size: the game's names and enchant lines, from the passive
// tree data (public/data/tree/passive-tree.json, clusters.jewels). Order is the game's.
export type ClusterSize = 'Small' | 'Medium' | 'Large'

export interface ClusterType { name: string, enchants: string[] }

const P = 'Added Small Passive Skills grant: '

export const CLUSTER_TYPES: Record<ClusterSize, ClusterType[]> = {
  Small: [
    { name: 'Life', enchants: [P + '4% increased maximum Life'] },
    { name: 'Energy Shield', enchants: [P + '6% increased maximum Energy Shield'] },
    { name: 'Mana', enchants: [P + '6% increased maximum Mana'] },
    { name: 'Armour', enchants: [P + '15% increased Armour'] },
    { name: 'Evasion', enchants: [P + '15% increased Evasion Rating'] },
    { name: 'Chance to Block Attack Damage', enchants: [P + '+2% Chance to Block Attack Damage'] },
    { name: 'Chance to Block Spell Damage', enchants: [P + '2% Chance to Block Spell Damage'] },
    { name: 'Fire Resistance', enchants: [P + '+15% to Fire Resistance'] },
    { name: 'Cold Resistance', enchants: [P + '+15% to Cold Resistance'] },
    { name: 'Lightning Resistance', enchants: [P + '+15% to Lightning Resistance'] },
    { name: 'Chaos Resistance', enchants: [P + '+12% to Chaos Resistance'] },
    { name: 'Chance to Suppress Spell Damage', enchants: [P + '+4% chance to Suppress Spell Damage'] },
    { name: 'Strength', enchants: [P + '+10 to Strength'] },
    { name: 'Dexterity', enchants: [P + '+10 to Dexterity'] },
    { name: 'Intelligence', enchants: [P + '+10 to Intelligence'] },
    { name: 'Reservation Efficiency', enchants: [P + '6% increased Mana Reservation Efficiency of Skills'] },
    { name: 'Curse Effect', enchants: [P + '2% increased Effect of your Curses'] }
  ],
  Medium: [
    { name: 'Fire Damage over Time', enchants: [P + '12% increased Burning Damage'] },
    { name: 'Chaos Damage over Time', enchants: [P + '12% increased Chaos Damage over Time'] },
    { name: 'Physical Damage over Time', enchants: [P + '12% increased Physical Damage over Time'] },
    { name: 'Cold Damage over Time', enchants: [P + '12% increased Cold Damage over Time'] },
    { name: 'Damage over Time', enchants: [P + '10% increased Damage over Time'] },
    { name: 'Effect of Non-Damaging Ailments', enchants: [P + '10% increased Effect of Non-Damaging Ailments'] },
    { name: 'Aura Effect (Legacy)', enchants: [P + '3% increased effect of Non-Curse Auras from your Skills'] },
    { name: 'Curse Effect (Legacy)', enchants: [P + '2% increased Effect of your Curses'] },
    { name: 'Damage while you have a Herald', enchants: [P + '10% increased Damage while affected by a Herald'] },
    { name: 'Minion Damage while you have a Herald', enchants: [P + 'Minions deal 10% increased Damage while you are affected by a Herald'] },
    { name: 'Exerted Attack Damage', enchants: [P + 'Exerted Attacks deal 20% increased Damage'] },
    { name: 'Critical Chance', enchants: [P + '15% increased Critical Strike Chance'] },
    { name: 'Minion Life', enchants: [P + 'Minions have 12% increased maximum Life'] },
    { name: 'Area Damage', enchants: [P + '10% increased Area Damage'] },
    { name: 'Projectile Damage', enchants: [P + '10% increased Projectile Damage'] },
    { name: 'Trap and Mine Damage', enchants: [P + '12% increased Trap Damage', P + '12% increased Mine Damage'] },
    { name: 'Totem Damage', enchants: [P + '12% increased Totem Damage'] },
    { name: 'Brand Damage', enchants: [P + '12% increased Brand Damage'] },
    { name: 'Channelling Skill Damage', enchants: [P + 'Channelling Skills deal 12% increased Damage'] },
    { name: 'Flask Duration', enchants: [P + '6% increased Flask Effect Duration'] },
    { name: 'Life and Mana recovery from Flasks', enchants: [P + '10% increased Life Recovery from Flasks', P + '10% increased Mana Recovery from Flasks'] }
  ],
  Large: [
    { name: 'Axe and Sword Damage', enchants: [P + 'Axe Attacks deal 12% increased Damage with Hits and Ailments', P + 'Sword Attacks deal 12% increased Damage with Hits and Ailments'] },
    { name: 'Mace and Staff Damage', enchants: [P + 'Staff Attacks deal 12% increased Damage with Hits and Ailments', P + 'Mace or Sceptre Attacks deal 12% increased Damage with Hits and Ailments'] },
    { name: 'Dagger and Claw Damage', enchants: [P + 'Claw Attacks deal 12% increased Damage with Hits and Ailments', P + 'Dagger Attacks deal 12% increased Damage with Hits and Ailments'] },
    { name: 'Bow Damage', enchants: [P + '12% increased Damage with Bows', P + '12% increased Damage Over Time with Bow Skills'] },
    { name: 'Wand Damage', enchants: [P + 'Wand Attacks deal 12% increased Damage with Hits and Ailments'] },
    { name: 'Damage with Two Handed Weapons', enchants: [P + '12% increased Damage with Two Handed Weapons'] },
    { name: 'Attack Damage while Dual Wielding', enchants: [P + '12% increased Attack Damage while Dual Wielding'] },
    { name: 'Attack Damage while holding a Shield', enchants: [P + '12% increased Attack Damage while holding a Shield'] },
    { name: 'Attack Damage', enchants: [P + '10% increased Attack Damage'] },
    { name: 'Spell Damage', enchants: [P + '10% increased Spell Damage'] },
    { name: 'Elemental Damage', enchants: [P + '10% increased Elemental Damage'] },
    { name: 'Physical Damage', enchants: [P + '12% increased Physical Damage'] },
    { name: 'Fire Damage', enchants: [P + '12% increased Fire Damage'] },
    { name: 'Lightning Damage', enchants: [P + '12% increased Lightning Damage'] },
    { name: 'Cold Damage', enchants: [P + '12% increased Cold Damage'] },
    { name: 'Chaos Damage', enchants: [P + '12% increased Chaos Damage'] },
    { name: 'Minion Damage', enchants: [P + 'Minions deal 10% increased Damage'] }
  ]
}
