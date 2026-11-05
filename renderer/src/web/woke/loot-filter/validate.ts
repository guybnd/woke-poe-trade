// Checks a filter before it is written. The game refuses a filter with a bad
// line and quietly keeps the old one, which looks like "my change did nothing",
// so problems are caught here and named by rule instead.
import type { FilterBlock, FilterDoc } from './parse'
import { ACTION_KEYS } from './parse'
import { groupName } from './groups'

export interface FilterProblem {
  block: FilterBlock
  message: string
}

const CONDITION_KEYS = new Set([
  'Class', 'BaseType', 'Rarity', 'ItemLevel', 'DropLevel', 'Quality', 'AreaLevel', 'MapTier', 'GemLevel',
  'StackSize', 'Width', 'Height', 'MemoryStrands', 'CorruptedMods', 'EnchantmentPassiveNum', 'LinkedSockets',
  'Sockets', 'SocketGroup', 'Identified', 'Corrupted', 'Mirrored', 'FracturedItem', 'SynthesisedItem', 'Replica',
  'Foulborn', 'Vestigial', 'TransfiguredGem', 'BlightedMap', 'Imbued', 'HasCruciblePassiveTree', 'UberBlightedMap',
  'AnyEnchantment', 'HasImplicitMod', 'HasInfluence', 'HasExplicitMod', 'HasEnchantment', 'EnchantmentPassiveNode',
  'ElderItem', 'ShaperItem', 'ShapedMap', 'ElderMap', 'GemQualityType', 'AlternateQuality', 'Scourged',
  'HasSearingExarchImplicit', 'HasEaterOfWorldsImplicit', 'ArchnemesisMod', 'BaseArmour', 'BaseEnergyShield',
  'BaseEvasion', 'BaseWard', 'BaseDefencePercentile', 'ZanaMemory', 'Continue', 'HasVaalUniqueMod', 'IsVaalUnique',
  'TwiceCorrupted', 'UnidentifiedItemTier', 'WaystoneTier', 'HasImplicitMods', 'Sanctified', 'Unmodifiable',
  'AlwaysShow', 'Exceptional', 'MirageMap'
])

const COLOURS = new Set(['Red', 'Green', 'Blue', 'Brown', 'White', 'Yellow', 'Cyan', 'Grey', 'Orange', 'Pink', 'Purple'])
const SHAPES = new Set(['Circle', 'Diamond', 'Hexagon', 'Square', 'Star', 'Triangle', 'Cross', 'Moon', 'Raindrop', 'Kite', 'Pentagon', 'UpsideDownHouse'])
// Conditions that need at least one value to mean anything.
const LIST_KEYS = new Set(['Class', 'BaseType', 'HasExplicitMod', 'HasEnchantment', 'EnchantmentPassiveNode', 'HasInfluence', 'Rarity'])

function int (v: string | undefined, min: number, max: number): boolean {
  if (v == null || !/^-?\d+$/.test(v)) return false
  const n = Number(v)
  return n >= min && n <= max
}

function checkBlock (b: FilterBlock): string[] {
  const out: string[] = []
  for (const c of b.conditions) {
    // A keyword from the source filter may be newer than this list (a new
    // league); it mustn't block a restyle of that rule. Ours must be known.
    if (!CONDITION_KEYS.has(c.key)) {
      if (!b.raw.length && !b.inherited) out.push(`unknown condition "${c.key}"`)
    } else if (LIST_KEYS.has(c.key) && !c.values.length) out.push(`${c.key} has no values`)
  }
  for (const a of b.actions) {
    if (!ACTION_KEYS.has(a.key)) { out.push(`unknown action "${a.key}"`); continue }
    switch (a.key) {
      case 'SetFontSize':
        if (!int(a.args[0], 1, 45)) out.push(`font size ${a.args[0] ?? '(none)'} is outside 1-45`)
        break
      case 'SetTextColor': case 'SetBorderColor': case 'SetBackgroundColor':
        if (a.args.length < 3 || a.args.length > 4 || !a.args.every(x => int(x, 0, 255))) out.push(`${a.key} needs 3 or 4 numbers from 0 to 255`)
        break
      case 'PlayAlertSound': case 'PlayAlertSoundPositional':
        if (!(int(a.args[0], 1, 16) || a.args[0] === 'None' || /^Sh[A-Za-z]+$/.test(a.args[0] ?? ''))) out.push(`alert sound "${a.args[0] ?? ''}" isn't 1-16`)
        if (a.args[1] != null && !int(a.args[1], 0, 300)) out.push(`sound volume ${a.args[1]} is outside 0-300`)
        break
      case 'CustomAlertSound': case 'CustomAlertSoundOptional':
        if (!a.args[0]) out.push('custom sound has no file name')
        if (a.args[1] != null && !int(a.args[1], 0, 300)) out.push(`sound volume ${a.args[1]} is outside 0-300`)
        break
      case 'PlayEffect':
        if (a.args[0] !== 'None' && !COLOURS.has(a.args[0])) out.push(`beam colour "${a.args[0] ?? ''}" isn't a game colour`)
        if (a.args[1] != null && a.args[1] !== 'Temp') out.push(`beam option "${a.args[1]}" should be Temp`)
        break
      case 'MinimapIcon':
        if (a.args[0] === '-1') break
        if (!int(a.args[0], 0, 2)) out.push(`minimap icon size ${a.args[0] ?? '(none)'} isn't 0, 1 or 2`)
        if (!COLOURS.has(a.args[1])) out.push(`minimap colour "${a.args[1] ?? ''}" isn't a game colour`)
        if (!SHAPES.has(a.args[2])) out.push(`minimap shape "${a.args[2] ?? ''}" isn't a game shape`)
        break
    }
  }
  return out
}

// Only rules the editor wrote or changed are checked: NeverSink's untouched
// rules are taken as they are, so a condition this checker doesn't know yet
// (a new league keyword) never blocks a save.
export function validateFilter (doc: FilterDoc): FilterProblem[] {
  const out: FilterProblem[] = []
  for (const b of doc.blocks) {
    if (b.disabled || !b.dirty) continue
    for (const message of checkBlock(b)) out.push({ block: b, message })
  }
  return out
}

export function describeProblem (p: FilterProblem): string {
  const where = p.block.type ? `${groupName(p.block.type)}${p.block.tier ? ` › ${p.block.tier}` : ''}` : `rule at line ${p.block.line}`
  return `${where}: ${p.message}`
}
