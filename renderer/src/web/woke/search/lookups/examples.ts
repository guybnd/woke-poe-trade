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
  // A hint's card title.
  title?: string
  // Shown only while this tool (widget type) is switched on.
  tool?: string
}

export const EXAMPLES: Example[] = [
  { query: 'mageblood', shows: 'Price per flask count; 24h and 7d change', icon: 'fas fa-coins' },
  { query: 'the doctor', shows: '8-card set price vs Headhunter', icon: 'fas fa-layer-group' },
  { query: '1 mirror in div', shows: 'Value in divines', icon: 'fas fa-calculator', live: true },
  { query: '2 div + 30c', shows: 'Sums with currency at poe.ninja prices', icon: 'fas fa-calculator', live: true },
  { query: 'dunes map', shows: 'Its divination cards, odds and value', icon: 'fas fa-map' },
  { query: 'valdo headhunter', shows: 'Valdo maps with that reward, priced', icon: 'fas fa-box-open' },
  { query: 'vault', shows: 'All four Templar Vaults and their rewards', icon: 'fas fa-vault' },
  { query: 'sold', shows: 'Today\'s and this week\'s sales', icon: 'fas fa-handshake', tool: 'woke-net-worth' },
  { query: 'awakened enlighten', shows: 'Where it drops, drop chance', icon: 'fas fa-gift' },
  { query: 'rustic sash', shows: 'Weapon + sash + whetstone → 40-84% inc. phys', icon: 'fas fa-store' },
  { query: 'herald of ash', shows: 'Quest reward and vendors, by class', icon: 'fas fa-gem' },
  { query: 'resolute technique', shows: 'Keystone stats; uniques that grant it', icon: 'fas fa-dharmachakra' },
  { query: 'lord of drought', shows: 'Cluster jewel notable stats', icon: 'fas fa-circle-nodes' },
  { query: 'the coast', shows: 'Act, area level, waypoint, next zones', icon: 'fas fa-map-location-dot' },
  { query: 'soul of lunaris', shows: 'Pantheon powers; maps for the upgrade souls', icon: 'fas fa-sun' },
  { query: 'lab reset', shows: 'Time to the lab layout reset', icon: 'fas fa-hourglass-half' },
  { query: 'market', shows: 'Opens Market', icon: 'fas fa-chart-line' },
  { query: 'keys', shows: 'Every hotkey you have set and every mouse trick', icon: 'fas fa-keyboard' },
  { query: 'a saved name or folder', shows: 'Your regexes, trade searches, PoB builds, atlas strategies', icon: 'fas fa-bookmark', hint: true, title: 'Find your saved items' },
  { query: 'any words', shows: 'poewiki and poedb search', icon: 'fas fa-book', hint: true }
]

export const HELP_QUERY = '?'

// The empty box's placeholder tries one of these, a new one each open.
export const PLACEHOLDER_TRIES = ['2 div + 30c', 'dunes map', '50d / 7', 'valdo headhunter', 'keys', 'mageblood', 'vault', 'the doctor']
export function placeholderFor (opens: number): string {
  return `Item, tool or setting. Try: ${PLACEHOLDER_TRIES[opens % PLACEHOLDER_TRIES.length]}`
}

// `answer`: the live answer for a query, when the example asks for one.
// `tools`: the tools switched on; an example for a tool that's off is left out.
export function exampleCards (answer: (query: string) => string | null = () => null, tools?: ReadonlySet<string>): LookupCard[] {
  return EXAMPLES.filter(e => !e.tool || !tools || tools.has(e.tool)).map(e => ({
    id: `example:${e.query}`,
    group: 'Things to try',
    name: e.query,
    sub: (e.live ? answer(e.query) : null) ?? e.shows,
    icon: e.icon,
    title: e.hint ? (e.title ?? 'Search the web') : `Try "${e.query}"`,
    sections: [{ text: [e.shows] }],
    actions: [{ label: e.hint ? 'Type anything' : `Search "${e.query}"`, search: e.hint ? '' : e.query }]
  }))
}
