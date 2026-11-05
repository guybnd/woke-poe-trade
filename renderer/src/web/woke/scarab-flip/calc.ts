// Expected value of the scarab vendor recipe. Any 3 scarabs vendor into a
// random scarab of a different type from those used, respecting drop weights
// (poewiki.net/wiki/Scarab).
import { median } from '../analytics/stats'
import type { PriceItem } from '../market/types'
import { SAMPLE_ROLLS, TIER_ROLLS, UNSAMPLED_TIERS } from './weights'

// Drop chance at or under this counts as exceptionally rare. The sample has a
// clear gap: nothing falls between 0.10% and 0.53%.
export const RARE_SHARE = 0.0015
// A rare scarab is cheap when it costs under this part of a typical rare one.
export const CHEAP_RATIO = 1 / 3
// Under this much chaos traded a day, a price means nothing.
export const UNTRADED_CHAOS = 1
export const JACKPOT_CHAOS = 200

export interface ScarabQuote {
  chaos: number
  // Chaos traded in the last 24 hours; null when the exchange feed is missing.
  tradedChaos: number | null
}

export interface FlipOptions {
  // Lost when selling results below the listed price, 0..1.
  sellDiscount: number
  // Vendor results worth less than a third of a recipe instead of selling them.
  reroll: boolean
}

export interface ScarabRow {
  name: string
  chaos: number
  // Chance of being the result of a recipe, before the input is removed.
  share: number
  weightSource: 'sample' | 'tier'
  tradedChaos: number | null
  tradedPerDay: number | null
  // Return of a recipe using 3 of this scarab, minus their price.
  profit: number
  // Most profit the day's trading could supply; null without the exchange feed.
  profitPerDay: number | null
  rare: boolean
  // Exceptionally rare but cheap: may be worth more later.
  rareCheap: boolean
}

export interface FlipModel {
  rows: ScarabRow[]
  // Priced scarabs with no known weight, left out of the pool.
  unrated: string[]
  // Average return of a recipe, with the chosen options.
  recipeValue: number
  // Above this a scarab costs more than a third of a recipe.
  buyUnder: number
  typicalRare: number | null
  options: FlipOptions
}

interface ExchangeFeed {
  core?: { primary?: string, items?: Array<{ id: string, name: string }> }
  items?: Array<{ id: string, name: string }>
  lines?: Array<{ id: string, primaryValue?: number, volumePrimaryValue?: number }>
}

export type ExchangeQuotes = Map<string, { chaos: number, tradedChaos: number }>

// poe.ninja's exchange overview, which has volume. Null if it isn't in chaos,
// so a change of format falls back to the dense prices.
export function parseExchange (feed: ExchangeFeed): ExchangeQuotes | null {
  if (feed.core?.primary !== 'chaos' || !feed.items || !feed.lines) return null
  const names = new Map(feed.items.map(i => [i.id, i.name]))
  const out: ExchangeQuotes = new Map()
  for (const line of feed.lines) {
    const name = names.get(line.id)
    if (name && line.primaryValue) {
      out.set(name, { chaos: line.primaryValue, tradedChaos: line.volumePrimaryValue ?? 0 })
    }
  }
  return out.size ? out : null
}

// Exchange prices when there are any: they are newer and the volume refers to them.
export function scarabQuotes (items: PriceItem[], exchange: ExchangeQuotes | null): Map<string, ScarabQuote> {
  const quotes = new Map<string, ScarabQuote>()
  for (const item of items) {
    if (item.type === 'Scarab' && item.chaos > 0) {
      quotes.set(item.name, { chaos: item.chaos, tradedChaos: exchange ? 0 : null })
    }
  }
  if (exchange) for (const [name, q] of exchange) quotes.set(name, q)
  return quotes
}

function weightOf (name: string): { weight: number, source: 'sample' | 'tier' } | null {
  const rolls = SAMPLE_ROLLS[name]
  if (rolls) return { weight: rolls, source: 'sample' }
  const tier = UNSAMPLED_TIERS[name]
  return tier ? { weight: TIER_ROLLS[tier], source: 'tier' } : null
}

export function flipModel (quotes: Map<string, ScarabQuote>, options: FlipOptions): FlipModel {
  const pool: Array<{ name: string, quote: ScarabQuote, weight: number, source: 'sample' | 'tier' }> = []
  const unrated: string[] = []
  for (const [name, quote] of quotes) {
    const w = weightOf(name)
    if (w) pool.push({ name, quote, weight: w.weight, source: w.source })
    else unrated.push(name)
  }
  const total = pool.reduce((n, s) => n + s.weight, 0)
  const keep = 1 - options.sellDiscount

  // With rerolling, a result is worth at least a third of a recipe, which
  // depends on the recipe's own value. Each pass shrinks the error to a third.
  const passes = total > 0 ? (options.reroll ? 60 : 1) : 0
  let recipeValue = 0
  const worth = (chaos: number) => Math.max(chaos * keep, options.reroll ? recipeValue / 3 : 0)
  for (let i = 0; i < passes; i++) {
    recipeValue = pool.reduce((n, s) => n + s.weight * worth(s.quote.chaos), 0) / total
  }

  const rareShares = pool.filter(s => s.weight / total <= RARE_SHARE)
  const typicalRare = median(rareShares.map(s => s.quote.chaos))

  const rows: ScarabRow[] = pool.map(s => {
    const { chaos, tradedChaos } = s.quote
    // The recipe can't give back the type you put in.
    const value = total > s.weight
      ? (recipeValue * total - s.weight * worth(chaos)) / (total - s.weight)
      : 0
    const profit = value - 3 * chaos
    const tradedPerDay = tradedChaos == null ? null : tradedChaos / chaos
    const share = s.weight / total
    const rare = share <= RARE_SHARE
    return {
      name: s.name,
      chaos,
      share,
      weightSource: s.source,
      tradedChaos,
      tradedPerDay,
      profit,
      profitPerDay: tradedPerDay == null ? null : Math.max(0, profit) * tradedPerDay / 3,
      rare,
      rareCheap: rare && typicalRare != null && chaos < typicalRare * CHEAP_RATIO
    }
  })
  return { rows, unrated, recipeValue, buyUnder: recipeValue / 3, typicalRare, options }
}

export function isTraded (row: ScarabRow): boolean {
  return row.tradedChaos == null || row.tradedChaos >= UNTRADED_CHAOS
}

// Scarabs worth buying to vendor, biggest supply of profit first.
export function buyList (model: FlipModel, hideUntraded: boolean): ScarabRow[] {
  return model.rows
    .filter(r => r.profit > 0 && (!hideUntraded || isTraded(r)))
    .sort((a, b) => (b.profitPerDay ?? 0) - (a.profitPerDay ?? 0) || b.profit - a.profit)
}

// Cheapest first, leaving out prices with no trades behind them.
export function rareCheapList (model: FlipModel): ScarabRow[] {
  return model.rows.filter(r => r.rareCheap && isTraded(r)).sort((a, b) => a.chaos - b.chaos)
}

export interface OddsBucket {
  label: string
  // Chance of a result in this price range, 0..1.
  chance: number
  // Part of the recipe's value that comes from this range, 0..1.
  valueShare: number
}

export interface Odds {
  buckets: OddsBucket[]
  // Average sale value of a result, before any rerolling.
  saleValue: number
  medianResult: number | null
  sources: Array<{ name: string, chaos: number, valueShare: number }>
  // Recipes per jackpot result, and the sale value without those results.
  jackpotOneIn: number | null
  withoutJackpot: number
}

const BUCKETS: Array<{ label: string, under: number }> = [
  { label: 'Under 1c', under: 1 },
  { label: '1–3c', under: 3 },
  { label: '3–10c', under: 10 },
  { label: '10–50c', under: 50 },
  { label: '50–200c', under: JACKPOT_CHAOS },
  { label: '200c+', under: Infinity }
]

export function flipOdds (model: FlipModel): Odds {
  const keep = 1 - model.options.sellDiscount
  const saleValue = model.rows.reduce((n, r) => n + r.share * r.chaos * keep, 0)
  const valueOf = (r: ScarabRow) => saleValue > 0 ? r.share * r.chaos * keep / saleValue : 0

  let from = 0
  const buckets = BUCKETS.map(b => {
    const inside = model.rows.filter(r => r.chaos >= from && r.chaos < b.under)
    from = b.under
    return {
      label: b.label,
      chance: inside.reduce((n, r) => n + r.share, 0),
      valueShare: inside.reduce((n, r) => n + valueOf(r), 0)
    }
  })

  let seen = 0
  let medianResult: number | null = null
  for (const r of [...model.rows].sort((a, b) => a.chaos - b.chaos)) {
    seen += r.share
    if (seen >= 0.5) { medianResult = r.chaos; break }
  }

  const jackpots = model.rows.filter(r => r.chaos >= JACKPOT_CHAOS)
  const jackpotChance = jackpots.reduce((n, r) => n + r.share, 0)
  return {
    buckets,
    saleValue,
    medianResult,
    sources: [...model.rows]
      .sort((a, b) => valueOf(b) - valueOf(a))
      .slice(0, 5)
      .map(r => ({ name: r.name, chaos: r.chaos, valueShare: valueOf(r) })),
    jackpotOneIn: jackpotChance > 0 ? 1 / jackpotChance : null,
    withoutJackpot: saleValue - jackpots.reduce((n, r) => n + r.share * r.chaos * keep, 0)
  }
}

// "Harvest Scarab of Doubling" -> "Harvest of Doubling"
export function shortScarab (name: string): string {
  return name.replace(/(\S) Scarab/, '$1')
}
