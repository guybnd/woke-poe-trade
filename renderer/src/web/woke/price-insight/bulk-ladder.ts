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
  /** Items on offer at this price (sellers' stock added up). */
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
    s.stock = s.offers.reduce((sum, o) => sum + o.stock, 0)
    s.sellers = new Set(s.offers.map(o => o.accountName)).size
  }
  return steps
}

/** Buying `want` from the cheapest offers up, in each seller's lot size, never past their stock. */
export function fillPlan<T extends LadderOffer> (offers: readonly T[], want: number): FillPlan<T> {
  const sorted = offers.filter(buyable).sort((a, b) => unitOf(a) - unitOf(b))
  const picks: Array<FillPick<T>> = []
  let left = Math.max(1, Math.floor(want))
  for (const offer of sorted) {
    if (left <= 0) break
    const lots = Math.min(Math.ceil(left / offer.itemAmount), Math.floor(offer.stock / offer.itemAmount))
    if (lots <= 0) continue
    const items = lots * offer.itemAmount
    picks.push({ offer, lots, items, cost: lots * offer.exchangeAmount })
    left -= items
  }
  return {
    picks,
    items: picks.reduce((s, p) => s + p.items, 0),
    cost: picks.reduce((s, p) => s + p.cost, 0),
    short: left > 0
  }
}
