// Net worth data layer: values stash items, sums them by category, diffs two
// reads and keeps daily snapshots. Knows nothing about how the stash was read
// (the personal reader today; another source later) or about Vue.

// The item fields valuing needs. The personal reader's records fit it.
export interface StashItemLike {
  name: string
  typeLine: string
  baseType: string
  frame: number
  stack: number
  icon: string
  gemLevel?: number
  quality?: number
  mapTier?: number
  links?: number
  corrupted?: boolean
}

export interface StashTabLike {
  id?: string
  name: string
  items: StashItemLike[]
}

export type Category = 'currency' | 'fragments' | 'cards' | 'gear' | 'other'

export const CATEGORIES: Array<{ id: Category, label: string }> = [
  { id: 'currency', label: 'Currency' },
  { id: 'fragments', label: 'Fragments' },
  { id: 'cards', label: 'Div cards' },
  { id: 'gear', label: 'Gear (priced)' },
  { id: 'other', label: 'Other' }
]

// A price for one of an item, and where it belongs. null: no price.
export interface Priced {
  chaos: number
  category: Category
  // poe.ninja's 7-day line (% change since its first day), when it has one.
  graph?: Array<number | null>
}
export type PriceOf = (item: StashItemLike) => Priced | null

// The same thing in any tab, counted together.
export interface ValuedLine {
  key: string
  name: string
  icon: string
  category: Category
  count: number
  unitChaos: number
  chaos: number
  tabs: string[]
  tabIds: string[]
  // For the item tooltip and menu: the name the game uses, a gem's variant.
  frame: number
  tipName: string
  variant?: string
  graph?: Array<number | null>
}

export interface Valuation {
  chaos: number
  byCategory: Record<Category, number>
  lines: ValuedLine[]
  // Items with no price (rares, unknown): never searched on the trade site.
  unpriced: number
}

// Gems by poe.ninja's variant ("1", "20", "21/20c", "1/20"), as price check
// names them (price-check/trends/getDetailsId.ts).
export function gemVariant (item: StashItemLike): string {
  const level = item.gemLevel ?? 1
  let v = level >= 20 ? String(level) : '1'
  const q = item.quality ?? 0
  if (q) v += `/${q >= 16 && q <= 20 ? 20 : q}`
  if (item.corrupted) v += 'c'
  return v
}

export function itemKey (item: StashItemLike): string {
  const name = item.frame === 3 && item.name ? `${item.name} ${item.typeLine}` : item.typeLine
  const parts = [name]
  if (item.frame === 4) parts.push(`L${item.gemLevel ?? 1}`, `Q${item.quality ?? 0}`, item.corrupted ? 'C' : '')
  if (item.mapTier) parts.push(`T${item.mapTier}`)
  if (item.frame === 3 && (item.links ?? 0) >= 5) parts.push(`${item.links}L`)
  return parts.filter(Boolean).join('|')
}

export function itemLabel (item: StashItemLike): string {
  const base = item.frame === 3 && item.name ? item.name : item.typeLine
  if (item.frame === 4) return `${base} ${item.gemLevel ?? 1}/${item.quality ?? 0}${item.corrupted ? ' corrupted' : ''}`
  if (item.mapTier && item.frame !== 3) return `${base} (T${item.mapTier})`
  if (item.frame === 3 && (item.links ?? 0) >= 5) return `${base} ${item.links}L`
  return base
}

const emptyCats = (): Record<Category, number> => ({ currency: 0, fragments: 0, cards: 0, gear: 0, other: 0 })

export function valueStash (tabs: StashTabLike[], priceOf: PriceOf): Valuation {
  const lines = new Map<string, ValuedLine>()
  let unpriced = 0
  for (const tab of tabs) {
    for (const item of tab.items) {
      const price = priceOf(item)
      if (!price || !(price.chaos > 0)) {
        unpriced++
        continue
      }
      const key = itemKey(item)
      let line = lines.get(key)
      if (!line) {
        line = {
          key,
          name: itemLabel(item),
          icon: item.icon,
          category: price.category,
          count: 0,
          unitChaos: price.chaos,
          chaos: 0,
          tabs: [],
          tabIds: [],
          frame: item.frame,
          tipName: item.frame === 3 && item.name ? item.name : item.typeLine,
          variant: item.frame === 4 ? gemVariant(item) : undefined,
          graph: price.graph
        }
        lines.set(key, line)
      }
      if (tab.id && !line.tabIds.includes(tab.id)) line.tabIds.push(tab.id)
      line.count += item.stack
      line.chaos += price.chaos * item.stack
      if (!line.tabs.includes(tab.name)) line.tabs.push(tab.name)
    }
  }
  const byCategory = emptyCats()
  let chaos = 0
  for (const line of lines.values()) {
    byCategory[line.category] += line.chaos
    chaos += line.chaos
  }
  return { chaos, byCategory, lines: [...lines.values()].sort((a, b) => b.chaos - a.chaos), unpriced }
}

// What a read held, small enough to keep: count and unit price per thing.
export type Baseline = Record<string, { name: string, icon: string, count: number, unitChaos: number }>

export function baselineOf (v: Valuation): Baseline {
  const out: Baseline = {}
  for (const l of v.lines) out[l.key] = { name: l.name, icon: l.icon, count: l.count, unitChaos: l.unitChaos }
  return out
}

export interface DiffLine { key: string, name: string, icon: string, count: number, chaos: number }

export interface StashDiff {
  at: number
  added: DiffLine[]
  removed: DiffLine[]
  // Added minus removed, at today's prices. Price moves alone don't count.
  netChaos: number
}

// Items that came or went between two reads (moving between tabs isn't a change).
export function diffStash (before: Baseline, after: Valuation, at: number): StashDiff {
  const added: DiffLine[] = []
  const removed: DiffLine[] = []
  const now = new Map(after.lines.map(l => [l.key, l]))
  for (const l of after.lines) {
    const had = before[l.key]?.count ?? 0
    if (l.count > had) added.push({ key: l.key, name: l.name, icon: l.icon, count: l.count - had, chaos: (l.count - had) * l.unitChaos })
  }
  for (const [key, b] of Object.entries(before)) {
    const left = now.get(key)
    const has = left?.count ?? 0
    if (has < b.count) {
      const unit = left?.unitChaos ?? b.unitChaos
      removed.push({ key, name: b.name, icon: b.icon, count: b.count - has, chaos: (b.count - has) * unit })
    }
  }
  const sum = (xs: DiffLine[]) => xs.reduce((s, x) => s + x.chaos, 0)
  added.sort((a, b) => b.chaos - a.chaos)
  removed.sort((a, b) => b.chaos - a.chaos)
  return { at, added, removed, netChaos: sum(added) - sum(removed) }
}

// ---------- daily snapshots (for a profit graph later) ----------

export interface DaySnapshot {
  // Last read of the day.
  at: number
  chaos: number
  divine: number | null
  byCategory: Record<Category, number>
}

export interface NetWorthHistory {
  days: Record<string, DaySnapshot>
  // Today's reads, for "per hour today".
  today: { day: string, points: Array<{ at: number, chaos: number }> }
  // The read already counted (so a reload doesn't count it twice).
  countedReadAt: number | null
  lastDiff: StashDiff | null
}

export const emptyHistory = (): NetWorthHistory => ({ days: {}, today: { day: '', points: [] }, countedReadAt: null, lastDiff: null })

export function dayOf (at: number): string {
  const d = new Date(at)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const MAX_POINTS = 96

export function recordRead (h: NetWorthHistory, v: Valuation, divine: number | null, at: number): NetWorthHistory {
  const day = dayOf(at)
  const days = { ...h.days, [day]: { at, chaos: v.chaos, divine, byCategory: { ...v.byCategory } } }
  const points = h.today.day === day ? [...h.today.points, { at, chaos: v.chaos }].slice(-MAX_POINTS) : [{ at, chaos: v.chaos }]
  return { ...h, days, today: { day, points }, countedReadAt: at }
}

// Divines now against the last read of an earlier day (each in its own day's rate).
export function sinceYesterday (h: NetWorthHistory, chaosNow: number, divineNow: number | null, at: number): number | null {
  if (!divineNow) return null
  const today = dayOf(at)
  const earlier = Object.keys(h.days).filter(d => d < today).sort().pop()
  const prev = earlier ? h.days[earlier] : null
  if (!prev) return null
  return chaosNow / divineNow - prev.chaos / (prev.divine ?? divineNow)
}

// Chaos per hour across today's reads. Needs at least 20 minutes between them.
export function perHourToday (h: NetWorthHistory, at: number): number | null {
  if (h.today.day !== dayOf(at) || h.today.points.length < 2) return null
  const first = h.today.points[0]
  const last = h.today.points[h.today.points.length - 1]
  const hours = (last.at - first.at) / 3_600_000
  if (hours < 1 / 3) return null
  return (last.chaos - first.chaos) / hours
}

// ---------- gains per refresh (session profit for other modules) ----------

// One refresh's net change: what came in minus what went out.
export interface StashGain {
  at: number
  // The read before this one: the gain happened between the two.
  since: number | null
  netChaos: number
  netDivine: number | null
  added: number
  removed: number
}

const MAX_GAINS = 2000

export function gainOf (diff: StashDiff, since: number | null, divine: number | null): StashGain {
  return {
    at: diff.at,
    since,
    netChaos: diff.netChaos,
    netDivine: divine ? diff.netChaos / divine : null,
    added: diff.added.length,
    removed: diff.removed.length
  }
}

export function addGain (gains: StashGain[], gain: StashGain): StashGain[] {
  return [...gains.filter(g => g.at !== gain.at), gain].sort((a, b) => a.at - b.at).slice(-MAX_GAINS)
}

// Refreshes whose read landed in [from, to], summed. Gains are only seen at a
// read, so a session's profit counts the reads inside it.
export function gainsBetween (gains: StashGain[], from: number, to: number) {
  const inside = gains.filter(g => g.at >= from && g.at <= to)
  const chaos = inside.reduce((s, g) => s + g.netChaos, 0)
  const divine = inside.every(g => g.netDivine != null) ? inside.reduce((s, g) => s + g.netDivine!, 0) : null
  return { chaos, divine, reads: inside.length, first: inside[0]?.at ?? null, last: inside[inside.length - 1]?.at ?? null }
}

// Which tabs a read covered: a baseline only compares with a read of the same tabs.
export function tabSetOf (tabs: Array<{ id: string }>): string {
  return tabs.map(t => t.id).sort().join(',')
}
