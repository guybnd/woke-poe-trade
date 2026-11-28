// The Jewels page's sample pile (Guy's Jewels A, 2026-11-28): abyss jewels and
// Cobalt, Crimson and Viridian jewels of every rarity and item level band,
// corrupted ones, cluster jewels and a few unique jewels. Each is an
// ItemFacts the matcher runs through the filter as it is now.
import type { FilterRarity, ItemFacts } from './item-facts'
import type { MapDrop } from './map-pile'
import { ABYSS_BASES, PLAIN_BASES } from './jewel-classes'

const AREA = 83
const CLUSTERS: Array<{ base: string, passives: number[], enchant: string }> = [
  { base: 'Large Cluster Jewel', passives: [8, 12], enchant: 'Added Small Passive Skills grant: 12% increased Fire Damage' },
  { base: 'Medium Cluster Jewel', passives: [4, 5], enchant: 'Added Small Passive Skills grant: 6% increased Effect of Non-Damaging Ailments on Enemies' },
  { base: 'Small Cluster Jewel', passives: [2, 3], enchant: 'Added Small Passive Skills grant: +5% to Chaos Resistance' }
]
const UNIQUES: Array<{ name: string, base: string }> = [
  { name: "Watcher's Eye", base: 'Prismatic Jewel' },
  { name: 'Lethal Pride', base: 'Timeless Jewel' },
  { name: 'Thread of Hope', base: 'Crimson Jewel' }
]
const FIVE = ['Tempered', 'Hazardous', 'of Rending', 'of Shelter', 'of the Elements']
const ILVLS = [86, 85, 84, 83, 82, 81, 79, 75, 70]

function rng (s: number) {
  let x = (s * 48271 + 7) % 2147483647
  return () => { x = (x * 48271) % 2147483647; return (x - 1) / 2147483646 }
}
const one = <T>(list: readonly T[], r: () => number): T => list[Math.floor(r() * list.length)]

function facts (base: string, cls: string, rarity: FilterRarity, itemLevel: number, more: Partial<ItemFacts> = {}): ItemFacts {
  return { name: base, itemClass: cls, baseType: base, rarity, itemLevel, identified: false, corrupted: false, influences: [], explicitModNames: [], areaLevel: AREA, ...more }
}

type Make = (r: () => number) => Omit<MapDrop, 'id'>
const band = (n: number) => n >= 86 ? 'item level 86+' : n >= 82 ? 'item level 82-85' : 'item level under 82'
const KINDS: Array<{ id: string, w: number, make: Make }> = [
  {
    id: 'abyss-rare',
    w: 10,
    make: r => {
      const b = one(ABYSS_BASES, r)
      const n = one(ILVLS, r)
      return { key: `ar-${b}-${n}`, label: b, kind: `Rare, ilvl ${n}`, tip: b, facts: facts(b, 'Abyss Jewels', 'Rare', n), priced: `Rare abyss jewel, ${band(n)}` }
    }
  },
  {
    id: 'abyss-low',
    w: 8,
    make: r => {
      const b = one(ABYSS_BASES, r)
      const n = one(ILVLS, r)
      const rar: FilterRarity = r() < 0.7 ? 'Magic' : 'Normal'
      return { key: `al-${b}-${n}-${rar}`, label: b, kind: `${rar === 'Magic' ? 'Magic' : 'White'}, ilvl ${n}`, tip: b, facts: facts(b, 'Abyss Jewels', rar, n), priced: `Magic or white abyss jewel, ${n >= 86 ? 'item level 86+' : 'item level under 86'}` }
    }
  },
  {
    id: 'abyss-five',
    w: 1,
    make: r => {
      const b = one(ABYSS_BASES, r)
      return { key: `a5-${b}`, label: b, kind: 'Corrupted, 5 mods', tip: b, facts: facts(b, 'Abyss Jewels', 'Rare', 84, { identified: true, corrupted: true, explicitModNames: FIVE }), priced: 'Rare abyss jewel, corrupted, 5 mods' }
    }
  },
  {
    id: 'plain-rare',
    w: 8,
    make: r => {
      const b = one(PLAIN_BASES, r)
      return { key: `pr-${b}`, label: b, kind: 'Rare', tip: b, facts: facts(b, 'Jewels', 'Rare', one(ILVLS, r)), priced: 'Rare jewel' }
    }
  },
  {
    id: 'plain-low',
    w: 6,
    make: r => {
      const b = one(PLAIN_BASES, r)
      const rar: FilterRarity = r() < 0.7 ? 'Magic' : 'Normal'
      return { key: `pl-${b}-${rar}`, label: b, kind: rar === 'Magic' ? 'Magic' : 'White', tip: b, facts: facts(b, 'Jewels', rar, one(ILVLS, r)), priced: 'Magic or white jewel' }
    }
  },
  {
    id: 'plain-corr',
    w: 2,
    make: r => {
      const b = one(PLAIN_BASES, r)
      const rar: FilterRarity = r() < 0.5 ? 'Magic' : 'Rare'
      return { key: `pc-${b}-${rar}`, label: b, kind: 'Corrupted implicit', tip: b, facts: facts(b, 'Jewels', rar, one(ILVLS, r), { corrupted: true, corruptedMods: 1, hasImplicitMod: true }), priced: 'Jewel with a corrupted implicit' }
    }
  },
  {
    id: 'cluster',
    w: 5,
    make: r => {
      const c = one(CLUSTERS, r)
      const p = one(c.passives, r)
      const n = one([84, 84, 75, 68, 60], r)
      return {
        key: `cl-${c.base}-${p}-${n}`,
        label: c.base,
        kind: `${p} passives, ilvl ${n}`,
        tip: c.base,
        facts: facts(c.base, 'Jewels', one(['Normal', 'Magic', 'Rare'] as FilterRarity[], r), n, { enchantmentPassiveNum: p, enchantments: [c.enchant], anyEnchantment: true })
      }
    }
  },
  {
    id: 'unique',
    w: 1.5,
    make: r => {
      const u = one(UNIQUES, r)
      return { key: `u-${u.name}`, label: u.base, kind: null, tip: u.name, facts: facts(u.base, 'Jewels', 'Unique', 84) }
    }
  }
]
// Kinds always in a pile, so the page shows each look at once.
const ALWAYS = ['abyss-rare', 'abyss-low', 'abyss-five', 'plain-rare', 'plain-low', 'plain-corr', 'cluster', 'unique']

export function jewelPile (seed: number, count = 24): MapDrop[] {
  const r = rng(seed)
  const kinds = ALWAYS.map(id => KINDS.find(k => k.id === id)!)
  const total = KINDS.reduce((a, k) => a + k.w, 0)
  while (kinds.length < count) {
    let x = r() * total
    kinds.push(KINDS.find(k => (x -= k.w) <= 0) ?? KINDS[0])
  }
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]]
  }
  return kinds.map((k, id) => ({ id, ...k.make(r) }))
}
