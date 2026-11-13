// Plain names for NeverSink's $type and $tier tags ("rareid", "t1exalted").
// Display only: edits and the saved filter keep the real tags.

// Top-level groups and path parts, where a capital letter isn't enough.
const WHOLE_TYPES: Record<string, string> = {
  'currency': 'General currency',
  'divination': 'Divination cards',
  'normalcraft->extra': 'Normal crafting bases',
  'influenced->all': 'Influenced gear',
  'uniques': 'All uniques'
}

const PARTS: Record<string, string> = {
  '6l': '6-links',
  'amuring': 'Amulets and rings',
  'animatedweapons': 'Animated weapons',
  'anyremaining': 'Anything else',
  'breachrings': 'Breach rings',
  'clustereco': 'Cluster jewels by price',
  'corruptedid': 'Corrupted with good mods',
  'corruptedimplicit': 'Corrupted implicit',
  'corruptedspecial': 'Corrupted special',
  'deadmansulphur': 'Dead man\'s sulphur',
  'deliriumorbs': 'Delirium orbs',
  'droppeditems': 'Dropped items',
  'endgameflasks': 'Endgame flasks',
  'endgamergb': 'Endgame RGB items',
  'endgametinctures': 'Endgame tinctures',
  'exoticbases': 'Exotic bases',
  'exoticbaseslower': 'Exotic bases, lower',
  'exoticmap': 'Exotic maps',
  'exoticmods': 'Exotic mods',
  'firstlevels': 'First levels',
  'generalgear': 'General gear',
  'heisttarget': 'Heist targets',
  'hidelayer': 'Rares to hide',
  'implicitmod': 'Implicit mods',
  'leagueexclusive': 'League exclusive',
  'leveling': 'Levelling',
  'levelingstacked': 'Levelling stacks',
  'magicid': 'Identified magic items',
  'mapenchantments': 'Allflames and map enchantments',
  'maphiders': 'Maps to hide',
  'melee1h': 'One-handed melee',
  'melee2h': 'Two-handed melee',
  'memorystrand': 'Memory strands',
  'miscmapitems': 'Misc map items',
  'miscmapitemsextra': 'Misc map items, extra',
  'normalcraft': 'Normal crafting bases',
  'normalmagic': 'Normal and magic',
  'otheracts': 'Other acts',
  'qualityperfection': 'Quality and perfection',
  'questlike': 'Quest-like items',
  'questlikeexception': 'Quest items',
  'rareblendid': 'Rares with blended mods',
  'rareeg': 'Endgame rares',
  'rareid': 'Identified rares',
  'rareoptional': 'Optional rares',
  'restex': 'Everything else',
  'rgb': 'RGB items',
  'rr': 'Rare gear',
  'runesgrafts': 'Runes and grafts',
  'sanctifiedrelics': 'Sanctified relics',
  'socketslinks': 'Sockets and links',
  'specialmods': 'Special mods',
  'stackedsix': 'Stacks of 6 or more',
  'stackedsplintershigh': 'Stacked splinters, high',
  'stackedsplinterslow': 'Stacked splinters, low',
  'stackedsupplieshigh': 'Stacked supplies, high',
  'stackedsupplieslow': 'Stacked supplies, low',
  'stackedsuppliesportal': 'Stacked portal scrolls',
  'stackedsupplieswisdom': 'Stacked wisdom scrolls',
  'stackedthree': 'Stacks of 3 or more',
  'tiered': 'Item tiers',
  'vaaltemple': 'Vaal temple',
  'wandprogression': 'Wand progression',
  'weaponprogression': 'Weapon progression'
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function groupLabel (type: string): string {
  return WHOLE_TYPES[type] ?? type.split('->').map(part => PARTS[part] ?? capital(part)).join(' › ')
}

// Words NeverSink tags a tier with that only say what's in it: t1exalted is
// tier 1. Others tell tiers of one number apart, so they stay.
const ITEM_WORDS = new Set(['exalted', 'divine', 'annul', 'chaos', 'alchemy', 'chrom', 'chance', 'trans', 'armour', 'lifeforce'])

const WHOLE_TIERS: Record<string, string> = {
  any: 'Any',
  anyother: 'Any other',
  exhide: 'Hidden extras',
  hideable: 'Can be hidden',
  restex: 'The rest'
}

export function tierLabel (tier: string): string {
  if (tier.startsWith('#')) return 'Rule'
  if (WHOLE_TIERS[tier]) return WHOLE_TIERS[tier]
  let m = /^t(\d+)_(\d+)$/.exec(tier)
  if (m) return `Tier ${m[1]}, item level ${m[2]}`
  m = /^n(\d+)_i(\d+)_t(\d+)$/.exec(tier)
  if (m) return `${m[1]} nodes, item level ${m[2]}, tier ${m[3]}`
  m = /^any(\d+)$/.exec(tier)
  if (m) return `Any, item level ${m[1]}`
  m = /^stack(\d+)$/.exec(tier)
  if (m) return `Stack tier ${m[1]}`
  m = /^t(\d+)([a-z_]*)$/.exec(tier)
  if (m) return !m[2] || ITEM_WORDS.has(m[2]) ? `Tier ${m[1]}` : `Tier ${m[1]} ${m[2]}`
  return capital(tier.replace(/_/g, ' '))
}

// NeverSink's chapter titles are often in capitals.
export function sectionLabel (title: string): string {
  return title === title.toUpperCase() ? capital(title.toLowerCase()) : title
}
