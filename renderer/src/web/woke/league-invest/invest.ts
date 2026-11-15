// Ranks items by how reliably they rose, in divines, over the same stretch
// of past leagues: buy on league day `day`, sell on `day + horizon`.
import { MAX_DAY } from './dumps'
import type { ItemHistory, LeagueHistory } from './dumps'

// Item types sold in bulk at one price: easy to buy many and to resell.
export const BULK_TYPES = new Set([
  'Currency', 'Fragment', 'Scarab', 'DivinationCard', 'Essence', 'Fossil', 'Resonator',
  'Oil', 'DeliriumOrb', 'Incubator', 'Invitation', 'Vial', 'Tattoo', 'Omen', 'Artifact',
  'Map', 'BlightedMap', 'AllflameEmber', 'Coffin', 'Astrolabe', 'Runegraft'
])

export interface RankOptions {
  day: number
  horizon: number
  // Leagues an item must appear in (both buy and sell day) to be ranked.
  minLeagues: number
  // Median multiple required to be listed.
  minMultiple: number
  // Share of priced days that must be medium/high confidence.
  minReliability: number
  // Ignore items cheaper than this (chaos, on the buy day of that league):
  // tiny early prices are noisy and give silly multiples.
  minBuyChaos: number
  bulkOnly: boolean
}

export interface Opportunity {
  type: string
  name: string
  variant: string
  links: string
  leagues: string[]
  // Sell/buy price ratio in divines, one per league.
  multiples: number[]
  median: number
  // Share of leagues where the item rose at least 10%.
  hitRate: number
  // Share of day-to-day steps (pooled over leagues) that rose more than 2%.
  upDays: number
  reliability: number
  bulk: boolean
  // Median buy-day price in divines across leagues (for reference only:
  // price levels differ between leagues).
  histBuyDiv: number
}

export function priceOn (item: ItemHistory, d: number): number | null {
  if (d < 0 || d > MAX_DAY) return null
  const v = item.div[d]
  if (v != null) return v
  const a = item.div[d - 1]; const b = item.div[d + 1]
  if (a != null && b != null) return (a + b) / 2
  return null
}

export function median (values: number[]): number {
  if (!values.length) return NaN
  const s = [...values].sort((x, y) => x - y)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function opportunityKey (o: { type: string, name: string, variant?: string, links?: string }): string {
  return `${o.type}\u0000${o.name}\u0000${o.variant ?? ''}\u0000${o.links ?? ''}`
}

export function rankOpportunities (histories: LeagueHistory[], opts: RankOptions): Opportunity[] {
  const { day, horizon } = opts
  const sell = day + horizon
  const acc = new Map<string, {
    item: ItemHistory,
    leagues: string[],
    multiples: number[],
    buys: number[],
    up: number,
    steps: number,
    confident: number,
    priced: number
  }>()

  for (const h of histories) {
    if (sell >= h.days) continue
    for (const item of h.items) {
      const buy = priceOn(item, day)
      const out = priceOn(item, sell)
      if (buy == null || out == null || buy <= 0) continue
      // The buy-day price itself must be medium/high confidence.
      if ((item.conf[day] ?? -1) < 1) continue
      const divine = h.divine[day]
      if (divine != null && buy * divine < opts.minBuyChaos) continue
      const key = opportunityKey(item)
      let a = acc.get(key)
      if (!a) {
        a = { item, leagues: [], multiples: [], buys: [], up: 0, steps: 0, confident: 0, priced: 0 }
        acc.set(key, a)
      }
      a.leagues.push(h.league)
      a.multiples.push(out / buy)
      a.buys.push(buy)
      for (let d = day; d <= sell; d++) {
        if (item.conf[d] >= 0) {
          a.priced++
          if (item.conf[d] >= 1) a.confident++
        }
        if (d < sell) {
          const p0 = priceOn(item, d); const p1 = priceOn(item, d + 1)
          if (p0 != null && p1 != null && p0 > 0) {
            a.steps++
            if (p1 / p0 > 1.02) a.up++
          }
        }
      }
    }
  }

  const out: Opportunity[] = []
  for (const a of acc.values()) {
    if (a.leagues.length < opts.minLeagues) continue
    const reliability = a.priced ? a.confident / a.priced : 0
    if (reliability < opts.minReliability) continue
    const bulk = BULK_TYPES.has(a.item.type)
    if (opts.bulkOnly && !bulk) continue
    const med = median(a.multiples)
    if (!(med >= opts.minMultiple)) continue
    out.push({
      type: a.item.type,
      name: a.item.name,
      variant: a.item.variant ?? '',
      links: a.item.links ?? '',
      leagues: a.leagues,
      multiples: a.multiples,
      median: med,
      hitRate: a.multiples.filter(m => m >= 1.1).length / a.multiples.length,
      upDays: a.steps ? a.up / a.steps : 0,
      reliability,
      bulk,
      histBuyDiv: median(a.buys)
    })
  }

  // Guy's metric: consistent day-over-day rises first (share of days up,
  // in steps of 5% so near-ties fall through), then the typical size of
  // the rise, then how many leagues back it up.
  return out.sort((x, y) =>
    (bucket(y.upDays) - bucket(x.upDays)) ||
    (y.median - x.median) ||
    (y.leagues.length - x.leagues.length))
}

function bucket (share: number): number {
  return Math.round(share * 20)
}

export interface PlanLine {
  opportunity: Opportunity
  chaos: number
  qty: number
  cost: number
  expected: number
  // Thin market: spend was capped because few people trade it.
  thin: boolean
}

// Past-league prices that were mostly low confidence, or a thin market now,
// mean you can't buy (or later sell) much without moving the price.
export const THIN_RELIABILITY = 0.8
export const THIN_SLOT_SHARE = 1 / 3

// Splits a budget evenly over the best `slots` items that a slot can afford.
export function planBudget (
  ranked: Array<{ opportunity: Opportunity, chaos: number | null, thin?: boolean }>,
  budgetChaos: number,
  slots: number
): PlanLine[] {
  if (budgetChaos <= 0 || slots <= 0) return []
  const perSlot = budgetChaos / slots
  const lines: PlanLine[] = []
  for (const r of ranked) {
    if (lines.length >= slots) break
    if (r.chaos == null || r.chaos <= 0 || r.chaos > perSlot) continue
    const thin = !!r.thin || r.opportunity.reliability < THIN_RELIABILITY
    const spend = thin ? perSlot * THIN_SLOT_SHARE : perSlot
    const qty = Math.floor(spend / r.chaos)
    if (qty < 1) continue
    // Only bulk items are worth buying more than a few of; thin non-bulk
    // markets get one copy.
    const capped = r.opportunity.bulk ? qty : Math.min(qty, thin ? 1 : 3)
    lines.push({
      opportunity: r.opportunity,
      chaos: r.chaos,
      qty: capped,
      cost: capped * r.chaos,
      expected: capped * r.chaos * r.opportunity.median,
      thin
    })
  }
  return lines
}
