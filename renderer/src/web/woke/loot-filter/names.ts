// Plain names for NeverSink's $type and $tier tags ("rareid", "t1exalted").
// Display only: edits and the saved filter keep the real tags.

import { tagWords } from './tag-words'

// Top-level groups and path parts, where a capital letter isn't enough.
const WHOLE_TYPES: Record<string, string> = {
  'currency': 'General currency',
  'divination': 'Divination cards',
  'normalcraft->extra': 'Normal crafting bases',
  'influenced->all': 'Influenced gear',
  'maps->influenced': 'Influenced maps',
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
  return WHOLE_TYPES[type] ?? type.split('->').map(part => PARTS[part] ?? tagWords(part) ?? capital(part)).join(' › ')
}

// Words NeverSink tags a tier with that only say what's in it: t1exalted is
// tier 1. Others tell tiers of one number apart, so they stay.
const ITEM_WORDS = new Set(['exalted', 'divine', 'annul', 'chaos', 'alchemy', 'chrom', 'chance', 'trans', 'armour', 'lifeforce'])

const WHOLE_TIERS: Record<string, string> = {
  'any': 'Any',
  'anyother': 'Any other',
  'exhide': 'Hidden extras',
  'hideable': 'Can be hidden',
  'restex': 'The rest',
  // NeverSink 8.21's Fated rares (3.30).
  'fatedgear': 'Fated gear',
  'fatedoverride': 'Fated, any base',
  'fatedspecial': 'Fated jewels, flasks and heist',
  'identifieditemhandling': 'Identified rares, not corrupted or mirrored',
  // NeverSink 8.21's endgame tinctures and flasks.
  'overqual1': 'Quality 26+, not corrupted or mirrored',
  'overqual2': 'Quality 21+, not corrupted or mirrored',
  'tinc85': 'Item level 85+',
  'tinc82': 'Item level 82+',
  'overqualcorrupted': 'Corrupted, quality 30+',
  'overqualutil1': 'Utility, quality 26+',
  'overqualutil2': 'Utility, quality 21+',
  'overquallife1': 'Life and mana, quality 30+',
  'overquallife2': 'Life and mana, quality 21+',
  'utility85': 'Utility, item level 85+',
  'utility84': 'Utility, item level 84+',
  'utility82': 'Utility, item level 82+',
  'lifemana82': 'Life and mana, item level 82+',
  'any20qualflask': 'Any flask, quality 20+',
  'qualityhigh': 'Quality 10+, early maps',
  'qualitylow': 'Any quality, early maps',
  'earlymappingflasks': 'Utility, early maps',
  'anyutility': 'Any utility flask',
  'earlymappinglifemana': 'Life and mana, early maps',
  // NeverSink's Maps to hide, shipped off.
  'corruptedmaphider': 'Hide corrupted maps',
  'mirroredmaphider': 'Hide mirrored maps',
  // NeverSink's shorthand tags, named from what each rule catches.
  // Gems › Special: picked gems by level and quality.
  'altany': 'Any transfigured gem',
  '2020z': 'Level 20+, quality 20+, not corrupted',
  'xx20z': 'Quality 19+, not corrupted',
  '2120': 'Level 21+, quality 20+',
  '2023': 'Level 20+, quality 23+',
  '2123any': 'Level 21+, quality 23+, any gem',
  'xx23': 'Quality 23+',
  '21xx': 'Level 21+',
  // Gems › Generic: level and quality tiers.
  'lt1': 'Level 21+',
  'lt2': 'Level 20+',
  'lt3': 'Level 18+',
  'lt4': 'Level 2+',
  'qt1': 'Quality 23+',
  'qt2': 'Quality 20+',
  'qt3': 'Quality 13+',
  'qt4': 'Quality 1+',
  'qt4lvl': 'Quality 1+, while levelling',
  // Uniques.
  '6s': '6 sockets',
  'exforgesword': 'Infernal Sword unique, Shaper or Elder',
  'exrationaljewel': 'Synthesised unique Cobalt Jewel',
  'exuberimpresence': 'Impresence, Shaper and Elder',
  'hideable2': 'Can be hidden, second list',
  // Sockets and links.
  '6sockets4h': '6 sockets, 4 squares tall',
  // Crafting › Quality and perfection.
  'armors1q1': 'Tier 1 armour, quality 28+',
  'armors1q2': 'Tier 1 armour, quality 24+',
  'weapont1q1': 'Tier 1 weapons, quality 28+, item level 83+',
  'weapont1q2': 'Tier 1 weapons, quality 24+, item level 83+',
  'weapont2q1': 'Tier 2 weapons, quality 28+, item level 83+',
  'weapont2q2': 'Tier 2 weapons, quality 24+, item level 83+',
  // Exotic bases.
  'ecotinkbases': 'Hand-added bases',
  'ecotinkbases84': 'Hand-added bases, item level 84+',
  'exoticstiered': 'Item tier 5+',
  'v83': 'Talismans and rings, item level 83+',
  'v84': 'Talismans and rings, item level 84+',
  'v85': 'Talismans and rings, item level 85+',
  'v86': 'Talismans and rings, item level 86+',
  // Identified rares.
  'idaj_attack': 'Abyss jewel attack',
  'idaj_caster': 'Abyss jewel caster',
  'idaj_minion': 'Abyss jewel minion',
  'idaj_mixer': 'Abyss jewel mixed',
  'quiv_hit': 'Quivers hit damage',
  // Rares with blended mods.
  'wamuletsblend': 'Amulets',
  'wbeltsblend': 'Belts',
  'wringsblend': 'Rings',
  'wsmallarmorsblend': 'Boots, gloves and helmets',
  'weleattackblend': 'Elemental attack weapons',
  'wcastermin': 'Caster weapons and shields',
  // Rares to hide.
  'outdatedlevelflaska': 'Outdated Small to Large flasks, quality 0, area 15+',
  'outdatedlevelflaskb': 'Outdated Greater and Grand flasks, quality 0, area 30+',
  'outdatedlevelflaskc': 'Outdated Giant to Sacred flasks, quality 0, area 48+',
  'outdatedlevelflaskd': 'Outdated Sanctified and Hallowed flasks, quality 0, area 60+',
  'rrihide1': 'Rare armour under drop level 75, area 82+',
  'rrihide2': 'Rare armour under drop level 60, area 80+',
  'rrihide3': 'Rare armour under drop level 50, area 78+',
  'rrihide4': 'Rare armour under drop level 40, area 73+',
  // Fragments, cards and chancing.
  't3stackedex': 'Tier 3, stacks of 3+',
  't4c': 'Tier 4, kept at stricter levels',
  't5c': 'Tier 5, kept at stricter levels',
  'hh': 'Leather and Heavy belts',
  // Levelling › Weapon progression: normal weapons with 3+ sockets.
  'r01': 'Drop level 5+, item level up to 9',
  'r02': 'Drop level 11+, item level up to 15',
  'r03': 'Drop level 15+, item level up to 18',
  'r04': 'Drop level 18+, item level up to 22',
  'r05': 'Drop level 22+, item level up to 26',
  'r06': 'Drop level 26+, item level up to 30',
  'r07': 'Drop level 30+, item level up to 34',
  'r08': 'Drop level 34+, item level up to 40',
  'r09': 'Drop level 40+, item level up to 44',
  'r10': 'Drop level 44+, item level up to 48',
  'r11': 'Drop level 48+, item level up to 52',
  'r12': 'Drop level 52+, item level up to 56',
  'r13': 'Drop level 56+, item level up to 60',
  'r14': 'Drop level 60+, item level up to 64',
  'r15bas': 'Drop level 64+, item level up to 68',
  // Levelling › Rare weapons.
  'l1': 'Area level up to 25',
  'l2': 'Drop level 10+, area level up to 30',
  'l3': 'Drop level 15+, area level up to 35',
  'l4': 'Drop level 20+, area level up to 45',
  'l5': 'Drop level 25+, area level up to 55',
  'l6': 'Drop level 30+, area level up to 60',
  'l7': 'Drop level 35+, area level up to 65',
  'l8': 'Drop level 40+, area level up to 70',
  // Levelling › Wand progression.
  'w1': 'Somatic Wand, area level up to 24',
  'w2': 'Blasting Wand, area level up to 50',
  'w3': 'Kinetic Wand, area level up to 67'
}

// NeverSink's map progression: maps_a_t14 is a tier 14 map in its high reds
// (a), then low reds (b), yellows (c) and whites (d). maps_a_t16 is 16 and
// up. The colour follows the map tier itself: 1-5 white, 6-10 yellow, 11+ red.
const mapColour = (tier: number) => tier >= 11 ? 'red' : tier >= 6 ? 'yellow' : 'white'

export function tierLabel (tier: string): string {
  if (tier.startsWith('#')) return 'Rule'
  if (WHOLE_TIERS[tier]) return WHOLE_TIERS[tier]
  let m = /^t(\d+)_(\d+)$/.exec(tier)
  if (m) return `Tier ${m[1]}, item level ${m[2]}`
  m = /^n(\d+)_i(\d+)_t(\d+)$/.exec(tier)
  if (m) return `${m[1]} nodes, item level ${m[2]}, tier ${m[3]}`
  m = /^maps_([a-d])_t(\d+)$/.exec(tier)
  if (m) return `Map tier ${m[2]}${m[2] === '16' ? '+' : ''}, ${mapColour(Number(m[2]))}`
  // NeverSink 8.21's tiered gear: item tier and base rank (t5r1), and its
  // any-base rules, where any5 catches item tier 4 and up.
  m = /^t(\d)r(\d)$/.exec(tier)
  if (m) return `Item tier ${m[1]}, rank ${m[2]}`
  m = /^any(\d)$/.exec(tier)
  if (m) return `Any base, item tier ${Number(m[1]) - 1}+`
  m = /^any(\d+)$/.exec(tier)
  if (m) return `Any, item level ${m[1]}`
  m = /^stack(\d+)$/.exec(tier)
  if (m) return `Stack tier ${m[1]}`
  // NeverSink 8.21's Fated twins of its rare tiers (t1f, t2f).
  m = /^t(\d+)f$/.exec(tier)
  if (m) return `Tier ${m[1]}, Fated`
  m = /^t(\d+)([a-z_]*)$/.exec(tier)
  if (m) return !m[2] || ITEM_WORDS.has(m[2]) ? `Tier ${m[1]}` : tagWords(tier) ?? `Tier ${m[1]} ${m[2]}`
  return tagWords(tier) ?? capital(tier.replace(/_/g, ' '))
}

// NeverSink's chapter titles are often in capitals.
export function sectionLabel (title: string): string {
  return title === title.toUpperCase() ? capital(title.toLowerCase()) : title
}
