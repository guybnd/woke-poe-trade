// The drop-rate check for divination card prices: a card can't be worth more
// than a few decks' price for how often it comes out of a Stacked Deck, by
// the Prohibited Library's weights (stacked-decks/pl-weights.json).
import type { HeldPrice } from './price-trust'
import PL_WEIGHTS from '../stacked-decks/pl-weights.json'

export const STACKED_DECK = 'Stacked Deck'

// A card's share of what a deck gives can't be more than this many decks'
// price: a deck's whole expected value sits near its price (people open them
// while it's worth it), so one card worth far more is a few fake listings.
// Loyalty, 1 in 45 decks, read 53 div (~10,000c): ~220c a deck on its own.
// The Doctor (1 in 126,000) passes this up to ~950,000c at a 3c deck.
export const DROP_RATE_CAP = 2

// A card price over DROP_RATE_CAP decks' worth for how often it drops, or null.
// `chance`: its share of deck draws (0 = unknown).
export function dropRateHeld (chaos: number | null, chance: number, deckChaos: number | null): HeldPrice | null {
  if (chaos == null || !(chance > 0) || deckChaos == null || !(deckChaos > 0)) return null
  return chaos * chance > DROP_RATE_CAP * deckChaos ? { ninja: chaos, chaos: null, kind: 'drop-rate' } : null
}

// The line checks' hold (price-trust.ts heldPrice) with the drop-rate check on
// top. A fake that climbs again: the line's "usual" price is the earlier fake.
export function withDropRate (chaos: number, held: HeldPrice | null, chance: number, deckChaos: number | null): HeldPrice | null {
  if (held?.chaos != null && dropRateHeld(held.chaos, chance, deckChaos)) return { ninja: chaos, chaos: null, kind: 'drop-rate' }
  return held ?? dropRateHeld(chaos, chance, deckChaos)
}

// The most a card can be worth at this deck price, or null when unknown.
export function cardCap (chance: number, deckChaos: number | null): number | null {
  return chance > 0 && deckChaos != null && deckChaos > 0 ? DROP_RATE_CAP * deckChaos / chance : null
}

// ---------- the weights ----------
// Static, not loaded on first use: a check made before a lazy load arrived
// went unguarded, and Net worth saved such a read (baseline, chart). ~9 KB.
let chances: Map<string, number> | null = null
function table (): Map<string, number> {
  if (!chances) {
    const weights = PL_WEIGHTS.weights as Record<string, number>
    const sum = Object.values(weights).reduce((a, b) => a + b, 0)
    chances = new Map()
    if (sum > 0) for (const [name, w] of Object.entries(weights)) chances.set(name, w / sum)
  }
  return chances
}

// A card's share of deck draws; 0 for a card the weights don't have.
export function cardChance (name: string): number {
  return table().get(name) ?? 0
}
