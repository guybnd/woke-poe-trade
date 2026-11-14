import { ITEMS_ITERATOR, STATS_ITERATOR } from '@/assets/data'
import { buildMapRegex, buildTrimmedMapRegex } from './regex'
import type { MapRegexResult } from './regex'
import { modPriority, modRatings, searchOptions } from './rules'
import type { MapModProfile, ModMode } from './rules'

let areaMods: string[] | null = null
let t17Mods: Set<string> | null = null
let mapNames: string[] | null = null
let heist: string[] | null = null
let heistRows: Map<string, string> | null = null
let charts: string[] | null = null

// Chart mods (poedb's Deep Water chart table) that the stat data can read, by
// stat ref, which isn't translated. The data doesn't tag them: they share lines
// with maps. Its "adjacent Areas" and "all Voyage Areas" lines aren't in the
// data, so a card can't rate them.
const CHART_MOD_REFS = new Set([
  'Monsters have #% chance to Blind on Hit',
  'Monsters have #% chance to Hinder on Hit with Spells',
  'Monsters have #% chance to inflict Withered for 2 seconds on Hit',
  'Monsters have #% chance to Maim on Hit with Attacks',
  'Monsters have #% chance to steal Power, Frenzy and Endurance charges on Hit',
  '+#% Monster Chaos Resistance',
  '+#% Monster Elemental Resistances',
  '+#% Monster Physical Damage Reduction',
  '#% increased Monster Attack Speed',
  '#% increased Monster Cast Speed',
  '#% increased Monster Damage',
  '#% increased Monster Movement Speed',
  '#% less effect of Curses on Monsters',
  '#% more Monster Life',
  '+#% to Monster Critical Strike Multiplier',
  'Area has patches of Chilled Ground',
  'Area has patches of Shocked Ground which increase Damage taken by #%',
  'Monster Damage Penetrates #% Elemental Resistances',
  'Monsters Poison on Hit',
  "Monsters' Action Speed cannot be modified to below Base Value",
  "Monsters' Movement Speed cannot be modified to below Base Value",
  "Monsters' skills Chain # additional times",
  'Monsters are Hexproof',
  'Monsters cannot be Stunned',
  'Monsters cannot be Taunted',
  'Monsters deal #% extra Physical Damage as Cold',
  'Monsters deal #% extra Physical Damage as Fire',
  'Monsters deal #% extra Physical Damage as Lightning',
  'Monsters fire # additional Projectiles',
  'Monsters gain #% of Maximum Life as Extra Maximum Energy Shield',
  'Monsters gain #% of their Physical Damage as Extra Chaos Damage',
  'Monsters gain #% of their Physical Damage as Extra Damage of a random Element',
  'Monsters have #% chance to Avoid Elemental Ailments',
  'Monsters have +#% chance to Suppress Spell Damage',
  'Monsters have #% chance to gain a Frenzy Charge on Hit',
  'Monsters have #% chance to gain a Power Charge on Hit',
  'Monsters have #% chance to gain an Endurance Charge on Hit',
  'Monsters have #% increased Area of Effect',
  'Monsters have #% increased Critical Strike Chance',
  'Monsters have a #% chance to avoid Poison, Impale, and Bleeding',
  'Monsters inflict # Grasping Vine on Hit',
  'Monsters take #% reduced Extra Damage from Critical Strikes',
  'Players have #% to all maximum Resistances'
])

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

// Every mod line in the game's stat data. The card rates any stat a map shows,
// listed in Map mods or not, so this is what a rating has to be missing from
// before it's really dead.
export function everyStatLine (): string[] {
  const out: string[] = []
  for (const stat of STATS_ITERATOR('')) for (const m of stat.matchers) out.push(m.string)
  return out
}

// 3.30's new map suffixes (rare maps only). The stat data has them, from the
// trade site, but not tagged as map mods. Mirage and Mirror of Delirium were
// map mods already, under an older wording.
const NEW_IN_330 = new Set([
  'Area contains the Viridian Wildwood',
  'Area contains a buried Apex Sentinel',
  'Area contains a buried Stalker Sentinel',
  'Area contains a buried Pandemonium Sentinel',
  'Area contains an Evocator of Ghorr',
  'Area contains an Evocator of Beidat',
  "Area contains an Evocator of K'Tash"
])
// 3.30 took Vaal side areas out of maps, with the corruption implicit that
// added one.
const GONE_IN_330 = new Set([
  '+#% Chance to contain a Vaal Side Area',
  'Map has a Vaal Side Area'
])

// Every map mod line (all wordings), from APT's stat data.
export function allAreaMods (): string[] {
  if (areaMods) return areaMods
  const out = new Set<string>()
  for (const stat of STATS_ITERATOR('AreaMods')) {
    if (!stat.fromAreaMods || stat.fromAreaMods === 'heist_exclusive') continue
    if (GONE_IN_330.has(stat.ref)) continue
    for (const m of stat.matchers) out.add(m.string)
  }
  for (const stat of STATS_ITERATOR('Area contains')) {
    if (NEW_IN_330.has(stat.ref)) for (const m of stat.matchers) out.add(m.string)
  }
  areaMods = [...out].sort((a, b) => a.localeCompare(b))
  return areaMods
}

// Mods that only roll on tier 17 (Nightmare) maps.
export function tier17Mods (): Set<string> {
  if (t17Mods) return t17Mods
  t17Mods = new Set()
  for (const stat of STATS_ITERATOR('AreaMods')) {
    if (stat.fromAreaMods !== 'ubermap_exclusive') continue
    for (const m of stat.matchers) t17Mods.add(m.string)
  }
  return t17Mods
}

// Mods that only roll on heist contracts and blueprints, minus any wording a
// map mod also uses. One row per mod: its opposite wording ("reduced" for
// "increased") shares the rating, as a stash search can't tell them apart when
// the only text between them is the roll's direction.
export function heistMods (): string[] {
  if (heist) return heist
  const maps = new Set(allAreaMods())
  const out = new Set<string>()
  heistRows = new Map()
  for (const stat of STATS_ITERATOR('AreaMods')) {
    if (stat.fromAreaMods !== 'heist_exclusive') continue
    const wordings = stat.matchers.filter(m => !maps.has(m.string))
    const row = (wordings.find(m => !m.negate) ?? wordings[0])?.string
    if (!row) continue
    out.add(row)
    for (const m of wordings) heistRows.set(m.string, row)
  }
  heist = [...out].sort((a, b) => a.localeCompare(b))
  return heist
}

// The Heist tab row a wording belongs to, if it's a heist mod.
export function heistRowOf (matcher: string): string | undefined {
  heistMods()
  return heistRows!.get(matcher)
}

export function chartMods (): string[] {
  if (charts) return charts
  const out = new Set<string>()
  for (const stat of STATS_ITERATOR('AreaMods')) {
    if (!stat.fromAreaMods || !CHART_MOD_REFS.has(stat.ref)) continue
    // Some refs are the negated wording ("less effect of Curses"): that's the one
    // that rolls, so it needs a row too.
    for (const m of stat.matchers) if (!m.negate || m.string === stat.ref) out.add(m.string)
  }
  charts = [...out].sort((a, b) => a.localeCompare(b))
  return charts
}

// The list one tab shows. Anything rated stays visible so it can be un-rated: a
// wording a patch has since renamed, or a mod rated from a card that isn't on
// the tab's list. On Maps, the T17 switch takes T17 mods out.
export function modsForMode (mode: ModMode, profile: MapModProfile): string[] {
  const base = mode === 'heist' ? heistMods() : mode === 'charts' ? chartMods() : allAreaMods()
  const all = [...new Set([...base, ...Object.keys(modRatings(profile, mode))])]
  if (mode !== 'maps' || !profile.hideT17) return all
  const t17 = tier17Mods()
  return all.filter(m => !t17.has(m))
}

// Every line a tab's search could meet, so its tokens stay unique. Heist rows
// stand for both wordings of a mod, so "guards deal" matches either.
function searchUniverse (mode: ModMode): string[] {
  if (mode === 'heist') return heistMods()
  if (mode === 'charts') return [...chartMods(), ...CHART_LINES]
  return allAreaMods()
}

// Map names ("Strand Map"), so mod tokens don't also match a map's name.
export function allMapNames (): string[] {
  if (mapNames) return mapNames
  const out: string[] = []
  for (const area of ITEMS_ITERATOR('"namespace":"AREA"')) {
    out.push(`${area.name} Map`)
  }
  mapNames = out
  return mapNames
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
