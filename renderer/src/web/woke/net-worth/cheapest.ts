// "Still cheapest?" on Net worth › Listed (WOKEPOET-535): on a click, one
// trade search for one of your listings, instant buyout only, cheapest
// first, and one fetch of the ten cheapest. The row then says where your ask
// ranks among other sellers' and what the cheapest asks.
//
// Only on a click (Guy's rule: no trade search he didn't ask for). A check
// belongs to the asking price it was made at: a reprice makes it old.
// Rare gear has no check: a search by name can't compare rares.
// Pure: no Vue, no IO.
import type { Listing } from './faustus'
import { ROLLED_UNIQUES } from './pending'
import { saleType } from './sales'

export interface CheapestCheck {
  at: number
  // Your asking price when checked.
  price: { amount: number, currency: string }
  // Other sellers asking less than you (each, for a stack).
  cheaper: number
  // Every fetched listing was cheaper than yours: there may be more.
  more?: boolean
  // Other sellers' asks in chaos each, cheapest first (at most 5).
  // A stack's ask is its price note over its size, as Listed's Suggest
  // column takes a stack's price (the whole stack).
  asks: number[]
  // Other instant buyout listings of it on the trade site.
  total: number
  // Its rolls, corruption or mods move the price: a name search is rough.
  rough?: boolean
}

export interface CheapestDoc {
  league: string
  // Item id → its last check.
  checks: Record<string, CheapestCheck>
}

export const cheapestKey = (league: string) => `${league}-cheapest`
export const MAX_ASKS = 5
const MAX_KEPT = 300
// Asks this close to yours are a tie, not cheaper.
const TIE = 0.005

export function isCheapestDoc (x: unknown): x is CheapestDoc {
  return x != null && typeof x === 'object' && typeof (x as CheapestDoc).league === 'string' &&
    (x as CheapestDoc).checks != null && typeof (x as CheapestDoc).checks === 'object'
}

const isRare = (l: Listing) => l.frameType === 1 || l.frameType === 2
const isUnique = (l: Listing) => l.frameType === 3 || l.frameType === 9

// Whether a listing can be checked: everything but gear that isn't unique
// (a base's price is in its mods, item level or influence, which a search by
// type can't see). A magic or rare map is checked by its base and tier, roughly.
export function canCheck (l: Listing): boolean {
  if (isRare(l)) return l.mapTier != null
  if (l.frameType === 0 && saleType(l) === 'gear') return false
  return !!(l.typeLine || l.baseType)
}

export function isRough (l: Listing): boolean {
  if (isRare(l)) return true
  return isUnique(l) && (!!l.corrupted || ROLLED_UNIQUES.has(l.name) || ROLLED_UNIQUES.has(l.typeLine))
}

type Range = { min?: number, max?: number }
// A transfigured gem's trade type: its normal gem and a discriminator.
export interface GemType { option: string, discriminator: string }

// The trade search for others' instant buyout listings of the same item,
// cheapest first. Null: not checkable.
export function cheapestQuery (l: Listing, transfigured?: GemType | null) {
  if (!canCheck(l)) return null
  const misc: Record<string, Range | { option: string }> = {}
  const filters: Record<string, { filters: Record<string, unknown> }> = {}
  const query: { status: { option: 'securable' }, name?: string, type?: string | GemType, stats: Array<{ type: 'and', filters: [] }>, filters: typeof filters } =
    { status: { option: 'securable' }, stats: [{ type: 'and', filters: [] }], filters }
  if (isUnique(l)) {
    if (l.name) query.name = l.name
    query.type = l.baseType || l.typeLine
    if (l.frameType === 9) filters.type_filters = { filters: { rarity: { option: 'uniquefoil' } } }
    misc.corrupted = { option: l.corrupted ? 'true' : 'false' }
    if (l.links && l.links >= 5) filters.socket_filters = { filters: { links: { min: l.links } } }
  } else if (l.frameType === 4) {
    query.type = transfigured ?? (l.typeLine || l.baseType)
    if (l.gemLevel) misc.gem_level = { min: l.gemLevel, max: l.gemLevel }
    if (l.quality) misc.quality = { min: l.quality }
    misc.corrupted = { option: l.corrupted ? 'true' : 'false' }
  } else {
    query.type = l.mapTier != null ? (l.baseType || l.typeLine) : (l.typeLine || l.baseType)
    if (isRare(l)) filters.type_filters = { filters: { rarity: { option: 'nonunique' } } }
  }
  if (l.mapTier != null) filters.map_filters = { filters: { map_tier: { min: l.mapTier, max: l.mapTier } } }
  if (Object.keys(misc).length) filters.misc_filters = { filters: misc }
  return { query, sort: { price: 'asc' as const } }
}

// What a fetched listing asks, in chaos each (null: a currency without a price).
export interface FetchedAsk { chaosEach: number | null, mine: boolean }

// Where your ask (chaos each) ranks among the fetched listings.
// `total`: the search's count of listings; `fetchedAll`: the fetch held all.
export function summarize (l: Listing, mineEach: number, fetched: readonly FetchedAsk[], total: number, fetchedAll: boolean, at: number): CheapestCheck {
  const mineCount = fetched.filter(f => f.mine).length
  const asks = fetched.filter(f => !f.mine && f.chaosEach != null && f.chaosEach > 0).map(f => f.chaosEach as number).sort((a, b) => a - b)
  const cheaper = asks.filter(a => a < mineEach * (1 - TIE)).length
  const more = asks.length > 0 && cheaper === asks.length && !fetchedAll
  return {
    at,
    price: { ...l.price },
    cheaper,
    ...(more ? { more: true } : {}),
    asks: asks.slice(0, MAX_ASKS),
    total: Math.max(asks.length, total - mineCount),
    ...(isRough(l) ? { rough: true } : {})
  }
}

// The check for a listing, if it still holds: same asking price.
export function checkFor (doc: CheapestDoc | null, l: Listing): CheapestCheck | null {
  const c = doc?.checks[l.id]
  return c && c.price.amount === l.price.amount && c.price.currency === l.price.currency ? c : null
}

// A check added; the oldest dropped past MAX_KEPT.
export function withCheck (doc: CheapestDoc | null, league: string, id: string, check: CheapestCheck): CheapestDoc {
  const old = doc?.league === league ? doc.checks : {}
  const entries = Object.entries({ ...old, [id]: check }).sort((a, b) => b[1].at - a[1].at).slice(0, MAX_KEPT)
  return { league, checks: Object.fromEntries(entries) }
}

export function ordinal (n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'
  return `${n}${s}`
}

// The cell's short text: "1st", "4th", "11th+".
export function rankText (c: CheapestCheck): string {
  return `${c.rough ? '~' : ''}${ordinal(c.cheaper + 1)}${c.more ? '+' : ''}`
}
