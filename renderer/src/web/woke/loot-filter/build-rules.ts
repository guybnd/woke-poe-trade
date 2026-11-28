// Rules made from the active PoB build, put at the top of the saved filter
// so they win over NeverSink's own: your gems, linked items in your colours,
// your uniques' bases, your rare bases, and (opt-in) hiding white and blue
// weapons your build doesn't use while levelling.
//
// They are rebuilt from the build on every load and save, before the user's
// edits apply, so a restyle of a build rule in the editor sticks.
import type { FilterAction, FilterBlock, FilterCondition, FilterDoc, Visibility } from './parse'
import type { GemColour } from '../pob-builds/gems'

export const BUILD_RULE_TYPE = 'woke->build'

export interface BuildRuleSwitches {
  gems: boolean
  links: boolean
  uniques: boolean
  bases: boolean
  hideWeapons: boolean
}

export const DEFAULT_BUILD_RULES: BuildRuleSwitches = { gems: true, links: true, uniques: true, bases: false, hideWeapons: false }

export interface BuildRuleInput {
  buildName: string
  // Gem item names ("Combustion Support").
  gems: string[]
  // Colours of the main link, active gem first.
  linkColours: GemColour[]
  uniqueBases: string[]
  rareBases: string[]
  // Filter class names of the weapons the build uses ("Wands").
  weaponClasses: string[]
}

// Below this area level you are still levelling.
export const LEVELLING_BELOW = 68

// Weapon classes as loot filters name them.
export const WEAPON_CLASSES = [
  'Bows', 'Claws', 'Daggers', 'Rune Daggers', 'One Hand Axes', 'One Hand Maces', 'One Hand Swords',
  'Thrusting One Hand Swords', 'Sceptres', 'Staves', 'Warstaves', 'Two Hand Axes', 'Two Hand Maces',
  'Two Hand Swords', 'Wands'
]

// APT item category -> filter classes.
export const CATEGORY_CLASSES: Record<string, string[]> = {
  'Bow': ['Bows'],
  'Claw': ['Claws'],
  'Dagger': ['Daggers'],
  'Rune Dagger': ['Rune Daggers'],
  'One-Handed Axe': ['One Hand Axes'],
  'One-Handed Mace': ['One Hand Maces'],
  'One-Handed Sword': ['One Hand Swords', 'Thrusting One Hand Swords'],
  'Sceptre': ['Sceptres'],
  'Staff': ['Staves', 'Warstaves'],
  'Warstaff': ['Staves', 'Warstaves'],
  'Two-Handed Axe': ['Two Hand Axes'],
  'Two-Handed Mace': ['Two Hand Maces'],
  'Two-Handed Sword': ['Two Hand Swords'],
  'Wand': ['Wands']
}

const cond = (key: string, op: string, values: string[]): FilterCondition => ({ key, op, count: null, values })
const act = (key: string, ...args: Array<string | number>): FilterAction => ({ key, args: args.map(String) })

function block (tier: string, label: string, buildName: string, visibility: Visibility, conditions: FilterCondition[], actions: FilterAction[]): FilterBlock {
  return {
    kind: 'block',
    index: -1,
    line: 0,
    visibility,
    disabled: false,
    comment: `$type->${BUILD_RULE_TYPE} $tier->${tier} woke: ${label} (build: ${buildName.replace(/[\r\n]/g, ' ')})`,
    type: BUILD_RULE_TYPE,
    tier,
    conditions,
    actions,
    continue: false,
    section: 'Your build',
    subsection: '',
    raw: [],
    dirty: true,
    added: true
  }
}

const RARITY_TEXT: Array<[string, number[]]> = [
  ['Normal', [200, 200, 200]],
  ['Magic', [136, 136, 255]],
  ['Rare', [255, 255, 119]]
]

export function buildRuleBlocks (input: BuildRuleInput, on: BuildRuleSwitches): FilterBlock[] {
  const out: FilterBlock[] = []
  const name = input.buildName
  const levelling = cond('AreaLevel', '<', [String(LEVELLING_BELOW)])

  if (on.gems && input.gems.length) {
    out.push(block('gems', 'gems in your build', name, 'Show', [
      levelling,
      cond('Class', '==', ['Skill Gems', 'Support Gems']),
      cond('BaseType', '==', input.gems)
    ], [
      act('SetFontSize', 40),
      act('SetTextColor', 27, 162, 155, 255),
      act('SetBorderColor', 27, 162, 155, 255),
      act('SetBackgroundColor', 12, 30, 30, 240),
      act('PlayEffect', 'Cyan', 'Temp'),
      act('MinimapIcon', 1, 'Cyan', 'Triangle')
    ]))
  }

  if (on.uniques && input.uniqueBases.length) {
    out.push(block('uniques', 'bases of the uniques in your build', name, 'Show', [
      cond('Rarity', '', ['Unique']),
      cond('BaseType', '==', input.uniqueBases)
    ], [
      act('SetFontSize', 45),
      act('SetTextColor', 175, 96, 37, 255),
      act('SetBorderColor', 175, 96, 37, 255),
      act('SetBackgroundColor', 53, 13, 13, 255),
      act('PlayAlertSound', 3, 300),
      act('PlayEffect', 'Brown'),
      act('MinimapIcon', 0, 'Brown', 'Star')
    ]))
  }

  const coloured = input.linkColours.filter(c => c !== 'w')
  if (on.links && coloured.length >= 2) {
    // The main link, and its first three gems as a smaller target.
    const sizes = [...new Set([Math.min(coloured.length, 4), Math.min(coloured.length, 3)])]
    for (const size of sizes) {
      const group = coloured.slice(0, size).map(c => c.toUpperCase()).join('')
      for (const [rarity, rgb] of RARITY_TEXT) {
        out.push(block(`links${size}`, `${size}-link in your colours`, name, 'Show', [
          levelling,
          cond('Rarity', '', [rarity]),
          cond('LinkedSockets', '>=', [String(size)]),
          cond('SocketGroup', '', [group])
        ], [
          act('SetFontSize', size >= 4 ? 42 : 38),
          act('SetTextColor', ...rgb, 255),
          act('SetBorderColor', 212, 166, 74, 255),
          act('SetBackgroundColor', 40, 30, 10, 240),
          act('MinimapIcon', size >= 4 ? 1 : 2, 'Yellow', 'Diamond')
        ]))
      }
    }
  }

  if (on.bases && input.rareBases.length) {
    out.push(block('bases', 'rare bases your build wears', name, 'Show', [
      cond('Rarity', '', ['Rare']),
      cond('BaseType', '==', input.rareBases)
    ], [
      act('SetFontSize', 40),
      act('SetTextColor', 255, 255, 119, 255),
      act('SetBorderColor', 255, 255, 119, 255),
      act('SetBackgroundColor', 30, 30, 10, 240),
      act('MinimapIcon', 2, 'Yellow', 'Hexagon')
    ]))
  }

  if (on.hideWeapons && input.weaponClasses.length) {
    const others = WEAPON_CLASSES.filter(c => !input.weaponClasses.includes(c))
    if (others.length) {
      out.push(block('otherweapons', 'white and blue weapons your build does not use', name, 'Hide', [
        levelling,
        cond('Rarity', '', ['Normal', 'Magic']),
        cond('Class', '==', others)
      ], [
        act('DisableDropSound', 'True')
      ]))
    }
  }
  return out
}

// Puts the blocks before the filter's first rule.
export function insertBuildBlocks (doc: FilterDoc, blocks: FilterBlock[]): void {
  if (!blocks.length) return
  const first = doc.chunks.findIndex(c => c.kind === 'block')
  const at = first < 0 ? doc.chunks.length : first
  doc.chunks.splice(at, 0, ...blocks)
  const firstBlock = doc.blocks[0]
  blocks.forEach(b => { b.line = firstBlock?.line ?? 1 })
  doc.blocks.unshift(...blocks)
  doc.blocks.forEach((b, i) => { b.index = i })
}
