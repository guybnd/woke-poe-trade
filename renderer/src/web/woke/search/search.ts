// Matching and grouping for the search boxes: the palette, the launcher and the
// Market all rank and group prices the same way.
import { itemKey, isCorrupted } from '../market/types'
import type { PriceItem, CorruptedFilter } from '../market/types'
import type { ItemTipRef } from '../ui/tooltip/item-tip'
import { dataUniqueName } from '../shared/item-identity'

export const MIN_QUERY = 2
// More than this and the list is too long to read: keep typing.
export const PRICE_GROUP_LIMIT = 30

// "Kaom's Heart" should match "kaoms heart" too. Names repeat on every
// keystroke, across thousands of rows, so each is worked out once.
// Latin letters lose their accents, so "morrigan" finds Black Mórrigan. Other
// scripts (Cyrillic, Hangul) are left whole.
export function foldAccents (text: string): string {
  return text.replace(/[\u00C0-\u024F]/g, c => c.normalize('NFD').replace(/[\u0300-\u036F]/g, ''))
}

const normalized = new Map<string, string>()
function normalize (text: string): string {
  let n = normalized.get(text)
  if (n == null) {
    n = foldAccents(text.toLowerCase()).replace(/['’]/g, '').trim().replace(/\s+/g, ' ')
    if (normalized.size > 100_000) normalized.clear()
    normalized.set(text, n)
  }
  return n
}

// 0 name starts with it, 1 every word starts a word, 2 found inside a word,
// -1 no match. So "mage" lists Mageblood well before Minion Damage Support.
export function matchRank (name: string, query: string): number {
  const n = normalize(name)
  const q = normalize(query)
  if (!q) return -1
  if (n.startsWith(q)) return 0
  const parts = q.split(' ')
  if (!parts.every(p => n.includes(p))) return -1
  const words = n.split(/[^\p{L}\p{N}]+/u)
  return parts.every(p => words.some(w => w.startsWith(p))) ? 1 : 2
}

// One item's name and all its prices (links, flasks, gem level and quality).
export interface PriceGroup {
  type: string
  name: string
  variants: PriceItem[] // most expensive first
  high: number
  low: number
}

// The item tooltip for a whole result: one price is that price, several a range.
export function groupTip (group: PriceGroup): ItemTipRef {
  if (group.variants.length === 1) return group.variants[0]
  return { name: group.name, type: group.type, prices: { low: group.low, high: group.high, count: group.variants.length } }
}

export function groupKey (group: { type: string, name: string }): string {
  return `${group.type}\u0000${group.name}`
}

export function searchPrices (
  items: readonly PriceItem[],
  query: string,
  opts: { limit?: number, corrupted?: CorruptedFilter } = {}
): PriceGroup[] {
  if (normalize(query).length < MIN_QUERY) return []
  return groupPrices(items, item => matchRank(item.name, query), opts)
}

// The uniques on some bases, by name: "Shagreen Boots" brings Three-step
// Assault and its Foulborn one. Unique rows only, dearest first.
export function uniquePrices (
  items: readonly PriceItem[],
  names: ReadonlySet<string>,
  opts: { limit?: number, corrupted?: CorruptedFilter } = {}
): PriceGroup[] {
  if (!names.size) return []
  return groupPrices(items, item => /^Unique/.test(item.type) && names.has(baseUniqueName(item.name)) ? 0 : -1, opts)
}

// Each base's uniques and each unique's bases, by English name. Some uniques
// come on several bases (Precursor's Emblem on five rings), one entry each.
export interface UniqueBaseIndex {
  byBase: Map<string, string[]>
  basesOf: Map<string, string[]>
}
export function uniqueBaseIndex (uniques: Iterable<{ refName: string, unique?: { base: string } }>): UniqueBaseIndex {
  const byBase = new Map<string, string[]>()
  const basesOf = new Map<string, string[]>()
  const add = (map: Map<string, string[]>, k: string, v: string) => {
    const list = map.get(k)
    if (!list) map.set(k, [v])
    else if (!list.includes(v)) list.push(v)
  }
  for (const u of uniques) {
    if (!u.unique?.base) continue
    add(byBase, u.unique.base, u.refName)
    add(basesOf, u.refName, u.unique.base)
  }
  return { byBase, basesOf }
}

// One group per type and name, ranked (-1 leaves an item out), then dearest first.
function groupPrices (
  items: readonly PriceItem[],
  rankOf: (item: PriceItem) => number,
  opts: { limit?: number, corrupted?: CorruptedFilter }
): PriceGroup[] {
  const corrupted = opts.corrupted ?? 'any'
  const groups = new Map<string, PriceGroup & { rank: number }>()
  // poe.ninja sends Currency and Fragment in two feeds, so a snapshot can hold
  // the same row twice.
  const seen = new Set<string>()
  for (const item of items) {
    if (!passesCorrupted(item, corrupted)) continue
    const rank = rankOf(item)
    if (rank < 0) continue
    const k = itemKey(item)
    if (seen.has(k)) continue
    seen.add(k)
    const gk = groupKey(item)
    const group = groups.get(gk)
    if (group) {
      group.variants.push(item)
      group.high = Math.max(group.high, item.chaos)
      group.low = Math.min(group.low, item.chaos)
    } else {
      groups.set(gk, { type: item.type, name: item.name, variants: [item], high: item.chaos, low: item.chaos, rank })
    }
  }
  const out = [...groups.values()].sort((a, b) => a.rank - b.rank || b.high - a.high || a.name.localeCompare(b.name))
  for (const group of out) group.variants.sort((a, b) => b.chaos - a.chaos)
  return out.slice(0, opts.limit ?? PRICE_GROUP_LIMIT)
}

export function passesCorrupted (item: { type: string, variant: string }, filter: CorruptedFilter): boolean {
  if (filter === 'any') return true
  return isCorrupted(item) === (filter === 'only')
}

// Anything else with a name: tools, settings pages, items with no price.
export function searchNamed<T> (list: readonly T[], query: string, name: (entry: T) => string, limit = 8): T[] {
  if (normalize(query).length < MIN_QUERY) return []
  return list
    .map(entry => ({ entry, rank: matchRank(name(entry), query) }))
    .filter(r => r.rank >= 0)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map(r => r.entry)
}

// Change since an older price, as a fraction. null when there is no older price.
export function changeSince (now: number, then: number | null | undefined): number | null {
  return then ? now / then - 1 : null
}

// poe.ninja category -> PoE item colour
export function rarityClass (type: string): string {
  if (/^Unique/.test(type)) return 'w-rarity-unique'
  if (/Gem/.test(type)) return 'w-rarity-gem'
  if (type === 'DivinationCard') return 'w-rarity-divination'
  return 'w-rarity-currency'
}

// poe.ninja's category names: "UniqueArmour" reads as "Unique Armour".
export function typeLabel (type: string): string {
  return type.replace(/([a-z])([A-Z])/g, '$1 $2')
}

// Foulborn items share their unique's page and base.
export const baseUniqueName = dataUniqueName

export function tradeUrl (league: string, item: { name?: string, type?: string | { option: string, discriminator: string }, filters?: object }, host = 'www.pathofexile.com'): string {
  const query = {
    query: { status: { option: 'online' }, ...item },
    sort: { price: 'asc' }
  }
  return `https://${host}/trade/search/${encodeURIComponent(league)}?q=${encodeURIComponent(JSON.stringify(query))}`
}
