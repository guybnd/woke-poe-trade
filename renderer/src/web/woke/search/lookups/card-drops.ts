// A map name lists the divination cards that drop there, dearest first: which
// map to run for cards. From the Divcord data (card-drops/card-drops.ts).
import { cardPageUrl, cardsInMap, mapLabel, mapTip, mapsMatching, DIVCORD_URL } from '../../card-drops/card-drops'
import type { CardDropData } from '../../card-drops/card-drops'
import { formatChaos } from '../../ui/format'
import type { Lookup, LookupCard, LookupContext, LookupRow } from './types'

export function mapCardsCard (data: CardDropData, map: string, ctx: LookupContext): LookupCard {
  const price = (name: string) => ctx.price(name)
  const cards = cardsInMap(data, map)
    .map(name => ({ name, chaos: price(name) }))
    .sort((a, b) => (b.chaos ?? -1) - (a.chaos ?? -1) || (a.name < b.name ? -1 : 1))
  const rows: LookupRow[] = cards.map(c => ({
    label: c.name,
    item: { name: c.name, type: 'DivinationCard' },
    ...(c.chaos != null ? { chaos: c.chaos, bulk: true } : { value: 'No price', dim: true })
  }))
  const tier = data.maps[map]
  const label = mapLabel(map)
  const best = cards[0]
  const content = mapTip(data, map, price, chaos => formatChaos(chaos, ctx.divine))
  return {
    id: `map-cards:${map}`,
    group: 'Div cards by map',
    name: `${label}: ${cards.length} card${cards.length === 1 ? '' : 's'}`,
    title: map,
    sub: best ? `Best: ${best.name}${best.chaos != null ? ` · ${formatChaos(best.chaos, ctx.divine)}` : ''}` : 'No cards listed',
    icon: 'fas fa-map',
    tip: { name: map, content },
    sections: [
      { label: `Cards in ${label}${tier ? ` (tier ${tier})` : ''}`, rows },
      { text: ['Sources: Divcord. Prices are poe.ninja\'s, per card.'] }
    ],
    actions: [
      ...(best ? [{ label: `Look up ${best.name}`, search: best.name }] : []),
      { label: 'Divcord', url: best ? cardPageUrl(best.name) : DIVCORD_URL }
    ]
  }
}

export function mapCardsLookup (data: CardDropData | null): Lookup {
  if (!data) return () => []
  return (query, ctx) => mapsMatching(data, query)
    .filter(map => cardsInMap(data, map).length)
    .slice(0, 3)
    .map(map => mapCardsCard(data, map, ctx))
}
