// Uniques on the Loot tab (Guy's picks, 2026-11-27: Uniques A, bossmix M1).
// A filter can't tell uniques apart on one base, so a base is priced by the
// most valuable unique that drops on it naturally (poe.ninja, boss-only
// uniques left out). The bases come from NeverSink's plain unique tiers;
// its special rules (6-link, corrupted implicits, abyss sockets, Foulborn,
// replicas) keep deciding those items, above the priced ones.
import type { LootCategory } from './fragment-classes'
import type { SectionMode } from './currency-settings'

export const UNIQUE_CATEGORIES: LootCategory[] = [
  { id: 'uniqplain', name: 'Uniques', art: 'Leather Belt' },
  { id: 'uniqvar', name: 'High variance', art: 'Small Cluster Jewel' },
  { id: 'uniqearly', name: 'Early league', art: 'Bone Helmet' },
  { id: 'uniqboss', name: 'Boss drops', art: 'Hubris Circlet' }
]
export const UNIQUE_IDS = new Set(UNIQUE_CATEGORIES.map(x => x.id))

// The unique brown, a shade per fold.
export const UNIQUE_LOOK: Record<string, { text: [number, number, number], color: string, shape: string }> = {
  uniqplain: { text: [175, 96, 37], color: 'Brown', shape: 'Star' },
  uniqvar: { text: [210, 130, 60], color: 'Orange', shape: 'Star' },
  uniqearly: { text: [200, 150, 90], color: 'Yellow', shape: 'Star' },
  // Not red: red beams and map icons are kept for Tink (Guy 2026-11-27).
  uniqboss: { text: [190, 80, 40], color: 'Orange', shape: 'Pentagon' }
}

// Boss-only bases show whatever they are (Guy: "boss-only likely always on").
export const UNIQUE_MODES: Record<string, SectionMode> = { uniqboss: 'always' }

// NeverSink's tiers that list bases by price. Every other unique tier is a
// special rule and stays NeverSink's.
const TIER_CAT: Record<string, string> = {
  t1: 'uniqplain',
  t2: 'uniqplain',
  t3: 'uniqplain',
  hideable: 'uniqplain',
  hideable2: 'uniqplain',
  restex: 'uniqplain',
  multispecialhigh: 'uniqvar',
  multispecial: 'uniqvar',
  earlyleague: 'uniqearly',
  t3boss: 'uniqboss'
}
export const uniqueCategoryOf = (tier: string | null): string | null => tier ? TIER_CAT[tier] ?? null : null

// A guess where poe.ninja has no usable price. Early league bases start
// high and give way to the real price once there's a market (Guy).
const GUESS: Record<string, number> = { t1: 300, t2: 50, multispecialhigh: 30, multispecial: 10, earlyleague: 20, t3boss: 5, t3: 2, hideable2: 0.5, hideable: 0.2, restex: 0.1 }
export const uniqueGuess = (tier: string | null): number => (tier && GUESS[tier]) || 1

// Stands in for a Class list: the rules match `Rarity Unique`.
export const UNIQUE_CLS = 'Rarity Unique'
