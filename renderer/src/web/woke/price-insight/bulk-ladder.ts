// The exchange's offers as a price ladder: one step per price, with how many
// are on offer there and from how many sellers, and what buying N would cost
// taking the cheapest first. Pure functions, no Vue or IO.

import { bulkAmount } from './bulk-insight'

export interface LadderOffer {
  exchangeAmount: number
  itemAmount: number
  stock: number
  accountName: string
  isMine: boolean
}

export interface LadderStep<T extends LadderOffer> {
  /** Price per item of the step's cheapest offer. */
  unit: number
  /** The price as shown, which is what makes offers one step. */
  key: string
  offers: T[]
  /** Items for sale at this price (other sellers' stock added up). */
  stock: number
  sellers: number
}

export interface FillPick<T extends LadderOffer> {
  offer: T
  /** Trades of the seller's own lot size. */
  lots: number
  items: number
  cost: number
}

export interface FillPlan<T extends LadderOffer> {
  picks: Array<FillPick<T>>
  /** Items the picks bring: under `want` when the market runs out, over it when lots round up. */
  items: number
  cost: number
  /** Fewer than asked are on offer. */
  short: boolean
}

const unitOf = (o: LadderOffer) => o.exchangeAmount / o.itemAmount

/** An offer that can fill at least one of its lots, from someone else. */
export function buyable (o: LadderOffer): boolean {
  return !o.isMine && o.itemAmount > 0 && o.exchangeAmount > 0 && o.stock >= o.itemAmount
}

/** Offers grouped by the price they show, cheapest first. */
export function ladderSteps<T extends LadderOffer> (offers: readonly T[]): Array<LadderStep<T>> {
  const sorted = offers.filter(o => o.itemAmount > 0).sort((a, b) => unitOf(a) - unitOf(b))
  const steps: Array<LadderStep<T>> = []
  for (const o of sorted) {
    const key = bulkAmount(unitOf(o))
    let step = steps[steps.length - 1]
    if (!step || step.key !== key) {
      step = { unit: unitOf(o), key, offers: [], stock: 0, sellers: 0 }
      steps.push(step)
    }
    step.offers.push(o)
  }
  for (const s of steps) {
    // What can be bought: not yours, and at least one lot in stock.
    const real = s.offers.filter(buyable)
    s.stock = real.reduce((sum, o) => sum + o.stock, 0)
    s.sellers = new Set(real.map(o => o.accountName)).size
  }
  return steps
}

/**
 * Buying `want` from the cheapest offers up, in each seller's lot size, never past their stock.
 * Whole lots that fit come first; what's left is finished by the offer that does it for least,
 * so a Buy of 1 isn't one big cheap lot when a single costs less.
 */
export function fillPlan<T extends LadderOffer> (offers: readonly T[], want: number): FillPlan<T> {
  const sorted = offers.filter(buyable).sort((a, b) => unitOf(a) - unitOf(b))
  const lotsOf = new Map<T, number>()
  let left = Math.max(1, Math.floor(want))
  const room = (o: T) => Math.floor(o.stock / o.itemAmount) - (lotsOf.get(o) ?? 0)
  for (const offer of sorted) {
    if (left <= 0) break
    const lots = Math.min(Math.floor(left / offer.itemAmount), room(offer))
    if (lots <= 0) continue
    lotsOf.set(offer, lots)
    left -= lots * offer.itemAmount
  }
  // The rest is smaller than the lots it reached: the cheapest way to cover it, overshooting as little as it must.
  while (left > 0) {
    let best: { offer: T, lots: number, cost: number } | null = null
    for (const offer of sorted) {
      const lots = Math.min(Math.ceil(left / offer.itemAmount), room(offer))
      if (lots <= 0) continue
      const covers = lots * offer.itemAmount >= left
      const cost = lots * offer.exchangeAmount
      // One that covers it all beats one that doesn't; then the cheaper.
      if (!best || (covers && best.lots * best.offer.itemAmount < left) || (covers === (best.lots * best.offer.itemAmount >= left) && cost < best.cost)) {
        best = { offer, lots, cost }
      }
    }
    if (!best) break
    lotsOf.set(best.offer, (lotsOf.get(best.offer) ?? 0) + best.lots)
    left -= best.lots * best.offer.itemAmount
  }
  const picks: Array<FillPick<T>> = sorted.filter(o => lotsOf.has(o)).map(offer => {
    const lots = lotsOf.get(offer)!
    return { offer, lots, items: lots * offer.itemAmount, cost: lots * offer.exchangeAmount }
  })
  return {
    picks,
    items: picks.reduce((s, p) => s + p.items, 0),
    cost: picks.reduce((s, p) => s + p.cost, 0),
    short: left > 0
  }
}
