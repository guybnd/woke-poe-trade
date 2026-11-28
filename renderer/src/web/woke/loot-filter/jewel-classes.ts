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
// a step or By price to change it. Cluster jewels are
// priced rows, folded by size (clusterEnchantRows).
import type { LootCategory } from './fragment-classes'
import type { FilterCondition } from './parse'
import type { CStep, SectionMode } from './currency-settings'

export const JEWEL_CATEGORIES: LootCategory[] = [
  { id: 'jewabyss', name: 'Abyss jewels', art: 'Murderous Eye Jewel' },
  { id: 'jewplain', name: 'Jewels', art: 'Cobalt Jewel' },
  { id: 'jewclus', name: 'Cluster jewels', art: 'Large Cluster Jewel' }
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

export const ABYSS_BASES = ['Assembled Eye Jewel', 'Ghastly Eye Jewel', 'Hypnotic Eye Jewel', 'Murderous Eye Jewel', 'Searching Eye Jewel']
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
  // Shows at least this step whatever the section's mode, line or steps
  // turned off, until you set a step or price (fractured jewels: Guy
  // 2026-11-28, "should have a always on default").
  floor?: CStep
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
  { cat: 'jewabyss', name: 'Fractured abyss jewel', cls: 'Abyss Jewels', bts: ABYSS_BASES, guess: 5, fixed: 3, floor: 3, conds: [NOT_UNIQUE, FRACTURED] },
  { cat: 'jewplain', name: 'Fractured jewel', cls: 'Jewels', bts: PLAIN_BASES, guess: 5, fixed: 3, floor: 3, conds: [NOT_UNIQUE, FRACTURED] },
  { cat: 'jewclus', name: 'Fractured cluster jewel', cls: 'Jewels', bts: CLUSTER_BASES, guess: 5, fixed: 3, floor: 3, conds: [NOT_UNIQUE, FRACTURED] },
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

// Cluster jewels (Guy's redesign, WOKEPOET-726): one section, a fold per
// size. Each size has band rows (passive count and item level: what a filter
// sees on a cluster jewel besides its passive type), each worth the cheapest
// cluster jewel of that band on poe.ninja (any passive type, at least 5
// listings), and an enchant row for every passive type that sells well above
// its band (clusterEnchantRows). Enchant rows are louder, so they come first
// in the filter; the band row catches the rest. All above NeverSink's cluster
// price rules, which stay below for whatever these leave. `guess` while
// poe.ninja has no line. Band rows of a size never overlap.
export const CLUSTER_BASE_TYPE = 'jewels->cluster'
export type ClusterSizeName = 'Small' | 'Medium' | 'Large'
export const CLUSTER_SIZES: ClusterSizeName[] = ['Large', 'Medium', 'Small']
export interface ClusterRow extends JewelRow {
  size: ClusterSizeName
  // Passive counts and item levels a poe.ninja line must have to count.
  passives: [number, number]
  ilvl: [number, number]
  // An enchant row's passive type (EnchantmentPassiveNode).
  node?: string
}
const passives = (op: string, n: number) => cnd('EnchantmentPassiveNum', op, [String(n)])
const pasText = (p: [number, number]) => p[0] === p[1] ? `${p[0]} passives` : `${p[0]}-${p[1]} passives`
const lvText = (lv: [number, number]) => lv[0] <= 1 && lv[1] >= 100 ? 'any item level' : lv[1] >= 100 ? `item level ${lv[0]}+` : lv[0] <= 1 ? `item level under ${lv[1] + 1}` : `item level ${lv[0]}-${lv[1]}`
const cluster = (size: ClusterSizeName, guess: number, pas: [number, number], lv: [number, number], conds: FilterCondition[]): ClusterRow =>
  ({ cat: 'jewclus', name: `${size} Cluster Jewel, ${pasText(pas)}, ${lvText(lv)}`, cls: '', bts: [`${size} Cluster Jewel`], size, guess, passives: pas, ilvl: lv, conds: [NOT_UNIQUE, ...conds] })
// poe.ninja prices at item level 1, 50, 68, 75 and 84: 84 is where the
// price jumps for every size (Small Reservation Efficiency: 13c at 75,
// 1,976c at 84). Small keeps 75-83 apart so you can see it.
export const CLUSTER_ROWS: ClusterRow[] = [
  cluster('Large', 5, [12, 12], [84, 100], [passives('>=', 12), ilvl('>=', 84)]),
  cluster('Large', 5, [9, 11], [84, 100], [passives('>=', 9), passives('<=', 11), ilvl('>=', 84)]),
  cluster('Large', 5, [8, 8], [84, 100], [passives('<=', 8), ilvl('>=', 84)]),
  cluster('Large', 1.5, [8, 8], [1, 83], [passives('<=', 8), ilvl('<', 84)]),
  cluster('Large', 0.1, [9, 12], [1, 83], [passives('>=', 9), ilvl('<', 84)]),
  cluster('Medium', 5, [4, 5], [84, 100], [passives('<=', 5), ilvl('>=', 84)]),
  cluster('Medium', 1.5, [4, 5], [1, 83], [passives('<=', 5), ilvl('<', 84)]),
  cluster('Medium', 1, [6, 6], [84, 100], [passives('>=', 6), ilvl('>=', 84)]),
  cluster('Medium', 0.1, [6, 6], [1, 83], [passives('>=', 6), ilvl('<', 84)]),
  cluster('Small', 1.5, [2, 3], [84, 100], [ilvl('>=', 84)]),
  cluster('Small', 0.5, [2, 3], [75, 83], [ilvl('>=', 75), ilvl('<', 84)]),
  cluster('Small', 0.1, [2, 3], [1, 74], [ilvl('<', 75)])
]

export interface ClusterLine { size: string, passives: number, ilvl: number, node?: string, chaos: number, listings: number }
const inRow = (row: ClusterRow, l: ClusterLine, minListings: number) =>
  l.size === row.size && l.listings >= minListings && l.chaos > 0 &&
  l.passives >= row.passives[0] && l.passives <= row.passives[1] && l.ilvl >= row.ilvl[0] && l.ilvl <= row.ilvl[1]

// The cheapest solid poe.ninja line for a row, or null.
export function clusterFloor (row: ClusterRow, lines: readonly ClusterLine[], minListings = 5): number | null {
  let low: number | null = null
  for (const l of lines) {
    if (!inRow(row, l, minListings)) continue
    if (low == null || l.chaos < low) low = l.chaos
  }
  return low
}

// An enchant worth at least this, and this many times its band's floor,
// gets a row of its own.
export const ENCHANT_MIN = 5
export const ENCHANT_TIMES = 3

// The money enchants: for each band row, every passive type whose best
// poe.ninja line there is worth ENCHANT_MIN and ENCHANT_TIMES its floor.
// Under item level 84 poe.ninja's lines are thin (an under-75 Small Evasion
// at 659c), so a price there is capped at the same enchant's 84+ price.
export function clusterEnchantRows (lines: readonly ClusterLine[], minListings = 5): Array<ClusterRow & { chaos: number }> {
  const out: Array<ClusterRow & { chaos: number }> = []
  const best = (row: ClusterRow) => {
    const m = new Map<string, number>()
    for (const l of lines) if (l.node && inRow(row, l, minListings)) m.set(l.node, Math.max(m.get(l.node) ?? 0, l.chaos))
    return m
  }
  for (const row of CLUSTER_ROWS) {
    const floor = clusterFloor(row, lines, minListings)
    if (floor == null) continue
    const here = best(row)
    // The 84+ rows of this size that share a passive count with this one.
    const twins = row.ilvl[0] >= 84 ? [] : CLUSTER_ROWS.filter(t => t.size === row.size && t.ilvl[0] >= 84 && t.passives[0] <= row.passives[1] && t.passives[1] >= row.passives[0])
    const top = twins.map(best)
    for (const [node, raw] of here) {
      let chaos = raw
      // Under 84 only a type poe.ninja also prices at 84+ gets a row, at
      // most at that price.
      if (row.ilvl[0] < 84) {
        const caps = top.map(m => m.get(node)).filter((x): x is number => x != null)
        if (!caps.length) continue
        chaos = Math.min(raw, Math.max(...caps))
      }
      if (chaos < Math.max(ENCHANT_MIN, floor * ENCHANT_TIMES)) continue
      out.push({ ...row, node, chaos, guess: chaos, name: `${row.size} Cluster Jewel, ${node}, ${pasText(row.passives)}, ${lvText(row.ilvl)}`, conds: [...row.conds, cnd('EnchantmentPassiveNode', '==', [node])] })
    }
  }
  return out.sort((a, b) => b.chaos - a.chaos || a.name.localeCompare(b.name))
}

// The size fold a cluster row sits in.
export function clusterSizeOf (name: string): ClusterSizeName | null {
  const m = /^(Large|Medium|Small) Cluster Jewel, /.exec(name)
  return m ? m[1] as ClusterSizeName : null
}
