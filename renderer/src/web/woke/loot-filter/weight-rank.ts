// A base's rank in Rare weights, as the Alt+F card reads and changes it.
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import type { ItemFacts } from './item-facts'
import { RANK_KEYS, filterBases } from './weights'
import type { BaseRow, RankKey, WeightItem } from './weights'
import { pastedRare } from './weight-samples'

// The item as the weights see it, or null when they don't decide it.
export function weightRow (store: LootFilterStore, config: LootFilterWidget, facts: ItemFacts): { row: BaseRow, it: WeightItem } | null {
  const w = config.presets.weights
  if (!w.on || (facts.rarity === 'Rare' && facts.identified) || (facts.itemLevel ?? 0) < 68) return null
  const bases = store.weightBases.value.length ? store.weightBases.value : (store.doc.value ? filterBases(store.doc.value, w.ranks) : [])
  return pastedRare(facts, bases)
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
