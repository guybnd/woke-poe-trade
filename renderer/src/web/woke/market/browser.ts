// The Market window: every poe.ninja category, like poe.ninja's economy pages.
// It reads the dense overview APT already keeps in memory (hook.ts), and
// parses only the category on screen, so it holds no copy of the prices.
import { graphGaps } from './parse'
import type { DenseChunk } from './parse'
import { SKIPPED_TYPES, typeForSlug } from './types'

// The order and grouping of poe.ninja's side list. A category poe.ninja adds
// later (a league's new currency) lands under General.
export const CATEGORY_GROUPS: Array<{ label: string, types: string[] }> = [
  { label: 'General', types: ['Currency', 'Fragment', 'Wombgift', 'Runegraft', 'AllflameEmber', 'Corpse', 'Tattoo', 'Omen', 'DjinnCoin', 'Ducat', 'EnshroudingCrystal', 'DivinationCard', 'Artifact', 'Oil', 'Incubator', 'Coffin', 'ScryingOrb'] },
  { label: 'Equipment & gems', types: ['UniqueWeapon', 'UniqueArmour', 'UniqueAccessory', 'UniqueFlask', 'UniqueJewel', 'UniqueTincture', 'UniqueRelic', 'UniqueIdol', 'SkillGem', 'ImbuedGem', 'Flask'] },
  { label: 'Atlas', types: ['Map', 'UniqueMap', 'BlightedMap', 'BlightRavagedMap', 'ValdoMap', 'Invitation', 'Scarab', 'DeliriumOrb', 'Astrolabe', 'Memory', 'IncursionTemple'] },
  { label: 'Crafting', types: ['Essence', 'Fossil', 'Resonator', 'Vial', 'Beast'] }
]

const LABELS: Record<string, string> = {
  Currency: 'Currency',
  Fragment: 'Fragments',
  DivinationCard: 'Divination Cards',
  UniqueArmour: 'Unique Armours',
  UniqueAccessory: 'Unique Accessories',
  SkillGem: 'Skill Gems',
  DeliriumOrb: 'Delirium Orbs',
  BlightRavagedMap: 'Blight-ravaged Maps',
  Memory: 'Memories',
  Essence: 'Essences',
  Beast: 'Beasts',
  EnshroudingCrystal: 'Enshrouding Crystals',
  DjinnCoin: 'Djinn Coins',
  AllflameEmber: 'Allflame Embers'
}

// "UniqueWeapon" reads as "Unique Weapons".
export function categoryLabel (type: string): string {
  const known = LABELS[type]
  if (known) return known
  const words = type.replace(/([a-z])([A-Z])/g, '$1 $2')
  return /s$/.test(words) ? words : `${words}s`
}

export interface Category {
  type: string
  label: string
  count: number
  chunk: DenseChunk
  // The first few item names, for an icon when ICON_ITEMS has none.
  sample: string[]
}

// The item whose art stands for a category in the side list, like poe.ninja's.
// A category without one (or whose item has no art) takes its first item's.
export const ICON_ITEMS: Record<string, string> = {
  Currency: 'Exalted Orb',
  Fragment: 'Sacrifice at Midnight',
  Wombgift: 'Mysterious Wombgift',
  Omen: 'Omen of Fortune',
  DivinationCard: 'The Doctor',
  Artifact: 'Exotic Coinage',
  Oil: 'Golden Oil',
  UniqueWeapon: 'Starforge',
  UniqueArmour: "Kaom's Heart",
  UniqueAccessory: 'Headhunter',
  UniqueFlask: 'Dying Sun',
  UniqueJewel: "Watcher's Eye",
  SkillGem: 'Empower Support',
  DeliriumOrb: 'Delirium Orb',
  Essence: 'Deafening Essence of Greed',
  Fossil: 'Pristine Fossil',
  Resonator: 'Prime Chaotic Resonator',
  Vial: 'Vial of Fate'
}

const NAME_AT = /\{"name":"((?:[^"\\]|\\.)*)"/g

function sampleNames (lines: string, count = 8): string[] {
  const out: string[] = []
  NAME_AT.lastIndex = 0
  for (let m = NAME_AT.exec(lines); m && out.length < count; m = NAME_AT.exec(lines)) {
    try { out.push(JSON.parse(`"${m[1]}"`) as string) } catch {}
  }
  return out
}

export interface CategoryGroup {
  label: string
  categories: Category[]
}

const ENTRY_START = '{"name":'

function countEntries (lines: string): number {
  let n = 0
  let pos = lines.indexOf(ENTRY_START)
  while (pos !== -1) {
    n++
    pos = lines.indexOf(ENTRY_START, pos + ENTRY_START.length)
  }
  return n
}

// A price load is counted once, however often the window opens.
const groupCache = new WeakMap<DenseChunk[], CategoryGroup[]>()
// Rows of the last category read only: skill gems alone are thousands of rows.
let rowCache: { chunk: DenseChunk, rows: MarketRow[] } | null = null

// Categories with at least one price, grouped like poe.ninja's side list.
export function categoryGroups (chunks: DenseChunk[]): CategoryGroup[] {
  let groups = groupCache.get(chunks)
  if (!groups) {
    groups = readGroups(chunks)
    groupCache.set(chunks, groups)
  }
  return groups
}

function readGroups (chunks: DenseChunk[]): CategoryGroup[] {
  const byType = new Map<string, Category>()
  for (const chunk of chunks) {
    const type = typeForSlug(chunk.url)
    if (!type || SKIPPED_TYPES.has(type) || byType.has(type)) continue
    const count = countEntries(chunk.lines)
    if (count) byType.set(type, { type, label: categoryLabel(type), count, chunk, sample: sampleNames(chunk.lines) })
  }
  const placed = new Set<string>()
  const groups = CATEGORY_GROUPS.map(g => ({
    label: g.label,
    categories: g.types.flatMap(t => {
      const c = byType.get(t)
      if (!c) return []
      placed.add(t)
      return [c]
    })
  }))
  const rest = [...byType.values()].filter(c => !placed.has(c.type))
  groups[0].categories.push(...rest)
  return groups.filter(g => g.categories.length)
}

export interface MarketRow {
  key: string
  type: string
  name: string
  variant: string
  chaos: number
  // Prices on the days poe.ninja has one, oldest first (for the line).
  trend: number[]
  // poe.ninja's own 7-day change in % (its graph's last value). Null when it
  // has none, or only zeros (poe.ninja shows "Not enough data").
  change: number | null
  // Change since the day before, in %. Null without both days.
  dayChange: number | null
  gaps: number
}

// One category's rows. poe.ninja's graph is 7 daily values, % change against
// the price today; null on days with no price.
export function parseCategory (type: string, chunk: DenseChunk): MarketRow[] {
  if (rowCache?.chunk !== chunk) rowCache = { chunk, rows: readRows(type, chunk) }
  return rowCache.rows
}

function readRows (type: string, chunk: DenseChunk): MarketRow[] {
  const out: MarketRow[] = []
  const seen = new Set<string>()
  const lines = chunk.lines
  let pos = lines.indexOf(ENTRY_START)
  while (pos !== -1) {
    // Entries hold no nested objects (graph is a flat array), so the first
    // closing brace ends one. parse.ts relies on this too.
    const end = lines.indexOf('}', pos)
    if (end === -1) break
    try {
      const info = JSON.parse(lines.slice(pos, end + 1)) as { name?: unknown, variant?: unknown, chaos?: unknown, graph?: unknown }
      if (typeof info.name === 'string' && typeof info.chaos === 'number' && Number.isFinite(info.chaos)) {
        const variant = typeof info.variant === 'string' ? info.variant : ''
        const key = `${info.name}\u0000${variant}`
        if (!seen.has(key)) {
          seen.add(key)
          const trend = trendLine(info.chaos, info.graph)
          out.push({
            key,
            type,
            name: info.name,
            variant,
            chaos: info.chaos,
            trend,
            change: weekChange(info.graph),
            dayChange: dayChange(info.graph),
            gaps: graphGaps(info.graph)
          })
        }
      }
    } catch {}
    pos = lines.indexOf(ENTRY_START, end)
  }
  return out
}

export function weekChange (graph: unknown): number | null {
  if (!Array.isArray(graph) || !graph.length) return null
  const last = graph[graph.length - 1]
  if (typeof last !== 'number' || !Number.isFinite(last)) return null
  return graph.some(v => typeof v === 'number' && v !== 0) ? last : null
}

export function dayChange (graph: unknown): number | null {
  if (!Array.isArray(graph) || graph.length < 2) return null
  const today = graph[graph.length - 1]
  const before = graph[graph.length - 2]
  if (typeof today !== 'number' || typeof before !== 'number' || 1 + before / 100 <= 0) return null
  return ((1 + today / 100) / (1 + before / 100) - 1) * 100
}

export function trendLine (chaos: number, graph: unknown): number[] {
  if (!Array.isArray(graph) || !graph.length) return []
  const last = graph[graph.length - 1]
  if (typeof last !== 'number' || 1 + last / 100 <= 0) return []
  const out: number[] = []
  for (const v of graph.slice(-7)) {
    if (typeof v === 'number' && Number.isFinite(v) && 1 + v / 100 > 0) {
      out.push(chaos * (1 + v / 100) / (1 + last / 100))
    }
  }
  return out
}

export type MarketSort = 'value' | 'name' | 'change'

const NAMES = new Intl.Collator('en')

export function sortRows (rows: MarketRow[], sort: MarketSort, desc: boolean): MarketRow[] {
  const dir = desc ? -1 : 1
  const sorted = [...rows]
  if (sort === 'name') sorted.sort((a, b) => dir * NAMES.compare(a.name, b.name) || b.chaos - a.chaos)
  // Rows without a change go last either way.
  else if (sort === 'change') sorted.sort((a, b) => a.change == null ? (b.change == null ? b.chaos - a.chaos : 1) : b.change == null ? -1 : dir * (a.change - b.change))
  else sorted.sort((a, b) => dir * (a.chaos - b.chaos))
  return sorted
}

// Words in any order, each matching the name or the variant.
export function filterRows (rows: MarketRow[], query: string): MarketRow[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return rows
  return rows.filter(r => {
    const text = `${r.name} ${r.variant}`.toLowerCase()
    return words.every(w => text.includes(w))
  })
}
