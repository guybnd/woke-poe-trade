// Our own filter skeleton (NeverSink retirement M3, WOKEPOET-716): the file
// woke writes its rules into when NeverSink's isn't used. Every rule woke
// makes goes on top of it, as it goes on top of NeverSink's file today; this
// only holds what is left once ours have had their say:
//   - plain and magic gear hides, in maps and while levelling (the Loot
//     tab, rare weights and levelling rules above show what's worth it,
//     the safety net the rest)
//   - below maps, older life, mana and hybrid flask sizes with quality
//     show small (the levelling rules above hide the ones without)
//   - anything else shows pink, so an item no rule of ours knows stands out
//     instead of falling to the game's own plain label.
// Its strictness header is the one NeverSink's file would have, so the
// Loot tab's ruler scales the same.
import { WEAPON_CLASSES } from './build-rules'

export const OWN_REST_TYPE = 'woke->rest'

const GEAR_CLASSES = [...WEAPON_CLASSES, 'Body Armours', 'Helmets', 'Gloves', 'Boots', 'Shields', 'Quivers', 'Rings', 'Amulets', 'Belts']

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
    `Show # $type->${OWN_REST_TYPE} $tier->unknown`,
    '\tSetFontSize 36',
    '\tSetTextColor 255 0 255 255',
    '\tSetBorderColor 255 0 255 255',
    '\tSetBackgroundColor 100 0 100 255',
    ''
  ].join('\n')
}
