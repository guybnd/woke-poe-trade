// poe.ninja category slugs (as used by APT's dense overview) mapped to the
// overview "type" names, which are also the Type column of poe.ninja's
// per-league data dumps.
export const CATEGORY_TYPES: Record<string, string> = {
  'currency': 'Currency',
  'fragments': 'Fragment',
  'delirium-orbs': 'DeliriumOrb',
  'scarabs': 'Scarab',
  'artifacts': 'Artifact',
  'base-types': 'BaseType',
  'fossils': 'Fossil',
  'resonators': 'Resonator',
  'incubators': 'Incubator',
  'oils': 'Oil',
  'vials': 'Vial',
  'invitations': 'Invitation',
  'blighted-maps': 'BlightedMap',
  'blight-ravaged-maps': 'BlightRavagedMap',
  'essences': 'Essence',
  'maps': 'Map',
  'tattoos': 'Tattoo',
  'omens': 'Omen',
  'coffins': 'Coffin',
  'allflame-embers': 'AllflameEmber',
  'djinn-coins': 'DjinnCoin',
  'astrolabes': 'Astrolabe',
  'runegrafts': 'Runegraft',
  'ducats': 'Ducat',
  'enshrouding-crystals': 'EnshroudingCrystal',
  'corpses': 'Corpse',
  'divination-cards': 'DivinationCard',
  'beasts': 'Beast',
  'unique-jewels': 'UniqueJewel',
  'unique-flasks': 'UniqueFlask',
  'unique-weapons': 'UniqueWeapon',
  'unique-armours': 'UniqueArmour',
  'unique-accessories': 'UniqueAccessory',
  'unique-maps': 'UniqueMap',
  'unique-relics': 'UniqueRelic',
  'unique-tinctures': 'UniqueTincture',
  'skill-gems': 'SkillGem'
}

// woke: a category poe.ninja adds for a new league, such as its currency, is
// still read. Its page slug follows poe.ninja's pattern ('AllflameEmber' ->
// 'allflame-embers'), and lookups by slug learn it when prices load.
const SLUG_OF_TYPE = new Map(Object.entries(CATEGORY_TYPES).map(([slug, type]) => [type, slug]))
const LEARNED_TYPES = new Map<string, string>()

export function slugForType (type: string): string {
  const known = SLUG_OF_TYPE.get(type)
  if (known) return known
  const words = type.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
  const slug = words.endsWith('s') ? words : words.endsWith('y') ? `${words.slice(0, -1)}ies` : `${words}s`
  LEARNED_TYPES.set(slug, type)
  return slug
}

export function isListedType (type: string): boolean {
  return SLUG_OF_TYPE.has(type)
}

export function typeForSlug (slug: string): string | undefined {
  return CATEGORY_TYPES[slug] ?? LEARNED_TYPES.get(slug)
}

// The namespace APT's item data files a type's items under.
export function namespaceForType (type: string): string {
  if (type === 'DivinationCard') return 'DIVINATION_CARD'
  if (type === 'Beast') return 'CAPTURED_BEAST'
  if (type === 'SkillGem') return 'GEM'
  if (type.startsWith('Unique')) return 'UNIQUE'
  return 'ITEM'
}

// Base types are tens of thousands of rows (item level x influence) and not
// useful for flipping, so they are not stored.
export const SKIPPED_TYPES = new Set(['BaseType'])

export interface PriceItem {
  type: string
  name: string
  // '' when the item has no variant (gem level/quality, links, etc.)
  variant: string
  chaos: number
  // Price a day and a week ago, from poe.ninja's trend. Only on snapshots.
  d1?: number
  d7?: number
  // Days out of poe.ninja's last 7 with no price (null or missing graph
  // points). The dense feed has no listing counts, so this is the best
  // available sign of a thin, easily price-fixed market. Missing on
  // snapshots saved before it was recorded.
  gaps?: number
}

// Thin market: poe.ninja had no price on 3+ of the last 7 days.
export const THIN_GAPS = 3

export function isThin (item: { gaps?: number }): boolean {
  return (item.gaps ?? 0) >= THIN_GAPS
}

export function thinTitle (item: { gaps?: number }): string {
  return `Thin market: poe.ninja recorded no price on ${item.gaps ?? 0} of the last 7 days, so this price is easy to fake.`
}

// poe.ninja only prices corrupted items for gems: a variant like "21/20c".
export function isCorrupted (item: { type: string, variant: string }): boolean {
  return item.type === 'SkillGem' && /c$/.test(item.variant)
}

export type CorruptedFilter = 'any' | 'only' | 'hide'

// One collected snapshot (kept for a couple of days for short-term movers).
export interface Snapshot {
  league: string
  ts: number
  divine: number | null
  items: PriceItem[]
}

// One row per item per UTC day; the latest snapshot of the day wins.
// Field names mirror poe.ninja's league dumps so the two can be joined.
export interface DailyRow {
  league: string
  date: string // YYYY-MM-DD, UTC
  type: string
  name: string
  variant: string
  chaos: number
  gaps?: number
  // Divine Orb price in chaos on that day, for converting.
  divine: number | null
  ts: number
}

export function itemKey (item: { type: string, name: string, variant: string }): string {
  return `${item.type}\u0000${item.name}\u0000${item.variant}`
}

// Snapshots saved before poe.ninja's doubled Currency and Fragment lists were
// dropped hold those rows twice. Repeated keys make Vue leave old rows on screen.
export function uniqueItems<T extends { type: string, name: string, variant: string }> (items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = itemKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function utcDate (ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}
