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
  // The poe.ninja variant priced (gems), for the tooltip.
  variant?: string
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
  // Your own price (Set my price), and poe.ninja's for the hover (null: none).
  mine?: boolean
  ninjaChaos?: number | null
  // Shown dimmed, outside the totals: no price at all, or ignored.
  state?: 'unpriced' | 'ignored'
}

export interface Valuation {
  chaos: number
  byCategory: Record<Category, number>
  lines: ValuedLine[]
  // Items with no price (rares, unknown): never searched on the trade site.
  unpriced: number
  // The same as lines (each worth 0), so they can be shown and given a price.
  unpricedLines: ValuedLine[]
  // Items you ignore: left out of every sum, listed to un-ignore.
  ignoredLines: ValuedLine[]
  // Everything you ignore, held now or not, and your prices: an item gone
  // since the last read is still worth what you said.
  ignoredKeys?: string[]
  ownPrices?: Record<string, number>
}

// Your prices and ignored items for one league, by itemKey.
export interface PricePrefs {
  // Chaos for one.
  prices: Record<string, number>
  ignored: string[]
}
export const emptyPrefs = (): PricePrefs => ({ prices: {}, ignored: [] })

// Where an item with your price but no poe.ninja one belongs.
// Uniques, relics (9) and supporter foils (10): priced and named as the unique.
export function isUniqueFrame (frame: number): boolean {
  return frame === 3 || frame === 9 || frame === 10
}

function categoryOfFrame (frame: number): Category {
  if (isUniqueFrame(frame)) return 'gear'
  if (frame === 6) return 'cards'
  if (frame === 5) return 'currency'
  return frame >= 1 && frame <= 4 ? 'gear' : 'other'
}

export interface ItemPrice { chaos: number, category: Category, graph?: Array<number | null>, ninja: number | null, mine: boolean, variant?: string }

// One item's price with your prices on top. null: no price.
export function priceItem (item: StashItemLike, priceOf: PriceOf, prefs: PricePrefs, key = itemKey(item)): ItemPrice | null {
  const ninja = priceOf(item)
  const ninjaChaos = ninja && ninja.chaos > 0 ? ninja.chaos : null
  const own = prefs.prices[key]
  if (typeof own === 'number' && Number.isFinite(own) && own >= 0) {
    return { chaos: own, category: ninja?.category ?? categoryOfFrame(item.frame), graph: ninja?.graph, ninja: ninjaChaos, mine: true, variant: ninja?.variant }
  }
  return ninja && ninjaChaos != null ? { chaos: ninjaChaos, category: ninja.category, graph: ninja.graph, ninja: ninjaChaos, mine: false, variant: ninja.variant } : null
}

// Gems by poe.ninja's variant ("1", "20", "21/20c", "1/20"), as price check
// names them (price-check/trends/getDetailsId.ts).
// `exactLevel`: the gem's own level, for gems that top out below 20 (Awakened
// at 5, Enlighten at 3...), which poe.ninja lists by that level.
export function gemVariant (item: StashItemLike, exactLevel = false): string {
  const level = item.gemLevel ?? 1
  let v = exactLevel || level >= 20 ? String(level) : '1'
  const q = item.quality ?? 0
  if (q) v += `/${q >= 16 && q <= 20 ? 20 : q}`
  if (item.corrupted) v += 'c'
  return v
}

export function itemKey (item: StashItemLike): string {
  // Uniques and rares by name and base (each rare is its own thing). Magic and
  // rare items are marked, so an unidentified rare map is never a normal one.
  const named = (isUniqueFrame(item.frame) || item.frame === 2) && item.name
  const name = named ? `${item.name} ${item.typeLine}` : item.typeLine
  const parts = [item.frame === 1 ? `M:${name}` : item.frame === 2 ? `R:${name}` : name]
  if (item.frame === 4) parts.push(`L${item.gemLevel ?? 1}`, `Q${item.quality ?? 0}`, item.corrupted ? 'C' : '')
  if (item.mapTier) parts.push(`T${item.mapTier}`)
  if (isUniqueFrame(item.frame) && (item.links ?? 0) >= 5) parts.push(`${item.links}L`)
  return parts.filter(Boolean).join('|')
}

export function itemLabel (item: StashItemLike): string {
  const base = isUniqueFrame(item.frame) && item.name ? item.name : item.typeLine
  if (item.frame === 2 && item.name) return `${item.name}, ${item.typeLine}`
  if (item.frame === 4) return `${base} ${item.gemLevel ?? 1}/${item.quality ?? 0}${item.corrupted ? ' corrupted' : ''}`
  if (item.mapTier && !isUniqueFrame(item.frame)) return `${base} (T${item.mapTier})`
  if (isUniqueFrame(item.frame) && (item.links ?? 0) >= 5) return `${base} ${item.links}L`
  return base
}

const emptyCats = (): Record<Category, number> => ({ currency: 0, fragments: 0, cards: 0, gear: 0, other: 0 })

export function valueStash (tabs: StashTabLike[], priceOf: PriceOf, prefs: PricePrefs = emptyPrefs()): Valuation {
  const lines = new Map<string, ValuedLine>()
  const unpricedLines = new Map<string, ValuedLine>()
  const ignoredLines = new Map<string, ValuedLine>()
  const ignored = new Set(prefs.ignored)
  let unpriced = 0
  for (const tab of tabs) {
    for (const item of tab.items) {
      const key = itemKey(item)
      const price = priceItem(item, priceOf, prefs, key)
      const off = ignored.has(key)
      if (!price && !off) unpriced++
      const into = off ? ignoredLines : price ? lines : unpricedLines
      let line = into.get(key)
      if (!line) {
        line = {
          key,
          name: itemLabel(item),
          icon: item.icon,
          category: price?.category ?? categoryOfFrame(item.frame),
          count: 0,
          unitChaos: price?.chaos ?? 0,
          chaos: 0,
          tabs: [],
          tabIds: [],
          frame: item.frame,
          tipName: isUniqueFrame(item.frame) && item.name ? item.name : item.typeLine,
          variant: item.frame === 4 ? (price?.variant ?? gemVariant(item)) : undefined,
          graph: price?.graph,
          mine: price?.mine || undefined,
          ninjaChaos: price?.ninja ?? null,
          state: off ? 'ignored' : price ? undefined : 'unpriced'
        }
        into.set(key, line)
      }
      if (tab.id && !line.tabIds.includes(tab.id)) line.tabIds.push(tab.id)
      line.count += item.stack
      line.chaos += (price?.chaos ?? 0) * item.stack
      if (!line.tabs.includes(tab.name)) line.tabs.push(tab.name)
    }
  }
  const byCategory = emptyCats()
  let chaos = 0
  for (const line of lines.values()) {
    byCategory[line.category] += line.chaos
    chaos += line.chaos
  }
  const sorted = (m: Map<string, ValuedLine>) => [...m.values()].sort((a, b) => b.chaos - a.chaos || a.name.localeCompare(b.name))
  return { chaos, byCategory, lines: sorted(lines), unpriced, unpricedLines: sorted(unpricedLines), ignoredLines: sorted(ignoredLines), ignoredKeys: [...ignored], ownPrices: { ...prefs.prices } }
}

// What a read held, small enough to keep: count and unit price per thing.
export type Baseline = Record<string, { name: string, icon: string, count: number, unitChaos: number }>

// Marks a baseline that holds unpriced and ignored items too (see diffStash).
export const BASELINE_V2 = '\u0000v2'

// Unpriced and ignored items too, so giving one a price or un-ignoring it later
// isn't booked as new.
export function baselineOf (v: Valuation): Baseline {
  const out: Baseline = { [BASELINE_V2]: { name: '', icon: '', count: 0, unitChaos: 0 } }
  for (const l of [...v.lines, ...(v.unpricedLines ?? []), ...(v.ignoredLines ?? [])]) {
    const had = out[l.key]
    out[l.key] = { name: l.name, icon: l.icon, count: (had?.count ?? 0) + l.count, unitChaos: Math.max(had?.unitChaos ?? 0, l.unitChaos) }
  }
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
// Ignored items never count, and items with no price are worth nothing.
export function diffStash (before: Baseline, after: Valuation, at: number): StashDiff {
  const added: DiffLine[] = []
  const removed: DiffLine[] = []
  const ignored = new Set([...(after.ignoredKeys ?? []), ...(after.ignoredLines ?? []).map(l => l.key)])
  const now = new Map([...(after.unpricedLines ?? []), ...after.lines].map(l => [l.key, l]))
  // A baseline from before your prices lacks unpriced items: one you priced
  // since isn't new.
  const old = !before[BASELINE_V2]
  for (const l of after.lines) {
    if (old && l.mine && before[l.key] == null) continue
    const had = before[l.key]?.count ?? 0
    if (l.count > had && l.unitChaos > 0) added.push({ key: l.key, name: l.name, icon: l.icon, count: l.count - had, chaos: (l.count - had) * l.unitChaos })
  }
  for (const [key, b] of Object.entries(before)) {
    if (key === BASELINE_V2 || ignored.has(key)) continue
    const left = now.get(key)
    const has = left?.count ?? 0
    const unit = left ? left.unitChaos : after.ownPrices?.[key] ?? b.unitChaos
    if (has < b.count && unit > 0) removed.push({ key, name: b.name, icon: b.icon, count: b.count - has, chaos: (b.count - has) * unit })
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
