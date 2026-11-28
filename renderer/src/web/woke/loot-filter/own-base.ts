// Our own filter skeleton (NeverSink retirement M3, WOKEPOET-716): the file
// woke writes its rules into when NeverSink's isn't used. Every rule woke
// makes goes on top of it, as it goes on top of NeverSink's file today; this
// only holds what is left once ours have had their say:
//   - plain and magic gear in maps hides (the Loot tab, rare weights and
//     levelling rules above show what's worth it, the safety net the rest)
//   - plain life, mana and hybrid flasks and plain normal and magic jewels in maps
//     hide too (NeverSink hides them; the Loot tab's rows show the good ones)
//   - uniques, maps (blighted ones above the map floor) and rare and abyss
//     jewels no row of ours took still show, in their
//     usual look: a price we don't have never hides one (M8 proof)
//   - anything else shows pink, so an item no rule of ours knows stands out
//     instead of falling to the game's own plain label.
// Sections that go above one of NeverSink's rules (uniques, maps, jewels,
// special gear) go just above these when NeverSink's file isn't there
// (ownBottom).
// Its strictness header is the one NeverSink's file would have, so the
// Loot tab's ruler scales the same.
import { WEAPON_CLASSES } from './build-rules'
import type { FilterBlock, FilterDoc } from './parse'
import { parseFilter } from './parse'
import { MAP_BANDS } from './map-floor'

export const OWN_REST_TYPE = 'woke->rest'

const GEAR_CLASSES = [...WEAPON_CLASSES, 'Body Armours', 'Helmets', 'Gloves', 'Boots', 'Shields', 'Quivers', 'Rings', 'Amulets', 'Belts']

const FLASK_CLASSES = ['Life Flasks', 'Mana Flasks', 'Hybrid Flasks']

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
    `Show # $type->${OWN_REST_TYPE} $tier->unknown`,
    '\tSetFontSize 36',
    '\tSetTextColor 255 0 255 255',
    '\tSetBorderColor 255 0 255 255',
    '\tSetBackgroundColor 100 0 100 255',
    ''
  ].join('\n')
}
