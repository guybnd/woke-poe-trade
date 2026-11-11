// Your own rules, made in the rule builder: any conditions, any look. They
// go at the top of the filter (above NeverSink's rules, so they win) and are
// kept in the widget config, so a new NeverSink version keeps them.
import type { FilterBlock, FilterCondition, FilterDoc, Visibility } from './parse'
import { applyStyle } from './edits'
import type { StylePatch } from './edits'

export const RULE_TYPE = 'woke->rule'

export interface OwnRule {
  id: number
  name: string
  on: boolean
  conditions: FilterCondition[]
  visibility: Visibility
  patch: StylePatch
}

export type ConditionInput = 'list' | 'number' | 'rarity' | 'bool' | 'influence' | 'tier'

export interface ConditionKind {
  key: string
  label: string
  input: ConditionInput
  // Numbers: the range the game accepts.
  min?: number
  max?: number
}

// What the builder offers. Lists match exactly (`==`), so "Ring" never
// catches "Ring Mail".
export const CONDITION_KINDS: ConditionKind[] = [
  { key: 'Class', label: 'Item class', input: 'list' },
  { key: 'BaseType', label: 'Base type', input: 'list' },
  { key: 'Rarity', label: 'Rarity', input: 'rarity' },
  { key: 'ItemLevel', label: 'Item level', input: 'number', min: 1, max: 100 },
  { key: 'AreaLevel', label: 'Area level', input: 'number', min: 1, max: 100 },
  { key: 'DropLevel', label: 'Base drop level', input: 'number', min: 1, max: 100 },
  { key: 'Quality', label: 'Quality', input: 'number', min: 0, max: 30 },
  { key: 'Sockets', label: 'Sockets', input: 'number', min: 0, max: 6 },
  { key: 'LinkedSockets', label: 'Linked sockets', input: 'number', min: 0, max: 6 },
  { key: 'StackSize', label: 'Stack size', input: 'number', min: 1, max: 5000 },
  { key: 'MapTier', label: 'Map tier', input: 'number', min: 1, max: 17 },
  { key: 'GemLevel', label: 'Gem level', input: 'number', min: 1, max: 21 },
  { key: 'Width', label: 'Width', input: 'number', min: 1, max: 2 },
  { key: 'Height', label: 'Height', input: 'number', min: 1, max: 4 },
  { key: 'Identified', label: 'Identified', input: 'bool' },
  { key: 'Corrupted', label: 'Corrupted', input: 'bool' },
  { key: 'Mirrored', label: 'Mirrored', input: 'bool' },
  { key: 'FracturedItem', label: 'Fractured', input: 'bool' },
  { key: 'SynthesisedItem', label: 'Synthesised', input: 'bool' },
  { key: 'HasInfluence', label: 'Influence', input: 'influence' },
  // 3.30: magic and rare drops from Act 6 on can carry a tier, 2 to 5.
  { key: 'UnidentifiedItemTier', label: 'Item tier', input: 'tier', min: 2, max: 5 }
]

export const RARITIES = ['Normal', 'Magic', 'Rare', 'Unique']
export const INFLUENCES = ['Shaper', 'Elder', 'Crusader', 'Hunter', 'Redeemer', 'Warlord']
export const NUMBER_OPS = ['>=', '<=', '==', '>', '<']

// 3.30 patch notes: tiers run from 2 to 5; an item with no tier has none.
export const ITEM_TIERS = [2, 3, 4, 5]

// Which tier buttons a tier condition lights. Ours are always "this tier and
// up"; a hand-written or NeverSink one can use any compare.
export function tierLit (op: string, value: number, tier: number): boolean {
  switch (op || '==') {
    case '>=': return tier >= value
    case '>': return tier > value
    case '<=': return tier <= value
    case '<': return tier < value
    default: return tier === value
  }
}

export function conditionKind (key: string): ConditionKind | undefined {
  return CONDITION_KINDS.find(k => k.key === key)
}

export function newCondition (key: string): FilterCondition {
  const kind = conditionKind(key)
  switch (kind?.input) {
    case 'number': return { key, op: '>=', count: null, values: [String(kind.min ?? 1)] }
    case 'rarity': return { key, op: '==', count: null, values: ['Rare'] }
    case 'bool': return { key, op: '', count: null, values: ['False'] }
    case 'influence': return { key, op: '', count: null, values: ['None'] }
    case 'tier': return { key, op: '>=', count: null, values: ['4'] }
    default: return { key, op: '==', count: null, values: [] }
  }
}

export function newRule (id: number, n: number): OwnRule {
  return { id, name: `My rule ${n}`, on: true, conditions: [newCondition('Class')], visibility: 'Show', patch: {} }
}

// Values end up quoted in the filter file.
export function cleanValue (v: string): string {
  return v.replace(/["\r\n\t]/g, '').trim().slice(0, 120)
}

// Why a rule can't be written (it is skipped until fixed), or null.
export function ruleProblem (r: OwnRule): string | null {
  if (r.conditions.some(c => !conditionKind(c.key) || c.values.some(v => v !== cleanValue(v) || !v))) return 'A condition has a value the game can\'t read'
  for (const c of r.conditions) {
    if (!c.values.length) return `${conditionKind(c.key)?.label ?? c.key} is empty`
    const kind = conditionKind(c.key)
    if (kind?.input === 'number' || kind?.input === 'tier') {
      const n = Number(c.values[0])
      if (!Number.isInteger(n) || (kind.min != null && n < kind.min) || (kind.max != null && n > kind.max)) {
        return `${kind.label} must be a whole number from ${kind.min} to ${kind.max}`
      }
    }
  }
  const live = r.conditions.filter(c => c.values.length)
  if (!live.length) return 'Add a condition: a rule with none would catch every item'
  return null
}

export function describeCondition (c: FilterCondition): string {
  const kind = conditionKind(c.key)
  const label = kind?.label ?? c.key
  switch (kind?.input) {
    case 'number': return `${label} ${c.op || '='} ${c.values[0]}`
    case 'bool': return c.values[0] === 'True' ? label : `not ${label.toLowerCase()}`
    case 'rarity': return `${c.op && c.op !== '==' ? `${c.op} ` : ''}${c.values.join(', ')}`
    default: return `${label}: ${c.values.slice(0, 3).join(', ')}${c.values.length > 3 ? ` +${c.values.length - 3}` : ''}`
  }
}

export function ruleSummary (r: OwnRule): string {
  return r.conditions.filter(c => c.values.length).map(describeCondition).join(' · ')
}

// A block the editor adds (own rules, presets): tagged so the editor groups it.
export function addedBlock (type: string, tier: string, note: string, conditions: FilterCondition[], visibility: Visibility, section: string): FilterBlock {
  return {
    kind: 'block',
    index: -1,
    line: 1,
    visibility,
    disabled: false,
    comment: `$type->${type} $tier->${tier} woke: ${note}`,
    type,
    tier,
    conditions: conditions.map(c => ({ ...c, values: [...c.values] })),
    actions: visibility === 'Hide' ? [{ key: 'DisableDropSound', args: ['True'] }] : [],
    continue: false,
    section,
    subsection: '',
    raw: [],
    dirty: true,
    added: true
  }
}

export function ruleTier (r: OwnRule): string {
  return `r${r.id}`
}

export function ruleBlocks (rules: OwnRule[]): FilterBlock[] {
  const out: FilterBlock[] = []
  for (const r of rules) {
    if (!r.on || ruleProblem(r)) continue
    const b = addedBlock(RULE_TYPE, ruleTier(r), r.name.replace(/[\r\n]/g, ' ').slice(0, 60), r.conditions, r.visibility, 'Your rules')
    if (r.visibility !== 'Hide') applyStyle(b, r.patch)
    out.push(b)
  }
  return out
}

export function ruleFor (rules: OwnRule[], tier: string | null): OwnRule | undefined {
  return rules.find(r => ruleTier(r) === tier)
}

// Bases and classes the doc's own rules name: suggestions for the pickers.
export function knownValues (doc: FilterDoc | null, key: 'Class' | 'BaseType'): string[] {
  const out = new Set<string>()
  if (doc) {
    for (const b of doc.blocks) {
      for (const c of b.conditions) if (c.key === key) for (const v of c.values) out.add(v)
    }
  }
  return [...out].sort((a, z) => a.localeCompare(z))
}
