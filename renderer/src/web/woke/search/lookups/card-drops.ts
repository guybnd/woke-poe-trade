// A map name lists the divination cards that drop there, dearest first: which
// map to run for cards. From the Divcord data (card-drops/card-drops.ts).
import { cardChanceIn, cardPageUrl, cardsInMap, mapLabel, mapTip, mapsMatching, oneInText, valuePerCardDrop, DIVCORD_URL } from '../../card-drops/card-drops'
import type { CardDropData } from '../../card-drops/card-drops'
import { formatChaos } from '../../ui/format'
import { SCRYING_TYPE } from '../../scrying/widget'
import { ITEM_BY_REF } from '@/assets/data'
import { matchRank } from '../search'
import type { Lookup, LookupCard, LookupContext, LookupRow } from './types'

export function mapCardsCard (data: CardDropData, map: string, ctx: LookupContext): LookupCard {
  const price = (name: string) => ctx.price(name)
  const cards = cardsInMap(data, map)
    .map(name => ({ name, chaos: price(name) }))
    .sort((a, b) => (b.chaos ?? -1) - (a.chaos ?? -1) || (a.name < b.name ? -1 : 1))
  // Each card's share of the map's own cards, and their average value (Guy's pick, veteran review 2026-11-24).
  const rows: LookupRow[] = cards.map(c => {
    const oneIn = cardChanceIn(data, c.name, map)
    return {
      label: c.name,
      item: { name: c.name, type: 'DivinationCard' },
      ...(oneIn ? { note: oneInText(oneIn) } : {}),
      ...(c.chaos != null ? { chaos: c.chaos, bulk: true } : { value: 'No price', dim: true })
    }
  })
  const perDrop = valuePerCardDrop(data, map, price)
  const tier = data.maps[map]
  const label = mapLabel(map)
  const best = cards[0]
  const content = mapTip(data, map, price, chaos => formatChaos(chaos, ctx.divine))
  return {
    id: `map-cards:${map}`,
    group: 'Div cards by map',
    name: `${label}: ${cards.length} card${cards.length === 1 ? '' : 's'}`,
    title: map,
    sub: best ? `Best: ${best.name}${best.chaos != null ? ` · ${formatChaos(best.chaos, ctx.divine)}` : ''}${perDrop != null ? ` · about ${formatChaos(perDrop, ctx.divine)} per card` : ''}` : 'No cards listed',
    icon: 'fas fa-map',
    tip: { name: map, content },
    sections: [
      { label: `Cards in ${label}${tier ? ` (tier ${tier})` : ''}`, rows },
      ...(perDrop != null ? [{ text: [`About ${formatChaos(perDrop, ctx.divine)} per card from this map's list. 1 in N: how many of this map's own cards it takes, on average, to get that one.`] }] : []),
      { text: ['Sources: Divcord, weights from the Prohibited Library (by drop weight; cards from bosses and league content are not counted). Prices are poe.ninja\'s, per card.'] }
    ],
    actions: [
      ...(best ? [{ label: `Look up ${best.name}`, search: best.name }] : []),
      // Only maps a Scrying Orb can name (tiered, with an orb on trade).
      ...(ctx.tools.has(SCRYING_TYPE) && tier > 0 && ITEM_BY_REF('AREA', label)?.[0]?.tradeDisc ? [{ label: 'Scry it', open: { tool: SCRYING_TYPE, id: map } }] : []),
      { label: 'Divcord', url: best ? cardPageUrl(best.name) : DIVCORD_URL }
    ]
  }
}

// "scry" or "scrying": a card that opens the Scrying window.
function scryingCard (): LookupCard {
  return {
    id: 'scrying-window',
    group: 'Div cards by map',
    name: 'Scrying',
    sub: 'Which map to scry, by the cards a Scrying Orb adds per map',
    icon: 'fas fa-eye',
    tip: { name: 'Scrying Orb' },
    sections: [{ text: ['A Scrying Orb names a map. Used on a map on your Atlas, that map\'s own divination cards become the named map\'s. The Scrying window ranks maps by what that adds per map you run, with the orb\'s price from trade and a Buy link.'] }],
    actions: [{ label: 'Open Scrying', tool: SCRYING_TYPE }]
  }
}

export function mapCardsLookup (data: CardDropData | null): Lookup {
  if (!data) return () => []
  return (query, ctx) => {
    const q = query.trim()
    const scry = q.length >= 4 && ctx.tools.has(SCRYING_TYPE) && [matchRank('Scrying', q), matchRank('Scry', q)].some(r => r >= 0 && r < 2) ? [scryingCard()] : []
    return [...scry, ...mapsMatching(data, query)
      .filter(map => cardsInMap(data, map).length)
      .slice(0, 3)
      .map(map => mapCardsCard(data, map, ctx))]
  }
}
