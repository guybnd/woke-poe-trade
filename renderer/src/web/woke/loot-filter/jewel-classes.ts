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
import type { CStep } from './currency-settings'

export const JEWEL_CATEGORIES: LootCategory[] = [
  { id: 'jewabyss', name: 'Abyss jewels', art: 'Murderous Eye Jewel' },
  { id: 'jewplain', name: 'Jewels', art: 'Cobalt Jewel' }
]
export const JEWEL_IDS = new Set(JEWEL_CATEGORIES.map(x => x.id))

export const JEWEL_LOOK: Record<string, { text: [number, number, number], color: string, shape: string }> = {
  jewabyss: { text: [150, 215, 120], color: 'Green', shape: 'Raindrop' },
  jewplain: { text: [120, 190, 240], color: 'Blue', shape: 'Raindrop' }
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
export const JEWEL_ROWS: JewelRow[] = [
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
