// Net worth data layer: values stash items, sums them by category, diffs two
// reads and keeps daily snapshots. Knows nothing about how the stash was read
// (the personal reader today; another source later) or about Vue.
import { resolveSpends } from './spend'
import type { SpendKind, SpendMark } from './spend'

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
  // A thin market: poe.ninja had no price on 3+ of its last 7 days.
  thin?: boolean
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
  // poe.ninja's price jumped in a thin market: unitChaos is the last read's
  // price, held since then (see holdJump). ninjaChaos is the jumped one.
  heldSince?: number
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

// poe.ninja's category slug (from its url) to ours. Omens trade like
// currency (the currency exchange), so they count as currency and liquid.
const CURRENCY_SLUGS = new Set(['currency', 'omens'])
const FRAGMENT_SLUGS = new Set(['fragments', 'scarabs', 'invitations', 'artifacts'])

export function categoryOfSlug (slug: string): Category {
  return CURRENCY_SLUGS.has(slug) ? 'currency' : FRAGMENT_SLUGS.has(slug) ? 'fragments' : 'other'
}

function categoryOfFrame (frame: number): Category {
  if (isUniqueFrame(frame)) return 'gear'
  if (frame === 6) return 'cards'
  if (frame === 5) return 'currency'
  return frame >= 1 && frame <= 4 ? 'gear' : 'other'
}

export interface ItemPrice { chaos: number, category: Category, graph?: Array<number | null>, ninja: number | null, mine: boolean, variant?: string, heldSince?: number }

// ---------- price jumps in thin markets ----------
// One fake listing can set a thin item's poe.ninja price: The Witch read
// 7,075c (really 0.2c) for two hours. A thin item whose price jumps to 5x the
// last read's, and by at least 1c, keeps the last read's price for up to 6
// hours. It takes the new price sooner once poe.ninja's comes back down or
// the market stops being thin. Backtested on 3 days of poe.ninja prices: 2 in
// 3 fakes were gone within 6 hours; a real rise shows up at most 6 hours late.
export const HOLD_RATIO = 5
export const HOLD_MIN_JUMP = 1
export const HOLD_MS = 6 * 3_600_000

// The last read's price for an item, and since when it was held.
export interface HoldGuard { before: Baseline | null, now: number }

// The held price and since when, or null to take poe.ninja's.
export function holdJump (ninja: number, thin: boolean | undefined, prev: Baseline[string] | undefined, now: number): { chaos: number, since: number } | null {
  if (!thin || !prev || prev.mine || !(prev.unitChaos > 0)) return null
  if (ninja < prev.unitChaos * HOLD_RATIO || ninja - prev.unitChaos < HOLD_MIN_JUMP) return null
  const since = prev.heldSince ?? now
  return now - since < HOLD_MS ? { chaos: prev.unitChaos, since } : null
}

// One item's price with your prices on top. null: no price.
// `guard`: the last read, so a jump in a thin market is held (holdJump).
export function priceItem (item: StashItemLike, priceOf: PriceOf, prefs: PricePrefs, key = itemKey(item), guard?: HoldGuard): ItemPrice | null {
  const ninja = priceOf(item)
  const ninjaChaos = ninja && ninja.chaos > 0 ? ninja.chaos : null
  const own = prefs.prices[key]
  if (typeof own === 'number' && Number.isFinite(own) && own >= 0) {
    return { chaos: own, category: ninja?.category ?? categoryOfFrame(item.frame), graph: ninja?.graph, ninja: ninjaChaos, mine: true, variant: ninja?.variant }
  }
  if (!ninja || ninjaChaos == null) return null
  const held = guard ? holdJump(ninjaChaos, ninja.thin, guard.before?.[key], guard.now) : null
  const out: ItemPrice = { chaos: held?.chaos ?? ninjaChaos, category: ninja.category, graph: ninja.graph, ninja: ninjaChaos, mine: false, variant: ninja.variant }
  if (held) out.heldSince = held.since
  return out
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

export function valueStash (tabs: StashTabLike[], priceOf: PriceOf, prefs: PricePrefs = emptyPrefs(), guard?: HoldGuard): Valuation {
  const lines = new Map<string, ValuedLine>()
  const unpricedLines = new Map<string, ValuedLine>()
  const ignoredLines = new Map<string, ValuedLine>()
  const ignored = new Set(prefs.ignored)
  let unpriced = 0
  for (const tab of tabs) {
    for (const item of tab.items) {
      const key = itemKey(item)
      const off = ignored.has(key)
      // An ignored item counts for nothing: no hold, so it can't outlive it.
      const price = priceItem(item, priceOf, prefs, key, off ? undefined : guard)
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
        if (price?.heldSince != null) line.heldSince = price.heldSince
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
// cat: where the item belongs (older baselines lack it).
// heldSince: the price is held (holdJump) since then.
// mine: unitChaos is your own price, so it isn't the last poe.ninja price.
export type Baseline = Record<string, { name: string, icon: string, count: number, unitChaos: number, cat?: Category, heldSince?: number, mine?: boolean }>

// Marks a baseline that holds unpriced and ignored items too (see diffStash).
export const BASELINE_V2 = '\u0000v2'

// Unpriced and ignored items too, so giving one a price or un-ignoring it later
// isn't booked as new.
export function baselineOf (v: Valuation): Baseline {
  const out: Baseline = { [BASELINE_V2]: { name: '', icon: '', count: 0, unitChaos: 0 } }
  for (const l of [...v.lines, ...(v.unpricedLines ?? []), ...(v.ignoredLines ?? [])]) {
    const had = out[l.key]
    out[l.key] = { name: l.name, icon: l.icon, count: (had?.count ?? 0) + l.count, unitChaos: Math.max(had?.unitChaos ?? 0, l.unitChaos), cat: l.category }
    const since = l.heldSince ?? had?.heldSince
    if (since != null) out[l.key].heldSince = since
    if (l.mine || had?.mine) out[l.key].mine = true
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
  // The currency part of netChaos (spend.ts tells purchases from losses).
  // Older diffs lack it.
  cashChaos?: number
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
  let cash = 0
  for (const l of after.lines) {
    if (old && l.mine && before[l.key] == null) continue
    const had = before[l.key]?.count ?? 0
    if (l.count > had && l.unitChaos > 0) {
      added.push({ key: l.key, name: l.name, icon: l.icon, count: l.count - had, chaos: (l.count - had) * l.unitChaos })
      if (l.category === 'currency') cash += (l.count - had) * l.unitChaos
    }
  }
  for (const [key, b] of Object.entries(before)) {
    if (key === BASELINE_V2 || ignored.has(key)) continue
    const left = now.get(key)
    const has = left?.count ?? 0
    const unit = left ? left.unitChaos : after.ownPrices?.[key] ?? b.unitChaos
    if (has < b.count && unit > 0) {
      removed.push({ key, name: b.name, icon: b.icon, count: b.count - has, chaos: (b.count - has) * unit })
      if ((left?.category ?? b.cat) === 'currency') cash -= (b.count - has) * unit
    }
  }
  const sum = (xs: DiffLine[]) => xs.reduce((s, x) => s + x.chaos, 0)
  added.sort((a, b) => b.chaos - a.chaos)
  removed.sort((a, b) => b.chaos - a.chaos)
  return { at, added, removed, netChaos: sum(added) - sum(removed), cashChaos: cash }
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
  // Purchases and their returns (spend.ts). Older gains lack them.
  cashChaos?: number
  auto?: SpendKind
  mark?: SpendMark
  markChaos?: number
  topAddChaos?: number
}

const MAX_GAINS = 2000

export function gainOf (diff: StashDiff, since: number | null, divine: number | null, guess: Pick<StashGain, 'auto'> = {}): StashGain {
  return {
    ...guess,
    cashChaos: diff.cashChaos,
    topAddChaos: diff.added[0]?.chaos ?? 0,
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
// read, so a session's profit counts the reads inside it. Purchases count at
// most 0 (spend.ts); `spent` is what they left out.
export function gainsBetween (gains: StashGain[], from: number, to: number) {
  // Worked out over every gain: a purchase before `from` can be cancelled inside.
  const share = resolveSpends(gains)
  const inside = gains.filter(g => g.at >= from && g.at <= to)
  const counted = (g: StashGain) => share.get(g.at)?.counted ?? g.netChaos
  const chaos = inside.reduce((s, g) => s + counted(g), 0)
  const spent = inside.reduce((s, g) => s + (share.get(g.at)?.spent ?? 0), 0)
  // Each gain in divines at its own read's rate.
  const divOf = (g: StashGain) => {
    const c = counted(g)
    if (c === g.netChaos) return g.netDivine!
    return g.netChaos ? g.netDivine! * c / g.netChaos : 0
  }
  const divine = inside.every(g => g.netDivine != null) ? inside.reduce((s, g) => s + divOf(g), 0) : null
  return { chaos, divine, spent, reads: inside.length, first: inside[0]?.at ?? null, last: inside[inside.length - 1]?.at ?? null }
}

// Which tabs a read covered: a baseline only compares with a read of the same tabs.
export function tabSetOf (tabs: Array<{ id: string }>): string {
  return tabs.map(t => t.id).sort().join(',')
}
