// "?" in the search box: things to try, one per kind of lookup. Picking one
// searches it.
import type { LookupCard } from './types'

interface Example { query: string, shows: string }

export const EXAMPLES: Array<{ group: string, icon: string, about: string, items: Example[] }> = [
  {
    group: 'Prices and items',
    icon: 'fas fa-coins',
    about: 'Any item name gives its poe.ninja prices, the wiki, poedb and the trade site. Paste a copied item to price check it.',
    items: [
      { query: 'mageblood', shows: 'Every Mageblood price, by flask count' },
      { query: 'divine orb', shows: 'Its price now, a day and a week ago' }
    ]
  },
  {
    group: 'Quick answers',
    icon: 'fas fa-calculator',
    about: 'Currency maths at today\'s prices, and countdowns.',
    items: [
      { query: '3.5 div', shows: 'In chaos' },
      { query: '1 mirror in div', shows: 'One currency in another' },
      { query: 'lab reset', shows: 'When the lab layout changes' },
      { query: 'league', shows: 'League start countdown, or the league\'s day' }
    ]
  },
  {
    group: 'Bosses and drops',
    icon: 'fas fa-dragon',
    about: 'Entry cost, loot per kill and drop rates, from Boss runs.',
    items: [
      { query: 'uber maven', shows: 'Entry, loot per kill, top drops' },
      { query: 'reality frag', shows: 'The boss a fragment opens' },
      { query: 'progenesis', shows: 'Which bosses drop it, and how often' }
    ]
  },
  {
    group: 'Div card sets',
    icon: 'fas fa-layer-group',
    about: 'A full set against what it turns into.',
    items: [
      { query: 'the doctor', shows: 'Set price against Headhunter' },
      { query: 'headhunter', shows: 'The cards that turn into it' }
    ]
  },
  {
    group: 'Vendor recipes',
    icon: 'fas fa-store',
    about: 'By what you get, what you sell, or a nickname.',
    items: [
      { query: '6l', shows: 'Sell a 6-link for 20 Fusing' },
      { query: 'chaos recipe', shows: 'The full rare set recipes' },
      { query: 'movement speed', shows: 'Boots + Quicksilver Flask' }
    ]
  },
  {
    group: 'Gems',
    icon: 'fas fa-gem',
    about: 'Which quest gives a gem, which vendor sells it, and for which classes.',
    items: [
      { query: 'leap slam', shows: 'Quest reward and vendors by class' },
      { query: 'ice nova of frostbolts', shows: 'Where transfigured gems come from' }
    ]
  },
  {
    group: 'Passive tree',
    icon: 'fas fa-dharmachakra',
    about: 'Keystones, notables, ascendancy and cluster jewel notables.',
    items: [
      { query: 'resolute tech', shows: 'What a keystone does' },
      { query: 'lord of drought', shows: 'A cluster jewel notable' }
    ]
  },
  {
    group: 'Betrayal',
    icon: 'fas fa-user-secret',
    about: 'A member\'s reward in each division, priced.',
    items: [
      { query: 'aisling', shows: 'Rewards in every division' },
      { query: 'veiled', shows: 'Who gives a reward' }
    ]
  },
  {
    group: 'Tools and settings',
    icon: 'fas fa-sliders',
    about: 'Open a tool, run its action, or jump to a Settings page. Anything else ends with a poewiki and poedb search.',
    items: [
      { query: 'market', shows: 'Open a tool' },
      { query: 'hotkeys', shows: 'A Settings page' }
    ]
  }
]

export const HELP_QUERY = '?'

export function exampleCards (): LookupCard[] {
  return EXAMPLES.flatMap(g => g.items.map(e => ({
    id: `example:${e.query}`,
    group: g.group,
    name: e.query,
    sub: e.shows,
    icon: g.icon,
    title: `Try "${e.query}"`,
    sections: [{ label: g.group, text: [g.about] }],
    actions: [{ label: `Search "${e.query}"`, search: e.query }]
  })))
}
