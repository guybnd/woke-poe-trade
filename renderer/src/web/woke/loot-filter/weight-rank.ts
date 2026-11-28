// A base's rank in Rare weights, as the Alt+F card reads and changes it.
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import type { ItemFacts } from './item-facts'
import { RANK_KEYS, baseRanks, filterBases, idMarked } from './weights'
import type { FilterDoc } from './parse'
import type { BaseRow, RankKey, WeightItem } from './weights'
import { pastedRare } from './weight-samples'

// The item as the weights see it, or null when they don't decide it.
export function weightRow (store: LootFilterStore, config: LootFilterWidget, facts: ItemFacts): { row: BaseRow, it: WeightItem } | null {
  const w = config.presets.weights
  if (!w.on || (facts.itemLevel ?? 0) < 68) return null
  const bases = store.weightBases.value.length ? store.weightBases.value : (store.doc.value ? filterBases(store.doc.value, w.ranks) : [])
  const got = pastedRare(facts, bases)
  // An identified rare scores by its mods, unless a mark that counts
  // (6-link, influence...) scores it like an unidentified one.
  if (got && facts.rarity === 'Rare' && facts.identified && !idMarked(got.it, w.mult)) return null
  return got
}

// One rank list (Guy's pick, 2026-11-28): a move on Loot filter › Base ranks
// sets the base's rank on Equipment › Rare gear too. Exotic bases keep
// theirs (Base ranks' Exotic lane is NeverSink's own rules), and Never only
// hides on the Drop tiers table.
export function moveWeightRanks (store: LootFilterStore, config: LootFilterWidget, bases: readonly string[], lane: string) {
  const to = lane === 'none' ? 'r0' : lane
  const doc = store.doc.value
  if (!doc || !(['r1', 'r2', 'r3', 'r0'] as string[]).includes(to)) return
  const filter = new Map(filterBases(doc).map(r => [r.name, r.rank]))
  const moved = bases.filter(b => { const was = filter.get(b); return was && was !== 'x1' && was !== 'x2' })
  const rest = Object.entries(config.presets.weights.ranks).filter(([n]) => !moved.includes(n))
  config.presets.weights.ranks = Object.fromEntries([...rest, ...moved.filter(b => filter.get(b) !== to).map(b => [b, to as RankKey])])
}

// Your rank for this base (back to the filter's when it's the same).
export function setWeightRank (config: LootFilterWidget, row: BaseRow, to: RankKey) {
  const w = config.presets.weights
  const orig = row.was ?? row.rank
  const rest = Object.fromEntries(Object.entries(w.ranks).filter(([n]) => n !== row.name))
  w.ranks = to === orig ? rest : { ...rest, [row.name]: to }
}

export const rankStep = (r: RankKey, dir: 1 | -1): RankKey | null => RANK_KEYS[RANK_KEYS.indexOf(r) + dir] ?? null

// Valuable exotic bases (Guy, 2026-11-28): Base ranks splits its Exotic lane
// into the ones worth about a divine or more (rank x1: NeverSink's top two
// exotic tiers, which it sets from trade prices) and the rest (x2). A move
// between the two lanes is your own x1/x2 rank, so Rare gear's score and
// the exotic text colour follow it.
export type ExoticLane = 'exotichi' | 'exotic'
export const isExoticLane = (lane: string): lane is ExoticLane => lane === 'exotichi' || lane === 'exotic'

export function valuableExotics (doc: FilterDoc, own: Record<string, RankKey>, exotics: Iterable<string>): Set<string> {
  const top = new Set(baseRanks().x1)
  return new Set([...exotics].filter(b => (own[b] ?? (top.has(b) ? 'x1' : 'x2')) === 'x1'))
}

export function moveExotics (store: LootFilterStore, config: LootFilterWidget, bases: readonly string[], lane: ExoticLane) {
  const doc = store.doc.value
  if (!doc) return
  const top = new Set(baseRanks().x1)
  const to: RankKey = lane === 'exotichi' ? 'x1' : 'x2'
  const w = config.presets.weights
  const rest = Object.entries(w.ranks).filter(([n]) => !bases.includes(n))
  w.ranks = Object.fromEntries([...rest, ...bases.filter(b => (top.has(b) ? 'x1' : 'x2') !== to).map(b => [b, to])])
}
