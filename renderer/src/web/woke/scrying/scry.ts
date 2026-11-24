// Which map is worth scrying. A Scrying Orb names a map; used on a map on the
// Atlas, that map's own divination cards become the named map's cards (poedb,
// Map Scrying). Only non-unique maps with bonus objectives can be scried, to
// or from. So a scry is worth, per map run, the cards a map drops times the
// difference in what one of its own cards is worth on average.
//
// Pure: no Vue or IO, so the tests load it on its own.
import { mapLabel, mapPool, valuePerCardDrop } from '../card-drops/card-drops'
import type { CardDropData } from '../card-drops/card-drops'

export const DEFAULT_CARDS_PER_MAP = 3

// Maps a Scrying Orb can name: tiered atlas maps (unique maps have tier 0).
// `canScry`: the trade site has a Scrying Orb for it. Guardian maps, Vaal
// Temple, Ziggurat and a few others have none (no bonus objectives).
export function scryableMaps (data: CardDropData, canScry: (map: string) => boolean = () => true): string[] {
  return Object.entries(data.maps)
    .filter(([name, tier]) => tier > 0 && / Map$/.test(name) && canScry(name))
    .map(([name]) => name)
    .sort((a, b) => a.localeCompare(b))
}

export interface ScryCard {
  name: string
  // About 1 in this many of the map's own cards.
  oneIn: number
  price: number | null
  // What it adds to one card drop, in chaos (null: no price).
  adds: number | null
}

export interface ScryRow {
  map: string
  label: string
  tier: number
  // One of the map's own cards, on average, in chaos. Null: none priced.
  value: number | null
  // Per map run, over the map you scry from. Null: value unknown.
  gain: number | null
  // The orb's price in chaos, from trade. Null: not looked up yet.
  orb: number | null
  orbListings: number | null
  // Maps until the gain pays for the orb. Null: no orb price, or no gain.
  payback: number | null
  // The card adding the most, for the list's sub line.
  top: ScryCard | null
  cards: ScryCard[]
}

export interface ScryOpts {
  cardsPerMap: number
  // The map you run and scry from; its own cards are what you give up.
  fromMap: string | null
  canScry?: (map: string) => boolean
  orbPrice: (map: string) => { chaos: number, listings: number } | null
}

export function mapCards (data: CardDropData, map: string, price: (card: string) => number | null): ScryCard[] {
  const pool = mapPool(data, map)
  if (!pool.total) return []
  return pool.cards
    .map(c => {
      const p = price(c.name)
      return { name: c.name, oneIn: Math.max(1, Math.round(pool.total / c.weight)), price: p, adds: p == null ? null : p * c.weight / pool.total }
    })
    .sort((a, b) => (b.adds ?? -1) - (a.adds ?? -1) || a.oneIn - b.oneIn)
}

// What one of your map's own cards is worth; 0 when not set. Null: set, but
// none of its cards has a price (the gain is then over 0, an overstatement).
export function fromValue (data: CardDropData, fromMap: string | null, price: (card: string) => number | null): number | null {
  return fromMap ? valuePerCardDrop(data, fromMap, price) : 0
}

export function scryRows (data: CardDropData, price: (card: string) => number | null, opts: ScryOpts): ScryRow[] {
  const cardsPerMap = Math.max(0, opts.cardsPerMap)
  const base = fromValue(data, opts.fromMap, price) ?? 0
  return scryableMaps(data, opts.canScry)
    .filter(map => map !== opts.fromMap)
    .map(map => {
      const value = valuePerCardDrop(data, map, price)
      const cards = mapCards(data, map, price)
      const gain = value == null ? null : cardsPerMap * (value - base)
      const quote = opts.orbPrice(map)
      const orb = quote?.chaos ?? null
      const payback = orb != null && gain != null && gain > 0 ? Math.max(1, Math.ceil(orb / gain)) : null
      return {
        map,
        label: mapLabel(map),
        tier: data.maps[map],
        value,
        gain,
        orb,
        orbListings: quote?.listings ?? null,
        payback,
        top: cards[0]?.adds != null ? cards[0] : null,
        cards
      }
    })
}

export type ScrySort = 'gain' | 'payback'

export interface Ranked {
  // Gain over the map you run.
  good: ScryRow[]
  // No gain, or a loss.
  losing: ScryRow[]
  // No card prices yet.
  noData: ScryRow[]
}

export function rankScry (rows: ScryRow[], sort: ScrySort): Ranked {
  const priced = rows.filter(r => r.gain != null)
  const byGain = (a: ScryRow, b: ScryRow) => b.gain! - a.gain!
  // Payback: orbs priced first, fewest maps first; the rest by gain.
  const byPayback = (a: ScryRow, b: ScryRow) =>
    (a.payback ?? Infinity) - (b.payback ?? Infinity) || byGain(a, b)
  priced.sort(sort === 'payback' ? byPayback : byGain)
  return {
    good: priced.filter(r => r.gain! > 0),
    losing: priced.filter(r => r.gain! <= 0),
    noData: rows.filter(r => r.gain == null)
  }
}

// The official trade search for a map's Scrying Orb, cheapest first. `disc`:
// the map area's trade id (items data, AREA namespace).
export function orbTradeQuery (disc: string) {
  return {
    query: {
      status: { option: 'securable' as const },
      type: { discriminator: 'scrying_orb', option: disc },
      stats: []
    },
    sort: { price: 'asc' as const }
  }
}

export function orbTradeUrl (league: string, disc: string): string {
  return `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}?q=${encodeURIComponent(JSON.stringify(orbTradeQuery(disc)))}`
}
