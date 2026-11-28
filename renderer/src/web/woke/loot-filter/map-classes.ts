// Special maps on the Loot tab (Guy's M1, 2026-11-28): blighted and
// blight-ravaged maps priced by tier from poe.ninja ("Blighted Map (Tier 14)"),
// on the same steps. A filter names them "Map (Tier 14)" plus BlightedMap or
// UberBlightedMap, so a step's rule lists its tiers and the rule count stays
// small. The rules go where NeverSink's blighted maps start, under its unique,
// Valdo and Originator maps. Unique maps are one row (a filter can't tell
// them apart): what the cheapest one sells for on poe.ninja, Always shown.
import type { LootCategory } from './fragment-classes'
import type { FilterCondition } from './parse'

export const MAP_CATEGORIES: LootCategory[] = [
  { id: 'mapend', name: 'Endgame maps', art: 'Nightmare Map' },
  { id: 'mapguard', name: 'Guardian and Citadel maps', art: 'Shaper Guardian Map' },
  { id: 'maporig', name: 'Originator maps', art: 'Map' },
  { id: 'mapmods', name: 'Content mods', art: 'Map' },
  { id: 'mapcorr', name: 'Corrupted', art: 'Map' },
  { id: 'mapblight', name: 'Blighted maps', art: 'Blighted Map' },
  { id: 'mapravaged', name: 'Blight-ravaged maps', art: 'Blight-ravaged Map' },
  { id: 'mapuniq', name: 'Unique maps', art: "Acton's Nightmare" }
]
export const MAP_IDS = new Set(MAP_CATEGORIES.map(x => x.id))

// Each kind's tint (Guy's B, 2026-11-28): the map look players know, black on
// white, with the kind on the border, beam and minimap icon. Map icons are
// always squares in the kind's tint (Guy: "always square with content
// tint"). Red stays Tink's.
export const MAP_LOOK: Record<string, { text: [number, number, number], color: string, shape: string }> = {
  mapend: { text: [255, 175, 70], color: 'Orange', shape: 'Square' },
  mapguard: { text: [200, 165, 255], color: 'Purple', shape: 'Square' },
  maporig: { text: [255, 225, 120], color: 'Yellow', shape: 'Square' },
  mapmods: { text: [110, 220, 235], color: 'Cyan', shape: 'Square' },
  mapcorr: { text: [255, 120, 165], color: 'Pink', shape: 'Square' },
  mapblight: { text: [150, 215, 95], color: 'Green', shape: 'Square' },
  mapravaged: { text: [220, 150, 70], color: 'Brown', shape: 'Square' },
  mapuniq: { text: [175, 96, 37], color: 'Brown', shape: 'Square' }
}
// A unique map is a rare drop: Always, its price lifts it above Small.
export const MAP_MODES: Record<string, 'always'> = { mapuniq: 'always' }

// NeverSink's blighted section, where the rules go.
export const BLIGHT_TYPE = 'maps->blighted'

// poe.ninja's line for a tier, and the filter's condition for its kind.
export const MAP_KINDS = [
  { cat: 'mapblight', ninja: 'BlightedMap', prefix: 'Blighted Map', cond: 'BlightedMap' },
  { cat: 'mapravaged', ninja: 'BlightRavagedMap', prefix: 'Blight-ravaged Map', cond: 'UberBlightedMap' }
] as const

// The special map folds (Guy 2026-11-28: "why is there no special maps
// sections"), on the same steps. Endgame and guardian/Citadel maps are priced
// by poe.ninja's Map page; Originator, content-mod and corrupted maps have no
// price anywhere, so they start from a guess (est.) near NeverSink's look and
// you set the step or price by hand. Originator guesses from the bulk
// exchange (Covens, 2026-11-28: T16 about 30c). Each goes above NeverSink's map rules,
// which still decide whatever these don't catch (lower-tier guardian maps,
// Valdo and unique maps).
export interface SpecialMap {
  cat: string
  name: string
  // The filter's BaseType for it, one or several.
  bts: string[]
  // poe.ninja lines to price it by (the cheapest wins); none: `guess`.
  ninja?: string[]
  // Priced by every unique map in the item data (the cheapest solid line).
  uniqueMaps?: true
  guess?: number
  conds: FilterCondition[]
}

const cnd = (key: string, op: string, values: string[], count: number | null = null): FilterCondition => ({ key, op, count, values } as FilterCondition)
const tiers = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `Map (Tier ${from + i})`)
const NOT_UNIQUE = cnd('Rarity', '', ['Normal', 'Magic', 'Rare'])
const IDENTIFIED = cnd('Identified', '', ['True'])
// A blighted map's own price rules sit lower (at NeverSink's blighted
// section), and anointing one counts as an enchantment: these rows skip them.
const NOT_BLIGHT = [cnd('BlightedMap', '', ['False']), cnd('UberBlightedMap', '', ['False'])]

export const SPECIAL_MAPS: SpecialMap[] = [
  { cat: 'mapend', name: 'Nightmare Map', bts: ['Nightmare Map'], ninja: ['Nightmare Map'], conds: [NOT_UNIQUE] },
  { cat: 'mapend', name: 'Vaal Temple Map', bts: ['Vaal Temple Map'], ninja: ['Vaal Temple Map'], conds: [NOT_UNIQUE] },
  { cat: 'mapend', name: 'Shaper Guardian Map', bts: ['Shaper Guardian Map'], ninja: ['Shaper Guardian Map'], conds: [NOT_UNIQUE] },
  { cat: 'mapguard', name: 'Elder guardian maps (Tier 16)', bts: ['Map (Tier 16)'], ninja: ['The Enslaver Map (Tier 16)', 'The Eradicator Map (Tier 16)', 'The Constrictor Map (Tier 16)', 'The Purifier Map (Tier 16)'], conds: [NOT_UNIQUE, cnd('HasInfluence', '', ['Elder'])] },
  { cat: 'mapguard', name: 'Citadel maps (Tier 16)', bts: ['Map (Tier 16)'], ninja: ['Al-Hezmin Map (Tier 16)', 'Baran Map (Tier 16)', 'Drox Map (Tier 16)', 'Veritania Map (Tier 16)'], conds: [NOT_UNIQUE, cnd('HasInfluence', '', ['Crusader', 'Hunter', 'Redeemer', 'Warlord'])] },
  { cat: 'maporig', name: 'Originator Map (Tier 16)', bts: ['Map (Tier 16)'], guess: 30, conds: [...NOT_BLIGHT, NOT_UNIQUE, cnd('ZanaMemory', '', ['True'])] },
  { cat: 'maporig', name: 'Originator Map (Tier 15)', bts: ['Map (Tier 15)'], guess: 6, conds: [...NOT_BLIGHT, NOT_UNIQUE, cnd('ZanaMemory', '', ['True'])] },
  { cat: 'maporig', name: 'Originator Map (Tier 14)', bts: ['Map (Tier 14)'], guess: 3, conds: [...NOT_BLIGHT, NOT_UNIQUE, cnd('ZanaMemory', '', ['True'])] },
  { cat: 'maporig', name: 'Originator maps (Tier 1-13)', bts: tiers(1, 13), guess: 1, conds: [...NOT_BLIGHT, NOT_UNIQUE, cnd('ZanaMemory', '', ['True'])] },
  { cat: 'mapmods', name: 'Mirage (of Zarokh)', bts: tiers(1, 16), guess: 10, conds: [...NOT_BLIGHT, IDENTIFIED, cnd('HasExplicitMod', '', ['of Zarokh'])] },
  { cat: 'mapmods', name: 'Wildwood (of the Woods)', bts: tiers(1, 16), guess: 10, conds: [...NOT_BLIGHT, IDENTIFIED, cnd('HasExplicitMod', '', ['of the Woods'])] },
  { cat: 'mapmods', name: 'Sentinel (of Unearthed Technology)', bts: tiers(1, 16), guess: 4, conds: [...NOT_BLIGHT, IDENTIFIED, cnd('HasExplicitMod', '', ['of Unearthed Technology'])] },
  { cat: 'mapmods', name: 'Delirium mirror (of Insanity)', bts: tiers(1, 16), guess: 4, conds: [...NOT_BLIGHT, IDENTIFIED, cnd('HasExplicitMod', '', ['of Insanity'])] },
  { cat: 'mapmods', name: "Beidat, Ghorr or K'Tash", bts: tiers(1, 16), guess: 4, conds: [...NOT_BLIGHT, IDENTIFIED, cnd('HasExplicitMod', '', ['of Beidat', 'of Ghorr', "of K'Tash"])] },
  { cat: 'mapcorr', name: '8 mods', bts: tiers(1, 16), guess: 4, conds: [...NOT_BLIGHT, IDENTIFIED, cnd('Corrupted', '', ['True']), cnd('HasExplicitMod', '>=', ['a', 'e', 'i', 'o', 'u', 'y'], 7)] },
  { cat: 'mapcorr', name: 'Corrupted implicit', bts: tiers(1, 16), guess: 1, conds: [...NOT_BLIGHT, NOT_UNIQUE, cnd('CorruptedMods', '>=', ['1'])] },
  { cat: 'mapcorr', name: 'Enchanted', bts: tiers(1, 16), guess: 1, conds: [...NOT_BLIGHT, NOT_UNIQUE, cnd('AnyEnchantment', '', ['True'])] },
  { cat: 'mapuniq', name: 'Unique map', bts: [], uniqueMaps: true, guess: 5, conds: [cnd('Rarity', '', ['Unique'])] }
]
export const SPECIAL_MAP_CATS = new Set(SPECIAL_MAPS.map(m => m.cat))
