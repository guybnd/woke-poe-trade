// Rare weights' test rares: a fixed set that covers every kind of multiplier
// (to check a change against), a seeded pile of made-up map drops (for the
// strictness numbers), and the filter facts of each, so the real compiled
// filter can be asked what it does with them.
import type { ItemFacts } from './item-facts'
import { BASE_FACTS } from './base-facts'
import type { BaseRow, Rank, WeightItem, WeightKey } from './weights'
import type { ItemTipRef } from '../ui/tooltip/item-tip'

// Points: every +10 doubles (×2 = +10, ×0.5 = -10).
export const points = (mult: number): number => mult > 0 ? 10 * Math.log2(mult) : -Infinity
export const fromPoints = (p: number): number => Math.pow(2, p / 10)
export function pointsText (p: number): string {
  if (!Number.isFinite(p)) return 'never'
  const r = Math.round(p)
  return r > 0 ? `+${r}` : String(r)
}

const PLAIN: Omit<WeightItem, 'rank' | 'width' | 'height' | 'old'> = {
  tier: 1,
  itemLevel: 83,
  influenced: false,
  eldritch: false,
  quality: 0,
  fractured: false,
  synthesised: false,
  fated: false,
  mirrored: false,
  abyssal: false,
  strands: 0,
  enchanted: false,
  crucible: false,
  links: 0,
  rgb: false,
  corruption: 'no'
}

type Size = 'big' | 'tiny' | 'normal'
export interface SampleSpec {
  // What the sample shows, short.
  label: string
  rank: Rank
  size?: Size
  old?: boolean
  cls?: string
  item: Partial<WeightItem>
}

// One of each kind, then the mixes that show how marks combine.
export const SAMPLES: SampleSpec[] = [
  { label: 'Plain base', rank: 'r0', item: { tier: 1, itemLevel: 75 } },
  { label: 'Rank 1, tier 1', rank: 'r1', item: { tier: 1 } },
  { label: 'Rank 1, tier 4', rank: 'r1', item: { tier: 4 } },
  { label: 'Rank 1, tier 5, ilvl 86', rank: 'r1', item: { tier: 5, itemLevel: 86 } },
  { label: 'Top exotic base', rank: 'x1', item: { tier: 1, itemLevel: 75 } },
  { label: 'Other exotic base', rank: 'x2', item: { tier: 3 } },
  { label: 'Rank 2, large', rank: 'r2', size: 'big', item: { tier: 2, itemLevel: 75 } },
  { label: 'Rank 3, tiny', rank: 'r3', size: 'tiny', item: { tier: 3, itemLevel: 70 } },
  { label: 'Old armour, tier 5', rank: 'r0', old: true, item: { tier: 5 } },
  { label: 'Plain corrupted', rank: 'r1', item: { tier: 3, corruption: 'plain' } },
  { label: 'Corrupted implicit', rank: 'r2', item: { tier: 2, corruption: 'implicit' } },
  { label: 'Double corrupted', rank: 'r1', item: { tier: 2, corruption: 'double' } },
  { label: '6-link', rank: 'r0', size: 'big', item: { links: 6, itemLevel: 75 } },
  { label: '5-link', rank: 'r2', size: 'big', item: { links: 5, itemLevel: 82 } },
  { label: 'Red, green and blue linked', rank: 'r0', item: { links: 4, rgb: true, itemLevel: 75 } },
  { label: 'Influenced', rank: 'r3', item: { tier: 2, influenced: true } },
  { label: 'Eldritch implicit', rank: 'r1', item: { tier: 2, itemLevel: 86, eldritch: true } },
  { label: 'Fractured', rank: 'r0', item: { fractured: true } },
  { label: 'Synthesised', rank: 'r2', item: { synthesised: true, itemLevel: 75 } },
  { label: 'Quality 25%', rank: 'r0', item: { quality: 25, itemLevel: 75 } },
  { label: 'Abyssal socket', rank: 'r0', item: { abyssal: true } },
  { label: 'Memory strands 80', rank: 'r0', item: { strands: 80, itemLevel: 75 } },
  { label: 'Crucible tree', rank: 'r0', item: { crucible: true, itemLevel: 75 } },
  { label: 'Enchanted', rank: 'r0', item: { enchanted: true, itemLevel: 75 } },
  { label: 'Fated', rank: 'r1', item: { tier: 3, fated: true } },
  { label: 'Mirrored', rank: 'r1', item: { tier: 4, itemLevel: 86, mirrored: true } },
  { label: 'Fractured and influenced', rank: 'r2', item: { tier: 2, fractured: true, influenced: true } },
  { label: '6-link, corrupted implicit', rank: 'r1', size: 'big', item: { tier: 2, links: 6, corruption: 'implicit' } }
]

const sizeOf = (b: BaseRow): Size => b.width >= 2 && b.height >= 3 ? 'big' : b.height === 1 ? 'tiny' : 'normal'

// The first base (by name) that fits a sample, so the set stays the same.
export function sampleBase (spec: SampleSpec, bases: BaseRow[]): BaseRow | null {
  const fits = (b: BaseRow) => b.rank === spec.rank && !!b.cls && !!BASE_FACTS[b.name] &&
    (spec.size == null || sizeOf(b) === spec.size) && !!spec.old === b.old && (spec.cls == null || b.cls === spec.cls)
  return bases.find(fits) ?? bases.find(b => b.rank === spec.rank && !!b.cls && !!BASE_FACTS[b.name] && !!spec.old === b.old) ?? null
}

export function itemOf (row: BaseRow, rest: Partial<WeightItem>): WeightItem {
  const it = { ...PLAIN, ...rest, rank: row.rank, width: row.width, height: row.height, old: row.old }
  if (it.links < 3) it.rgb = false
  return it
}

// What the game's filter sees on this rare.
export function factsOf (row: BaseRow, it: WeightItem): ItemFacts {
  const groups = it.links ? [(it.rgb ? 'RGB' : 'RRR').slice(0, it.links) + 'R'.repeat(Math.max(0, it.links - 3))] : []
  if (it.abyssal) groups.push('A')
  return {
    name: row.name,
    baseType: row.name,
    itemClass: row.cls ?? '',
    rarity: 'Rare',
    itemLevel: it.itemLevel,
    dropLevel: BASE_FACTS[row.name]?.[0],
    areaLevel: 83,
    quality: it.quality,
    width: row.width,
    height: row.height,
    memoryStrands: it.strands,
    socketGroups: groups,
    identified: false,
    corrupted: it.corruption !== 'no',
    corruptedMods: it.corruption === 'double' ? 2 : it.corruption === 'implicit' ? 1 : 0,
    mirrored: it.mirrored,
    fractured: it.fractured,
    synthesised: it.synthesised,
    fated: it.fated,
    anyEnchantment: it.enchanted,
    crucibleTree: it.crucible,
    exarchTier: it.eldritch ? 2 : 0,
    eaterTier: 0,
    unidentifiedItemTier: it.tier || undefined,
    influences: it.influenced ? ['Shaper'] : [],
    explicitModNames: []
  } as unknown as ItemFacts
}

function rng (seed: number) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
}

// A made-up pile of endgame rares, with rough odds for each mark (a guess,
// for the strictness numbers only). Same seed, same pile.
export function samplePile (bases: BaseRow[], n = 2000, seed = 7): Array<{ row: BaseRow, it: WeightItem }> {
  const r = rng(seed)
  const pool = bases.filter(b => b.cls && BASE_FACTS[b.name])
  if (!pool.length) return []
  const pick = (p: number) => r() < p
  const out: Array<{ row: BaseRow, it: WeightItem }> = []
  const tierAt = (x: number) => x < 0.3 ? 0 : x < 0.55 ? 1 : x < 0.75 ? 2 : x < 0.87 ? 3 : x < 0.95 ? 4 : 5
  for (let k = 0; k < n; k++) {
    const row = pool[Math.floor(r() * pool.length)]
    const tall = row.height >= 2
    const lx = r()
    const links = !tall ? 0 : lx < 0.001 ? 6 : lx < 0.011 ? 5 : lx < 0.09 ? 4 : lx < 0.4 ? 3 : 0
    const cx = r()
    out.push({
      row,
      it: itemOf(row, {
        tier: tierAt(r()),
        itemLevel: 68 + Math.floor(r() * 19),
        influenced: pick(0.03),
        eldritch: pick(0.03),
        quality: pick(0.005) ? 25 : 0,
        fractured: pick(0.02),
        synthesised: pick(0.005),
        fated: pick(0.002),
        mirrored: pick(0.001),
        abyssal: pick(0.03),
        strands: pick(0.01) ? 80 : 0,
        enchanted: pick(0.005),
        crucible: pick(0.01),
        links,
        rgb: links >= 3 && pick(0.15),
        corruption: cx < 0.06 ? 'plain' : cx < 0.09 ? 'implicit' : cx < 0.1 ? 'double' : 'no'
      })
    })
  }
  return out
}

// The chip for one multiplier: a short name for the row it comes from.
export const CHIP_LABEL: Partial<Record<WeightKey, string>> = {
  x1: 'Exotic top',
  x2: 'Exotic',
  r1: 'Rank 1',
  r2: 'Rank 2',
  r3: 'Rank 3',
  r0: 'No rank',
  i68: 'ilvl 68-74',
  i75: 'ilvl 75-82',
  i83: 'ilvl 83-85',
  i86: 'ilvl 86',
  cp: 'Corrupted',
  ci: 'Corr. implicit',
  dc: 'Double corr.',
  big: 'Large',
  tiny: 'Tiny',
  old: 'Old base',
  rgb: 'R-G-B',
  strand: 'Strands 70+',
  qual: 'Quality 24+',
  eld: 'Eldritch',
  cruc: 'Crucible',
  ench: 'Enchanted',
  infl: 'Influenced',
  fract: 'Fractured',
  synth: 'Synthesised',
  abyss: 'Abyssal',
  mirr: 'Mirrored',
  fated: 'Fated'
}

// The test rare as its own item tooltip: what it is (item level, drop tier,
// sockets, influence, corruption, its marks), not just the plain base.
export function sampleTip (row: BaseRow, it: WeightItem): ItemTipRef {
  const marks = [
    it.fractured && 'Fractured',
    it.synthesised && 'Synthesised',
    it.fated && 'Fated',
    it.abyssal && 'Abyssal socket',
    it.strands >= 70 && `Memory Strands: ${it.strands}`,
    it.enchanted && 'Enchanted',
    it.crucible && 'Crucible passive tree',
    it.tier ? `Unidentified (Tier ${it.tier})` : 'Unidentified'
  ].filter((x): x is string => !!x)
  const implicits = [
    ...(it.eldritch ? ['Searing Exarch implicit'] : []),
    ...(it.corruption === 'implicit' ? ['Corrupted implicit'] : it.corruption === 'double' ? ['Corrupted implicit', 'Corrupted implicit'] : [])
  ]
  const sockets = it.links ? (it.rgb ? 'R-G-B' : 'R-R-R').slice(0, it.links * 2 - 1) + '-R'.repeat(Math.max(0, it.links - 3)) : ''
  return {
    name: row.name,
    noMenu: true,
    content: {
      kind: 'item',
      item: {
        rarity: 'RARE',
        name: row.name,
        base: row.name,
        sockets: it.abyssal ? `${sockets}${sockets ? ' ' : ''}A` : sockets,
        implicits,
        mods: marks,
        itemLevel: it.itemLevel,
        quality: it.quality || undefined,
        corrupted: it.corruption !== 'no',
        twiceCorrupted: it.corruption === 'double',
        mirrored: it.mirrored,
        influences: it.influenced ? ['Shaper'] : []
      }
    }
  }
}

// A pasted item (Ctrl+C in game) as the weights see it; null when it isn't
// a rare on a base the table knows.
export function pastedRare (facts: ItemFacts, bases: BaseRow[]): { row: BaseRow, it: WeightItem } | null {
  if (facts.rarity !== 'Rare' || !facts.baseType) return null
  const row = bases.find(b => b.name === facts.baseType)
  if (!row) return null
  const groups = facts.socketGroups ?? []
  const links = Math.max(0, ...groups.map(g => g.replace(/A/g, '').length))
  const cm = facts.corruptedMods ?? 0
  const it = itemOf(row, {
    tier: facts.unidentifiedItemTier ?? 0,
    itemLevel: facts.itemLevel ?? 68,
    influenced: facts.influences.length > 0,
    eldritch: (facts.exarchTier ?? 0) > 0 || (facts.eaterTier ?? 0) > 0,
    quality: facts.quality ?? 0,
    fractured: !!facts.fractured,
    synthesised: !!facts.synthesised,
    fated: !!facts.fated,
    mirrored: !!facts.mirrored,
    abyssal: groups.some(g => g.includes('A')),
    strands: facts.memoryStrands ?? 0,
    enchanted: !!facts.anyEnchantment,
    crucible: !!facts.crucibleTree,
    links: links >= 3 ? links : 0,
    rgb: groups.some(g => /R/.test(g) && /G/.test(g) && /B/.test(g)),
    corruption: !facts.corrupted ? 'no' : cm >= 2 ? 'double' : cm === 1 ? 'implicit' : 'plain'
  })
  return { row, it }
}
