// Fake card prices on poe.ninja, for the deck tracker. Pure: no Vue or IO.
import { heldPrice } from '../shared/price-trust'
import type { HeldPrice } from '../shared/price-trust'

// The shared fake-price check (shared/price-trust.ts heldPrice), for cards.
export type { HeldPrice }

export function guardCardPrice (chaos: number, graph: Array<number | null> | undefined, days: number | undefined): HeldPrice | null {
  return heldPrice(chaos, graph, days, 'cards')
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
