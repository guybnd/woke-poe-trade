// Fake card prices on poe.ninja, for the deck tracker. Pure: no Vue or IO.
import { heldPrice } from '../shared/price-trust'
import type { HeldPrice } from '../shared/price-trust'

// The shared fake-price check (shared/price-trust.ts heldPrice), for cards.
export type { HeldPrice }

// A card's share of what a deck gives can't be more than this many decks'
// price: a deck's whole expected value sits near its price (people open them
// while it's worth it), so one card worth far more is a few fake listings.
// Loyalty, 1 in 45 decks, read 53 div (~10,000c): ~220c a deck on its own.
// The Doctor (1 in 126,000) passes this up to ~950,000c at a 3c deck.
export const DROP_RATE_CAP = 2

export function guardCardPrice (chaos: number, graph: Array<number | null> | undefined, days: number | undefined, drop?: { chance: number, deckChaos: number | null }): HeldPrice | null {
  // poe.ninja's line can't tell a fake that's held for days, or one with no
  // earlier price: the drop rate can.
  const held = heldPrice(chaos, graph, days, 'cards')
  if (!drop) return held
  // A fake that climbs again: the line's "usual" price is the earlier fake.
  if (held?.chaos != null && dropRateHeld(held.chaos, drop.chance, drop.deckChaos)) return { ninja: chaos, chaos: null, kind: 'drop-rate' }
  return held ?? dropRateHeld(chaos, drop.chance, drop.deckChaos)
}

// A card price over DROP_RATE_CAP decks' worth for how often it drops, or null.
// `chance`: its share of deck draws (weights.ts dropChance; 0 = unknown).
export function dropRateHeld (chaos: number | null, chance: number, deckChaos: number | null): HeldPrice | null {
  if (chaos == null || !(chance > 0) || deckChaos == null || !(deckChaos > 0)) return null
  return chaos * chance > DROP_RATE_CAP * deckChaos ? { ninja: chaos, chaos: null, kind: 'drop-rate' } : null
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
