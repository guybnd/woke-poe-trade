// "megalo" in the search palette: a card that opens the Megalomaniac searcher.
import { matchRank } from '../search'
import { MEGALO_TYPE } from '../../megalo/widget'
import type { Lookup } from './types'

export const megaloLookup: Lookup = (query, ctx) => {
  const q = query.trim()
  if (q.length < 4 || !ctx.tools.has(MEGALO_TYPE)) return []
  if (matchRank('Megalomaniac searcher', q) < 0 && matchRank('Megalo search', q) < 0) return []
  return [{
    id: 'megalo-searcher',
    group: 'Megalomaniac',
    name: 'Megalomaniac searcher',
    sub: 'Trade search for the notables your build wants',
    icon: 'fas fa-circle-nodes',
    tip: { name: 'Megalomaniac' },
    sections: [
      { text: ['Reads your PoB build or character, scores every notable Megalomaniac can roll, and searches trade for jewels with 2 or 3 of the ones you tick.'] },
      { rows: [{ label: 'Megalomaniac', chaos: ctx.price('Megalomaniac'), item: { name: 'Megalomaniac' } }] }
    ],
    actions: [{ label: 'Open the searcher', tool: MEGALO_TYPE }]
  }]
}
