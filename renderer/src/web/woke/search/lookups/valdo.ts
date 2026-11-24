// "valdo headhunter" in the search palette: a Valdo map price check for that
// reward, without owning one. The check opens as if a Valdo map with that
// reward and no other mods was pasted, so your Map mods template (the Not
// list on the Valdo strip) hides listings as on a real one.
import { matchRank } from '../search'
import type { Lookup, LookupCard } from './types'
import { valdoMapText } from '../../valdo/map-text'

export { valdoMapText }

// poe.ninja's unique kinds a Valdo map can reward.
const REWARD_TYPES = new Set(['UniqueWeapon', 'UniqueArmour', 'UniqueAccessory', 'UniqueFlask', 'UniqueJewel'])
const MAX_CARDS = 5

/** `known`: whether the item data has this unique (the check can't read others). */
export function valdoLookup (known: (name: string) => boolean): Lookup {
  return (query, ctx) => {
    const m = /^valdo(?:'s)?(?:\s+maps?)?(?:\s+(.*))?$/i.exec(query.trim())
    if (!m) return []
    const rest = (m[1] ?? '').trim()
    if (rest.length < 2) {
      return [{
        id: 'valdo-help',
        group: 'Valdo map',
        name: 'Valdo map price check',
        sub: 'Type the reward: valdo headhunter',
        icon: 'fas fa-map',
        sections: [{ text: ['Type a unique after "valdo" to price check Valdo maps that reward it. Your Map mods template hides listings with mods you set Not.'] }],
        actions: [{ label: 'Type a reward', search: 'valdo ' }]
      }]
    }
    const seen = new Set<string>()
    const hits: Array<{ name: string, rank: number }> = []
    for (const row of ctx.items) {
      if (!REWARD_TYPES.has(row.type) || seen.has(row.name)) continue
      seen.add(row.name)
      const rank = matchRank(row.name, rest)
      if (rank >= 0 && known(row.name)) hits.push({ name: row.name, rank })
    }
    hits.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
    return hits.slice(0, MAX_CARDS).map(({ name }): LookupCard => ({
      id: `valdo:${name}`,
      group: 'Valdo map',
      name: `Valdo map: ${name}`,
      sub: 'Price check Valdo maps with this reward',
      icon: 'fas fa-map',
      tip: { name },
      sections: [
        { rows: [{ label: name, chaos: ctx.price(name), item: { name } }] },
        { text: ['Opens a price check for Valdo maps that reward it. Your Map mods template hides listings with mods you set Not.'] }
      ],
      actions: [{ label: 'Price check', priceCheck: valdoMapText(name) }]
    }))
  }
}
