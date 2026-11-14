// "Never hide value": the safety net rule and the filter health list.
//
// The safety net is one rule at the top of the saved filter that shows any
// base worth more than your line (poe.ninja) that the filter would otherwise
// hide. Only hidden bases are listed, so items NeverSink already shows keep
// their usual look.
import type { FilterAction, FilterBlock, FilterDoc } from './parse'
import type { StylePatch } from './edits'
import { readStyle } from './edits'
import { ownMatchActions } from './look'
import type { EconomyGroup, PriceLookup } from './economy'
import { NET_GROUPS } from './economy'
import { matchItem } from './match'
import type { ItemFacts } from './item-facts'
import { BASE_FACTS } from './base-facts'

export const SAFETY_RULE_TYPE = 'woke->safety'

export interface SafetyNet {
  on: boolean
  // Chaos value from which an item always shows.
  minChaos: number
  // What was over the line at the last rebuild with prices, for when there are
  // none. The filter as it stands then decides which of it the net shows.
  last?: NetList
}

export interface NetList {
  plain: string[]
  unique: string[]
  // Items too cheap alone, by the stack size from which they're over the line.
  stacks?: Record<string, string[]>
  // The line this was remembered at. A higher line since can't rely on it.
  line?: number
}

export const DEFAULT_SAFETY_NET: SafetyNet = { on: true, minChaos: 20 }

// The look of an item the safety net catches: big, white on dark red, a
// temporary red beam and a red minimap diamond. Distinct from NeverSink's
// tiers so you can tell the net caught it.
export const SAFETY_LOOK: StylePatch = {
  fontSize: 42,
  text: [255, 255, 255, 255],
  border: [255, 255, 255, 255],
  background: [140, 20, 20, 255],
  effect: { color: 'Red', temp: true },
  icon: { size: 1, color: 'Red', shape: 'Diamond' },
  // A valuable catch shouldn't be silent.
  sound: { id: '6', volume: 200 }
}

export type ItemState = 'hidden' | 'small' | 'ok'

export interface BaseVerdict {
  group: EconomyGroup
  base: string
  chaos: number
  thin: boolean
  note?: string
  // The rule that decides this drop.
  block: FilterBlock | null
  state: ItemState
  // Decided by your own rule, a preset or your build, not by NeverSink.
  mine: boolean
}

const SMALL_FONT = 30

function stateOf (visibility: string, actions: FilterAction[]): ItemState {
  if (visibility === 'Hide') return 'hidden'
  const s = readStyle(actions)
  return (s.fontSize ?? 32) < SMALL_FONT && !s.sound ? 'small' : 'ok'
}

// Area level the net and the health list judge by: an end-game map.
const MAP_AREA_LEVEL = 83

// The drop the net is about: one item, straight off a monster in a map, with
// nothing special about it.
function plainDrop (group: EconomyGroup, base: string, itemClass: string | undefined): ItemFacts {
  const known = BASE_FACTS[base]
  return {
    name: base,
    baseType: base,
    itemClass,
    rarity: group.unique ? 'Unique' : 'Normal',
    itemLevel: MAP_AREA_LEVEL,
    dropLevel: known?.[0],
    width: known?.[1],
    height: known?.[2],
    areaLevel: MAP_AREA_LEVEL,
    quality: 0,
    stackSize: 1,
    memoryStrands: 0,
    socketGroups: [],
    identified: !group.unique,
    corrupted: false,
    mirrored: false,
    fractured: false,
    synthesised: false,
    replica: false,
    foulborn: false,
    vestigial: false,
    transfigured: false,
    imbued: false,
    zanaMemory: false,
    exceptional: false,
    crucibleTree: false,
    blightedMap: false,
    uberBlightedMap: false,
    anyEnchantment: false,
    hasImplicitMod: false,
    exarchTier: 0,
    eaterTier: 0,
    corruptedMods: 0,
    enchantmentPassiveNum: 0,
    enchantPassiveNodes: [],
    enchantments: [],
    influences: [],
    explicitModNames: []
  }
}

// woke: what the game really does with that drop, walking the rules in order.
// Taking the first rule that listed a base read every Replica and Foulborn rule
// as "this base shows", and the net left the plain unique hidden. A hide the
// walk can't rule out counts as hidden: a false alarm costs one click.
function verdictOf (doc: FilterDoc, drop: ItemFacts): { block: FilterBlock | null, state: ItemState, mine: boolean } {
  const m = matchItem(doc, drop, { brief: true })
  // A rule that names this base, or a unique rule when the drop is one, is about
  // this item. A class-wide rule we can't judge without the item's class isn't.
  const about = (b: FilterBlock) => b.conditions.some(c =>
    (c.key === 'BaseType' && c.values.includes(drop.baseType!)) || (drop.rarity === 'Unique' && c.key === 'Rarity' && c.values.includes('Unique')))
  const unsure = m.visibility !== 'Hide' ? m.uncertain.find(u => u.block.visibility === 'Hide' && about(u.block)) : undefined
  const block = unsure?.block ?? m.final?.block ?? null
  return {
    block,
    // Judged on the rules' own sizes: the look strip is your call, not the filter's.
    state: unsure ? 'hidden' : stateOf(m.visibility, ownMatchActions(m)),
    // Your own rules, presets and build rules: you chose this. A rule of yours
    // with no Rarity, made for a rare of this base, says nothing about a unique.
    mine: Boolean(block?.type?.startsWith('woke->')) && (drop.rarity !== 'Unique' || block!.conditions.some(c => c.key === 'Rarity'))
  }
}

// Every priced base of the price groups with what the filter does to it.
// `safety` blocks are skipped, so the result says what NeverSink (plus your
// edits) would do without the net.
export function auditBases (doc: FilterDoc, lookup: PriceLookup, minChaos: number, groups = NET_GROUPS): BaseVerdict[] {
  const out: BaseVerdict[] = []
  const walked: FilterDoc = doc.blocks.some(b => b.type === SAFETY_RULE_TYPE)
    ? { ...doc, blocks: doc.blocks.filter(b => b.type !== SAFETY_RULE_TYPE) }
    : doc
  for (const group of groups) {
    // A base and the Class of a rule that lists it. A tier this level has
    // commented out still names the base, which then falls to a later rule.
    const bases = new Map<string, string | undefined>()
    for (const b of walked.blocks) {
      if (b.type == null) continue
      if (b.type !== group.type && !b.type.startsWith(group.type + '->') && !b.type.startsWith('woke->')) continue
      const itemClass = b.conditions.find(c => c.key === 'Class' && ['', '=', '=='].includes(c.op))?.values[0]
      for (const c of b.conditions) {
        if (c.key !== 'BaseType' || c.op !== '==') continue
        // Own and build rules count for every group; only keep them for bases
        // this group prices.
        for (const base of c.values) {
          if (b.type.startsWith('woke->') && !lookup(group, base)) continue
          if (!bases.has(base) || (bases.get(base) == null && itemClass)) bases.set(base, itemClass)
        }
      }
    }
    for (const [base, itemClass] of bases) {
      const price = lookup(group, base)
      if (!price || price.chaos < minChaos) continue
      out.push({ group, base, chaos: price.chaos, thin: price.thin, note: price.note, ...verdictOf(walked, plainDrop(group, base, itemClass)) })
    }
  }
  return out.sort((a, b) => b.chaos - a.chaos)
}

// Items worth at least `minChaos` that the filter hides. A thin market counts:
// showing a junk price costs a click, and hiding a rare one costs the item.
// What you hid yourself, or said isn't for you, stays hidden.
export function netFromAudit (verdicts: BaseVerdict[], skip?: (v: BaseVerdict) => boolean): NetList {
  const plain = new Set<string>()
  const unique = new Set<string>()
  for (const v of verdicts) {
    if (v.state !== 'hidden' || v.mine || skip?.(v)) continue
    ;(v.group.unique ? unique : plain).add(v.base)
  }
  return { plain: [...plain].sort(), unique: [...unique].sort() }
}

export function safetyBases (doc: FilterDoc, lookup: PriceLookup, minChaos: number, skip?: (v: BaseVerdict) => boolean): NetList {
  return netFromAudit(auditBases(doc, lookup, minChaos), skip)
}

// Everything over the line, hidden or not: what to remember for a time with no
// prices, so another strictness level can still be judged.
export function valuableFromAudit (verdicts: BaseVerdict[]): NetList {
  const plain = new Set<string>()
  const unique = new Set<string>()
  for (const v of verdicts) (v.group.unique ? unique : plain).add(v.base)
  return { plain: [...plain].sort(), unique: [...unique].sort() }
}

function rgba (c: [number, number, number, number]): string[] {
  return c.map(String)
}

function block (tier: string, conditions: FilterBlock['conditions']): FilterBlock {
  const s = SAFETY_LOOK
  return {
    kind: 'block',
    index: -1,
    line: 1,
    visibility: 'Show',
    disabled: false,
    comment: `$type->${SAFETY_RULE_TYPE} $tier->${tier} woke: safety net, worth more than your line on poe.ninja`,
    type: SAFETY_RULE_TYPE,
    tier,
    conditions,
    actions: [
      { key: 'SetFontSize', args: [String(s.fontSize)] },
      { key: 'SetTextColor', args: rgba(s.text!) },
      { key: 'SetBorderColor', args: rgba(s.border!) },
      { key: 'SetBackgroundColor', args: rgba(s.background!) },
      { key: 'PlayAlertSound', args: [s.sound!.id, String(s.sound!.volume)] },
      { key: 'PlayEffect', args: [s.effect!.color, 'Temp'] },
      { key: 'MinimapIcon', args: [String(s.icon!.size), s.icon!.color, s.icon!.shape] }
    ],
    continue: false,
    section: 'Safety net',
    subsection: '',
    raw: [],
    dirty: true,
    added: true
  }
}

const STACK_SIZES = [5, 10, 20, 40]
const STACKS = /Currency|Divination|Fragment/

// A strict filter can hide a stack worth more than the line, item by item too
// cheap to count. Each item goes in at the smallest stack that's over the line
// and hidden.
export function stackNet (doc: FilterDoc, lookup: PriceLookup, minChaos: number, skip?: (group: EconomyGroup, base: string) => boolean): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  const walked: FilterDoc = { ...doc, blocks: doc.blocks.filter(b => b.type !== SAFETY_RULE_TYPE) }
  for (const group of NET_GROUPS) {
    if (group.unique) continue
    const seen = new Set<string>()
    for (const b of walked.blocks) {
      if (b.type !== group.type && !b.type?.startsWith(group.type + '->')) continue
      const itemClass = b.conditions.find(c => c.key === 'Class' && ['', '=', '=='].includes(c.op))?.values[0]
      if (!itemClass || !STACKS.test(itemClass)) continue
      for (const c of b.conditions) {
        if (c.key !== 'BaseType' || c.op !== '==') continue
        for (const base of c.values) {
          if (seen.has(base)) continue
          seen.add(base)
          const price = lookup(group, base)
          if (!price || price.chaos >= minChaos || skip?.(group, base)) continue
          const size = STACK_SIZES.find(n => price.chaos * n >= minChaos)
          if (size == null) continue
          const v = verdictOf(walked, { ...plainDrop(group, base, itemClass), stackSize: size })
          if (v.state === 'hidden' && !v.mine) (out[size] ??= []).push(base)
        }
      }
    }
  }
  for (const list of Object.values(out)) list.sort()
  return out
}

// Prices with holes: a category missing from the feed isn't worthless, so what
// was valuable there last time still counts.
export function withLast (lookup: PriceLookup, last: NetList | undefined, minChaos: number, hasType: (type: string) => boolean): PriceLookup {
  const memory = lastLookup(last, minChaos)
  return (group, base) => lookup(group, base) ?? (group.ninja.some(hasType) ? null : memory(group, base))
}

// A stand-in for prices when there are none: what was valuable last time still
// is. Only names this filter lists can come back, so the game knows them all.
export function lastLookup (last: NetList | undefined, minChaos: number): PriceLookup {
  const plain = new Set(last?.plain)
  const unique = new Set(last?.unique)
  if (last?.line != null && minChaos > last.line) return () => null
  return (group, base) => (group.unique ? unique : plain).has(base) ? { chaos: minChaos, thin: false } : null
}

// The net's rules (0-2): currency-like bases (cards, scarabs... never
// unique), and unique bases with `Rarity Unique` so a valuable unique's base
// doesn't light up every white and rare copy.
export function safetyBlocks (bases: NetList): FilterBlock[] {
  const out: FilterBlock[] = []
  if (bases.plain.length) {
    out.push(block('items', [
      { key: 'BaseType', op: '==', count: null, values: bases.plain }
    ]))
  }
  if (bases.unique.length) {
    out.push(block('uniques', [
      { key: 'Rarity', op: '==', count: null, values: ['Unique'] },
      { key: 'BaseType', op: '==', count: null, values: bases.unique }
    ]))
  }
  for (const [size, list] of Object.entries(bases.stacks ?? {})) {
    if (!list.length) continue
    out.push(block(`stacks${size}`, [
      { key: 'StackSize', op: '>=', count: null, values: [size] },
      { key: 'BaseType', op: '==', count: null, values: list }
    ]))
  }
  return out
}
