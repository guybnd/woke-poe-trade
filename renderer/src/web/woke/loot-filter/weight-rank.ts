// A base's rank in Rare weights, as the Alt+F card reads and changes it.
import type { LootFilterStore } from './store'
import type { LootFilterWidget } from './widget'
import type { ItemFacts } from './item-facts'
import { RANK_KEYS, filterBases, ranksWithMoves } from './weights'
import type { BaseRow, RankKey, WeightItem } from './weights'
import { pastedRare } from './weight-samples'

// The item as the weights see it, or null when they don't decide it.
export function weightRow (store: LootFilterStore, config: LootFilterWidget, facts: ItemFacts): { row: BaseRow, it: WeightItem } | null {
  const w = config.presets.weights
  if (!w.on || (facts.rarity === 'Rare' && facts.identified) || (facts.itemLevel ?? 0) < 68) return null
  const bases = store.weightBases.value.length ? store.weightBases.value : (store.doc.value ? filterBases(store.doc.value, ranksWithMoves(w.ranks, config.presets.gear.moves)) : [])
  return pastedRare(facts, bases)
}

// A move on Base ranks is the base's rank for Equipment too: it drops the
// rank Equipment had of its own (one list, Guy's pick 2026-11-28).
export function clearWeightRanks (config: LootFilterWidget, bases: readonly string[]) {
  const w = config.presets.weights
  if (bases.some(b => b in w.ranks)) w.ranks = Object.fromEntries(Object.entries(w.ranks).filter(([n]) => !bases.includes(n)))
}

// Your rank for this base (back to the filter's when it's the same).
export function setWeightRank (config: LootFilterWidget, row: BaseRow, to: RankKey) {
  const w = config.presets.weights
  const orig = row.was ?? row.rank
  const rest = Object.fromEntries(Object.entries(w.ranks).filter(([n]) => n !== row.name))
  w.ranks = to === orig ? rest : { ...rest, [row.name]: to }
}

export const rankStep = (r: RankKey, dir: 1 | -1): RankKey | null => RANK_KEYS[RANK_KEYS.indexOf(r) + dir] ?? null
