// The filter the editor writes: NeverSink's text with everything applied, in
// order: build rules, the presets' own rules, your rules, price moves, your
// edits, the presets' changes to NeverSink's rules, then the safety net.
// Pure, so the tests run the same path the save does (store.ts compose).
import { parseFilter } from './parse'
import type { FilterDoc } from './parse'
import { ruleBlocks } from './rules'
import type { OwnRule } from './rules'
import { applyPresetChanges, colourBlindActions, presetBlocks, scaleVolume } from './presets'
import type { Presets, UniqueBreakdown } from './presets'
import { applyEdits } from './edits'
import type { EditStatus, FilterEdit } from './edits'
import { buildRuleBlocks, insertBuildBlocks } from './build-rules'
import type { BuildRuleInput, BuildRuleSwitches } from './build-rules'
import { NET_GROUPS, applyPriceMoves, movesOutOfPlace } from './economy'
import type { EconomyGroup, PriceLookup, PriceMove } from './economy'
import { SAFETY_RULE_TYPE, auditBases, lastLookup, netFromAudit, safetyBlocks, stackNet, valuableFromAudit, withLast } from './safety'
import type { BaseVerdict, NetList, SafetyNet } from './safety'

// The safety net's rule names (safetyBlocks): items, uniques, stacks20...
const NET_TIER = /^(items|uniques|stacks\d+)$/

export interface ComposeInput {
  presets: Presets
  rules: OwnRule[]
  edits: FilterEdit[]
  buildRules: BuildRuleSwitches
  build: BuildRuleInput | null
  // Price moves in effect (price tiers on, this league's).
  moves: PriceMove[]
  safetyNet: SafetyNet
  prices: {
    lookup: PriceLookup | null
    // The safety net's own lookup (never the "cheapest unique" setting).
    safety: PriceLookup | null
    breakdown: UniqueBreakdown | null
    // Types the price snapshot has at all.
    pricedTypes?: Set<string> | null
  }
  // Bases for the dust preset's price rule, or null.
  dustList: string[] | null
  // What you held back from the net: "Not for me", or moved down yourself.
  heldBack: (v: BaseVerdict) => boolean
  stackHeld: (group: EconomyGroup, base: string) => boolean
}

export interface Composed {
  doc: FilterDoc
  results: Map<number, EditStatus>
  buildCount: number
  netCount: number
  netList: string
  netFresh: NetList | null
  movesFit: number
  outOfPlace: PriceMove[]
  presetChanges: number
  presetSig: string
}

export function composeFilter (text: string, cfg: ComposeInput): Composed {
  const next = parseFilter(text)
  // Build rules go in first, so edits to them (restyles) apply on top.
  const input = cfg.build
  let buildCount = 0
  if (input) {
    const blocks = buildRuleBlocks(input, cfg.buildRules)
    insertBuildBlocks(next, blocks)
    buildCount = blocks.length
  }
  // Presets' rules, then your own rules above them: yours win.
  const presetTop = presetBlocks(next, cfg.presets, cfg.prices.lookup, cfg.dustList, {
    breakdown: cfg.presets.cheapUniques.on ? cfg.prices.breakdown : null,
    build: input ? { uniqueBases: input.uniqueBases, weaponClasses: input.weaponClasses } : null
  })
  insertBuildBlocks(next, presetTop)
  insertBuildBlocks(next, ruleBlocks(cfg.rules))
  // Price moves next: your own moves (edits) are applied after them and win.
  let movesFit = 0
  let outOfPlace: PriceMove[] = []
  if (cfg.moves.length) {
    outOfPlace = movesOutOfPlace(next, cfg.moves)
    movesFit = applyPriceMoves(next, cfg.moves)
  }
  const isNetEdit = (e: FilterEdit) => e.type === SAFETY_RULE_TYPE
  const results = new Map(applyEdits(next, cfg.edits.filter(e => !isNetEdit(e))).map(r => [r.edit.id, r]))
  // Quiet mode, bigger labels, colour-blind colours: over NeverSink's rules
  // as you left them.
  const presetChanges = applyPresetChanges(next, cfg.presets)
  // The safety net goes on top, listing only what the rest still hides.
  // Restyles of the net apply after it exists.
  let netCount = 0
  let netList = ''
  let netFresh: NetList | null = null
  if (cfg.safetyNet.on) {
    // woke: no prices (a new league, a fresh install) must not take the net
    // out of the file: the last list stays until there are prices again.
    const lookup = cfg.prices.safety
    const line = cfg.safetyNet.minChaos
    const types = cfg.prices.pricedTypes
    const known = lookup
      ? (types ? withLast(lookup, cfg.safetyNet.last, line, t => types.has(t)) : lookup)
      : lastLookup(cfg.safetyNet.last, line)
    const verdicts = auditBases(next, known, line)
    const bases = netFromAudit(verdicts, v => cfg.heldBack(v))
    const last = cfg.safetyNet.last
    if (lookup) {
      const stacks = stackNet(next, lookup, line, cfg.stackHeld)
      if (Object.keys(stacks).length) bases.stacks = stacks
    } else if (last?.stacks && !(last.line != null && line > last.line)) {
      // Only names this filter lists, as with the rest of the list, and not
      // what you held back since. A line raised since can't rely on them.
      const listed = new Set(next.blocks.flatMap(b => b.conditions.flatMap(c => c.key === 'BaseType' ? c.values : [])))
      const held = (base: string) => NET_GROUPS.some(g => !g.unique && cfg.stackHeld(g, base))
      const kept = Object.entries(last.stacks).map(([size, list]) => [size, list.filter(b => listed.has(b) && !held(b))] as const).filter(([, list]) => list.length)
      if (kept.length) bases.stacks = Object.fromEntries(kept)
    }
    const netBlocks = safetyBlocks(bases)
    if (cfg.presets.colourBlind.on) netBlocks.forEach(colourBlindActions)
    // The drop sound volume preset reaches the net's sound too.
    const volume = cfg.presets.volume
    if (volume.on && volume.percent < 100) netBlocks.forEach(b => scaleVolume(b, volume.percent))
    insertBuildBlocks(next, netBlocks)
    if (lookup) netFresh = { ...valuableFromAudit(verdicts), line, ...(bases.stacks ? { stacks: bases.stacks } : {}) }
    netCount = bases.plain.length + bases.unique.length + Object.values(bases.stacks ?? {}).reduce((n, l) => n + l.length, 0)
    if (lookup || netCount) netList = JSON.stringify(bases)
  }
  // A net rule shows up only while the net lists something for it (none on a
  // new league's first day): a change to it waits for the rule, it isn't broken.
  for (const r of applyEdits(next, cfg.edits.filter(isNetEdit))) {
    const tier = 'tier' in r.edit ? r.edit.tier : undefined
    const waiting = !r.ok && typeof tier === 'string' && NET_TIER.test(tier) && !next.blocks.some(b => b.type === SAFETY_RULE_TYPE && b.tier === tier)
    results.set(r.edit.id, waiting ? { ...r, ok: true, blocks: 0, message: 'Waits until the safety net lists something for this rule.' } : r)
  }
  return { doc: next, results, buildCount, netCount, netList, netFresh, movesFit, outOfPlace, presetChanges, presetSig: JSON.stringify(presetTop.map(b => b.conditions)) }
}
