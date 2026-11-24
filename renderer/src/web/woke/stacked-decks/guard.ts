// Fake card prices on poe.ninja, for the deck tracker. Pure: no Vue or IO.
import { ninjaDoubt } from '../price-insight/ninja-trust'

// A card price poe.ninja shows but the deck tracker doesn't count as is.
export interface HeldPrice {
  ninja: number
  // What counts instead (null: nothing, counted as 0).
  chaos: number | null
  kind: 'one-day' | 'spike'
}

// The same fake-price checks as Net worth and the price check (ninja-trust.ts),
// on poe.ninja's own 7-day line. Thirst for Knowledge read 14,139c (72 div) on
// the one day poe.ninja had it; a card in 1 of 200 decks isn't worth that.
// A price on one day only, at 10c or more, counts as 0 (no earlier price to
// fall back on); a sudden 5x step counts at the usual price until it holds.
// A thin market alone is kept: most cheap cards are thin.
export function guardCardPrice (chaos: number, graph: Array<number | null> | undefined, days: number | undefined): HeldPrice | null {
  const d = ninjaDoubt({ chaos, graph, days, category: 'cards' })
  if (d?.kind === 'one-day') return { ninja: chaos, chaos: d.usual, kind: 'one-day' }
  if (d?.kind === 'spike') return { ninja: chaos, chaos: d.usual, kind: 'spike' }
  return null
}

// A saved session's prices, without a fake one today's check still catches:
// a session saved while poe.ninja showed the fake price keeps it otherwise.
export function withoutHeld (saved: (name: string) => number | null, held: (name: string) => HeldPrice | null): (name: string) => number | null {
  return (name) => {
    const chaos = saved(name)
    const h = chaos != null ? held(name) : null
    return h && chaos! >= h.ninja / 2 ? h.chaos : chaos
  }
}
