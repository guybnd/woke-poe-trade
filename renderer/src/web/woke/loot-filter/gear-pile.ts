// A pile of gear drops for the Gear tab: random bases from each rank, magic
// and rare, every drop tier, with the decorators you pick, ready to run
// through the filter as it is now.
import type { ItemFacts } from './item-facts'
import { BASE_FACTS } from './base-facts'
import { baseInfo } from './gear-bases'

export type Decorator = 'influenced' | 'fractured' | 'synthesised' | 'corrupted' | 'quality'
export const DECORATORS: Array<{ key: Decorator, label: string }> = [
  { key: 'influenced', label: 'Influenced' },
  { key: 'fractured', label: 'Fractured' },
  { key: 'synthesised', label: 'Synthesised' },
  { key: 'corrupted', label: 'Corrupted' },
  { key: 'quality', label: 'Over-quality' }
]
// How often a picked decorator lands on a drop.
const CHANCE: Record<Decorator, number> = { influenced: 0.18, fractured: 0.12, synthesised: 0.08, corrupted: 0.15, quality: 0.15 }
const INFLUENCES = ['Shaper', 'Elder', 'Crusader', 'Hunter', 'Redeemer', 'Warlord']

export interface PileDrop {
  id: number
  facts: ItemFacts
  // Where it comes from in the table, for its caption.
  row: string
  tier: number | null
  tags: string[]
}

export interface PileInput {
  // Bases per table row; empty rows are skipped.
  rows: Array<{ row: string, bases: string[], weight: number }>
  decorators: Decorator[]
  count: number
  seed: number
}

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

export function rollPile (input: PileInput): PileDrop[] {
  const r = rng(input.seed)
  const rows = input.rows.filter(x => x.bases.length && x.weight > 0)
  const total = rows.reduce((n, x) => n + x.weight, 0)
  const out: PileDrop[] = []
  if (!rows.length) return out
  for (let id = 0; id < input.count; id++) {
    let roll = r() * total
    const row = rows.find(x => (roll -= x.weight) < 0) ?? rows[rows.length - 1]
    const base = row.bases[Math.floor(r() * row.bases.length)]
    const info = baseInfo(base)
    const rarity = r() < 0.55 ? 'Rare' : 'Magic'
    // 3.30: a fifth of map drops carry no tier.
    const tier = r() < 0.2 ? null : 2 + Math.floor(r() * 4)
    const facts: ItemFacts = {
      name: base,
      baseType: base,
      itemClass: info.cls ?? undefined,
      rarity,
      itemLevel: 75 + Math.floor(r() * 12),
      dropLevel: info.dropLevel ?? undefined,
      width: BASE_FACTS[base]?.[1],
      height: BASE_FACTS[base]?.[2],
      unidentifiedItemTier: tier ?? undefined,
      identified: false,
      corrupted: false,
      mirrored: false,
      fractured: false,
      synthesised: false,
      quality: 0,
      influences: [],
      explicitModNames: [],
      areaLevel: 83
    }
    const tags: string[] = []
    for (const d of input.decorators) {
      if (r() >= CHANCE[d]) continue
      if (d === 'influenced') {
        const inf = INFLUENCES[Math.floor(r() * INFLUENCES.length)]
        facts.influences = [inf]
        tags.push(inf)
      } else if (d === 'fractured') {
        facts.fractured = true
        tags.push('Fractured')
      } else if (d === 'synthesised') {
        facts.synthesised = true
        tags.push('Synthesised')
      } else if (d === 'corrupted') {
        facts.corrupted = true
        tags.push('Corrupted')
      } else {
        facts.quality = 21 + Math.floor(r() * 10)
        tags.push(`${facts.quality}%`)
      }
    }
    out.push({ id, facts, row: row.row, tier, tags })
  }
  return out
}
