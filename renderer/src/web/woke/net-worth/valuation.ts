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
  // Days of poe.ninja's last 7 with no price.
  gaps?: number
  // poe.ninja priced it today and on none of the days before (prices.ts).
  oneDay?: boolean
  // The app's own saved price on each day before today, oldest first, in
  // chaos (history.ts): what a spike is checked against.
  history?: Array<number | null>
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
  // 'jump': a thin price jump, held up to 6 hours. 'one-day': a price poe.ninja
  // has on only one day, not counted until it has a second. 'spike': 5x over
  // poe.ninja's own week, counted at its median (see holdJump, graphSpike).
  heldKind?: HoldKind
  // The last price from poe.ninja that could be trusted, kept through reads
  // with no price or a held one (saved in the baseline as ref).
  refChaos?: number
  // A gear spike on poe.ninja's line alone whose 6-hour hold ran out: when that
  // hold began, so the next read doesn't start it again (saved as released).
  releasedSince?: number
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

export interface ItemPrice { chaos: number, category: Category, graph?: Array<number | null>, ninja: number | null, mine: boolean, variant?: string, heldSince?: number, heldKind?: HoldKind, solid?: boolean, released?: number }

// ---------- price jumps in thin markets ----------
// One fake listing can set a thin item's poe.ninja price: The Witch read
// 7,075c (really 0.2c) for two hours. A thin item whose price jumps to 5x the
// last read's, and by at least 1c, keeps the last read's price for up to 6
// hours. It takes the new price sooner once poe.ninja's comes back down or
// the market stops being thin. Backtested on 3 days of poe.ninja prices: 2 in
// 3 fakes were gone within 6 hours; a real rise shows up at most 6 hours late.
//
// A price poe.ninja has on only one of the last 7 days, at 10c or more, is
// worse: The Web dropped off poe.ninja, came back at 28,886c (really 2c) and
// stayed for over a day; an Alteration Shard read 214c for 29 hours. Such a
// price doesn't count at all while it's 5x or more over the item's last solid
// price (ref), or there is none, until poe.ninja prices it on a second day.
// In 3 days of prices every card that did this was fake, and real one-day
// prices (maps, scrying orbs) stayed near their earlier price.
export const HOLD_RATIO = 5
export const HOLD_MIN_JUMP = 1
export const HOLD_MS = 6 * 3_600_000
export const ONE_DAY_MIN = 10

// A spike: a sudden step up from an item's usual price. Rain Tempter was 1c
// every day of the app's saved history, then poe.ninja priced it at 20,140c
// (98 div). poe.ninja's own line only showed +2,362%, because it ran from an
// earlier fake (818c), and the card was thin, so the 6-hour jump rule let it
// through. The price is checked against the app's saved daily prices (up to
// 14 days, history.ts); poe.ninja's % line, anchored at today's price, is only
// the fallback when the app has none. A step to 5x or more the last day
// before it counts at the median of the days before the step (2+ of them
// priced; 3+ for gear) until it has held 3 priced days (within half of today's).
// A step of 50x or more never counts on time alone: only once under 2 of the
// window's days are left from before it. A steady climb (under 5x a day)
// is never a step. Gear priced from poe.ninja's line alone lets go after 6
// hours, like a jump: its lines are sparse.
export const SPIKE_MIN_DAYS = 2
export const SPIKE_MIN_DAYS_GEAR = 3
export const SPIKE_KEEP_DAYS = 3
export const SPIKE_NEVER_RATIO = 50

export type HoldKind = 'jump' | 'one-day' | 'spike'

// poe.ninja's line as chaos per day, today last, from today's price: the line
// is % change from one reference day, so day / today is the price ratio.
export function graphChaos (chaos: number, graph: Array<number | null> | undefined): Array<number | null> {
  if (!Array.isArray(graph) || !graph.length) return []
  const today = graph[graph.length - 1]
  if (typeof today !== 'number' || !(1 + today / 100 > 0)) return []
  return graph.map(v => typeof v === 'number' && 1 + v / 100 > 0 ? chaos * (1 + v / 100) / (1 + today / 100) : null)
}

// A step up in a price series (today last, = chaos): 'confirmed' once it has
// held 3 priced days, else the price to count instead. null: no step.
export function seriesStep (chaos: number, series: Array<number | null>, minDays = SPIKE_MIN_DAYS): number | 'confirmed' | null {
  const priced = series.filter((v): v is number => typeof v === 'number' && v > 0)
  if (priced.length < 2) return null
  // The days at the new price, today back to the step (gaps skipped).
  let start = priced.length - 1
  while (start > 0 && priced[start - 1] >= chaos / 2) start--
  const before = priced.slice(0, start)
  if (!before.length || before.length < minDays) return null
  const last = before[before.length - 1]
  if (!(last > 0) || chaos < last * HOLD_RATIO) return null
  const sorted = [...before].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  const base = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  if (!(base > 0) || chaos < base * HOLD_RATIO || chaos - base < HOLD_MIN_JUMP) return null
  if (chaos >= base * SPIKE_NEVER_RATIO) return base
  return priced.length - start >= SPIKE_KEEP_DAYS ? 'confirmed' : base
}

export function graphStep (chaos: number, graph: Array<number | null> | undefined, minDays = SPIKE_MIN_DAYS): number | 'confirmed' | null {
  return seriesStep(chaos, graphChaos(chaos, graph), minDays)
}

// The price to count instead of a spike on poe.ninja's line, or null.
export function graphSpike (chaos: number, graph: Array<number | null> | undefined, minDays = SPIKE_MIN_DAYS): number | null {
  const step = graphStep(chaos, graph, minDays)
  return typeof step === 'number' ? step : null
}

// poe.ninja's line has today's price (within half) on its last 3 priced days.
function lineHeld (chaos: number, graph: Array<number | null> | undefined): boolean {
  const days = graphChaos(chaos, graph).filter((v): v is number => v != null)
  return days.length >= SPIKE_KEEP_DAYS && days.slice(-SPIKE_KEEP_DAYS).every(v => v >= chaos / 2)
}

// The step check on the app's saved prices when it has enough of them, else
// on poe.ninja's line. `saved`: which one it used.
export function priceStep (chaos: number, p: { graph?: Array<number | null>, history?: Array<number | null>, category?: Category }): { step: number | 'confirmed' | null, saved: boolean } {
  const minDays = p.category === 'gear' ? SPIKE_MIN_DAYS_GEAR : SPIKE_MIN_DAYS
  const saved = (p.history ?? []).filter(v => typeof v === 'number' && v > 0).length >= minDays
  if (saved) {
    const step = seriesStep(chaos, [...p.history!, chaos], minDays)
    // poe.ninja has had it 3 days too (a day the app saved nothing): real,
    // unless it's a 50x step.
    if (typeof step === 'number' && chaos < step * SPIKE_NEVER_RATIO && lineHeld(chaos, p.graph)) return { step: 'confirmed', saved }
    return { step, saved }
  }
  return { step: graphStep(chaos, p.graph, minDays), saved }
}

// The last read's price for an item, and since when it was held.
export interface HoldGuard { before: Baseline | null, now: number }

// The price to count instead and since when, or null to take poe.ninja's.
// Gear (uniques, gems) is left out of the one-day rule: many trade on so few days
// that poe.ninja's line is mostly empty, and those were real prices.
export function holdJump (ninja: number, p: { thin?: boolean, oneDay?: boolean, category?: Category, graph?: Array<number | null>, history?: Array<number | null> }, prev: Baseline[string] | undefined, now: number): { chaos: number, since: number, kind: HoldKind } | null {
  const sinceFor = (kind: HoldKind) => prev?.heldSince != null && (prev.heldKind ?? 'jump') === kind
    ? prev.heldSince
    // A gear spike whose hold ran out keeps its start: it isn't held again.
    : kind === 'spike' && releasedFor(ninja, prev) != null ? prev!.released! : now
  // Only a solid price vouches for a one-day one: an older baseline's price
  // may itself have been a fake.
  const ref = prev?.ref != null && prev.ref > 0 ? prev.ref : null
  if (p.oneDay && p.category !== 'gear' && ninja >= ONE_DAY_MIN && (ref == null || ninja >= ref * HOLD_RATIO)) {
    return { chaos: ref ?? 0, since: sinceFor('one-day'), kind: 'one-day' }
  }
  const { step, saved } = priceStep(ninja, p)
  if (typeof step === 'number') {
    const since = sinceFor('spike')
    // Gear on poe.ninja's sparse line alone: its hold ends after 6 hours, as a jump's does.
    if (saved || p.category !== 'gear' || now - since < HOLD_MS) return { chaos: step, since, kind: 'spike' }
    return null
  }
  // poe.ninja has had it for 3 days: real, never a thin jump to hold again.
  if (step === 'confirmed' || prev?.heldKind === 'spike') return null
  if (!p.thin || !prev || prev.mine) return null
  const base = ref ?? prev.unitChaos
  if (!(base > 0) || ninja < base * HOLD_RATIO || ninja - base < HOLD_MIN_JUMP) return null
  // A one-day hold that ended gets the full 6 hours as a jump.
  const since = sinceFor('jump')
  return now - since < HOLD_MS ? { chaos: base, since, kind: 'jump' } : null
}

// A released spike's start, while poe.ninja's price is still the one let go:
// a fresh jump of 5x or more over what the last read counted is a new spike.
function releasedFor (ninja: number, prev: Baseline[string] | undefined): number | undefined {
  if (prev?.released == null) return undefined
  return prev.unitChaos > 0 && ninja >= prev.unitChaos * HOLD_RATIO ? undefined : prev.released
}

// A gear spike on poe.ninja's line alone that holdJump let go after 6 hours:
// when its hold began, kept in the baseline so the next read, which finds the
// same step, doesn't start a fresh hold. undefined: not such a spike.
export function spikeReleased (ninja: number, p: { category?: Category, graph?: Array<number | null>, history?: Array<number | null> }, prev: Baseline[string] | undefined, now: number): number | undefined {
  if (p.category !== 'gear') return undefined
  const { step, saved } = priceStep(ninja, p)
  if (typeof step !== 'number' || saved) return undefined
  const since = prev?.heldSince != null && prev.heldKind === 'spike' ? prev.heldSince : releasedFor(ninja, prev)
  return since != null && now - since >= HOLD_MS ? since : undefined
}

function spikeOnly (ninja: number, p: { graph?: Array<number | null>, history?: Array<number | null>, category?: Category }): { chaos: number, since: number, kind: HoldKind } | null {
  const { step } = priceStep(ninja, p)
  return typeof step === 'number' ? { chaos: step, since: Date.now(), kind: 'spike' } : null
}

// One item's price with your prices on top. null: no price.
// `guard`: the last read, so a jump in a thin market is held (holdJump).
// `hold`: false for an ignored item, which counts for nothing and is never held.
export function priceItem (item: StashItemLike, priceOf: PriceOf, prefs: PricePrefs, key = itemKey(item), guard?: HoldGuard, hold = true): ItemPrice | null {
  const ninja = priceOf(item)
  const ninjaChaos = ninja && ninja.chaos > 0 ? ninja.chaos : null
  const own = prefs.prices[key]
  if (typeof own === 'number' && Number.isFinite(own) && own >= 0) {
    return { chaos: own, category: ninja?.category ?? categoryOfFrame(item.frame), graph: ninja?.graph, ninja: ninjaChaos, mine: true, variant: ninja?.variant }
  }
  if (!ninja || ninjaChaos == null) return null
  // With no last read, the spike on poe.ninja's own line still counts.
  const held = !hold
    ? null
    : guard
      ? holdJump(ninjaChaos, ninja, guard.before?.[key], guard.now)
      : spikeOnly(ninjaChaos, ninja)
  const out: ItemPrice = { chaos: held?.chaos ?? ninjaChaos, category: ninja.category, graph: ninja.graph, ninja: ninjaChaos, mine: false, variant: ninja.variant }
  if (held) {
    out.heldSince = held.since
    out.heldKind = held.kind
  } else if (!ninja.oneDay) out.solid = true
  if (!held && hold && guard) {
    const released = spikeReleased(ninjaChaos, ninja, guard.before?.[key], guard.now)
    if (released != null) out.released = released
  }
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

// A magic or rare map: priced by its base (prices.ts), so counted by it.
export function isRolledMap (item: Pick<StashItemLike, 'frame' | 'mapTier' | 'baseType'>): boolean {
  return (item.frame === 1 || item.frame === 2) && (!!item.mapTier || /\bMap$/.test(item.baseType))
}

// A rolled map's base as poe.ninja names it: blighted ones keep "Blighted"
// ("Blighted Strand Map"), which the API's baseType leaves out.
export function mapBase (item: Pick<StashItemLike, 'typeLine' | 'baseType'>): string {
  const blight = /\b(Blight-ravaged|Blighted) /.exec(item.typeLine)?.[1]
  return blight && !item.baseType.startsWith(blight) ? `${blight} ${item.baseType}` : item.baseType
}

// The name the app's saved prices (history.ts) know an item by, as prices.ts
// looks it up: a unique's name, a rolled map's base, else its typeLine.
export function historyName (item: StashItemLike): string {
  return isUniqueFrame(item.frame) && item.name ? item.name : isRolledMap(item) ? mapBase(item) : item.typeLine
}

// Keys of rolled maps (itemKey), which baselines before BASELINE_V3 kept
// by each map's own name, unpriced.
const ROLLED_MAP_KEY = /^[MR]:[^|]*\bMap(\|T\d+)?$/

export function itemKey (item: StashItemLike): string {
  // Uniques and rares by name and base (each rare is its own thing). Magic and
  // rare items are marked, so an unidentified rare map is never a normal one.
  // Magic and rare maps go by their base: 40 rare Nightmare Maps are one row.
  const rolledMap = isRolledMap(item)
  const named = (isUniqueFrame(item.frame) || item.frame === 2) && item.name && !rolledMap
  const name = named ? `${item.name} ${item.typeLine}` : rolledMap ? mapBase(item) : item.typeLine
  const parts = [item.frame === 1 ? `M:${name}` : item.frame === 2 ? `R:${name}` : name]
  if (item.frame === 4) parts.push(`L${item.gemLevel ?? 1}`, `Q${item.quality ?? 0}`, item.corrupted ? 'C' : '')
  if (item.mapTier) parts.push(`T${item.mapTier}`)
  if (isUniqueFrame(item.frame) && (item.links ?? 0) >= 5) parts.push(`${item.links}L`)
  return parts.filter(Boolean).join('|')
}

export function itemLabel (item: StashItemLike): string {
  const base = isUniqueFrame(item.frame) && item.name ? item.name : isRolledMap(item) ? mapBase(item) : item.typeLine
  if (isRolledMap(item)) return `${base} (${item.mapTier ? `T${item.mapTier}, ` : ''}${item.frame === 2 ? 'rare' : 'magic'})`
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
      const price = priceItem(item, priceOf, prefs, key, off ? undefined : guard, !off)
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
          tipName: isUniqueFrame(item.frame) && item.name ? item.name : isRolledMap(item) ? mapBase(item) : item.typeLine,
          variant: item.frame === 4 ? (price?.variant ?? gemVariant(item)) : undefined,
          graph: price?.graph,
          mine: price?.mine || undefined,
          ninjaChaos: price?.ninja ?? null,
          state: off ? 'ignored' : price ? undefined : 'unpriced'
        }
        if (price?.heldSince != null) {
          line.heldSince = price.heldSince
          line.heldKind = price.heldKind
        }
        if (price?.released != null) line.releasedSince = price.released
        const ref = price?.solid ? price.chaos : guard?.before?.[key]?.ref
        if (ref != null && ref > 0) line.refChaos = ref
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
// ref: the last solid poe.ninja price (ValuedLine.refChaos); older baselines lack it.
// released: a gear spike's hold ran out; when it began (ValuedLine.releasedSince).
export type Baseline = Record<string, { name: string, icon: string, count: number, unitChaos: number, cat?: Category, heldSince?: number, heldKind?: HoldKind, mine?: boolean, ref?: number, released?: number }>

// Marks a baseline that holds unpriced and ignored items too (see diffStash).
export const BASELINE_V2 = '\u0000v2'
// Rolled maps keyed by their base (2026-11-23).
export const BASELINE_V3 = '\u0000v3'

// Unpriced and ignored items too, so giving one a price or un-ignoring it later
// isn't booked as new.
export function baselineOf (v: Valuation): Baseline {
  const out: Baseline = { [BASELINE_V2]: { name: '', icon: '', count: 0, unitChaos: 0 }, [BASELINE_V3]: { name: '', icon: '', count: 0, unitChaos: 0 } }
  for (const l of [...v.lines, ...(v.unpricedLines ?? []), ...(v.ignoredLines ?? [])]) {
    const had = out[l.key]
    out[l.key] = { name: l.name, icon: l.icon, count: (had?.count ?? 0) + l.count, unitChaos: Math.max(had?.unitChaos ?? 0, l.unitChaos), cat: l.category }
    const since = l.heldSince ?? had?.heldSince
    if (since != null) out[l.key].heldSince = since
    const kind = l.heldKind ?? had?.heldKind
    if (kind) out[l.key].heldKind = kind
    if (l.mine || had?.mine) out[l.key].mine = true
    const ref = l.refChaos ?? had?.ref
    if (ref != null) out[l.key].ref = ref
    const released = l.releasedSince ?? had?.released
    if (released != null) out[l.key].released = released
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
  // A baseline from before rolled maps had a price kept them by their own
  // names: under their new key they aren't new.
  const oldMaps = !before[BASELINE_V3]
  let cash = 0
  for (const l of after.lines) {
    if (old && l.mine && before[l.key] == null) continue
    if (oldMaps && before[l.key] == null && ROLLED_MAP_KEY.test(l.key)) continue
    const had = before[l.key]?.count ?? 0
    if (l.count > had && l.unitChaos > 0) {
      added.push({ key: l.key, name: l.name, icon: l.icon, count: l.count - had, chaos: (l.count - had) * l.unitChaos })
      if (l.category === 'currency') cash += (l.count - had) * l.unitChaos
    }
  }
  for (const [key, b] of Object.entries(before)) {
    if (key === BASELINE_V2 || key === BASELINE_V3 || ignored.has(key)) continue
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
