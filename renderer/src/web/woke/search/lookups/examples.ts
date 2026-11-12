// "?" in the search box: things to try, one per kind of lookup. Picking one
// searches it.
import type { LookupCard } from './types'

interface Example { query: string, shows: string }

// The surprising ones first: what each kind of lookup knows that you'd
// otherwise alt-tab to a wiki for.
export const EXAMPLES: Array<{ group: string, icon: string, about: string, items: Example[] }> = [
  {
    group: 'Is it worth it?',
    icon: 'fas fa-scale-balanced',
    about: 'Prices put side by side, so you know before you farm, craft or turn in.',
    items: [
      { query: 'headhunter', shows: 'The div card set that makes one, and if the set is cheaper' },
      { query: 'uber maven', shows: 'Entry cost against loot per kill' },
      { query: 'awakened enlighten', shows: 'Which boss drops it, and how often' },
      { query: '1 mirror in div', shows: "Any currency in any other, at today's price" }
    ]
  },
  {
    group: 'Leveling',
    icon: 'fas fa-person-running',
    about: 'Vendor tricks and gem sources for the campaign.',
    items: [
      { query: 'rustic sash', shows: 'Sell it with a weapon: up to 84% physical damage' },
      { query: 'movement speed', shows: 'Boots + Quicksilver Flask = faster boots' },
      { query: 'herald of ash', shows: 'Which quest gives it free, for your class' },
      { query: 'ice nova of frostbolts', shows: 'Where transfigured gems come from' }
    ]
  },
  {
    group: 'Endgame',
    icon: 'fas fa-dungeon',
    about: 'The things you look up every league.',
    items: [
      { query: 'veiled', shows: 'Which Betrayal member gives veiled crafts' },
      { query: 'reality frag', shows: 'The boss a fragment opens, and what it drops' },
      { query: 'vaal fireball', shows: 'How to get a Vaal gem' },
      { query: 'lab reset', shows: 'When the lab layout changes' }
    ]
  },
  {
    group: 'Build questions',
    icon: 'fas fa-dharmachakra',
    about: 'What a passive does, without opening the tree.',
    items: [
      { query: 'sanctuary', shows: 'Same name, tree notable and Guardian node' },
      { query: 'lord of drought', shows: 'A cluster jewel notable' }
    ]
  },
  {
    group: 'Vendor money',
    icon: 'fas fa-store',
    about: 'Recipes by what you get, what you sell, or a nickname.',
    items: [
      { query: '6l', shows: 'A 6-link sells for 20 Fusing' },
      { query: 'chaos recipe', shows: 'Full rare sets, and how to get 3x' }
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
