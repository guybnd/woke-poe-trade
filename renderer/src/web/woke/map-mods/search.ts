// A tab's stash search, from a build profile. Apart from data.ts so the map
// check card, which loads at startup, doesn't carry the search builder: only
// the Map mods window needs it.
import { buildMapRegex, buildTrimmedMapRegex } from './regex'
import type { MapRegexResult } from './regex'
import { modPriority, modRatings, searchOptions } from './rules'
import type { MapModProfile, ModMode } from './rules'
import { allAreaMods, allMapNames, chartMods, heistMods, tier17Mods } from './data'

// Chart lines the stat data can't read. A card can't rate them, but a search
// token mustn't match them either.
const CHART_LINES = [
  '#% increased Quantity of Items found in adjacent Areas',
  "#% increased Dead Man's Sulphur found in adjacent Areas",
  '#% increased Rarity of Items found in adjacent Areas',
  '#% increased Pack Size in adjacent Areas',
  'Adjacent Areas contain # additional Imprisoned Monsters',
  'Adjacent Areas contain # additional Strongboxes',
  'Adjacent Areas contains # additional packs of Octopi',
  'Adjacent Areas contain # additional packs of Crabs',
  '#% increased number of Magic Monsters in adjacent Areas',
  '#% increased number of Rare Monsters in adjacent Areas',
  'Adjacent Areas contain # additional Messages in Bottles',
  'Adjacent Areas contain highly prized and exotic Fish',
  'Monsters have a chance to be Empowered by # Wildwood Wisps',
  "Atziri's Influence",
  '#% of Equipment dropped by monsters in adjacent Areas is converted to Gold',
  'Adjacent Areas contain # additional cages of Tormented Spirits',
  "Adjacent Areas contain # additional Diviner's Strongboxes",
  "Adjacent Areas contain # additional Arcanist's Strongboxes",
  "Adjacent Areas contain # additional Operative's Strongboxes",
  'Adjacent Areas contain # additional Clusters of Barrels',
  'Adjacent Areas contains # additional Giant Starfish',
  'Items dropped in adjacent Areas have #% chance to be Fractured',
  'Adjacent Areas contain # additional Golden Lanterns',
  'Rare Monsters in adjacent Areas will have a Pantheon Modifier',
  'Rings dropped in adjacent Areas have #% chance to instead drop as a Unique Ring',
  'Amulets dropped in adjacent Areas have #% chance to instead drop as a Unique Amulet',
  'Belts dropped in adjacent Areas have #% chance to instead drop as a Unique Belt',
  'Players in all Voyage Areas have Soul Eater',
  '#% increased Pack Size in all Voyage Areas',
  '#% increased Quantity of Items found in all Voyage Areas',
  '#% increased Rarity of Items found in all Voyage Areas',
  'All Voyage Areas contain Friendly Jellyfish',
  "#% increased Dead Man's Sulphur found in all Voyage Areas",
  '#% increased number of Rare Monsters in all Voyage Areas',
  '#% increased number of Magic Monsters in all Voyage Areas',
  'Monsters in all Voyage Areas cannot drop Equipment, Flasks or Tinctures',
  'Monsters in all Voyage Areas are at least Magic',
  '#% chance for Rare Monsters in all Voyage Areas to be Possessed',
  'Rare monsters that are natural inhabitants of all Voyage Areas are imprisoned by Essences',
  'Rare Monsters in all Voyage Areas have #% chance to Fracture on death',
  'Flasks found in all Voyage Areas have #% chance to have #% Quality',
  'Voyage Modifier will be revealed once Charted',
  'Monsters have #% increased Attack, Cast and Movement Speed',
  'Monsters in Area have increased Toughness and Reward'
]

const LONG_TOKEN = 5

// Non-mod text on those tooltips; search tokens mustn't match it.
const MODE_TOOLTIP_LINES: Record<ModMode, string[]> = {
  maps: [],
  heist: [
    'item class: contracts',
    'item class: blueprints',
    'contract:',
    'blueprint:',
    'client:',
    'heist target: enchanted armaments (moderate value)',
    'heist target: replica unique (priceless)',
    'area level: 83',
    'requires lockpicking (level 5)',
    'requires brute force (level 5)',
    'requires perception (level 5)',
    'requires demolition (level 5)',
    'requires counter-thaumaturgy (level 5)',
    'requires trap disarmament (level 5)',
    'requires agility (level 5)',
    'requires deception (level 5)',
    'requires engineering (level 5)',
    'wings revealed: 1/4',
    'escape routes revealed: 1/8',
    'reward rooms revealed: 1/8'
  ],
  charts: [
    'item class: chart',
    'area level: 83',
    'requirements:',
    'level: 66',
    'chart shape: junction',
    'take this item to valerie aboard the sovereign to chart this area.'
  ]
}

// Every line a tab's search could meet, so its tokens stay unique. Heist rows
// stand for both wordings of a mod, so "guards deal" matches either.
function searchUniverse (mode: ModMode): string[] {
  if (mode === 'heist') return heistMods()
  if (mode === 'charts') return [...chartMods(), ...CHART_LINES]
  return allAreaMods()
}

// Profile -> one tab's stash regex: "can't run" mods are avoided, "juice" mods
// wanted. With the T17 switch off, T17 picks stay out of the map search so they
// don't use up its characters. They keep their ratings.
export function profileRegex (profile: MapModProfile, mode: ModMode = 'maps'): MapRegexResult {
  const avoid: string[] = []
  const want: string[] = []
  const skip = new Set(mode === 'maps' && profile.hideT17 ? tier17Mods() : [])
  for (const [m, r] of Object.entries(modRatings(profile, mode))) {
    if (skip.has(m)) continue
    if (r === 'deadly') avoid.push(m)
    else if (r === 'good') want.push(m)
  }
  // The minimums are about map properties.
  const mins = mode === 'maps' ? profile.mins : {}
  const { highlight, autoTrim } = searchOptions(profile, mode)
  const input = { avoid, want, mins, highlight, minsAny: profile.minsAny }
  const universe = searchUniverse(mode)
  const extra = [...allMapNames(), ...MODE_TOOLTIP_LINES[mode]]
  // Rare names and heist targets on these items can't be listed, so a short
  // token could hit one: "ail" for Ailments is in the chart "Nautical Travail".
  const minToken = mode === 'maps' ? 3 : LONG_TOKEN
  return autoTrim
    ? buildTrimmedMapRegex(input, universe, extra, modPriority, minToken)
    : buildMapRegex(input, universe, extra, minToken)
}
