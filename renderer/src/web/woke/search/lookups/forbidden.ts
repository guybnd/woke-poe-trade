// "bone barrier" or "forbidden" in the search palette: an ascendancy notable's
// Forbidden Flame and Flesh pair, with poe.ninja's price of the pair, and a
// card that opens the Forbidden pair finder.
import { matchRank } from '../search'
import { FORBIDDEN_TYPE } from '../../forbidden/widget'
import { FLAME, FLESH, ONLY_HERE, pairEstimate } from '../../forbidden/notables'
import type { ForbiddenNotable } from '../../forbidden/notables'
import type { Lookup, LookupCard } from './types'

const GROUP = 'Forbidden pairs'

export function forbiddenLookup (list: readonly ForbiddenNotable[] | null): Lookup {
  return (query, ctx) => {
    const q = query.trim()
    if (q.length < 4 || !ctx.tools.has(FORBIDDEN_TYPE)) return []
    const out: LookupCard[] = []
    if (matchRank('Forbidden pair finder', q) >= 0 || matchRank('Forbidden Flame Flesh', q) >= 0) {
      out.push({
        id: 'forbidden-finder',
        group: GROUP,
        name: 'Forbidden pair finder',
        sub: 'The notables your class can take, and what each pair costs',
        icon: 'fas fa-fire',
        tip: { name: FLAME },
        sections: [
          { text: ['Lists the ascendancy notables a Forbidden Flame and Flesh pair can give your class, with poe.ninja\'s price of each pair. Price runs two trade searches for the real cheapest pair, and Flame or Flesh opens the price check on that jewel.'] },
          { rows: [{ label: FLAME, item: { name: FLAME } }, { label: FLESH, item: { name: FLESH } }] }
        ],
        actions: [{ label: 'Open the finder', tool: FORBIDDEN_TYPE }]
      })
    }
    const hits = (list ?? [])
      .map(n => ({ n, rank: matchRank(n.name, q) }))
      .filter(h => h.rank >= 0 && h.rank < 2)
      .sort((a, b) => a.rank - b.rank || a.n.name.length - b.n.name.length)
      .slice(0, 3)
    for (const { n } of hits) {
      const est = pairEstimate(ctx.items.filter(i => i.type === 'ForbiddenJewel' && i.name === n.name))
      out.push({
        id: `forbidden:${n.node}`,
        group: GROUP,
        name: n.name,
        sub: `Forbidden pair · ${n.group === ONLY_HERE ? `${n.cls} only` : n.group}`,
        icon: 'fas fa-fire',
        sections: [
          { label: n.group === ONLY_HERE ? `Only on Forbidden jewels (${n.cls})` : `${n.group} notable (${n.cls})`, text: n.stats.length ? n.stats : [n.group === 'Ascendant' ? `The Ascendant's ${n.name} node.` : 'No stats in the tree data.'] },
          {
            label: 'Both jewels name it',
            rows: [
              { label: FLAME, item: { name: FLAME } },
              { label: FLESH, item: { name: FLESH } },
              { label: 'The pair, poe.ninja', chaos: est, dim: est == null }
            ]
          }
        ],
        actions: [{ label: 'Open in the finder', open: { tool: FORBIDDEN_TYPE, id: n.name } }]
      })
    }
    return out
  }
}
