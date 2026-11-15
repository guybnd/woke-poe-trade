// Plain words for the filter's one-item panel: whether the item shows, which
// rule decides that, and the price tiers it can move between.
import type { FilterBlock, FilterCondition, FilterDoc } from './parse'
import type { MatchResult } from './match'
import { ECONOMY_GROUPS, tierRank } from './economy'
import { LEVEL_NAMES } from './strictness'
import { SAFETY_RULE_TYPE } from './safety'
import { OWN_RULE_TYPE, blocksOf } from './edits'
import { tierLabel } from './names'

export type VerdictSource = 'none' | 'safety' | 'own' | 'woke' | 'neversink'

export interface Verdict {
  shown: boolean
  source: VerdictSource
  // NeverSink hides this rule from this strictness up (null: never, or already).
  hideFrom: string | null
}

// The strictness index of a loaded file ("2-SEMI-STRICT" is 2).
export function levelOf (doc: FilterDoc | null): number | null {
  const m = /^(\d)/.exec(doc?.strictness ?? '')
  return m ? Number(m[1]) : null
}

// FilterBlade's %H5 tag: the rule hides from strictness 5 up; %D5 turns it off.
export function hideLevel (block: FilterBlock): number | null {
  const m = /%[HD](\d)/.exec(block.comment)
  return m ? Number(m[1]) : null
}

export function hideFromLabel (block: FilterBlock, level: number | null): string | null {
  const n = hideLevel(block)
  if (n == null || n >= LEVEL_NAMES.length) return null
  if (level != null && n <= level) return null
  return LEVEL_NAMES[n]
}

export type LevelState = 'shows' | 'hidden' | 'off'

// What a rule does at each of the seven strictness levels, worked out from
// the loaded file and FilterBlade's tags: %H hides from that level up, %D
// drops the rule (its items fall through to later rules).
export function levelStates (block: FilterBlock, level: number | null): LevelState[] {
  const m = /%([HD])(\d)/.exec(block.comment)
  const n = m ? Number(m[2]) : null
  // Hidden in the loaded file because of its tag, so shown below the tag.
  const hiddenByTag = n != null && m![1] === 'H' && level != null && n <= level
  return LEVEL_NAMES.map((_, l) => {
    if (block.disabled && !(m?.[1] === 'D' && level != null && n! <= level)) return 'off'
    if (n != null && l >= n) return m![1] === 'D' ? 'off' : 'hidden'
    if (block.visibility === 'Hide' && !hiddenByTag) return 'hidden'
    return 'shows'
  })
}

export function verdictOf (match: MatchResult, level: number | null): Verdict {
  const shown = match.visibility !== 'Hide'
  const block = match.final?.block
  if (!block) return { shown, source: 'none', hideFrom: null }
  const type = block.type ?? ''
  const source: VerdictSource = type === SAFETY_RULE_TYPE
    ? 'safety'
    : type === OWN_RULE_TYPE
      ? 'own'
      : type.startsWith('woke->') ? 'woke' : 'neversink'
  return { shown, source, hideFrom: source === 'neversink' && shown ? hideFromLabel(block, level) : null }
}

// ---- tiers ----

const PLAIN_KEYS = new Set(['BaseType', 'Rarity', 'Class'])

// A tier whose rules ask for nothing but the item's name, rarity and class:
// the price tiers. Others (6 links, Shaper and Elder, corrupted...) are
// special cases an item only lands in with more than its name.
export function isPlainTier (doc: FilterDoc, type: string, tier: string): boolean {
  const blocks = blocksOf(doc, type, tier)
  return blocks.length > 0 && blocks.every(b => b.conditions.every(c => PLAIN_KEYS.has(c.key)))
}

// The tier names ranked by price, best first, or null when the group has no
// price ladder.
export function priceLadder (type: string, tiers: string[]): string[] | null {
  const group = ECONOMY_GROUPS.find(g => g.type === type)
  const ranked = tiers
    .map(t => ({ t, r: tierRank(t, tiers, group) }))
    .filter((x): x is { t: string, r: number } => x.r != null)
    .sort((a, b) => a.r - b.r)
    .map(x => x.t)
  return ranked.length >= 2 ? ranked : null
}

const WORDS: Record<number, string[]> = {
  2: ['Top', 'Low'],
  3: ['Top', 'Mid', 'Low'],
  4: ['Top', 'High', 'Mid', 'Low']
}

// "Top", "High", "Mid", "Low" for a short ladder; "Tier 3" for a long one.
export function ladderLabel (index: number, count: number): string {
  return WORDS[count]?.[index] ?? `Tier ${index + 1}`
}

const SPECIAL_TIERS: Record<string, string> = {
  'ex6link': '6-linked',
  'extabula': '6-linked Tabula Rasa',
  'exkaom': 'No sockets',
  'exsynth': 'Synthesised',
  'exrationaljewel': 'Synthesised jewel',
  'exforgesword': 'Shaper or Elder',
  'exuberimpresence': 'Shaper and Elder',
  '4xabysshelmet': '4 abyss sockets',
  '3xabyss': '3 abyss sockets',
  '2xabyss': '2 abyss sockets',
  '2xcorrupteduniques': 'Two corrupted mods',
  'corrupteduniques': 'Corrupted',
  'excrucibleunique': 'Crucible tree',
  'overqual': 'Quality 27+',
  '5link': '5-linked',
  '6s': '6 sockets',
  'exjewels': 'Jewels',
  'exjewelscorrupted': 'Corrupted jewels',
  'foulborn': 'Foulborn',
  'restex': 'Everything else',
  'multispecialhigh': 'Base with several uniques, high',
  'multispecial': 'Base with several uniques',
  'earlyleague': 'Early league',
  't3boss': 'Boss drops',
  'hideable2': 'Can be hidden, 2',
  'exuniqueidols': 'Idols',
  'vestige': 'Vestigial'
}

export function specialLabel (tier: string): string {
  return SPECIAL_TIERS[tier] ?? tierLabel(tier.replace(/^ex(?=[a-z0-9])/, ''))
}

// A label from the list already says what the tier needs.
export const hasSpecialLabel = (tier: string) => tier in SPECIAL_TIERS

// What a special tier asks for beyond the name, in a few words.
export function conditionWords (c: FilterCondition): string | null {
  const v = c.values
  switch (c.key) {
    case 'BaseType': case 'Rarity': return null
    case 'LinkedSockets': return `${v[0]}-linked`
    case 'Sockets': {
      const abyss = /^A+$/.exec(v[0] ?? '')
      if (abyss) return `${abyss[0].length} abyss sockets`
      return `${c.op === '<' ? 'under' : ''} ${v[0]}${c.op === '>=' ? '+' : ''} sockets`.trim()
    }
    case 'HasInfluence': return v.join(' / ')
    case 'SynthesisedItem': return 'synthesised'
    case 'Corrupted': return v[0] === 'True' ? 'corrupted' : 'not corrupted'
    case 'CorruptedMods': return `${v[0]}+ corrupted mods`
    case 'Quality': return `quality ${v[0]}${c.op === '>=' ? '+' : ''}`
    case 'Vestigial': return 'vestigial'
    case 'HasCruciblePassiveTree': return 'crucible tree'
    case 'Class': return v.join(' / ')
    case 'ItemLevel': return `item level ${v[0]}${c.op === '>=' ? '+' : ''}`
    default: return `${c.key} ${c.op} ${v.join(' ')}`.replace(/\s+/g, ' ').trim()
  }
}

export function tierNeeds (doc: FilterDoc, type: string, tier: string): string {
  const first = blocksOf(doc, type, tier).find(b => !b.disabled) ?? blocksOf(doc, type, tier)[0]
  if (!first) return ''
  return first.conditions.map(conditionWords).filter(Boolean).join(', ')
}
