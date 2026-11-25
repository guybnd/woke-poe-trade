import { ITEMS_ITERATOR, STAT_BY_MATCH_STR_V2, STATS_ITERATOR } from '@/assets/data'
import { modRatings, rateMods, withOtherWordings } from './rules'
import type { CheckedMod, MapModProfile, ModMode } from './rules'

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

// A wording's text with its numbers, "a"/"an" and plural endings taken out, so
// "Areas contain a Mirror" and "Area contains a Mirror", or "# additional
// Packs" and "an additional Pack", read the same, while "faster" and "slower"
// or "increased" and "reduced" don't.
function wordingCanon (text: string): string {
  return text.toLowerCase()
    .replace(/[+-]?\([0-9.]+-[0-9.]+\)%?|[+-]?[0-9.#]+%?/g, '#')
    .replace(/\b(an|a)\b/g, '#')
    .split(/\s+/).map(w => w.replace(/(es|s)$/, '')).join(' ')
}

// Of a stat's wordings, the ones that say the same thing as `own` (the stat's
// "Area contains" for "Areas contain"), never the opposite ("reduced" for
// "increased"), which a rating on `own` must not carry over to.
export function sameSenseOf (matchers: ReadonlyArray<{ string: string, negate?: boolean }>, own: string): string[] {
  const mine = matchers.find(m => m.string === own)
  if (!mine) return []
  const canon = wordingCanon(own)
  return matchers.filter(m => m.string === own || (!m.negate === !mine.negate && wordingCanon(m.string) === canon)).map(m => m.string)
}

// Every same-sense wording of a map mod's stat, from one of them: for mods
// saved as text only (the death recap), where a rating on such a wording counts.
export function statWordings (matcher: string): string[] {
  const stat = areaStatOf(matcher)
  return stat ? sameSenseOf(stat.matchers, matcher) : []
}

// The other wordings of a map mod's stat that say the same thing ("Area
// contains" for "Areas contain"), not the opposite ("reduced" for
// "increased", "slower" for "faster").
export function sameSenseWordings (matcher: string): string[] {
  return statWordings(matcher).filter(m => m !== matcher)
}

function areaStatOf (matcher: string) {
  const found = STAT_BY_MATCH_STR_V2(matcher)
  if (!found) return undefined
  const stats = 'stats' in found ? found.stats.filter(s => s.matchers.some(m => m.string === matcher)) : [found]
  return stats.find(s => s.fromAreaMods) ?? stats[0]
}

// A map's saved mods rated by the profile's Maps ratings, as the map card
// rates them: a rating on another wording of a mod's stat counts.
export function rateSavedMods (mods: Array<{ matcher: string, roll?: number }>, profile: MapModProfile): CheckedMod[] {
  const withWordings = mods.map(m => ({ ...m, wordings: statWordings(m.matcher) }))
  return rateMods(withWordings, { ...profile, ratings: withOtherWordings(modRatings(profile, 'maps'), withWordings) }).mods
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
