// Things to try, shown in the empty search box and on "?". Guy's picks,
// in his order. Picking one searches it.
import type { LookupCard } from './types'

export interface Example {
  query: string
  shows: string
  icon: string
  // Show the live answer instead of `shows` once prices are in.
  live?: boolean
  // A hint, not a search: picking it only puts the cursor in the box.
  hint?: boolean
}

export const EXAMPLES: Example[] = [
  { query: 'mageblood', shows: 'Price per flask count; 24h and 7d change', icon: 'fas fa-coins' },
  { query: 'the doctor', shows: '8-card set price vs Headhunter', icon: 'fas fa-layer-group' },
  { query: '1 mirror in div', shows: 'Value in divines', icon: 'fas fa-calculator', live: true },
  { query: 'awakened enlighten', shows: 'Where it drops, drop chance', icon: 'fas fa-gift' },
  { query: 'rustic sash', shows: 'Weapon + sash + whetstone → 40-84% inc. phys', icon: 'fas fa-store' },
  { query: 'herald of ash', shows: 'Quest reward and vendors, by class', icon: 'fas fa-gem' },
  { query: 'resolute technique', shows: 'Keystone stats; uniques that grant it', icon: 'fas fa-dharmachakra' },
  { query: 'lord of drought', shows: 'Cluster jewel notable stats', icon: 'fas fa-circle-nodes' },
  { query: 'lab reset', shows: 'Time to the lab layout reset', icon: 'fas fa-hourglass-half' },
  { query: 'market', shows: 'Opens Market', icon: 'fas fa-chart-line' },
  { query: 'any words', shows: 'poewiki and poedb search', icon: 'fas fa-book', hint: true }
]

export const HELP_QUERY = '?'

// `answer`: the live answer for a query, when the example asks for one.
export function exampleCards (answer: (query: string) => string | null = () => null): LookupCard[] {
  return EXAMPLES.map(e => ({
    id: `example:${e.query}`,
    group: 'Things to try',
    name: e.query,
    sub: (e.live ? answer(e.query) : null) ?? e.shows,
    icon: e.icon,
    title: e.hint ? 'Search the web' : `Try "${e.query}"`,
    sections: [{ text: [e.shows] }],
    actions: [{ label: e.hint ? 'Type anything' : `Search "${e.query}"`, search: e.hint ? '' : e.query }]
  }))
}
