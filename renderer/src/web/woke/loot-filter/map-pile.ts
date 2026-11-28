// The Maps page's sample pile (Guy 2026-11-28): every kind of map a player
// meets in red maps, not only the priced ones. Normal maps of every tier
// (mostly high), Originator maps, blighted and blight-ravaged, Nightmare,
// Vaal Temple, guardian and citadel maps, Valdo maps, and maps with the
// rare-only content mods, corrupted implicits or 8 mods. Each is an ItemFacts
// the matcher runs through the filter as it is now.
import type { FilterRarity, ItemFacts } from './item-facts'

export interface MapDrop {
  id: number
  key: string
  // The ground label, as the game writes it for an unidentified map.
  label: string
  // A short tag above the label when the label alone can't tell its kind.
  kind: string | null
  // The tooltip's item name.
  tip: string
  facts: ItemFacts
  // The priced item it is on the Maps page, if any ("Blighted Map (Tier 14)").
  priced?: string
}

// The tier a dropped map has, in T16 maps: mostly 14-16, a few lower.
const TIER_WEIGHTS: Array<[number, number]> = [
  [16, 9], [15, 4], [14, 4], [13, 2], [12, 1.5], [11, 1.2], [10, 1], [9, 0.8],
  [8, 0.7], [7, 0.6], [6, 0.5], [5, 0.4], [4, 0.35], [3, 0.3], [2, 0.25], [1, 0.25]
]

type Kind = { id: string, w: number, make: (tier: number, r: () => number) => Omit<MapDrop, 'id'> }

const AREA = 83

function facts (base: string, tier: number, more: Partial<ItemFacts> = {}): ItemFacts {
  return {
    name: base,
    itemClass: 'Maps',
    baseType: base,
    rarity: 'Normal',
    itemLevel: Math.min(86, 67 + tier),
    mapTier: tier,
    identified: false,
    corrupted: false,
    influences: [],
    explicitModNames: [],
    areaLevel: AREA,
    ...more
  }
}

const RARITIES: FilterRarity[] = ['Normal', 'Magic', 'Magic', 'Rare', 'Rare', 'Rare']
const anyRarity = (r: () => number): FilterRarity => RARITIES[Math.floor(r() * RARITIES.length)]
const plain = (t: number) => `Map (Tier ${t})`

// Rare-only content mods NeverSink looks for (its exoticmod rules).
const CONTENT_MODS: Array<{ mod: string, tag: string }> = [
  { mod: 'of Zarokh', tag: 'Mirage' },
  { mod: 'of the Woods', tag: 'Wildwood' },
  { mod: 'of Unearthed Technology', tag: 'Sentinel' },
  { mod: 'of Insanity', tag: 'Delirium mirror' },
  { mod: 'of Beidat', tag: 'Beidat' },
  { mod: "of K'Tash", tag: "K'Tash" },
  { mod: 'of Ghorr', tag: 'Ghorr' }
]
const EIGHT = ['Magnifying', 'Fecund', 'Chaining', 'Savage', 'of Balance', 'of Exposure', 'of Stasis', 'of Toughness']
const CONQUERORS = ['Crusader', 'Hunter', 'Redeemer', 'Warlord']

const KINDS: Kind[] = [
  { id: 'normal', w: 40, make: (t, r) => ({ key: `normal-${t}`, label: plain(t), kind: null, tip: plain(t), facts: facts(plain(t), t, { rarity: anyRarity(r), corrupted: r() < 0.1 }) }) },
  { id: 'originator', w: 12, make: (t, r) => { t = Math.max(t, 14); return { key: `orig-${t}`, label: plain(t), kind: 'Originator', tip: plain(t), facts: facts(plain(t), t, { rarity: anyRarity(r), zanaMemory: true, hasImplicitMod: true }) } } },
  { id: 'blighted', w: 6, make: t => ({ key: `blight-${t}`, label: `Blighted Map (Tier ${t})`, kind: null, tip: `Blighted Map (Tier ${t})`, facts: facts(plain(t), t, { blightedMap: true }), priced: `Blighted Map (Tier ${t})` }) },
  { id: 'ravaged', w: 2, make: t => { t = Math.max(t, 14); return { key: `ravaged-${t}`, label: `Blight-ravaged Map (Tier ${t})`, kind: null, tip: `Blight-ravaged Map (Tier ${t})`, facts: facts(plain(t), t, { uberBlightedMap: true, rarity: 'Rare' }), priced: `Blight-ravaged Map (Tier ${t})` } } },
  { id: 'content', w: 5, make: (_t, r) => { const c = CONTENT_MODS[Math.floor(r() * CONTENT_MODS.length)]; return { key: `mod-${c.tag}`, label: plain(16), kind: c.tag, tip: plain(16), facts: facts(plain(16), 16, { rarity: 'Rare', identified: true, explicitModNames: ['Fecund', 'Chaining', c.mod] }) } } },
  { id: 'eight', w: 2, make: () => ({ key: 'eight', label: plain(16), kind: '8 mods', tip: plain(16), facts: facts(plain(16), 16, { rarity: 'Rare', identified: true, corrupted: true, explicitModNames: EIGHT }) }) },
  { id: 'corrimpl', w: 3, make: (t, r) => ({ key: `corr-${t}`, label: plain(t), kind: 'Corrupted implicit', tip: plain(t), facts: facts(plain(t), t, { rarity: anyRarity(r), corrupted: true, corruptedMods: 1, hasImplicitMod: true }) }) },
  { id: 'elder', w: 2, make: () => ({ key: 'elder', label: plain(16), kind: 'Elder guardian', tip: plain(16), facts: facts(plain(16), 16, { rarity: 'Rare', influences: ['Elder'], hasImplicitMod: true }) }) },
  { id: 'citadel', w: 2, make: (_t, r) => { const c = CONQUERORS[Math.floor(r() * CONQUERORS.length)]; return { key: `citadel-${c}`, label: plain(16), kind: 'Citadel', tip: plain(16), facts: facts(plain(16), 16, { rarity: 'Rare', influences: [c], hasImplicitMod: true }) } } },
  { id: 'nightmare', w: 1.5, make: () => ({ key: 'nightmare', label: 'Nightmare Map', kind: null, tip: 'Nightmare Map', facts: facts('Nightmare Map', 17) }) },
  { id: 'temple', w: 1.2, make: () => ({ key: 'temple', label: 'Vaal Temple Map', kind: null, tip: 'Vaal Temple Map', facts: facts('Vaal Temple Map', 16) }) },
  { id: 'guardian', w: 1, make: () => ({ key: 'guardian', label: 'Shaper Guardian Map', kind: null, tip: 'Shaper Guardian Map', facts: facts('Shaper Guardian Map', 16) }) },
  { id: 'valdo', w: 1, make: () => ({ key: 'valdo', label: 'Valdo Map', kind: null, tip: 'Valdo Map', facts: facts('Valdo Map', 16, { rarity: 'Unique' }) }) }
]
// Kinds that are always in a pile, so the page shows each look at once.
const ALWAYS = ['originator', 'blighted', 'content', 'nightmare', 'temple', 'corrimpl']

function rng (s: number) {
  let x = (s * 16807 + 12345) % 2147483647
  return () => { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646 }
}

function pick<T> (list: T[], w: (x: T) => number, r: () => number): T {
  const total = list.reduce((a, x) => a + w(x), 0)
  let x = r() * total
  for (const it of list) { x -= w(it); if (x <= 0) return it }
  return list[list.length - 1]
}

export function mapPile (seed: number, count = 26): MapDrop[] {
  const r = rng(seed)
  const tier = () => pick(TIER_WEIGHTS, t => t[1], r)[0]
  const kinds = [...ALWAYS.map(id => KINDS.find(k => k.id === id)!)]
  while (kinds.length < count) kinds.push(pick(KINDS, k => k.w, r))
  // Shuffle, so the always-kinds don't sit in one corner.
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]]
  }
  return kinds.map((k, id) => ({ id, ...k.make(tier(), r) }))
}
