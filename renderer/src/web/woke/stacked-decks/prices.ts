// Card, Stacked Deck and divine prices from the poe.ninja data the price
// check already downloads, and the luck numbers built on them.
import { computed } from 'vue'
import type { Ref } from 'vue'
import { usePoeninja } from '@/web/background/Prices'
import { STACKED_DECK, calibration, expectedValue, luckPercentile, ownAverage } from './deck'
import type { DeckRecord, PriceOf } from './deck'
import { WEIGHTS } from './weights'

export function useDeckPrices () {
  const ninja = usePoeninja()
  // APT's price table isn't reactive: each lookup reads updatedAt, which a
  // new download changes.
  function lookup (ns: string, name: string): number | null {
    if (ninja.updatedAt.value == null) return null
    try {
      return ninja.findPriceByQuery({ ns, name, variant: undefined })?.chaos ?? null
    } catch { return null }
  }
  const price = computed<PriceOf>(() => {
    const cache = new Map<string, number | null>()
    // Read here, so this table is rebuilt when prices change.
    const loaded = ninja.updatedAt.value != null
    return (name) => {
      if (!loaded) return null
      if (!cache.has(name)) cache.set(name, lookup('DIVINATION_CARD', name))
      return cache.get(name)!
    }
  })
  const deckChaos = computed<number | null>(() => lookup('ITEM', STACKED_DECK))
  const divine = computed<number | null>(() => ninja.xchgRate.value ?? null)
  const ready = computed(() => ninja.updatedAt.value != null)
  return { price, deckChaos, divine, ready, fetch: () => { ninja.queuePricesFetch() } }
}

export interface Luck {
  // Chaos per deck the weights expect (after calibration).
  expectedPerDeck: number
  // What these decks gave, per deck.
  gotPerDeck: number
  // 0–1: share of sessions like this one that got less.
  percentile: number | null
  // The weights scaled by your own decks (1: as they are).
  scale: number
  ownDecks: number
}

function seedOf (id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return h >>> 0
}

// C3: what these decks should have given against what they did. History
// other than this session calibrates the weights (D1 + D2).
export function luckFor (draws: string[], got: number, id: string, price: PriceOf, history: DeckRecord[]): Luck | null {
  if (!draws.length) return null
  const expected = expectedValue(WEIGHTS, price)
  if (!expected || expected.perDeck <= 0) return null
  const own = ownAverage(history.filter(r => r.id !== id), price)
  const scale = calibration(own, expected)
  return {
    expectedPerDeck: expected.perDeck * scale,
    gotPerDeck: got / draws.length,
    percentile: luckPercentile(expected, draws.length, got, scale, seedOf(id) ^ draws.length),
    scale,
    ownDecks: own?.decks ?? 0
  }
}

export function useLuck (session: Ref<{ draws: string[], got: number, id: string } | null>, price: Ref<PriceOf>, history: Ref<DeckRecord[]>) {
  // The same session, cards, prices and history give the last answer: the
  // config is swapped for a copy on every save, which would rerun it.
  let lastKey = ''
  let lastPrice: PriceOf | null = null
  let last: Luck | null = null
  return computed(() => {
    const s = session.value
    if (!s) return null
    const px = price.value
    const key = `${s.id}:${s.draws.length}:${s.got}:${history.value.length}`
    if (key === lastKey && px === lastPrice) return last
    lastKey = key
    lastPrice = px
    last = luckFor(s.draws, s.got, s.id, px, history.value)
    return last
  })
}
