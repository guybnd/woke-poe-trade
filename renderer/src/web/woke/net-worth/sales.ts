// Your sales (main/src/woke/personal/trade-history.ts) for the Net worth
// window: what each sold for in chaos, its type, totals per range and type,
// and which sales fall in a refresh. Pure: no Vue, no requests.

import { stashKey } from './valuation'
import type { PriceOf } from './valuation'
import { matchRank } from '../search/search'

// What main sends (trade-history.ts Sale).
export interface Sale {
  id: string
  at: number
  name: string
  typeLine: string
  baseType: string
  frameType: number
  icon: string
  stack: number
  ilvl?: number
  corrupted?: boolean
  gemLevel?: number
  quality?: number
  mapTier?: number
  links?: number
  price: { amount: number, currency: string }
  // Gear's item data for the tooltip (trade-history.ts tipOf).
  tip?: Record<string, unknown>
  // A listing's stash tab and its place there (x, y from the top left), when
  // the trade site gives them. Sales don't have it.
  tab?: { name: string, x?: number, y?: number }
}

export interface SalesReply {
  league: string
  readAt: number | null
  sales: Sale[]
  error: { kind: 'signed-out' | 'rate-limited' | 'failed', message: string, retryAt?: number } | null
}

export type SaleType = 'uniques' | 'gems' | 'gear' | 'currency' | 'fragments' | 'cards' | 'maps' | 'other'

export const SALE_TYPES: Array<{ id: SaleType, label: string }> = [
  { id: 'uniques', label: 'Uniques' },
  { id: 'gems', label: 'Gems' },
  { id: 'gear', label: 'Rare gear' },
  { id: 'currency', label: 'Currency' },
  { id: 'fragments', label: 'Fragments & scarabs' },
  { id: 'cards', label: 'Div cards' },
  { id: 'maps', label: 'Maps' },
  { id: 'other', label: 'Other' }
]

const FRAGMENT = /\b(Scarab|Fragment|Splinter|Emblem|Writ|Invitation|Offering|Crest|Breachstone|Reliquary Key|Sacrifice at|Mortal|Key to|Timeless|Simulacrum|Inscribed Ultimatum|Chronicle of Atzoatl|Mirrored Tablet)\b/

export function saleType (s: Pick<Sale, 'frameType' | 'typeLine' | 'mapTier'>): SaleType {
  const f = s.frameType
  if (f === 3 || f === 9 || f === 10) return s.mapTier ? 'maps' : 'uniques'
  if (f === 4) return 'gems'
  if (f === 6) return 'cards'
  if (FRAGMENT.test(s.typeLine)) return 'fragments'
  if (s.mapTier || /\bMap\b/.test(s.typeLine)) return 'maps'
  // Heist blueprints and contracts come as normal and magic items.
  if (/\b(Blueprint|Contract):|^(Blueprint|Contract)\b/.test(s.typeLine)) return 'other'
  if (f === 5) return 'currency'
  if (f === 0 || f === 1 || f === 2) return 'gear'
  return 'other'
}

// The name shown for a sale: "12 × Maven's Writ", "Headhunter".
export function saleName (s: Pick<Sale, 'name' | 'typeLine' | 'stack' | 'gemLevel' | 'quality' | 'frameType'>): string {
  const base = s.name || s.typeLine
  const gem = s.frameType === 4 && s.gemLevel ? ` ${s.gemLevel}${s.quality ? `/${s.quality}` : ''}` : ''
  return `${s.stack > 1 ? `${s.stack} × ` : ''}${base}${gem}`
}

// Chaos per currency id (trade ids: chaos, divine, exalted...). chaos is 1.
export type Rates = Record<string, number>

// Trade currency ids valued through poe.ninja, besides chaos and divine.
export const NINJA_CURRENCY: Record<string, string> = {
  exalted: 'Exalted Orb',
  alch: 'Orb of Alchemy',
  fusing: 'Orb of Fusing',
  chrome: 'Chromatic Orb',
  gcp: "Gemcutter's Prism",
  vaal: 'Vaal Orb',
  regal: 'Regal Orb',
  annul: 'Orb of Annulment',
  mirror: 'Mirror of Kalandra'
}

export function saleChaos (s: Pick<Sale, 'price'>, rates: Rates): number | null {
  const { amount, currency } = s.price
  if (currency === 'chaos') return amount
  const r = rates[currency]
  return r ? amount * r : null
}

export type SaleRange = 'today' | '7d' | '30d' | 'league'
export const RANGE_MS: Record<Exclude<SaleRange, 'today' | 'league'>, number> = { '7d': 7 * 86_400_000, '30d': 30 * 86_400_000 }

export function startOfDay (at: number): number {
  const d = new Date(at)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function rangeStart (range: SaleRange, now: number): number {
  if (range === 'today') return startOfDay(now)
  if (range === 'league') return 0
  return now - RANGE_MS[range]
}

export function inRange (sales: Sale[], range: SaleRange, now: number): Sale[] {
  const from = rangeStart(range, now)
  return sales.filter(s => s.at >= from && s.at <= now + 60_000)
}

export interface Totals { chaos: number, count: number, unpriced: number }

export function totals (sales: Sale[], rates: Rates): Totals {
  let chaos = 0
  let unpriced = 0
  for (const s of sales) {
    const c = saleChaos(s, rates)
    if (c == null) unpriced++
    else chaos += c
  }
  return { chaos, count: sales.length, unpriced }
}

export interface TypeRow extends Totals {
  id: SaleType
  label: string
  // Of the biggest type's chaos, for the bar.
  share: number
  best: Sale | null
  bestChaos: number
}

// One row per type with sales, biggest first (layout 1, "ranked bars").
export function byType (sales: Sale[], rates: Rates): TypeRow[] {
  const rows = new Map<SaleType, TypeRow>()
  for (const s of sales) {
    const id = saleType(s)
    const row = rows.get(id) ?? { id, label: SALE_TYPES.find(t => t.id === id)!.label, chaos: 0, count: 0, unpriced: 0, share: 0, best: null, bestChaos: 0 }
    const c = saleChaos(s, rates)
    row.count++
    if (c == null) row.unpriced++
    else {
      row.chaos += c
      if (!row.best || c > row.bestChaos) { row.best = s; row.bestChaos = c }
    }
    rows.set(id, row)
  }
  const list = [...rows.values()].sort((a, b) => b.chaos - a.chaos || b.count - a.count)
  const max = Math.max(1, list[0]?.chaos ?? 0)
  for (const r of list) r.share = r.chaos / max
  return list
}

// How a sale's price compares with poe.ninja's for the same item: -0.05 is
// 5% under. null without a poe.ninja price.
export function versusMarket (saleChaosValue: number | null, ninjaEach: number | null, stack: number): number | null {
  if (saleChaosValue == null || ninjaEach == null || !(ninjaEach > 0)) return null
  const v = saleChaosValue / (ninjaEach * Math.max(1, stack)) - 1
  // Way off: poe.ninja's row is most likely another version of the item (a
  // gem's level, a unique's links), so the comparison says nothing.
  return v > 2 || v < -0.8 ? null : v
}

export function marketText (v: number | null): string {
  if (v == null) return ''
  if (Math.abs(v) < 0.03) return 'at market'
  return `${Math.round(Math.abs(v) * 100)}% ${v < 0 ? 'under' : 'over'}`
}

// The Sales table's sort: a column and a direction. Price and the value column
// both sort by the sale's chaos value, so 1 div beats 150c.
export type SaleSortKey = 'item' | 'price' | 'value' | 'market' | 'when'
export interface SaleSort { key: SaleSortKey, dir: 'asc' | 'desc' }
export const DEFAULT_SALE_SORT: SaleSort = { key: 'when', dir: 'desc' }
const SORT_KEYS: SaleSortKey[] = ['item', 'price', 'value', 'market', 'when']

// A header click: the same column flips, a new one starts at its first
// direction (Item A to Z, numbers and dates highest/newest first).
export function nextSaleSort (cur: SaleSort, key: SaleSortKey): SaleSort {
  if (cur.key === key) return { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' }
  return { key, dir: key === 'item' ? 'asc' : 'desc' }
}

// A stored sort, or the default when it's missing or broken.
export function saleSortOf (v: unknown): SaleSort {
  const s = v as Partial<SaleSort> | null | undefined
  return s && SORT_KEYS.includes(s.key as SaleSortKey) && (s.dir === 'asc' || s.dir === 'desc')
    ? { key: s.key as SaleSortKey, dir: s.dir }
    : DEFAULT_SALE_SORT
}

// The rows in the chosen order. Rows without a value for the column (no price,
// no poe.ninja comparison) go last either way; ties keep newest first.
export function sortSales (sales: Sale[], sort: SaleSort, rates: Rates, market: (s: Sale) => number | null): Sale[] {
  const sign = sort.dir === 'asc' ? 1 : -1
  const keyed = sales.map(s => {
    let v: number | string | null
    switch (sort.key) {
      case 'item': v = (s.name || s.typeLine).toLowerCase(); break
      case 'price':
      case 'value': v = saleChaos(s, rates); break
      case 'market': v = market(s); break
      default: v = s.at
    }
    if (typeof v === 'number' && !Number.isFinite(v)) v = null
    return { s, v }
  })
  keyed.sort((a, b) => {
    if (a.v == null || b.v == null) {
      if (a.v != null) return -1
      if (b.v != null) return 1
    } else if (a.v !== b.v) {
      return sign * (typeof a.v === 'string' ? a.v.localeCompare(b.v as string) : (a.v as number) - (b.v as number))
    }
    return b.s.at - a.s.at
  })
  return keyed.map(k => k.s)
}

// The sales in each refresh: those after the read before it, up to it. reads
// are the refreshes' times (any order); before: the read before the first.
export function salesInWindow (sales: Sale[], from: number | null, to: number): Sale[] {
  return sales.filter(s => s.at <= to && (from == null ? s.at > to - 3_600_000 : s.at > from))
}

// The stash's key for a sale's item (valuation.ts stashKey), to find its line.
// identify: the unique an unidentified one is (PriceOf.identify).
export function saleKey (s: Sale, identify?: PriceOf['identify']): string {
  return stashKey({ name: s.name, typeLine: s.typeLine, baseType: s.baseType, frame: s.frameType, stack: s.stack, icon: s.icon, gemLevel: s.gemLevel, quality: s.quality, mapTier: s.mapTier, corrupted: s.corrupted, links: s.links }, identify)
}

// The change list's lines with the sold items taken out of their removed
// lines, by item and count: 10 scarabs sold out of 60 gone leaves 50 (and
// their share of the chaos). Added lines are never touched.
export function withoutSold<L extends { key: string, count: number, chaos: number, dir: 'add' | 'remove' }> (lines: L[], sales: Sale[], identify?: PriceOf['identify']): L[] {
  if (!sales.length) return lines
  const sold = new Map<string, number>()
  for (const s of sales) { const k = saleKey(s, identify); sold.set(k, (sold.get(k) ?? 0) + s.stack) }
  const out: L[] = []
  for (const l of lines) {
    const n = l.dir === 'remove' ? sold.get(l.key) ?? 0 : 0
    if (!n) { out.push(l); continue }
    if (n >= l.count) continue
    out.push({ ...l, count: l.count - n, chaos: l.chaos * (l.count - n) / l.count })
  }
  return out
}

// Ctrl+Space: sales whose name has every word of the query.
export function searchSales (sales: Sale[], query: string, limit = 8): Sale[] {
  if (!query.trim()) return []
  // Folds accents and apostrophes like the other results ("kaoms" finds Kaom's).
  return sales.filter(s => matchRank(`${s.name} ${s.typeLine}`, query) >= 0).slice(0, limit)
}

// Sales per day for the range, oldest first (the Sales view's bars).
export function perDay (sales: Sale[], rates: Rates, from: number, now: number): Array<{ day: number, chaos: number, count: number }> {
  const out = new Map<number, { day: number, chaos: number, count: number }>()
  const first = startOfDay(Math.max(from, sales.length ? Math.min(...sales.map(s => s.at)) : now))
  for (let d = first; d <= now; d = startOfDay(d + 36 * 3_600_000)) out.set(d, { day: d, chaos: 0, count: 0 })
  for (const s of sales) {
    const day = out.get(startOfDay(s.at))
    if (!day) continue
    day.count++
    day.chaos += saleChaos(s, rates) ?? 0
  }
  return [...out.values()]
}
