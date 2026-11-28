// The filter the editor writes: NeverSink's text with everything applied, in
// order: build rules, the presets' own rules, your rules, price moves, your
// edits, the presets' changes to NeverSink's rules, then the safety net.
// Pure, so the tests run the same path the save does (store.ts compose).
import { applyFlasks } from './flask-weights'
import { parseFilterCopy } from './parse'
import type { FilterDoc } from './parse'
import { ownBaseText } from './own-base'
import { gameNameCheck, nameCheck, ruleBlocks } from './rules'
import type { OwnRule } from './rules'
import { applyPresetChanges, colourBlindActions, presetBlocks, scaleVolume } from './presets'
import { levellingOnly, lootPresets, migratedPresets } from './loot-presets'
import type { Presets, UniqueBreakdown } from './presets'
import { applyEdits } from './edits'
import { applyGear } from './gear'
import type { EditStatus, FilterEdit } from './edits'
import { buildRuleBlocks, insertBuildBlocks } from './build-rules'
import type { BuildRuleInput, BuildRuleSwitches } from './build-rules'
import { NET_GROUPS, applyPriceMoves, movesOutOfPlace } from './economy'
import type { EconomyGroup, PriceLookup, PriceMove } from './economy'
import { SAFETY_RULE_TYPE, auditBases, lastLookup, netFromAudit, safetyBlocks, stackNet, valuableFromAudit, withLast } from './safety'
import type { BaseVerdict, NetList, SafetyNet } from './safety'
import { applyLook } from './look'
import { gemBaseName, renameBases } from './gem-bases'
import { CLUSTER_PRICE_TYPE, applyClusterPrices } from './cluster-prices'
import type { ClusterPrice } from './cluster-prices'
import type { BaseRename } from './gem-bases'
import { applyWeights, filterBases } from './weights'
import { applyCurrency, recipeStep, scaled } from './currency-weights'
import { levellingGearBlocks, questlikeBlocks, retireNeverSinkLevelling } from './levelling-gear'
import { applyMapFloor, applyMapLooks } from './map-floor'
import type { CardFacts } from './card-classes'
import type { GemLine } from './gem-classes'
import type { OwnTables } from './own-lists'
import type { CurrencyItem } from './currency-weights'
import type { BaseRow } from './weights'

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
    // The Loot tab's lookup (always a base's best unique); lookup when unset.
    loot?: PriceLookup | null
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
  // poe.ninja's cluster jewel prices for this league, or null.
  clusterPrices?: ClusterPrice[] | null
  // Names the game's filter can't take and what to write instead; the game
  // data's transfigured gems unless given (tests).
  renameBase?: BaseRename
  // Divination cards' set sizes and reward folds, once read (card-facts.ts).
  cards?: CardFacts | null
  // poe.ninja's gem lines, each a band (gem-classes.ts).
  gems?: readonly GemLine[] | null
  // The Loot tab's own item lists and guesses (own-lists.ts), once read.
  own?: OwnTables | null
  // Write onto our own skeleton (own-base.ts) instead of NeverSink's file,
  // at the strictness NeverSink's file has (NeverSink retirement M3).
  ownBase?: boolean
}

export interface Composed {
  doc: FilterDoc
  results: Map<number, EditStatus>
  buildCount: number
  netCount: number
  // Of netCount, the bases caught only as small stacks (Prices lists items, not these).
  netStackCount: number
  netList: string
  netFresh: NetList | null
  movesFit: number
  outOfPlace: PriceMove[]
  presetChanges: number
  presetSig: string
  // Rules the Gear page wrote, and NeverSink rules it replaced.
  gearBlocks: number
  gearReplaced: number
  // What the cluster price rules name after following prices ('' when untouched).
  clusterSig: string
  // Rules the rare weights wrote (0 when off), and about how many characters.
  weightRules: number
  weightChars: number
  // The bases the weights were written from (empty when off).
  weightBases: BaseRow[]
  // Rules the currency weights wrote (0 when off), about how many
  // characters, and the items they priced.
  currencyRules: number
  currencyChars: number
  currencyItems: CurrencyItem[]
}

// One name the game doesn't know in a BaseType list and it refuses the whole
// filter (Guy 2026-11-28: "Vaal Absolution (Absolution of ..." from a price
// list). The rules woke writes keep only names the game data knows (or our
// own item lists, from the same data), not ones only NeverSink's file names;
// a rule left with an empty list is written commented out.
export function dropUnknownBases (doc: FilterDoc, own?: OwnTables | null): number {
  const known = gameNameCheck(own?.lists)
  let dropped = 0
  for (const b of doc.blocks) {
    if (!b.type?.startsWith('woke->') || b.disabled) continue
    for (const c of b.conditions) {
      if (c.key !== 'BaseType') continue
      const keep = c.values.filter(v => known('BaseType', v))
      if (keep.length === c.values.length) continue
      dropped += c.values.length - keep.length
      c.values = keep
      b.dirty = true
      if (!keep.length) b.disabled = true
    }
  }
  return dropped
}

export function composeFilter (text: string, cfg: ComposeInput): Composed {
  const next = parseFilterCopy(cfg.ownBase ? ownBaseText(/^#\s*TYPE:\s*(\S+)/m.exec(text.slice(0, 4000))?.[1] ?? null) : text)
  // The Loot tab's first-time carry-over, even before the tab is opened.
  const migrated = migratedPresets(cfg.presets)
  // Rare weights (beta) first, so everything below goes on top of them.
  const weightBases = cfg.presets.weights.on ? filterBases(next, cfg.presets.weights.ranks) : []
  const weights = applyWeights(next, cfg.presets.weights, weightBases)
  // Utility flasks score on the same line (Equipment › Flasks).
  applyFlasks(next, cfg.presets.weights)
  // Currency weights (beta) the same way: above everything NeverSink has.
  const currency = applyCurrency(next, migrated.currency, cfg.prices.loot ?? cfg.prices.lookup, cfg.cards, cfg.gems, cfg.own, cfg.clusterPrices)
  // Maps under the Loot tab's tier slider hide.
  applyMapFloor(next, migrated.currency)
  applyMapLooks(next, migrated.currency)
  const input = cfg.build
  // Gear while levelling (Loot › Levelling): over NeverSink's levelling
  // gear, under the build rules, presets and your own rules.
  if (currency) {
    retireNeverSinkLevelling(next, migrated.currency)
    insertBuildBlocks(next, [...questlikeBlocks(), ...levellingGearBlocks(migrated.currency, cfg.presets.weapons, input ? { weaponClasses: input.weaponClasses, rareBases: input.rareBases } : null)])
  }
  // Build rules go in first, so edits to them (restyles) apply on top.
  let buildCount = 0
  if (input) {
    const blocks = buildRuleBlocks(input, cfg.buildRules)
    insertBuildBlocks(next, blocks)
    buildCount = blocks.length
  }
  // Presets the Loot tab covers leave maps to it (lootPresets).
  const presets = lootPresets(migrated, currency != null, recipeStep(scaled(migrated.currency, next.strictness), 'rgb', cfg.prices.loot ?? cfg.prices.lookup))
  // Presets' rules, then your own rules above them: yours win.
  const presetTop = presetBlocks(next, presets, cfg.prices.lookup, cfg.dustList, {
    breakdown: cfg.presets.cheapUniques.on ? cfg.prices.breakdown : null,
    build: input ? { uniqueBases: input.uniqueBases, weaponClasses: input.weaponClasses } : null
  })
  insertBuildBlocks(next, presetTop)
  insertBuildBlocks(next, ruleBlocks(cfg.rules, nameCheck(next)))
  // Price moves next: your own moves (edits) are applied after them and win.
  let movesFit = 0
  let outOfPlace: PriceMove[] = []
  if (cfg.moves.length) {
    outOfPlace = movesOutOfPlace(next, cfg.moves)
    movesFit = applyPriceMoves(next, cfg.moves)
  }
  // Cluster jewel price rules from poe.ninja, before your edits so they win.
  let clusterSig = ''
  if (cfg.clusterPrices?.length && applyClusterPrices(next, cfg.clusterPrices, cfg.presets.clusterPrices)) {
    clusterSig = JSON.stringify(next.blocks.filter(b => b.type === CLUSTER_PRICE_TYPE).map(b => [b.tier, b.disabled, b.conditions.find(c => c.key === 'EnchantmentPassiveNode')?.values ?? []]))
  }
  const isNetEdit = (e: FilterEdit) => e.type === SAFETY_RULE_TYPE
  const results = new Map(applyEdits(next, cfg.edits.filter(e => !isNetEdit(e))).map(r => [r.edit.id, r]))
  // The Gear page's table takes over NeverSink's tiered gear rules, with
  // their looks as you left them; the presets below then treat it as theirs.
  const gear = applyGear(next, cfg.presets.gear, input?.rareBases ?? [])
  // Quiet mode, bigger labels, colour-blind colours: over NeverSink's rules
  // as you left them.
  const presetChanges = applyPresetChanges(next, presets)
  if (currency) levellingOnly(next)
  // Before the net reads what the rules hide: as the game will read them.
  const renameBase = cfg.renameBase ?? gemBaseName
  renameBases(next, renameBase)
  // The safety net goes on top, listing only what the rest still hides.
  // Restyles of the net apply after it exists.
  let netCount = 0
  let netStackCount = 0
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
    netStackCount = Object.values(bases.stacks ?? {}).reduce((n, l) => n + l.length, 0)
    netCount = bases.plain.length + bases.unique.length + netStackCount
    if (lookup || netCount) netList = JSON.stringify(bases)
  }
  // A net rule shows up only while the net lists something for it (none on a
  // new league's first day): a change to it waits for the rule, it isn't broken.
  for (const r of applyEdits(next, cfg.edits.filter(isNetEdit))) {
    const tier = 'tier' in r.edit ? r.edit.tier : undefined
    const waiting = !r.ok && cfg.safetyNet.on && typeof tier === 'string' && NET_TIER.test(tier) && !next.blocks.some(b => b.type === SAFETY_RULE_TYPE && b.tier === tier)
    results.set(r.edit.id, waiting ? { ...r, ok: true, blocks: 0, message: 'Waits until the safety net lists something for this rule.' } : r)
  }
  // The look strip last, over every rule the net included. Bigger labels
  // stays the floor for NeverSink's shown rules, as it was set.
  const bigger = cfg.presets.bigger
  applyLook(next, cfg.presets.look, b => bigger.on && b.visibility !== 'Hide' && !b.type?.startsWith('woke->') ? bigger.size : null)
  // Again over the net's and restyled rules: one transfigured gem name in a
  // BaseType list and the game refuses to load the whole filter.
  renameBases(next, renameBase)
  dropUnknownBases(next, cfg.own)
  return { doc: next, results, buildCount, netCount, netStackCount, netList, netFresh, movesFit, outOfPlace, presetChanges, presetSig: JSON.stringify(presetTop.map(b => b.conditions)), gearBlocks: gear.blocks, gearReplaced: gear.replaced, clusterSig, weightRules: weights?.blocks.length ?? 0, weightChars: weights?.chars ?? 0, weightBases, currencyRules: currency?.blocks.length ?? 0, currencyChars: currency?.chars ?? 0, currencyItems: currency?.items ?? [] }
}
