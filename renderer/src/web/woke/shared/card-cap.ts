// The drop-rate check for divination card prices: a card can't be worth more
// than a few decks' price for how often it comes out of a Stacked Deck. Small
// and without the weights, so windows loaded at startup can use it: the
// weights (stacked-decks/pl-weights.json) load on first use.
import type { HeldPrice } from './price-trust'

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

// ---------- the weights, loaded on first use ----------
let chances: Map<string, number> | null = null
let loading: Promise<void> | null = null

export function loadCardChances (): Promise<void> {
  loading ??= import('../stacked-decks/pl-weights.json')
    .then(m => {
      const weights = (m.default ?? m).weights as Record<string, number>
      const sum = Object.values(weights).reduce((a, b) => a + b, 0)
      const out = new Map<string, number>()
      if (sum > 0) for (const [name, w] of Object.entries(weights)) out.set(name, w / sum)
      chances = out
    })
    .catch(() => { loading = null })
  return loading
}

// A card's share of deck draws; 0 until the weights load, or for a card
// they don't have.
export function cardChance (name: string): number {
  if (!chances) { loadCardChances().catch(() => {}); return 0 }
  return chances.get(name) ?? 0
}
