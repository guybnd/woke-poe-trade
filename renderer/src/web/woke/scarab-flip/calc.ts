// Expected value of a flip: put in some items, get back a random one. Scarabs,
// catalysts and runegrafts go through vendor recipes; catalysts, delirium orbs,
// fossils and essences through Harvest rerolls. Which is which: families.ts.
import { median } from '../analytics/stats'
import type { PriceItem } from '../market/types'
import { SAMPLE_ROLLS, TIER_ROLLS, UNSAMPLED_TIERS } from './weights'

// Scarabs: drop chance at or under this counts as exceptionally rare. The
// sample has a clear gap: nothing falls between 0.10% and 0.53%.
export const RARE_SHARE = 0.0015
// A rare item is cheap when it costs under this part of a typical rare one.
export const CHEAP_RATIO = 1 / 3
// Under this much chaos traded a day, a price means nothing.
export const UNTRADED_CHAOS = 1
export const JACKPOT_CHAOS = 200

export interface Quote {
  chaos: number
  // Chaos traded in the last 24 hours; null when the exchange feed is missing.
  tradedChaos: number | null
}

export interface FlipOptions {
  // Lost when selling results below the listed price, 0..1.
  sellDiscount: number
  // Flip results again when that is worth more than selling them.
  reroll: boolean
}

export interface ItemWeight {
  weight: number
  source: 'sample' | 'tier'
}

export interface FlipRecipe {
  // Items put in for one result.
  inputs: number
  // Chaos spent per flip on top of the inputs (Harvest lifeforce).
  cost: number
  // The result can't be the type you put in.
  excludeInput: boolean
  // Chance at or under which an item counts as rare; null: no rare marks.
  rareShare: number | null
  weightOf: (name: string) => ItemWeight | null
}

export function scarabWeight (name: string): ItemWeight | null {
  const rolls = SAMPLE_ROLLS[name]
  if (rolls) return { weight: rolls, source: 'sample' }
  const tier = UNSAMPLED_TIERS[name]
  return tier ? { weight: TIER_ROLLS[tier], source: 'tier' } : null
}

export interface FlipRow {
  name: string
  chaos: number
  // Chance of being the result of a flip, before the input is removed.
  share: number
  weightSource: 'sample' | 'tier'
  tradedChaos: number | null
  tradedPerDay: number | null
  // Return of a flip using this item, minus its inputs and any lifeforce.
  profit: number
  // The same, per item put in: what the panel shows.
  profitEach: number
  // Most profit the day's trading could supply; null without the exchange feed.
  profitPerDay: number | null
  rare: boolean
  // Exceptionally rare but cheap: may be worth more later.
  rareCheap: boolean
}

export interface FlipModel {
  rows: FlipRow[]
  // Priced items with no known weight, left out of the pool.
  unrated: string[]
  // Average return of a flip, with the chosen options.
  recipeValue: number
  // Above this an input costs more than its part of a flip.
  buyUnder: number
  typicalRare: number | null
  options: FlipOptions
  recipe: FlipRecipe
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

// Exchange prices when there are any: they are newer and the volume refers to
// them. `match` picks the family's items, since a feed can hold others
// (currency). A feed with none of them says nothing about volume, so it
// counts as missing.
export function familyQuotes (
  items: PriceItem[],
  type: string,
  match: (name: string) => boolean,
  exchange: ExchangeQuotes | null
): Map<string, Quote> {
  const feed = exchange ? [...exchange].filter(([name]) => match(name)) : []
  const quotes = new Map<string, Quote>()
  for (const item of items) {
    if (item.type === type && item.chaos > 0 && match(item.name)) {
      quotes.set(item.name, { chaos: item.chaos, tradedChaos: feed.length ? 0 : null })
    }
  }
  for (const [name, q] of feed) quotes.set(name, q)
  return quotes
}

export function flipModel (quotes: Map<string, Quote>, options: FlipOptions, recipe: FlipRecipe): FlipModel {
  const pool: Array<{ name: string, quote: Quote, weight: number, source: 'sample' | 'tier' }> = []
  const unrated: string[] = []
  for (const [name, quote] of quotes) {
    const w = recipe.weightOf(name)
    if (w) pool.push({ name, quote, weight: w.weight, source: w.source })
    else unrated.push(name)
  }
  const total = pool.reduce((n, s) => n + s.weight, 0)
  const keep = 1 - options.sellDiscount
  const { inputs, cost } = recipe

  const prices = pool.map(s => ({ weight: s.weight, chaos: s.quote.chaos * keep }))
  const plainValue = total > 0 ? prices.reduce((n, s) => n + s.weight * s.chaos, 0) / total : 0
  const rerollFloor = options.reroll && total > 0 ? rerollWorth(prices, total, inputs, cost) : null
  const recipeValue = rerollFloor == null ? plainValue : rerollFloor * inputs + cost
  const worth = (chaos: number) => Math.max(chaos * keep, rerollFloor ?? 0)

  const isRare = (weight: number) => recipe.rareShare != null && weight / total <= recipe.rareShare
  const typicalRare = median(pool.filter(s => isRare(s.weight)).map(s => s.quote.chaos))

  const rows: FlipRow[] = pool.map(s => {
    const { chaos, tradedChaos } = s.quote
    let value = recipeValue
    if (recipe.excludeInput) {
      value = total > s.weight ? (recipeValue * total - s.weight * worth(chaos)) / (total - s.weight) : 0
    }
    const profit = value - inputs * chaos - cost
    const tradedPerDay = tradedChaos == null ? null : tradedChaos / chaos
    const rare = isRare(s.weight)
    return {
      name: s.name,
      chaos,
      share: s.weight / total,
      weightSource: s.source,
      tradedChaos,
      tradedPerDay,
      profit,
      profitEach: profit / inputs,
      profitPerDay: tradedPerDay == null ? null : Math.max(0, profit) * tradedPerDay / inputs,
      rare,
      rareCheap: rare && typicalRare != null && chaos < typicalRare * CHEAP_RATIO
    }
  })
  return { rows, unrated, recipeValue, buyUnder: (recipeValue - cost) / inputs, typicalRare, options, recipe }
}

// What an item is worth as an input when results are flipped again whenever
// that pays: solves worth = (average result - cost) / inputs, where each result
// is worth the more of its price and `worth`. Results are kept from the dearest
// down, so the answer is the first cut-off that agrees with itself.
function rerollWorth (prices: Array<{ weight: number, chaos: number }>, total: number, inputs: number, cost: number): number {
  const sorted = [...prices].sort((a, b) => b.chaos - a.chaos)
  let kept = 0
  let keptWeight = 0
  for (let i = 0; i < sorted.length; i++) {
    kept += sorted[i].weight * sorted[i].chaos
    keptWeight += sorted[i].weight
    const worth = (kept - cost * total) / (inputs * total - (total - keptWeight))
    if (i + 1 === sorted.length || sorted[i + 1].chaos <= worth) return worth
  }
  return 0
}

export function isTraded (row: { tradedChaos: number | null }): boolean {
  return row.tradedChaos == null || row.tradedChaos >= UNTRADED_CHAOS
}

// Under this, a profit is rounding noise in the price sums, not a profit.
const PROFIT_EPSILON = 1e-6

// Items worth flipping, biggest supply of profit first.
export function buyList<T extends { profit: number, profitPerDay: number | null, tradedChaos: number | null }> (rows: T[], hideUntraded: boolean): T[] {
  return rows
    .filter(r => r.profit > PROFIT_EPSILON && (!hideUntraded || isTraded(r)))
    .sort((a, b) => (b.profitPerDay ?? 0) - (a.profitPerDay ?? 0) || b.profit - a.profit)
}

// Cheapest first, leaving out prices with no trades behind them.
export function rareCheapList (model: FlipModel): FlipRow[] {
  return model.rows.filter(r => r.rareCheap && isTraded(r)).sort((a, b) => a.chaos - b.chaos)
}

// 3 of a tier give 1 of the next.
const UPGRADE_INPUTS = 3

export interface UpgradeRow {
  name: string
  from: string
  into: string
  chaos: number
  // Price of 1 of the next tier, minus 3 of this one.
  profit: number
  // The same, per item put in: what the panel shows.
  profitEach: number
  // Chaos traded a day on the thinner side, input or result.
  tradedChaos: number | null
  tradedPerDay: number | null
  profitPerDay: number | null
}

// Vendor recipes with a known result: 3 of a tier give 1 of the next.
// `chains` lists each line of items from lowest tier to highest.
export function upgradeRows (quotes: Map<string, Quote>, chains: string[][], sellDiscount: number): UpgradeRow[] {
  const rows: UpgradeRow[] = []
  for (const chain of chains) {
    for (let i = 0; i + 1 < chain.length; i++) {
      const from = quotes.get(chain[i])
      const into = quotes.get(chain[i + 1])
      if (!from || !into) continue
      const profit = into.chaos * (1 - sellDiscount) - UPGRADE_INPUTS * from.chaos
      const tradedPerDay = from.tradedChaos == null ? null : from.tradedChaos / from.chaos
      // A recipe needs buyers for the result as well as sellers of the input,
      // so the thinner side of the market is what counts.
      const intoPerDay = into.tradedChaos == null ? null : into.tradedChaos / into.chaos
      const recipesPerDay = tradedPerDay == null ? null : Math.min(tradedPerDay / UPGRADE_INPUTS, intoPerDay ?? Infinity)
      rows.push({
        // "Black Oil", "Opalescent Oil" -> "Black to Opalescent Oil"
        name: `${chain[i].split(' ')[0]} to ${chain[i + 1]}`,
        from: chain[i],
        into: chain[i + 1],
        chaos: from.chaos,
        profit,
        profitEach: profit / UPGRADE_INPUTS,
        tradedChaos: from.tradedChaos == null || into.tradedChaos == null ? from.tradedChaos ?? into.tradedChaos : Math.min(from.tradedChaos, into.tradedChaos),
        tradedPerDay,
        profitPerDay: recipesPerDay == null ? null : Math.max(0, profit) * recipesPerDay
      })
    }
  }
  return rows
}

export interface OddsBucket {
  label: string
  // Chance of a result in this price range, 0..1.
  chance: number
  // Part of the flip's value that comes from this range, 0..1.
  valueShare: number
}

export interface Odds {
  buckets: OddsBucket[]
  // Average sale value of a result, before flipping any result again.
  saleValue: number
  medianResult: number | null
  sources: Array<{ name: string, chaos: number, valueShare: number }>
  // Flips per jackpot result, and the sale value without those results.
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
  const valueOf = (r: FlipRow) => saleValue > 0 ? r.share * r.chaos * keep / saleValue : 0

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
