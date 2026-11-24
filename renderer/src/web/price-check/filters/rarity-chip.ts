// woke: the rarity chip on non-unique gear (RarityChip.vue, loaded on demand): search any non-unique, magic only
// (bases to craft or recombine) or rare only.
import type { FilterOrGroup, ItemFilters, StatFilter } from './interfaces'

type ParsedModifier = StatFilter['sources'][number]['modifier']

export type RarityStep = 'nonunique' | 'magic' | 'rare'

export const RARITY_STEPS: Array<{ value: RarityStep, label: string, what: string }> = [
  { value: 'nonunique', label: 'Any', what: 'any non-unique item' },
  { value: 'magic', label: 'Magic', what: 'magic items only' },
  { value: 'rare', label: 'Rare', what: 'rare items only' }
]

// What the search sends: a turned-off filter is any non-unique.
export function rarityStep (rarity: NonNullable<ItemFilters['rarity']>): RarityStep {
  if (rarity.disabled) return 'nonunique'
  return (rarity.value === 'magic' || rarity.value === 'rare') ? rarity.value : 'nonunique'
}

export function nextRarity (rarity: NonNullable<ItemFilters['rarity']>) {
  const at = RARITY_STEPS.findIndex(step => step.value === rarityStep(rarity))
  rarity.value = RARITY_STEPS[(at + 1) % RARITY_STEPS.length].value
  rarity.disabled = false
}

// A magic item holds one prefix and one suffix. Counts the ticked rows that
// come from one known mod each (a hybrid mod's two rows count once); totals
// summed from several mods can't be told apart, so they don't count.
export function magicAffixClash (stats: FilterOrGroup[] | undefined): string | null {
  if (!stats) return null
  const prefixes = new Set<ParsedModifier>()
  const suffixes = new Set<ParsedModifier>()
  for (const filter of stats) {
    if (filter.group || filter.disabled || filter.not || filter.hidden) continue
    if (filter.sources.length !== 1) continue
    const mod = filter.sources[0].modifier
    if (mod.info.generation === 'prefix') prefixes.add(mod)
    else if (mod.info.generation === 'suffix') suffixes.add(mod)
  }
  const over: string[] = []
  if (prefixes.size > 1) over.push(`${prefixes.size} prefixes`)
  if (suffixes.size > 1) over.push(`${suffixes.size} suffixes`)
  if (!over.length) return null
  return `Magic items have one prefix and one suffix, but ${over.join(' and ')} are ticked, so few or no magic items will match.`
}
