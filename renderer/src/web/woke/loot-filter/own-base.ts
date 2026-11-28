// Our own filter skeleton (NeverSink retirement M3, WOKEPOET-716): the file
// woke writes its rules into when NeverSink's isn't used. Every rule woke
// makes goes on top of it, as it goes on top of NeverSink's file today; this
// only holds what is left once ours have had their say:
//   - plain and magic gear hides in maps, and while levelling where our
//     levelling rules are on (ownGearHideFrom); the Loot tab, rare weights
//     and levelling rules above show what's worth it, the safety net the rest
//   - below maps, older life, mana and hybrid flask sizes with quality
//     show small (the levelling rules above hide the ones without)
//   - plain life, mana and hybrid flasks and plain normal and magic jewels in maps
//     hide too (NeverSink hides them; the Loot tab's rows show the good ones)
//   - uniques, maps (blighted ones above the map floor) and rare and abyss
//     jewels no row of ours took still show, in their usual look: a price we
//     don't have never hides one (M8 proof)
//   - anything else shows pink, so an item no rule of ours knows stands out
//     instead of falling to the game's own plain label.
// Sections that go above one of NeverSink's rules (uniques, maps, jewels,
// special gear) go just above these when NeverSink's file isn't there
// (ownBottom).
// Its strictness header is the one NeverSink's file would have, so the
// Loot tab's ruler scales the same.
import { WEAPON_CLASSES } from './build-rules'
import type { FilterBlock, FilterCondition, FilterDoc } from './parse'
import { parseFilter } from './parse'
import { MAP_BANDS } from './map-floor'
import { baseRankTable } from './base-ranks'

export const OWN_REST_TYPE = 'woke->rest'

const GEAR_CLASSES = [...WEAPON_CLASSES, 'Body Armours', 'Helmets', 'Gloves', 'Boots', 'Shields', 'Quivers', 'Rings', 'Amulets', 'Belts']

const FLASK_CLASSES = ['Life Flasks', 'Mana Flasks', 'Hybrid Flasks']

// Item classes the skeleton shows in a plain look when no Loot row took them.
const CURRENCY_LIKE = ['Stackable Currency', 'Delve Stackable Socketable Currency', 'Map Fragments', 'Misc Map Items', 'Vault Keys', 'Cursed Ducat', 'Corpses', 'Viscera', 'Incursion Items', 'Sanctum Research', 'Expedition Logbooks', 'Pieces', 'Memories', 'Atlas Upgrade Items']
const OTHER_CLASSES = [...FLASK_CLASSES, 'Utility Flasks', 'Tinctures', 'Jewels', 'Abyss Jewels', 'Heist Gear', 'Heist Tools', 'Heist Brooches', 'Heist Cloaks', 'Heist Targets', 'Contracts', 'Blueprints', 'Quest Items', 'Labyrinth Items', 'Labyrinth Trinkets', 'Labyrinth Map Items', 'Pantheon Souls', 'Trinkets', 'Chart', 'Idols', 'Relics', 'Fishing Rods', 'Sentinels', 'Embers of the Allflame', 'Instance Local Items', 'Hideout Doodads', 'Microtransactions']
// The cheapest stacks NeverSink hid in maps: low shards and essences.
const CHEAP_STACKS = ['Transmutation Shard', 'Alteration Shard', 'Alchemy Shard', 'Scroll Fragment', 'Whispering Essence of Greed', 'Whispering Essence of Hatred', 'Whispering Essence of Woe', 'Whispering Essence of Contempt', 'Muttering Essence of Torment', 'Muttering Essence of Woe', 'Muttering Essence of Anger', 'Muttering Essence of Hatred', 'Muttering Essence of Contempt', 'Muttering Essence of Fear', 'Muttering Essence of Greed', 'Muttering Essence of Sorrow', 'Weeping Essence of Anger', 'Weeping Essence of Doubt', 'Weeping Essence of Rage', 'Weeping Essence of Suffering', 'Wailing Essence of Doubt', 'Wailing Essence of Suffering']

// Where a section that goes above one of NeverSink's rules goes when the
// filter is our own skeleton: above its rest rules. -1 on NeverSink's file.
export function ownBottom (doc: FilterDoc): number {
  return doc.chunks.findIndex(ch => ch.kind === 'block' && ch.type === OWN_REST_TYPE)
}

// Uniques a price never hides, kept above the priced unique rows as
// NeverSink's own "special" unique tiers are (its exjewels, idols, heist,
// replicas, 6-link, synthesised, corrupted, abyss, over-quality, 5-link and
// Vestigial ones): a
// base shared by many cheap uniques, or a roll the price can't see.
const UNIQUE_SPECIALS: Array<[tier: string, conds: string[]]> = [
  ['6link', ['LinkedSockets 6']],
  ['synth', ['SynthesisedItem True']],
  ['jewels', ['BaseType == "Cobalt Jewel" "Crimson Jewel" "Viridian Jewel"']],
  ['idols', ['Class == "Idols"']],
  ['heist', ['Class == "Blueprints" "Contracts"']],
  ['replicas', ['Replica True']],
  ['2xcorrupted', ['Corrupted True', 'CorruptedMods >= 2']],
  ['abyss', ['Sockets >= AA']],
  ['overqual', ['Quality >= 27']],
  ['5link', ['LinkedSockets 5']],
  ['vestige', ['Vestigial True']]
]
export function ownUniqueSpecials (): FilterBlock[] {
  return parseFilter(UNIQUE_SPECIALS.flatMap(([tier, conds]) => [
    `Show # $type->uniques $tier->own${tier}`,
    '\tRarity Unique',
    ...conds.map(c => `\t${c}`),
    '\tSetFontSize 45',
    '\tSetTextColor 255 255 255 255',
    '\tSetBorderColor 255 255 255 255',
    '\tSetBackgroundColor 175 96 37 255',
    '\tPlayAlertSound 3 300',
    '\tMinimapIcon 1 Brown Star',
    ''
  ]).join('\n')).blocks
}

const rgba = (c: readonly number[]) => c.join(' ')

// Plain maps by tier band, in the Loot tab's map look (map-floor.ts).
function mapBlocks (): string[] {
  return MAP_BANDS.flatMap((band, i) => [
    `Show # $type->${OWN_REST_TYPE} $tier->maps${band.from}`,
    '\tClass == "Maps"',
    `\tMapTier >= ${band.from}`,
    ...(i > 0 ? [`\tMapTier < ${MAP_BANDS[i - 1].from}`] : []),
    `\tSetFontSize ${band.from >= 11 ? 45 : band.from >= 6 ? 40 : 35}`,
    `\tSetTextColor ${rgba(band.style.text!)}`,
    `\tSetBorderColor ${rgba(band.style.border!)}`,
    `\tSetBackgroundColor ${rgba(band.style.background!)}`,
    ...(band.from >= 6 ? [`\tPlayAlertSound ${band.from >= 11 ? 5 : 4} 300`, `\tMinimapIcon ${band.from >= 11 ? 1 : 2} White Square`] : []),
    ''
  ]).concat([
    // Maps with no tier (Valdo, Nightmare, Shaper guardian, Vaal Temple...).
    `Show # $type->${OWN_REST_TYPE} $tier->mapsother`,
    '\tClass == "Maps"',
    '\tSetFontSize 45',
    `\tSetTextColor ${rgba(MAP_BANDS[0].style.text!)}`,
    `\tSetBorderColor ${rgba(MAP_BANDS[0].style.border!)}`,
    `\tSetBackgroundColor ${rgba(MAP_BANDS[0].style.background!)}`,
    '\tPlayAlertSound 5 300',
    '\tMinimapIcon 1 White Square',
    ''
  ])
}

const quoted = (names: string[]) => names.map(n => `"${n}"`).join(' ')

// The skeleton's text for a strictness header ("2-SEMI-STRICT"), or the
// default level when there's none.
export function ownBaseText (strictness: string | null): string {
  return [
    '#===============================================================================================================',
    '# woke-poe-trade: own loot filter (no NeverSink rules)',
    `#TYPE: ${strictness ?? '2-SEMI-STRICT'}`,
    '#===============================================================================================================',
    '',
    `Hide # $type->${OWN_REST_TYPE} $tier->plaingear`,
    '\tAreaLevel >= 68',
    '\tRarity <= Magic',
    `\tClass == ${quoted(GEAR_CLASSES)}`,
    '\tSetFontSize 18',
    '',
    `Show # $type->${OWN_REST_TYPE} $tier->qualityflasks`,
    '\tAreaLevel < 68',
    '\tRarity <= Magic',
    '\tClass == "Life Flasks" "Mana Flasks" "Hybrid Flasks"',
    '\tSetFontSize 30',
    '',
    `Hide # $type->${OWN_REST_TYPE} $tier->plainflasks`,
    '\tAreaLevel >= 68',
    '\tRarity Normal',
    '\tQuality < 20',
    `\tClass == ${quoted(FLASK_CLASSES)}`,
    '\tSetFontSize 18',
    '',
    // Identified magic ones can carry the mods worth keeping.
    `Hide # $type->${OWN_REST_TYPE} $tier->magicflasks`,
    '\tAreaLevel >= 68',
    '\tRarity Magic',
    '\tIdentified False',
    '\tQuality < 20',
    `\tClass == ${quoted(FLASK_CLASSES)}`,
    '\tSetFontSize 18',
    '',
    `Hide # $type->${OWN_REST_TYPE} $tier->plainjewels`,
    '\tAreaLevel >= 68',
    '\tRarity <= Magic',
    '\tIdentified False',
    '\tClass == "Jewels"',
    '\tBaseType == "Cobalt Jewel" "Crimson Jewel" "Viridian Jewel"',
    '\tSetFontSize 18',
    '',
    `Show # $type->${OWN_REST_TYPE} $tier->rarejewels`,
    '\tRarity Rare',
    '\tClass == "Abyss Jewels" "Jewels"',
    '\tSetFontSize 40',
    '\tSetTextColor 220 220 0 255',
    '\tSetBorderColor 220 220 0 255',
    '\tSetBackgroundColor 120 120 0 225',
    '',
    `Show # $type->${OWN_REST_TYPE} $tier->magicabyss`,
    '\tRarity Magic',
    '\tClass == "Abyss Jewels"',
    '\tSetFontSize 36',
    '\tSetTextColor 0 75 250 255',
    '\tSetBorderColor 0 75 250 255',
    '\tSetBackgroundColor 0 20 40 255',
    '',
    `Show # $type->${OWN_REST_TYPE} $tier->uniques`,
    '\tRarity Unique',
    '\tSetFontSize 40',
    '\tSetTextColor 175 96 37 255',
    '\tSetBorderColor 175 96 37 255',
    '\tSetBackgroundColor 53 13 13 255',
    '\tMinimapIcon 2 Brown Star',
    '',
    // Blighted and blight-ravaged maps, above the map floor's tiers.
    `Show # $type->${OWN_REST_TYPE} $tier->blightravaged`,
    '\tClass == "Maps"',
    '\tUberBlightedMap True',
    '\tSetFontSize 45',
    '\tSetTextColor 145 30 220 255',
    '\tSetBorderColor 145 30 220 255',
    '\tSetBackgroundColor 235 220 245 255',
    '\tPlayAlertSound 5 300',
    '\tMinimapIcon 1 Purple Square',
    '',
    `Show # $type->${OWN_REST_TYPE} $tier->blightedmaps`,
    '\tClass == "Maps"',
    '\tBlightedMap True',
    '\tSetFontSize 40',
    '\tSetTextColor 145 30 220 255',
    '\tSetBorderColor 145 30 220 255',
    '\tSetBackgroundColor 235 220 245 255',
    '\tMinimapIcon 2 Purple Square',
    '',
    ...mapBlocks(),
    // Gold piles under the Gold ruler's first step, and anything a class of
    // the game's has that no Loot row took (unpriced, or a kind the tab has
    // no section for yet): shown in their class's plain look, not the pink
    // catch-all (Guy's walk, 2026-11-28: shards, small gold, Wombgifts).
    // The cheapest shards and essences hide in maps, as NeverSink's did.
    // Rare gear no rule above took (the rare weights off, or a mark they
    // don't score): the game's rare look.
    `Show # $type->${OWN_REST_TYPE} $tier->rares`,
    '\tRarity Rare',
    `\tClass == ${quoted(GEAR_CLASSES)}`,
    '\tSetFontSize 35',
    '\tSetTextColor 255 255 119 255',
    '\tSetBorderColor 0 0 0 0',
    '\tSetBackgroundColor 0 0 0 200',
    '',
    `Hide # $type->${OWN_REST_TYPE} $tier->cheapstack`,
    '\tAreaLevel >= 68',
    `\tBaseType == ${quoted(CHEAP_STACKS)}`,
    '\tSetFontSize 18',
    '',
    `Show # $type->${OWN_REST_TYPE} $tier->gold`,
    '\tBaseType == "Gold"',
    '\tSetFontSize 32',
    '\tSetTextColor 255 211 90 255',
    '\tSetBorderColor 0 0 0 0',
    '\tSetBackgroundColor 0 0 0 180',
    '',
    `Show # $type->${OWN_REST_TYPE} $tier->wombgifts`,
    '\tClass == "Wombgifts"',
    '\tSetFontSize 42',
    '\tSetTextColor 0 0 0 255',
    '\tSetBorderColor 0 0 0 255',
    '\tSetBackgroundColor 249 150 25 255',
    '\tPlayAlertSound 2 300',
    '\tMinimapIcon 2 Orange Circle',
    '',
    `Show # $type->${OWN_REST_TYPE} $tier->currency`,
    `\tClass == ${quoted(CURRENCY_LIKE)}`,
    '\tSetFontSize 38',
    '\tSetTextColor 190 178 135 255',
    '\tSetBorderColor 190 178 135 255',
    '\tSetBackgroundColor 0 0 0 240',
    '',
    `Show # $type->${OWN_REST_TYPE} $tier->cards`,
    '\tClass == "Divination Cards"',
    '\tSetFontSize 36',
    '\tSetTextColor 14 186 255 255',
    '\tSetBorderColor 14 186 255 255',
    '\tSetBackgroundColor 0 0 0 240',
    '',
    `Show # $type->${OWN_REST_TYPE} $tier->gems`,
    '\tClass == "Skill Gems" "Support Gems"',
    '\tSetFontSize 34',
    '\tSetTextColor 27 162 155 255',
    '\tSetBorderColor 27 162 155 255',
    '\tSetBackgroundColor 0 0 0 220',
    '',
    `Show # $type->${OWN_REST_TYPE} $tier->other`,
    `\tClass == ${quoted(OTHER_CLASSES)}`,
    '\tSetFontSize 32',
    '\tSetTextColor 200 200 200 255',
    '\tSetBorderColor 120 120 120 255',
    '\tSetBackgroundColor 0 0 0 200',
    '',
    `Show # $type->${OWN_REST_TYPE} $tier->unknown`,
    '\tSetFontSize 36',
    '\tSetTextColor 255 0 255 255',
    '\tSetBorderColor 255 0 255 255',
    '\tSetBackgroundColor 100 0 100 255',
    ''
  ].join('\n')
}

// Where plain and magic gear starts hiding: in maps only, unless our
// levelling rules are on (`lv`, their area conditions), then from where they
// start. With them off a player levelling still sees white and blue gear
// (pink) instead of losing movement speed boots and 4-links.
export function ownGearHideFrom (doc: FilterDoc, lv: FilterCondition[] | null): void {
  const b = doc.blocks.find(b => b.type === OWN_REST_TYPE && b.tier === 'plaingear')
  if (!b) return
  const ge = lv?.find(c => c.key === 'AreaLevel' && c.op === '>=')
  const from = !lv ? 68 : ge ? Number(ge.values[0]) : null
  b.conditions = b.conditions.filter(c => c.key !== 'AreaLevel')
  if (from != null) b.conditions.unshift({ key: 'AreaLevel', op: '>=', count: null, values: [String(from)] })
  b.dirty = true
  // Exotic bases (talismans, experimented bases: our base ranks' x1 and x2)
  // show above it, as NeverSink's exotic rules did: a white or blue one is
  // worth picking up while levelling too (M8 proof). In maps the rare
  // weights above decide.
  const t = baseRankTable()
  const exotic = [...new Set([...t.x1, ...t.x2])]
  if (!exotic.length || doc.blocks.some(x => x.type === OWN_REST_TYPE && x.tier === 'exoticgear')) return
  const add = parseFilter([
    `Show # $type->${OWN_REST_TYPE} $tier->exoticgear`,
    '\tRarity Normal Magic',
    `\tBaseType == ${exotic.map(n => `"${n}"`).join(' ')}`,
    '\tSetFontSize 45',
    '\tSetTextColor 0 240 190 255',
    '\tSetBorderColor 0 240 190 255',
    '\tSetBackgroundColor 20 20 0 255',
    '\tPlayAlertSound 3 300',
    '\tMinimapIcon 1 Blue Diamond',
    ''
  ].join('\n')).blocks
  for (const x of add) { x.line = b.line; x.dirty = true }
  doc.chunks.splice(doc.chunks.indexOf(b), 0, ...add)
  doc.blocks.splice(doc.blocks.indexOf(b), 0, ...add)
  doc.blocks.forEach((x, k) => { x.index = k })
}
