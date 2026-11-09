// Mod swaps a player can buy, and which mods each one covers.
//
// Harvest (poedb Horticrafting list, checked 2026-11-09): "Change a modifier that
// grants Fire Resistance / Fire Damage into a similar-tier modifier that grants
// Cold ..." for every pair of Fire, Cold and Lightning. The target colour of
// lifeforce pays: to Fire is Wild, to Cold Vivid, to Lightning Primal.
// Physical, attack and caster crafts are random reforges, not swaps, so they
// aren't here.
//
// Genteel's Ducat (Allflame, 3.29): one single-attribute mod becomes one of the
// other two attributes, picked at random.
//
// Which mods a craft really hits is decided by the game's mod tags, which the
// app doesn't ship. The list is hand-made: add a member only once it's been
// checked in game.

export type SwapFamilyId = 'res' | 'maxRes' | 'eleDamage' | 'flatDamage' | 'attribute'

export interface SwapCost {
  /** poe.ninja item name of what pays for the swap. */
  item: string
  amount: number
}

export interface SwapFamily {
  id: SwapFamilyId
  label: string
  /** Keys of every member, in display order: elements or attributes. */
  keys: readonly string[]
  /** Each member maps a key to the stat ref that key turns the mod into. */
  members: ReadonlyArray<Readonly<Record<string, string>>>
  /** The outcome is random among the other keys; you can't pick one. */
  random?: true
  /** Tiers differ between keys, so the roll can't carry over. Searched at any roll. */
  anyRoll?: true
  /** Only offered while the mod's filter is ticked. Plain resistance changes nothing while total resistance is searched. */
  onlyTicked?: true
  /** Switched on unless the player turns it off. */
  defaultOn: boolean
  /** Word that marks a stat as hit by this craft too, for the random-target warning. */
  catches: RegExp
  cost: (to: string) => SwapCost
}

export const ELEMENTS = ['fire', 'cold', 'lightning'] as const
export const ATTRIBUTES = ['str', 'dex', 'int'] as const

export const KEY_LABEL: Record<string, string> = {
  fire: 'Fire',
  cold: 'Cold',
  lightning: 'Lightning',
  str: 'Strength',
  dex: 'Dexterity',
  int: 'Intelligence'
}

// What a Harvest swap to each element costs. Live prices come from poe.ninja.
const LIFEFORCE: Record<string, string> = {
  fire: 'Wild Crystallised Lifeforce',
  cold: 'Vivid Crystallised Lifeforce',
  lightning: 'Primal Crystallised Lifeforce'
}
export const HARVEST_SWAP_AMOUNT = 500
const harvestCost = (to: string): SwapCost => ({ item: LIFEFORCE[to], amount: HARVEST_SWAP_AMOUNT })

function byElement (template: string): Record<string, string> {
  return {
    fire: template.replace('{}', 'Fire'),
    cold: template.replace('{}', 'Cold'),
    lightning: template.replace('{}', 'Lightning')
  }
}

export const SWAP_FAMILIES: readonly SwapFamily[] = [
  {
    id: 'res',
    label: 'Resistance',
    keys: ELEMENTS,
    members: [byElement('+#% to {} Resistance'), byElement('+#% total to {} Resistance')],
    onlyTicked: true,
    defaultOn: true,
    catches: /\b(Fire|Cold|Lightning)\b.*Resistances?$/,
    cost: harvestCost
  },
  {
    id: 'maxRes',
    label: 'Maximum resistance',
    keys: ELEMENTS,
    members: [byElement('+#% to maximum {} Resistance')],
    defaultOn: true,
    catches: /maximum .*\b(Fire|Cold|Lightning)\b.*Resistance/,
    cost: harvestCost
  },
  {
    id: 'eleDamage',
    label: 'Elemental damage',
    keys: ELEMENTS,
    members: [byElement('#% increased {} Damage')],
    defaultOn: true,
    catches: /\b(Fire|Cold|Lightning)\b Damage/,
    cost: harvestCost
  },
  {
    id: 'flatDamage',
    label: 'Added elemental damage',
    keys: ELEMENTS,
    members: [
      byElement('Adds # to # {} Damage'),
      byElement('Adds # to # {} Damage to Attacks'),
      byElement('Adds # to # {} Damage to Spells')
    ],
    anyRoll: true,
    defaultOn: false,
    catches: /\b(Fire|Cold|Lightning)\b Damage/,
    cost: harvestCost
  },
  {
    id: 'attribute',
    label: "Attributes (Genteel's Ducat)",
    keys: ATTRIBUTES,
    members: [
      { str: '+# to Strength', dex: '+# to Dexterity', int: '+# to Intelligence' },
      { str: '+# total to Strength', dex: '+# total to Dexterity', int: '+# total to Intelligence' }
    ],
    random: true,
    defaultOn: false,
    catches: /\b(Strength|Dexterity|Intelligence|all Attributes)\b/,
    cost: () => ({ item: "Genteel's Ducat", amount: 1 })
  }
]

export const DEFAULT_HIGHLIGHT_CHAOS = 20

export interface HarvestSwapConfig {
  /** Families the player switched away from their default. */
  on?: Partial<Record<SwapFamilyId, boolean>>
  /** Swaps cheaper than this many chaos are highlighted. */
  highlightChaos?: number
}

export function familyOn (family: SwapFamily, config: HarvestSwapConfig | undefined): boolean {
  return config?.on?.[family.id] ?? family.defaultOn
}
