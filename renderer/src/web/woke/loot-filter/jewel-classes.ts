// Jewels on the Loot tab (Guy's Jewels A, 2026-11-28: "1. abyss jewels
// section 2. normal jewels section cobalt viridian emerald etc ... 4. clusters
// under their own category"). Abyss and plain jewels get folds on the same
// steps. poe.ninja prices neither by item level or rarity (the only things a
// filter sees on an unidentified jewel), and a filter can't tell which
// corruption implicit a jewel has (Guy 2026-11-28: "sometimes jewels can have
// powerful implicits and you cant price them"). So rows a price can't judge
// have a fixed step instead (Guy's Jewels A + Abyss A): corrupted ones with an
// implicit are loud, and every other jewel shows at least Small (Guy: "Why
// hide the lower ones? Users can turn it off if they wish"). Set a row Off,
// a step or By price to change it. Cluster jewels keep their own
// priced band (ClusterPriceBand).
import type { LootCategory } from './fragment-classes'
import type { FilterCondition } from './parse'
import type { CStep, SectionMode } from './currency-settings'

export const JEWEL_CATEGORIES: LootCategory[] = [
  { id: 'jewabyss', name: 'Abyss jewels', art: 'Murderous Eye Jewel' },
  { id: 'jewplain', name: 'Jewels', art: 'Cobalt Jewel' },
  { id: 'jewclus', name: 'Cluster jewel bases', art: 'Large Cluster Jewel' }
]
export const JEWEL_IDS = new Set(JEWEL_CATEGORIES.map(x => x.id))
// Both start Always: each row shows at its set look; By price on the
// section puts them on the price ladder instead (Guy 2026-11-28).
export const JEWEL_MODES: Record<string, SectionMode> = { jewabyss: 'always', jewplain: 'always', jewclus: 'always' }

export const JEWEL_LOOK: Record<string, { text: [number, number, number], color: string, shape: string }> = {
  jewabyss: { text: [150, 215, 120], color: 'Green', shape: 'Raindrop' },
  jewplain: { text: [120, 190, 240], color: 'Blue', shape: 'Raindrop' },
  jewclus: { text: [225, 195, 120], color: 'Yellow', shape: 'Raindrop' }
}

export const ABYSS_BASES = ['Ghastly Eye Jewel', 'Hypnotic Eye Jewel', 'Murderous Eye Jewel', 'Searching Eye Jewel']
export const PLAIN_BASES = ['Cobalt Jewel', 'Crimson Jewel', 'Viridian Jewel']

export interface JewelRow {
  cat: string
  // Unique among every Loot tab item: your edits are kept by name.
  name: string
  // The filter's Class and BaseTypes; `bts[0]` is the one its tooltip shows.
  cls: string
  bts: string[]
  // Sorts the rows; the price of a row with no `fixed` step.
  guess: number
  // No price: this step at any stack (0: Off) until you set a step or price.
  fixed?: CStep
  // Shows at least Small whatever the section's mode or line, until you set
  // it Off (fractured jewels: Guy 2026-11-28, "should have a always on default").
  free?: boolean
  conds: FilterCondition[]
}

const cnd = (key: string, op: string, values: string[], count: number | null = null): FilterCondition => ({ key, op, count, values } as FilterCondition)
const RARE = cnd('Rarity', '', ['Rare'])
const LOW = cnd('Rarity', '', ['Normal', 'Magic'])
const MAGIC = cnd('Rarity', '', ['Magic'])
const IMPLICIT = cnd('CorruptedMods', '>=', ['1'])
const ilvl = (op: string, n: number) => cnd('ItemLevel', op, [String(n)])

// The item level rows of a rarity never overlap. Corrupted rows are on top
// of them: the louder row wins (applyJewels puts it first). Steps: 1 Small,
// 2 Normal, 3 Decent, 4 Big. Below area level 68 NeverSink decides, so
// levelling still shows magic jewels.
export const CLUSTER_BASES = ['Large Cluster Jewel', 'Medium Cluster Jewel', 'Small Cluster Jewel']
const FRACTURED = cnd('FracturedItem', '', ['True'])
const NOT_UNIQUE = cnd('Rarity', '', ['Normal', 'Magic', 'Rare'])

export const JEWEL_ROWS: JewelRow[] = [
  // Fractured jewels of any kind (Guy 2026-11-28): a row of their own, on
  // top of the item level rows, that always shows.
  { cat: 'jewabyss', name: 'Fractured abyss jewel', cls: 'Abyss Jewels', bts: ABYSS_BASES, guess: 5, fixed: 3, free: true, conds: [NOT_UNIQUE, FRACTURED] },
  { cat: 'jewplain', name: 'Fractured jewel', cls: 'Jewels', bts: PLAIN_BASES, guess: 5, fixed: 3, free: true, conds: [NOT_UNIQUE, FRACTURED] },
  { cat: 'jewclus', name: 'Fractured cluster jewel', cls: 'Jewels', bts: CLUSTER_BASES, guess: 5, fixed: 3, free: true, conds: [NOT_UNIQUE, FRACTURED] },
  { cat: 'jewabyss', name: 'Rare abyss jewel, corrupted, 5 mods', cls: 'Abyss Jewels', bts: ABYSS_BASES, guess: 20, fixed: 4, conds: [RARE, cnd('Corrupted', '', ['True']), cnd('HasExplicitMod', '>=', ['a', 'e', 'i', 'o', 'u', 'y'], 5)] },
  { cat: 'jewabyss', name: 'Rare abyss jewel, corrupted', cls: 'Abyss Jewels', bts: ABYSS_BASES, guess: 5, fixed: 3, conds: [RARE, cnd('Corrupted', '', ['True'])] },
  { cat: 'jewabyss', name: 'Magic abyss jewel with a corrupted implicit', cls: 'Abyss Jewels', bts: ABYSS_BASES, guess: 1.5, fixed: 2, conds: [MAGIC, IMPLICIT] },
  { cat: 'jewabyss', name: 'Rare abyss jewel, item level 86+', cls: 'Abyss Jewels', bts: ABYSS_BASES, guess: 1.5, fixed: 2, conds: [RARE, ilvl('>=', 86)] },
  { cat: 'jewabyss', name: 'Rare abyss jewel, item level 82-85', cls: 'Abyss Jewels', bts: ABYSS_BASES, guess: 0.5, fixed: 1, conds: [RARE, ilvl('>=', 82), ilvl('<=', 85)] },
  { cat: 'jewabyss', name: 'Rare abyss jewel, item level under 82', cls: 'Abyss Jewels', bts: ABYSS_BASES, guess: 0.1, fixed: 1, conds: [RARE, ilvl('<', 82)] },
  { cat: 'jewabyss', name: 'Magic or white abyss jewel, item level 86+', cls: 'Abyss Jewels', bts: ABYSS_BASES, guess: 0.4, fixed: 1, conds: [LOW, ilvl('>=', 86)] },
  { cat: 'jewabyss', name: 'Magic or white abyss jewel, item level under 86', cls: 'Abyss Jewels', bts: ABYSS_BASES, guess: 0.1, fixed: 1, conds: [LOW, ilvl('<', 86)] },
  { cat: 'jewplain', name: 'Rare jewel with a corrupted implicit', cls: 'Jewels', bts: PLAIN_BASES, guess: 5, fixed: 3, conds: [RARE, IMPLICIT] },
  { cat: 'jewplain', name: 'Magic jewel with a corrupted implicit', cls: 'Jewels', bts: PLAIN_BASES, guess: 1.5, fixed: 2, conds: [MAGIC, IMPLICIT] },
  { cat: 'jewplain', name: 'Rare jewel', cls: 'Jewels', bts: PLAIN_BASES, guess: 0.5, fixed: 1, conds: [RARE] },
  { cat: 'jewplain', name: 'Magic or white jewel', cls: 'Jewels', bts: PLAIN_BASES, guess: 0.1, fixed: 1, conds: [LOW] }
]

// NeverSink's jewel rules; ours go above the first of them.
export const JEWEL_TYPE = /^jewels->(special|leveling|abyss|generic)$/

// A unique priced on a jewel base (the Uniques page owns them).
export const isJewelBase = (base: string): boolean => /Jewel$/.test(base)

// Cluster jewel bases (NeverSink retirement M4a, 2026-11-28): what a filter
// sees on a cluster jewel without its passive type, size, passive count and
// item level. Each row is worth the cheapest cluster jewel of that kind on
// poe.ninja (any passive type, at least 5 listings): what a drop of it sells
// for at least. The cluster price rules (ClusterPriceBand) still catch the
// valuable passive types first; these go under them. `guess` while poe.ninja
// has no line. Rows of a size never overlap except the last, which catches
// the rest.
export const CLUSTER_BASE_TYPE = 'jewels->cluster'
export interface ClusterRow extends JewelRow {
  size: 'Small' | 'Medium' | 'Large'
  // Passive counts and item levels a poe.ninja line must have to count.
  passives: [number, number]
  ilvl: [number, number]
}
const passives = (op: string, n: number) => cnd('EnchantmentPassiveNum', op, [String(n)])
const cluster = (size: ClusterRow['size'], name: string, guess: number, pas: [number, number], lv: [number, number], conds: FilterCondition[]): ClusterRow =>
  ({ cat: 'jewclus', name, cls: '', bts: [`${size} Cluster Jewel`], size, guess, passives: pas, ilvl: lv, conds: [NOT_UNIQUE, ...conds] })
export const CLUSTER_ROWS: ClusterRow[] = [
  cluster('Large', 'Large Cluster Jewel, 12 passives, item level 84+', 5, [12, 12], [84, 100], [passives('>=', 12), ilvl('>=', 84)]),
  cluster('Large', 'Large Cluster Jewel, 8 passives, item level 84+', 5, [8, 8], [84, 100], [passives('<=', 8), ilvl('>=', 84)]),
  cluster('Large', 'Large Cluster Jewel, 8 passives, item level under 84', 1.5, [8, 8], [1, 83], [passives('<=', 8), ilvl('<', 84)]),
  cluster('Large', 'Large Cluster Jewel, other', 0.1, [9, 12], [1, 100], []),
  cluster('Medium', 'Medium Cluster Jewel, 4-5 passives, item level 84+', 5, [4, 5], [84, 100], [passives('<=', 5), ilvl('>=', 84)]),
  cluster('Medium', 'Medium Cluster Jewel, 4-5 passives, item level under 84', 1.5, [4, 5], [1, 83], [passives('<=', 5), ilvl('<', 84)]),
  cluster('Medium', 'Medium Cluster Jewel, other', 0.1, [6, 6], [1, 100], []),
  cluster('Small', 'Small Cluster Jewel, item level 84+', 1.5, [2, 3], [84, 100], [ilvl('>=', 84)]),
  cluster('Small', 'Small Cluster Jewel, item level under 84', 0.1, [2, 3], [1, 83], [ilvl('<', 84)])
]

// The cheapest solid poe.ninja line for a row, or null.
export function clusterFloor (row: ClusterRow, lines: ReadonlyArray<{ size: string, passives: number, ilvl: number, chaos: number, listings: number }>, minListings = 5): number | null {
  let low: number | null = null
  for (const l of lines) {
    if (l.size !== row.size || l.listings < minListings || !(l.chaos > 0)) continue
    if (l.passives < row.passives[0] || l.passives > row.passives[1] || l.ilvl < row.ilvl[0] || l.ilvl > row.ilvl[1]) continue
    if (low == null || l.chaos < low) low = l.chaos
  }
  return low
}
