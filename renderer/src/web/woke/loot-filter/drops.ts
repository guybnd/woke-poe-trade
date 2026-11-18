// A pretend pile of loot for the preview: what a pack or two of monsters
// drops at an area level, from a small hand-made table of common and notable
// drops. Seeded, so a reroll is a new pile and two filters can be compared on
// the same pile.
import type { FilterRarity, ItemFacts } from './item-facts'
import { BASE_FACTS } from './base-facts'

interface DropEntry {
  name: string
  cls: string
  w: number
  h: number
  // Base drop level (gear), or the lowest area it drops in.
  drop: number
  // Relative chance.
  weight: number
  // Highest area level it still drops in (campaign-only bases).
  max?: number
  stack?: [number, number]
  rarity?: FilterRarity
  // Gear rolls normal/magic/rare; uniques use rarity: 'Unique'.
  gear?: boolean
  map?: boolean
  gem?: boolean
  // 3.30: the only drop tier (UnidentifiedItemTier) a magic or rare copy of
  // this base drops at, when it's gated to one.
  tier?: number
}

const C = 'Stackable Currency'
const DIV = 'Divination Cards'
const FRAG = 'Map Fragments'

// The ten mechanic Threads of 3.30, by name as the game data has them.
export const THREADS = ['Abyss', 'Bestiary', 'Betrayal', 'Blight', 'Breach', 'Expedition', 'Incursion', 'Legion', 'Ritual', 'Ultimatum'].map(m => `${m} Thread`)

const TABLE: DropEntry[] = [
  // Currency, roughly by how often it drops.
  { name: 'Portal Scroll', cls: C, w: 1, h: 1, drop: 1, weight: 60, stack: [1, 3] },
  { name: 'Scroll of Wisdom', cls: C, w: 1, h: 1, drop: 1, weight: 80, stack: [1, 4] },
  { name: 'Orb of Transmutation', cls: C, w: 1, h: 1, drop: 1, weight: 25 },
  { name: 'Transmutation Shard', cls: C, w: 1, h: 1, drop: 1, weight: 20, stack: [1, 6] },
  { name: 'Orb of Augmentation', cls: C, w: 1, h: 1, drop: 1, weight: 20 },
  { name: 'Armourer\'s Scrap', cls: C, w: 1, h: 1, drop: 1, weight: 30, stack: [1, 3] },
  { name: 'Blacksmith\'s Whetstone', cls: C, w: 1, h: 1, drop: 1, weight: 20 },
  { name: 'Orb of Alteration', cls: C, w: 1, h: 1, drop: 1, weight: 18 },
  { name: 'Chromatic Orb', cls: C, w: 1, h: 1, drop: 1, weight: 14 },
  { name: 'Jeweller\'s Orb', cls: C, w: 1, h: 1, drop: 1, weight: 10 },
  { name: 'Orb of Chance', cls: C, w: 1, h: 1, drop: 1, weight: 8 },
  { name: 'Glassblower\'s Bauble', cls: C, w: 1, h: 1, drop: 1, weight: 6 },
  { name: 'Orb of Fusing', cls: C, w: 1, h: 1, drop: 10, weight: 6 },
  { name: 'Orb of Alchemy', cls: C, w: 1, h: 1, drop: 10, weight: 6 },
  { name: 'Orb of Scouring', cls: C, w: 1, h: 1, drop: 10, weight: 5 },
  { name: 'Blessed Orb', cls: C, w: 1, h: 1, drop: 30, weight: 3 },
  { name: 'Chaos Orb', cls: C, w: 1, h: 1, drop: 12, weight: 4 },
  { name: 'Regal Orb', cls: C, w: 1, h: 1, drop: 30, weight: 2.5 },
  { name: 'Vaal Orb', cls: C, w: 1, h: 1, drop: 30, weight: 3 },
  { name: 'Gemcutter\'s Prism', cls: C, w: 1, h: 1, drop: 10, weight: 2 },
  { name: 'Orb of Regret', cls: C, w: 1, h: 1, drop: 30, weight: 1.5 },
  { name: 'Orb of Unmaking', cls: C, w: 1, h: 1, drop: 30, weight: 1.2 },
  { name: 'Enkindling Orb', cls: C, w: 1, h: 1, drop: 68, weight: 1.2 },
  { name: 'Instilling Orb', cls: C, w: 1, h: 1, drop: 68, weight: 1.2 },
  { name: 'Ancient Orb', cls: C, w: 1, h: 1, drop: 60, weight: 0.6 },
  { name: 'Orb of Annulment', cls: C, w: 1, h: 1, drop: 60, weight: 0.3 },
  { name: 'Exalted Orb', cls: C, w: 1, h: 1, drop: 35, weight: 0.3 },
  { name: 'Divine Orb', cls: C, w: 1, h: 1, drop: 35, weight: 0.25 },
  // A currency item, not a card: filters list it under Stackable Currency.
  { name: 'Stacked Deck', cls: C, w: 1, h: 1, drop: 30, weight: 1 },
  { name: 'Screaming Essence of Greed', cls: C, w: 1, h: 1, drop: 30, weight: 1.5, max: 75 },
  { name: 'Shrieking Essence of Wrath', cls: C, w: 1, h: 1, drop: 60, weight: 1.2 },
  { name: 'Deafening Essence of Hatred', cls: C, w: 1, h: 1, drop: 75, weight: 0.4 },
  { name: 'Clear Oil', cls: C, w: 1, h: 1, drop: 60, weight: 1.5 },
  { name: 'Golden Oil', cls: C, w: 1, h: 1, drop: 68, weight: 0.1 },
  // Divination cards, cheap to dear.
  { name: 'Rain of Chaos', cls: DIV, w: 1, h: 1, drop: 1, weight: 2 },
  { name: 'Her Mask', cls: DIV, w: 1, h: 1, drop: 30, weight: 1.5 },
  { name: 'The Gambler', cls: DIV, w: 1, h: 1, drop: 1, weight: 1.5 },
  { name: 'Emperor\'s Luck', cls: DIV, w: 1, h: 1, drop: 10, weight: 1.2 },
  { name: 'Humility', cls: DIV, w: 1, h: 1, drop: 10, weight: 0.6 },
  { name: 'The Hoarder', cls: DIV, w: 1, h: 1, drop: 40, weight: 0.4 },
  { name: 'The Apothecary', cls: DIV, w: 1, h: 1, drop: 68, weight: 0.03 },
  { name: 'The Doctor', cls: DIV, w: 1, h: 1, drop: 75, weight: 0.03 },
  // 3.30 Threads took the scarabs' place (one per mechanic). NeverSink 8.21
  // lists them as "Map Fragments" "Misc Map Items"; Frayed Thread sits with
  // the currency.
  ...THREADS.map((name): DropEntry => ({ name, cls: FRAG, w: 1, h: 1, drop: 68, weight: 0.4 })),
  { name: 'Frayed Thread', cls: C, w: 1, h: 1, drop: 68, weight: 0.6 },
  // Atziri's, in level 81+ Temples. Sacrifice and Mortal fragments are gone.
  { name: 'Royal Visage', cls: C, w: 1, h: 1, drop: 81, weight: 0.02 },
  { name: 'Simulacrum Splinter', cls: C, w: 1, h: 1, drop: 68, weight: 0.8, stack: [1, 3] },
  { name: 'Timeless Karui Splinter', cls: C, w: 1, h: 1, drop: 68, weight: 0.6 },
  // Maps (tier from the area level).
  { name: 'Map', cls: 'Maps', w: 1, h: 1, drop: 68, weight: 6, map: true },
  // Gems.
  { name: 'Fireball', cls: 'Skill Gems', w: 1, h: 1, drop: 1, weight: 3, gem: true },
  { name: 'Leap Slam', cls: 'Skill Gems', w: 1, h: 1, drop: 10, weight: 2, gem: true },
  { name: 'Added Fire Damage Support', cls: 'Support Gems', w: 1, h: 1, drop: 8, weight: 2, gem: true },
  { name: 'Empower Support', cls: 'Support Gems', w: 1, h: 1, drop: 68, weight: 0.08, gem: true },
  // Flasks.
  { name: 'Small Life Flask', cls: 'Life Flasks', w: 1, h: 2, drop: 1, weight: 4, max: 30, gear: true },
  { name: 'Divine Life Flask', cls: 'Life Flasks', w: 1, h: 2, drop: 60, weight: 3, gear: true },
  { name: 'Eternal Mana Flask', cls: 'Mana Flasks', w: 1, h: 2, drop: 65, weight: 2, gear: true },
  { name: 'Quicksilver Flask', cls: 'Utility Flasks', w: 1, h: 2, drop: 4, weight: 2, gear: true },
  { name: 'Granite Flask', cls: 'Utility Flasks', w: 1, h: 2, drop: 27, weight: 1.5, gear: true },
  // Gear: low bases in the campaign, end-game bases in maps.
  { name: 'Simple Robe', cls: 'Body Armours', w: 2, h: 3, drop: 1, weight: 3, max: 45, gear: true },
  { name: 'Plate Vest', cls: 'Body Armours', w: 2, h: 3, drop: 1, weight: 3, max: 45, gear: true },
  { name: 'Iron Hat', cls: 'Helmets', w: 2, h: 2, drop: 1, weight: 3, max: 45, gear: true },
  { name: 'Rusted Sword', cls: 'One Hand Swords', w: 1, h: 3, drop: 1, weight: 3, max: 45, gear: true },
  { name: 'Crude Bow', cls: 'Bows', w: 2, h: 3, drop: 1, weight: 2, max: 45, gear: true },
  { name: 'Driftwood Wand', cls: 'Wands', w: 1, h: 3, drop: 1, weight: 2, max: 45, gear: true },
  { name: 'Iron Ring', cls: 'Rings', w: 1, h: 1, drop: 1, weight: 2, gear: true },
  { name: 'Coral Amulet', cls: 'Amulets', w: 1, h: 1, drop: 1, weight: 2, gear: true },
  { name: 'Leather Belt', cls: 'Belts', w: 2, h: 1, drop: 8, weight: 2, gear: true },
  { name: 'Holy Chainmail', cls: 'Body Armours', w: 2, h: 3, drop: 35, weight: 2, max: 72, gear: true },
  { name: 'Vaal Regalia', cls: 'Body Armours', w: 2, h: 3, drop: 68, weight: 2, gear: true },
  { name: 'Astral Plate', cls: 'Body Armours', w: 2, h: 3, drop: 62, weight: 2, gear: true },
  { name: 'Glorious Plate', cls: 'Body Armours', w: 2, h: 3, drop: 68, weight: 2, gear: true },
  { name: 'Hubris Circlet', cls: 'Helmets', w: 2, h: 2, drop: 69, weight: 2, gear: true },
  { name: 'Eternal Burgonet', cls: 'Helmets', w: 2, h: 2, drop: 69, weight: 2, gear: true },
  { name: 'Sorcerer Boots', cls: 'Boots', w: 2, h: 2, drop: 67, weight: 2, gear: true },
  { name: 'Two-Toned Boots', cls: 'Boots', w: 2, h: 2, drop: 70, weight: 1.5, gear: true },
  { name: 'Sorcerer Gloves', cls: 'Gloves', w: 2, h: 2, drop: 70, weight: 2, gear: true },
  { name: 'Fingerless Silk Gloves', cls: 'Gloves', w: 2, h: 2, drop: 70, weight: 1, gear: true },
  // 3.30 core-pool bases, gated by drop tier rather than area level.
  // Stygian Vise only drops at tier 5.
  { name: 'Stygian Vise', cls: 'Belts', w: 2, h: 1, drop: 68, weight: 0.5, gear: true, tier: 5 },
  { name: 'Cord Belt', cls: 'Belts', w: 2, h: 1, drop: 68, weight: 0.3, gear: true },
  { name: 'Astrolabe Amulet', cls: 'Amulets', w: 1, h: 1, drop: 75, weight: 0.3, gear: true },
  { name: 'Focused Amulet', cls: 'Amulets', w: 1, h: 1, drop: 80, weight: 0.2, gear: true },
  { name: 'Simplex Amulet', cls: 'Amulets', w: 1, h: 1, drop: 80, weight: 0.1, gear: true },
  { name: 'Cogwork Ring', cls: 'Rings', w: 1, h: 1, drop: 68, weight: 0.3, gear: true },
  { name: 'Composite Ring', cls: 'Rings', w: 1, h: 1, drop: 68, weight: 0.3, gear: true },
  { name: 'Geodesic Ring', cls: 'Rings', w: 1, h: 1, drop: 68, weight: 0.3, gear: true },
  { name: 'Ratcheting Ring', cls: 'Rings', w: 1, h: 1, drop: 68, weight: 0.3, gear: true },
  { name: 'Helical Ring', cls: 'Rings', w: 1, h: 1, drop: 75, weight: 0.3, gear: true },
  { name: 'Manifold Ring', cls: 'Rings', w: 1, h: 1, drop: 75, weight: 0.3, gear: true },
  { name: 'Crystal Belt', cls: 'Belts', w: 2, h: 1, drop: 79, weight: 1, gear: true },
  { name: 'Two-Stone Ring', cls: 'Rings', w: 1, h: 1, drop: 20, weight: 2, gear: true },
  { name: 'Vermillion Ring', cls: 'Rings', w: 1, h: 1, drop: 80, weight: 1, gear: true },
  { name: 'Onyx Amulet', cls: 'Amulets', w: 1, h: 1, drop: 20, weight: 1.5, gear: true },
  { name: 'Marble Amulet', cls: 'Amulets', w: 1, h: 1, drop: 74, weight: 1, gear: true },
  { name: 'Spine Bow', cls: 'Bows', w: 2, h: 4, drop: 64, weight: 1.5, gear: true },
  { name: 'Imbued Wand', cls: 'Wands', w: 1, h: 3, drop: 59, weight: 1.5, gear: true },
  { name: 'Jewelled Foil', cls: 'Thrusting One Hand Swords', w: 1, h: 4, drop: 68, weight: 1.5, gear: true },
  { name: 'Titanium Spirit Shield', cls: 'Shields', w: 2, h: 2, drop: 68, weight: 1.5, gear: true },
  { name: 'Siege Axe', cls: 'One Hand Axes', w: 2, h: 3, drop: 59, weight: 1.5, gear: true },
  { name: 'Cobalt Jewel', cls: 'Jewels', w: 1, h: 1, drop: 1, weight: 0.8, gear: true },
  { name: 'Crimson Jewel', cls: 'Jewels', w: 1, h: 1, drop: 1, weight: 0.8, gear: true },
  // Uniques (unidentified, so they show their base).
  { name: 'Leather Belt', cls: 'Belts', w: 2, h: 1, drop: 8, weight: 0.4, rarity: 'Unique' },
  { name: 'Simple Robe', cls: 'Body Armours', w: 2, h: 3, drop: 1, weight: 0.3, rarity: 'Unique' },
  { name: 'Iron Ring', cls: 'Rings', w: 1, h: 1, drop: 1, weight: 0.5, rarity: 'Unique' },
  { name: 'Sorcerer Boots', cls: 'Boots', w: 2, h: 2, drop: 67, weight: 0.3, rarity: 'Unique' },
  { name: 'Hubris Circlet', cls: 'Helmets', w: 2, h: 2, drop: 69, weight: 0.3, rarity: 'Unique' },
  { name: 'Plate Vest', cls: 'Body Armours', w: 2, h: 3, drop: 1, weight: 0.5, rarity: 'Unique' }
]

// The game's own DropLevel of a base, when it has one.
function baseDropLevel (e: DropEntry): number | undefined {
  return e.gear || e.rarity === 'Unique' ? BASE_FACTS[e.name]?.[0] : undefined
}

// The lowest area a row drops in: never below its base's DropLevel, which the
// game never drops under.
function firstArea (e: DropEntry): number {
  return Math.max(e.drop, baseDropLevel(e) ?? 0)
}

// Each row's area window and its DropLevel, for the tests.
export function dropWindows (): Array<{ name: string, from: number, to: number | undefined, dropLevel: number }> {
  return TABLE.filter(e => !e.map).map(e => ({ name: e.name, from: firstArea(e), to: e.max, dropLevel: baseDropLevel(e) ?? e.drop }))
}

// Every item the table can drop, with the game data namespace it's in.
export function tableNames (): Array<{ name: string, ns: 'ITEM' | 'GEM' | 'DIVINATION_CARD' }> {
  return TABLE.filter(e => !e.map).map(e => ({ name: e.name, ns: e.gem ? 'GEM' : e.cls === DIV ? 'DIVINATION_CARD' : 'ITEM' }))
}

const MAP_NAMES = ['Strand Map', 'Dunes Map', 'Cemetery Map', 'Toxic Sewer Map', 'Crimson Township Map', 'Burial Chambers Map', 'Defiled Cathedral Map', 'Mesa Map', 'Jungle Valley Map', 'Tower Map']

export interface Drop {
  id: number
  label: string
  facts: ItemFacts
}

// Small, fast, seeded.
function rng (seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function sockets (r: () => number, e: DropEntry): string[] | undefined {
  if (!e.gear || ['Rings', 'Amulets', 'Belts', 'Jewels', 'Life Flasks', 'Mana Flasks', 'Utility Flasks'].includes(e.cls)) return undefined
  const max = e.w * e.h >= 6 ? 6 : e.w * e.h >= 4 ? 4 : 3
  // Now and then a 6-socket body armour or a fully linked smaller item.
  const n = max === 6 && r() < 0.06 ? 6 : 1 + Math.floor(r() * Math.min(max, 4))
  const colours = Array.from({ length: n }, () => 'RGB'[Math.floor(r() * 3)]).join('')
  const linked = r() < 0.3 ? n : Math.max(1, Math.floor(r() * n))
  const groups = [colours.slice(0, linked)]
  for (let i = linked; i < n; i++) groups.push(colours[i])
  return groups
}

// `count` drops for an area level, the same pile for the same seed.
export function rollDrops (areaLevel: number, seed: number, count = 60): Drop[] {
  const r = rng(seed * 7919 + areaLevel)
  const pool = TABLE.filter(e => areaLevel >= firstArea(e) && (e.max == null || areaLevel <= e.max))
  const total = pool.reduce((s, e) => s + e.weight, 0)
  const out: Drop[] = []
  for (let i = 0; i < count; i++) {
    let pick = r() * total
    let e = pool[pool.length - 1]
    for (const x of pool) {
      pick -= x.weight
      if (pick <= 0) { e = x; break }
    }
    out.push(makeDrop(i, e, areaLevel, r))
  }
  return out
}

// Every kind of drop in the table once per rarity it can have, for checking
// what a rule catches (not weighted: a rare ring counts as much as a scroll).
export function everyDrop (areaLevel: number): Drop[] {
  const out: Drop[] = []
  const r = rng(areaLevel)
  for (const e of TABLE) {
    if (e.map) {
      for (const name of MAP_NAMES.slice(0, 3)) {
        for (const rarity of ['Normal', 'Magic', 'Rare'] as const) {
          const d = makeDrop(out.length, e, areaLevel, r)
          d.facts = { ...d.facts, name, baseType: name, rarity }
          d.label = name
          out.push(d)
        }
      }
      continue
    }
    const rarities: FilterRarity[] = e.gear ? ['Normal', 'Magic', 'Rare'] : [e.rarity ?? 'Normal']
    for (const rarity of rarities) {
      const d = makeDrop(out.length, e, areaLevel, r)
      d.facts = { ...d.facts, rarity, unidentifiedItemTier: tierOf(e, rarity) }
      out.push(d)
    }
  }
  return out
}

// Drop tiers are for magic and rare gear.
function tierOf (e: DropEntry, rarity: FilterRarity | undefined): number | undefined {
  return e.tier != null && (rarity === 'Magic' || rarity === 'Rare') ? e.tier : undefined
}

function makeDrop (id: number, e: DropEntry, areaLevel: number, r: () => number): Drop {
  const facts: ItemFacts = {
    name: e.name,
    itemClass: e.cls,
    baseType: e.name,
    rarity: e.rarity ?? 'Normal',
    itemLevel: areaLevel,
    // The game's own DropLevel for a base; the area it starts in otherwise.
    dropLevel: baseDropLevel(e) ?? e.drop,
    width: e.w,
    height: e.h,
    identified: false,
    corrupted: false,
    influences: [],
    explicitModNames: [],
    areaLevel
  }
  let label = e.name
  if (e.stack) {
    const n = e.stack[0] + Math.floor(r() * (e.stack[1] - e.stack[0] + 1))
    facts.stackSize = n
    if (n > 1) label = `${n}x ${e.name}`
  } else if (e.cls === C || e.cls === DIV || e.cls === FRAG) {
    facts.stackSize = 1
  }
  if (e.gear) {
    const roll = r()
    facts.rarity = roll < 0.12 ? 'Rare' : roll < 0.5 ? 'Magic' : 'Normal'
    facts.socketGroups = sockets(r, e)
  }
  facts.unidentifiedItemTier = tierOf(e, facts.rarity)
  if (e.rarity === 'Unique') facts.socketGroups = sockets(r, { ...e, gear: true })
  if (e.map) {
    const tier = Math.max(1, Math.min(16, areaLevel - 67 + Math.floor(r() * 3) - 1))
    const name = MAP_NAMES[Math.floor(r() * MAP_NAMES.length)]
    facts.name = facts.baseType = label = name
    facts.mapTier = tier
    facts.dropLevel = 67 + tier
    const roll = r()
    facts.rarity = roll < 0.3 ? 'Rare' : roll < 0.65 ? 'Magic' : 'Normal'
  }
  if (e.gem) {
    facts.gemLevel = 1 + Math.floor(r() * (r() < 0.1 ? 20 : 8))
    facts.quality = r() < 0.2 ? 1 + Math.floor(r() * 20) : 0
    if (facts.quality) label = `Superior ${e.name}`
  }
  return { id, label, facts }
}

// The label colour the game uses when a rule sets none.
export function defaultTextColour (f: ItemFacts): [number, number, number, number] {
  if (f.itemClass === 'Stackable Currency' || f.itemClass === 'Map Fragments') return [170, 158, 130, 255]
  if (f.itemClass === 'Divination Cards') return [14, 186, 255, 255]
  if (f.itemClass?.endsWith('Gems')) return [27, 162, 155, 255]
  switch (f.rarity) {
    case 'Magic': return [136, 136, 255, 255]
    case 'Rare': return [255, 255, 119, 255]
    case 'Unique': return [175, 96, 37, 255]
    default: return [200, 200, 200, 255]
  }
}
