// Where divination cards drop: the atlas maps that have each card, other
// verified sources (campaign zones, bosses, league content), the lowest area
// level and how rare it is. From the community Divcord sheet via divicards
// (scripts/build-card-drops.mjs), fetched once when something needs it.
import type { LookupTip } from '../ui/tooltip/tooltip'
import type { TipLine } from '../ui/tooltip/tip-content'

export interface CardDrop {
  // Atlas maps, highest tier first ("Waste Pool Map").
  m?: string[]
  // Other verified sources, as lines.
  s?: string[]
  // Lowest area level.
  l?: number
  // 1 in this many card drops (stacked-deck weights).
  w?: number
  // No longer drops.
  x?: 1
}

export interface CardDropData {
  // The league the weights are from, e.g. "3.29".
  season: string | null
  // Map name to its tier; 0 for unique maps.
  maps: Record<string, number>
  cards: Record<string, CardDrop>
}

export const DIVCORD_URL = 'https://divicards-site.pages.dev/divcord'
export const cardPageUrl = (name: string) =>
  `https://divicards-site.pages.dev/card/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`

let job: Promise<CardDropData | null> | null = null
export function loadCardDrops (): Promise<CardDropData | null> {
  job ??= fetch(`${import.meta.env.BASE_URL}data/card-drops.json`)
    .then(r => {
      if (!r.ok) throw new Error(`${r.status}`)
      return r.json() as Promise<CardDropData>
    })
    // Tried again on the next ask.
    .catch(() => { job = null; return null })
  return job
}

export interface DropMap {
  // As the item is named, for its tooltip: "Waste Pool Map".
  name: string
  // As shown: "Waste Pool".
  label: string
  tier: number | null
}

export interface CardDropFacts {
  maps: DropMap[]
  other: string[]
  level: number | null
  oneIn: number | null
  disabled: boolean
}

export const mapLabel = (name: string) => name.replace(/ Map$/, '')

export function dropMap (data: CardDropData, name: string): DropMap {
  return { name, label: mapLabel(name), tier: data.maps[name] || null }
}

export function cardDropFacts (data: CardDropData | null, card: string): CardDropFacts | null {
  const e = data?.cards[card]
  if (!data || !e) return null
  return {
    maps: (e.m ?? []).map(m => dropMap(data, m)),
    other: e.s ?? [],
    level: e.l ?? null,
    oneIn: e.w ?? null,
    disabled: !!e.x
  }
}

// "1 in 12", "1 in 4,300", "1 in 121k", "1 in 1.2M".
export function oneInText (n: number): string {
  if (n < 10_000) return `1 in ${n.toLocaleString('en-US')}`
  if (n < 1_000_000) return `1 in ${Math.round(n / 1000)}k`
  return `1 in ${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
}

// A short line under the maps: "Area level 75+ · 1 in 121k cards". The
// share is of stacked-deck draws (drop weights), not a drop rate in maps.
export function factLine (f: CardDropFacts): string {
  if (f.disabled) return 'No longer drops'
  const parts: string[] = []
  if (f.level) parts.push(`Area level ${f.level}+`)
  if (f.oneIn) parts.push(`${oneInText(f.oneIn)} cards`)
  return parts.join(' · ')
}

// How rare the card is among all card drops, by stacked-deck drop weight
// (the Prohibited Library's research): "1 in 121k cards". Null for a card
// with no weight or one that no longer drops.
export function rarityText (f: CardDropFacts | null): string | null {
  return f && !f.disabled && f.oneIn ? `${oneInText(f.oneIn)} cards` : null
}

// The hover on the rarity.
export const rarityWords = (oneIn: number) =>
  `About ${oneInText(oneIn)} of all divination cards that drop is this one, by drop weight (the Prohibited Library's stacked-deck research)`

// The cards that drop in a map, by name.
export function cardsInMap (data: CardDropData, map: string): string[] {
  const out: string[] = []
  for (const [name, e] of Object.entries(data.cards)) {
    if (!e.x && e.m?.includes(map)) out.push(name)
  }
  return out
}

// Lower case, no accents ("Maelström" = "maelstrom").
const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// Map names a query names: the start of the name, or (4 letters or more) a
// phrase from the start of any word in it ("coward's trial", "chambers").
export function mapsMatching (data: CardDropData, query: string): string[] {
  const q = fold(query.trim()).replace(/\s+/g, ' ').replace(/ m(a(p)?)?$/, '')
  if (q.length < 3) return []
  const out: Array<[string, number]> = []
  for (const name of Object.keys(data.maps)) {
    const label = fold(mapLabel(name))
    const rank = label === q ? 0 : label.startsWith(q) ? 1 : q.length >= 4 && ` ${label}`.includes(` ${q}`) ? 2 : -1
    if (rank >= 0) out.push([name, rank])
  }
  return out.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1)).map(([n]) => n)
}

// The map's own tooltip: its tier and the cards in it, dearest first.
export function mapTip (data: CardDropData, map: string, price: (card: string) => number | null, fmt: (chaos: number) => string): LookupTip {
  const cards = cardsInMap(data, map)
    .map(name => ({ name, chaos: price(name) }))
    .sort((a, b) => (b.chaos ?? -1) - (a.chaos ?? -1) || (a.name < b.name ? -1 : 1))
  const lines: TipLine[] = cards.map(c => {
    const oneIn = cardChanceIn(data, c.name, map)
    return [
      { text: c.name, tone: 'card' as const },
      ...(c.chaos != null ? [{ text: `  ${fmt(c.chaos)}`, tone: 'value' as const }] : []),
      ...(oneIn ? [{ text: `  ${oneInText(oneIn)}`, tone: 'dim' as const }] : [])
    ]
  })
  const perDrop = valuePerCardDrop(data, map, price)
  const tier = data.maps[map]
  return {
    kind: 'lookup',
    model: {
      name: map,
      base: tier ? `Map Tier ${tier}` : undefined,
      // Unique maps have no tier.
      frame: tier ? 'normal' : 'unique',
      sections: [
        [[{ text: 'Divination cards here', tone: 'label' }]],
        lines.length ? lines : [[{ text: 'No cards listed', tone: 'dim' }]],
        ...(perDrop != null ? [[[{ text: `About ${fmt(perDrop)} per card from this map's list (by drop weight)`, tone: 'dim' as const }]]] : [])
      ]
    },
    market: null
  }
}

// How likely a card from a map is to be a given card (Guy's pick, veteran
// review 2026-11-24): the card's drop weight over the total weight of the
// cards Divcord lists for that map. Cards Divcord ties to no map (bosses,
// league content, unverified ones) are left out, so this ranks a map's own
// cards against each other; it is not a drop rate. Cards with no weight are
// left out too.

export interface PoolCard { name: string, weight: number }
export interface MapPool { cards: PoolCard[], total: number }

const poolCache = new WeakMap<CardDropData, Map<string, MapPool>>()
// The map's own weighted cards, with their weight (1 / "1 in N").
export function mapPool (data: CardDropData, map: string): MapPool {
  let byMap = poolCache.get(data)
  if (!byMap) { byMap = new Map(); poolCache.set(data, byMap) }
  let pool = byMap.get(map)
  if (!pool) {
    const cards: PoolCard[] = []
    for (const [name, e] of Object.entries(data.cards)) {
      if (!e.x && e.w && e.m?.includes(map)) cards.push({ name, weight: 1 / e.w })
    }
    pool = { cards, total: cards.reduce((s, c) => s + c.weight, 0) }
    byMap.set(map, pool)
  }
  return pool
}

// About 1 in this many of the map's cards is this one; null when the card has
// no weight or isn't listed for the map.
export function cardChanceIn (data: CardDropData, card: string, map: string): number | null {
  const pool = mapPool(data, map)
  const c = pool.cards.find(x => x.name === card)
  return c && pool.total > 0 ? Math.max(1, Math.round(pool.total / c.weight)) : null
}

// What one of the map's cards is worth on average, in chaos: unpriced cards
// count as 0. Null when none has a price.
export function valuePerCardDrop (data: CardDropData, map: string, price: (card: string) => number | null): number | null {
  const pool = mapPool(data, map)
  if (!pool.total) return null
  let sum = 0
  let priced = false
  for (const c of pool.cards) {
    const p = price(c.name)
    if (p == null) continue
    priced = true
    sum += p * c.weight
  }
  return priced ? sum / pool.total : null
}

// A card's maps, likeliest first (unknown chance last, in Divcord's order).
export function mapsByChance (data: CardDropData, card: string, maps: DropMap[]): Array<DropMap & { oneIn: number | null }> {
  return maps
    .map((m, i) => ({ ...m, oneIn: cardChanceIn(data, card, m.name), i }))
    .sort((a, b) => (a.oneIn ?? Infinity) - (b.oneIn ?? Infinity) || a.i - b.i)
    .map(({ name, label, tier, oneIn }) => ({ name, label, tier, oneIn }))
}

// The hover on a "1 in 22".
export const chanceWords = (oneIn: number) => `About ${oneInText(oneIn)} of this map's own cards is this one, by drop weight`
