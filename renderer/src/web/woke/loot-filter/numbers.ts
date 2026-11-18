// The numbers a rule checks (item level, passives on a cluster jewel, gem
// quality...) as things you can read and change: "item level 84 or more",
// "8 passives or fewer". Stack size has its own editor (stack.ts).
import type { FilterCondition } from './parse'
import type { NumberBound } from './edits'

export interface NumberSpec {
  // How a row says it: "Item level", "Passives".
  label: string
  min: number
  max: number
}

// Keys the game takes one whole number for, with the range it accepts.
export const NUMBER_KEYS: Record<string, NumberSpec> = {
  // What the item is first (passives, tier, gem level), where it dropped last.
  EnchantmentPassiveNum: { label: 'Passives', min: 1, max: 12 },
  MapTier: { label: 'Map tier', min: 1, max: 17 },
  WaystoneTier: { label: 'Waystone tier', min: 1, max: 16 },
  GemLevel: { label: 'Gem level', min: 1, max: 21 },
  Quality: { label: 'Quality', min: 0, max: 30 },
  LinkedSockets: { label: 'Linked sockets', min: 0, max: 6 },
  CorruptedMods: { label: 'Corrupted mods', min: 0, max: 6 },
  MemoryStrands: { label: 'Memory strands', min: 0, max: 100 },
  BaseArmour: { label: 'Base armour', min: 0, max: 5000 },
  BaseEvasion: { label: 'Base evasion', min: 0, max: 5000 },
  BaseEnergyShield: { label: 'Base energy shield', min: 0, max: 1000 },
  BaseWard: { label: 'Base ward', min: 0, max: 1000 },
  BaseDefencePercentile: { label: 'Defence roll %', min: 0, max: 100 },
  UnidentifiedItemTier: { label: 'Unidentified tier', min: 1, max: 5 },
  ItemLevel: { label: 'Item level', min: 1, max: 100 },
  DropLevel: { label: 'Drop level', min: 1, max: 100 },
  AreaLevel: { label: 'Area level', min: 1, max: 100 }
}

// One condition as a bound on its number, or null when it isn't one: a list
// ("== 1 16"), a "!=", a key we don't edit.
export function boundOf (c: FilterCondition): NumberBound | null {
  if (!Object.hasOwn(NUMBER_KEYS, c.key) || c.count != null || c.values.length !== 1 || !/^-?\d+$/.test(c.values[0])) return null
  switch (c.op) {
    case '>=': case '>': return 'min'
    case '<=': case '<': return 'max'
    case '': case '=': case '==': return 'exact'
    default: return null
  }
}

// The value a bound means, with > and < folded in: "> 83" is 84 or more.
export function boundValue (c: FilterCondition): number {
  const v = Number(c.values[0])
  return c.op === '>' ? v + 1 : c.op === '<' ? v - 1 : v
}

export interface NumberCheck {
  key: string
  bound: NumberBound
  value: number
}

// Every number a rule checks, one per key and bound, in the rule's order.
export function numberChecks (conditions: FilterCondition[]): NumberCheck[] {
  const out: NumberCheck[] = []
  for (const c of conditions) {
    const bound = boundOf(c)
    if (!bound) continue
    const value = boundValue(c)
    const prev = out.find(x => x.key === c.key && x.bound === bound)
    // Two lower bounds: the higher one is what counts (and the reverse).
    if (prev) prev.value = bound === 'min' ? Math.max(prev.value, value) : bound === 'max' ? Math.min(prev.value, value) : value
    else out.push({ key: c.key, bound, value })
  }
  const order = Object.keys(NUMBER_KEYS)
  return out.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
}

const OP: Record<NumberBound, string> = { min: '>=', max: '<=', exact: '==' }

// The conditions with one bound set to `value` (null: taken off). The new
// condition takes the old one's place, so the rule reads the same way.
export function setNumber (conditions: FilterCondition[], key: string, bound: NumberBound, value: number | null): FilterCondition[] {
  const next: FilterCondition = { key, op: OP[bound], count: null, values: [String(value)] }
  const out: FilterCondition[] = []
  let placed = false
  for (const c of conditions) {
    if (c.key === key && boundOf(c) === bound) {
      if (!placed && value != null) out.push(next)
      placed = true
      continue
    }
    // An exact value can't stand with a range on the same key, or the other way round.
    if (value != null && c.key === key && boundOf(c) != null && (bound === 'exact') !== (boundOf(c) === 'exact')) continue
    out.push(c)
  }
  if (!placed && value != null) out.push(next)
  return out
}

// "84 or more", "up to 8", "exactly 12".
export function boundWords (bound: NumberBound, value: number): string {
  return bound === 'min' ? `${value}+` : bound === 'max' ? `up to ${value}` : `${value}`
}

// A rule's numbers in words, one per key: "Item level 84+", "Passives up to 8",
// "Item level 75–83".
export function numberWords (conditions: FilterCondition[]): Array<{ key: string, text: string }> {
  const checks = numberChecks(conditions)
  const keys = [...new Set(checks.map(c => c.key))]
  return keys.map(key => {
    const label = NUMBER_KEYS[key].label
    const lo = checks.find(c => c.key === key && c.bound === 'min')
    const hi = checks.find(c => c.key === key && c.bound === 'max')
    const ex = checks.find(c => c.key === key && c.bound === 'exact')
    if (ex) return { key, text: `${label} ${ex.value}` }
    if (lo && hi) return { key, text: lo.value === hi.value ? `${label} ${lo.value}` : `${label} ${lo.value}–${hi.value}` }
    if (lo) return { key, text: `${label} ${lo.value}+` }
    return { key, text: `${label} up to ${hi!.value}` }
  })
}

export function numberEditWords (key: string, bound: NumberBound, value: number | null): string {
  const label = (NUMBER_KEYS[key]?.label ?? key).toLowerCase()
  if (value == null) return `no ${bound === 'min' ? 'lowest' : bound === 'max' ? 'highest' : 'exact'} ${label}`
  return `${label} ${boundWords(bound, value)}`
}
