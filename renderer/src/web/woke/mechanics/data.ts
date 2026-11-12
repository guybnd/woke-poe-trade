// League mechanic definitions: which poe.ninja items to price for each
// mechanic, a few rules of thumb, and the zones that switch to it.
// Kept data-only so the widget layout can change without touching it.

import type { PriceItem } from '../market/types'

export interface PriceGroup {
  label: string
  // poe.ninja overview type ('Fossil', 'Currency', …); omit to search all types.
  types?: string[]
  match?: RegExp
  // Show the price for this many units (lifeforce is traded per 100).
  unit?: number
  // Short tag shown next to an item, e.g. the Expedition vendor.
  tag?: (item: PriceItem) => string | undefined
  // Prices here can't rank the items against each other, so no "best" call.
  unranked?: boolean
  limit?: number
}

export interface Mechanic {
  id: string
  label: string
  // 3-letter label for compact layouts.
  short: string
  icon: string
  groups: PriceGroup[]
  // Scarab family words (matched against Scarab names).
  scarabs?: RegExp
  tips: string[]
  // Client.txt area id or zone name that switches the widget to this mechanic.
  zone?: RegExp
}

const EXPEDITION_VENDORS: Record<string, string> = {
  'Exotic Coinage': 'Tujen',
  'Scrap Metal': 'Rog',
  'Astragali': 'Gwennen',
  'Burial Medallion': 'Dannig'
}

// Per unit, and the four don't drop in the same amounts, so the dearest isn't
// necessarily the one worth most per run.
const EXPEDITION_GROUP: PriceGroup = {
  label: 'Refresh currency, each',
  types: ['Artifact'],
  tag: i => EXPEDITION_VENDORS[i.name],
  unranked: true
}

const LIFEFORCE_COLOUR: Record<string, string> = {
  'Vivid Crystallised Lifeforce': 'yellow',
  'Primal Crystallised Lifeforce': 'blue',
  'Wild Crystallised Lifeforce': 'purple'
}

export const MECHANICS: Mechanic[] = [
  {
    id: 'delve',
    label: 'Delve',
    short: 'DLV',
    icon: 'fas fa-gem',
    groups: [
      { label: 'Fossils', types: ['Fossil'], limit: 12 },
      { label: 'Resonators', types: ['Resonator'], limit: 4 }
    ],
    scarabs: /Sulphite/,
    tips: [
      'Fossil nodes show their fossil icon on the mine map; detour only for the ones at the top of this list.',
      'Walls hide extra fossil and resonator chests; flares reveal them from the cart path.',
      'APT\'s Delve grid widget is still there for marking the map.'
    ],
    zone: /^Delve|Azurite Mine/i
  },
  {
    id: 'expedition',
    label: 'Expedition',
    short: 'EXP',
    icon: 'fas fa-bomb',
    groups: [EXPEDITION_GROUP],
    scarabs: /Expedition/,
    tips: [
      'Prices are per unit and drop amounts differ, so the dearest currency is not always the best faction to run.',
      'Place explosives on remnants that add vendor currency quantity or rarity first.',
      'Skip remnants your build cannot handle; one bad remnant can brick the run.'
    ],
    zone: /^Expedition/i
  },
  {
    id: 'harvest',
    label: 'Harvest',
    short: 'HRV',
    icon: 'fas fa-seedling',
    groups: [
      {
        label: 'Lifeforce colours',
        types: ['Currency'],
        match: /^(Vivid|Primal|Wild) Crystallised Lifeforce$/,
        unit: 100,
        tag: i => LIFEFORCE_COLOUR[i.name]
      },
      { label: 'Sacred lifeforce', types: ['Currency'], match: /^Sacred Crystallised Lifeforce$/ }
    ],
    scarabs: /Harvest/,
    tips: [
      'Each pair of plots lets you open one; pick the colour that ranks higher here.',
      'Colours are priced per 100; Sacred lifeforce per unit.',
      'Kill the tier 4 monsters first: they drop the most lifeforce.'
    ],
    zone: /Sacred Grove|^Harvest/i
  },
  {
    id: 'blight',
    label: 'Blight',
    short: 'BLT',
    icon: 'fas fa-biohazard',
    groups: [
      { label: 'Oils', types: ['Oil'], limit: 14 },
      { label: 'Blighted maps', types: ['BlightedMap', 'BlightRavagedMap'], limit: 5 }
    ],
    scarabs: /Blight/,
    tips: [
      'Cassia upgrades three oils into one of the next tier; compare with the next price up.',
      'Blight-ravaged maps drop Tainted Oil and have more lanes; bring a tower setup that covers all of them.'
    ],
    zone: /Blight/i
  },
  {
    id: 'essence',
    label: 'Essence',
    short: 'ESS',
    icon: 'fas fa-flask',
    groups: [
      { label: 'Essences', types: ['Essence'], limit: 12 }
    ],
    scarabs: /Essence/,
    tips: [
      'Corrupting with a Remnant of Corruption can turn essences into Horror, Hysteria, Insanity or Delirium.',
      'Three of an essence upgrade to the next tier at the vendor.'
    ]
  },
  {
    id: 'breach',
    label: 'Breach',
    short: 'BRC',
    icon: 'fas fa-hand-paper',
    // Breach splinters, Breachstones and Blessings are no longer in the game;
    // breaches drop Breach Rings (rare, corrupted), which poe.ninja doesn't price.
    groups: [],
    scarabs: /Breach/,
    tips: [
      'Breaches drop Breach Rings, which come corrupted: check their mods before vendoring.'
    ],
    zone: /Breach/i
  },
  {
    id: 'legion',
    label: 'Legion',
    short: 'LGN',
    icon: 'fas fa-shield-alt',
    groups: [
      { label: 'Splinters and emblems', types: ['Fragment'], match: /^Timeless .*(Splinter|Emblem)$/ }
    ],
    scarabs: /Legion/,
    tips: [
      'Open the generals and sergeants first: they carry the splinter drops.'
    ],
    zone: /Legion/i
  },
  {
    id: 'delirium',
    label: 'Delirium',
    short: 'DLR',
    icon: 'fas fa-cloud',
    groups: [
      { label: 'Delirium orbs', types: ['DeliriumOrb'], limit: 12 },
      { label: 'Simulacrum', types: ['Fragment'], match: /Simulacrum/ }
    ],
    scarabs: /Delirium/,
    tips: [
      'Put delirium orbs on maps whose reward type is near the top of this list.'
    ],
    zone: /Affliction|Simulacrum/i
  },
  {
    id: 'ritual',
    label: 'Ritual',
    short: 'RTL',
    icon: 'fas fa-skull',
    groups: [
      { label: 'Omens', types: ['Omen'], limit: 12 },
      { label: 'Corpses', types: ['Corpse'], limit: 12 }
    ],
    scarabs: /Ritual/,
    tips: [
      'Defer cheap rewards so expensive ones show up again on later altars.'
    ]
  },
  {
    id: 'allflame',
    label: 'Allflame',
    short: 'ALF',
    icon: 'fas fa-fire',
    groups: [
      { label: 'Allflame Embers', types: ['AllflameEmber'], limit: 12 }
    ],
    tips: [
      'Prices are for one ember.'
    ]
  },
  {
    id: 'ultimatum',
    label: 'Ultimatum',
    short: 'ULT',
    icon: 'fas fa-dungeon',
    groups: [
      { label: 'Catalysts', types: ['Currency'], match: /Catalyst$/, limit: 10 }
    ],
    scarabs: /Ultimatum/,
    tips: [
      'Stop when the next round adds a modifier your build cannot handle; you lose everything on failure.'
    ],
    zone: /Ultimatum|Trialmaster/i
  },
  {
    id: 'sanctum',
    label: 'Sanctum',
    short: 'SNC',
    icon: 'fas fa-place-of-worship',
    groups: [
      { label: 'Relics', types: ['UniqueRelic'], limit: 10 }
    ],
    tips: [
      'Keep resolve high early; take deferred currency rewards on floors you are sure to clear.',
      'Pick rooms that remove afflictions before stacking boons.'
    ],
    zone: /^Sanctum|Forbidden Sanctum/i
  },
  {
    id: 'heist',
    label: 'Heist',
    short: 'HST',
    icon: 'fas fa-user-secret',
    groups: [
      { label: 'Replica uniques', types: ['UniqueWeapon', 'UniqueArmour', 'UniqueAccessory', 'UniqueJewel', 'UniqueFlask'], match: /^Replica /, limit: 12 }
    ],
    tips: [
      'Blueprint reward rooms are revealed by rogues; check this list before choosing which reward to take.',
      'Grand Heist curio displays hold replica uniques and experimented bases.'
    ],
    zone: /^Heist|Rogue Harbour/i
  },
  {
    id: 'bestiary',
    label: 'Bestiary',
    short: 'BST',
    icon: 'fas fa-paw',
    groups: [
      { label: 'Captured beasts', types: ['Beast'], limit: 12 }
    ],
    scarabs: /Bestiary/,
    tips: [
      'Itemise beasts you will not use; the top ones are worth more sold than spent on recipes.'
    ]
  },
  {
    id: 'incursion',
    label: 'Incursion',
    short: 'INC',
    icon: 'fas fa-archway',
    groups: [
      { label: 'Vials', types: ['Vial'], limit: 10 }
    ],
    scarabs: /Incursion/,
    tips: [
      'Upgrade the Locus of Corruption and Apex rooms when vials at the top of this list are worth it.'
    ],
    zone: /Incursion|Temple of Atzoatl/i
  },
  {
    id: 'betrayal',
    label: 'Betrayal',
    short: 'BTR',
    icon: 'fas fa-balance-scale',
    groups: [],
    scarabs: /Betrayal/,
    tips: [
      'Interrogate to move a member up or out; Bargain to swap divisions.',
      'The captain of a division gives the best version of its reward.'
    ],
    zone: /Betrayal|Syndicate|Safehouse|Mastermind/i
  }
]

export function mechanicById (id: string): Mechanic | undefined {
  return MECHANICS.find(m => m.id === id)
}

// Mechanic for a Client.txt area id or zone name, if any.
export function mechanicForZone (areaIdOrName: string): Mechanic | undefined {
  if (!areaIdOrName) return undefined
  return MECHANICS.find(m => m.zone?.test(areaIdOrName))
}

export interface PricedRow {
  item: PriceItem
  // Price for `unit` items.
  chaos: number
  unit: number
  tag?: string
}

// leaveOut: drops a name whose chosen row it matches (a thin market, say)
// before the group's limit, so cheaper rows move up to fill it.
export function priceGroup (group: PriceGroup, items: PriceItem[], leaveOut?: (item: PriceItem) => boolean): PricedRow[] {
  const unit = group.unit ?? 1
  // One row per name. Variants: prefer the plain one, and never a 5- or
  // 6-link unique (poe.ninja lists those separately at many times the
  // price of the one that drops) unless that is all there is.
  const linked = (i: PriceItem) => /\b[56]L\b/.test(i.variant)
  const better = (a: PriceItem, b: PriceItem) =>
    linked(a) !== linked(b) ? !linked(a) : (!a.variant && Boolean(b.variant))
  const best = new Map<string, PriceItem>()
  for (const item of items) {
    if (group.types && !group.types.includes(item.type)) continue
    if (group.match && !group.match.test(item.name)) continue
    const prev = best.get(item.name)
    if (!prev || better(item, prev)) best.set(item.name, item)
  }
  const rows: PricedRow[] = [...best.values()].filter(item => !leaveOut?.(item)).map(item => ({ item, chaos: item.chaos * unit, unit, tag: group.tag?.(item) }))
  rows.sort((a, b) => b.chaos - a.chaos)
  return rows.slice(0, group.limit ?? 20)
}

export function priceScarabs (family: RegExp, items: PriceItem[], limit = 8): PricedRow[] {
  return priceGroup({ label: 'Scarabs', types: ['Scarab'], match: family, limit }, items)
}

export function expeditionRows (items: PriceItem[]): PricedRow[] {
  return priceGroup(EXPEDITION_GROUP, items)
}

// Change over poe.ninja's last 7 days as a ratio (0.12 is +12%), if known.
export function weekChange (row: PricedRow): number | null {
  const then = row.item.d7
  return then != null && then > 0 ? row.item.chaos / then - 1 : null
}

// One-line pick: the top item of the first group that has prices, unless
// that group's prices can't rank its items.
export function verdict (mech: Mechanic, items: PriceItem[]): { best: PricedRow, next?: PricedRow } | null {
  for (const group of mech.groups) {
    const rows = priceGroup(group, items)
    if (rows.length) return group.unranked ? null : { best: rows[0], next: rows[1] }
  }
  return null
}
