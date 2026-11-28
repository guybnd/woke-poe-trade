// Special maps on the Loot tab (Guy's M1, 2026-11-28): blighted and
// blight-ravaged maps priced by tier from poe.ninja ("Blighted Map (Tier 14)"),
// on the same steps. A filter names them "Map (Tier 14)" plus BlightedMap or
// UberBlightedMap, so a step's rule lists its tiers and the rule count stays
// small. The rules go where NeverSink's blighted maps start, under its unique,
// Valdo and Originator maps. Unique maps stay NeverSink's: poe.ninja gives
// them no tier, and a filter can tell them apart only by tier.
import type { LootCategory } from './fragment-classes'

export const MAP_CATEGORIES: LootCategory[] = [
  { id: 'mapblight', name: 'Blighted maps', art: 'Blighted Map' },
  { id: 'mapravaged', name: 'Blight-ravaged maps', art: 'Blight-ravaged Map' }
]
export const MAP_IDS = new Set(MAP_CATEGORIES.map(x => x.id))

export const MAP_LOOK: Record<string, { text: [number, number, number], color: string, shape: string }> = {
  mapblight: { text: [150, 200, 110], color: 'Green', shape: 'Hexagon' },
  mapravaged: { text: [210, 170, 90], color: 'Orange', shape: 'Hexagon' }
}

// NeverSink's blighted section, where the rules go.
export const BLIGHT_TYPE = 'maps->blighted'

// poe.ninja's line for a tier, and the filter's condition for its kind.
export const MAP_KINDS = [
  { cat: 'mapblight', ninja: 'BlightedMap', prefix: 'Blighted Map', cond: 'BlightedMap' },
  { cat: 'mapravaged', ninja: 'BlightRavagedMap', prefix: 'Blight-ravaged Map', cond: 'UberBlightedMap' }
] as const
