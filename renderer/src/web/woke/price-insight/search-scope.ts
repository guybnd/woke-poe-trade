// Whether a search can price this rare at all. A rare's value is in its mods,
// so listings found without them say nothing about it. Pure functions.

import { ItemRarity, ParsedItem } from '@/parser'
import type { FilterOrGroup, ItemFilters, CorruptedSearch } from '@/web/price-check/filters/interfaces'
import { isTopTierFilter } from '@/web/price-check/filters/create-stat-filters'

const GOOD_ROLL = 0.5
const BASE_PERCENTILE = 'Base Percentile: #%'

/** A rare with mods to tick, searched with only its name or category: any rare would match. */
export function isBlankRareSearch (item: ParsedItem, filters: ItemFilters, stats: FilterOrGroup[]): boolean {
  if (item.rarity !== ItemRarity.Rare || item.isUnidentified) return false
  // Beasts, invitations and the like are priced by name: they have nothing to tick.
  if (!stats.some(s => s.group || !s.hidden)) return false
  if (stats.some(s => s.group ? !s.meta.disabled : !s.disabled)) return false
  // These narrow a search as much as a mod does, as when pricing a crafting base.
  return !(
    filters.mapTier != null ||
    filters.areaLevel != null ||
    filters.sentinelCharge != null ||
    (filters.itemLevel && !filters.itemLevel.disabled) ||
    (filters.linkedSockets && !filters.linkedSockets.disabled) ||
    (filters.quality && !filters.quality.disabled) ||
    (filters.veiled && !filters.veiled.disabled) ||
    filters.influences?.some(i => !i.disabled)
  )
}

/**
 * Whether poe.ninja's price covers what this search looks for. Its unique
 * prices are for any roll, uncorrupted and without a Foulborn mod.
 */
export function ninjaFitsSearch (item: ParsedItem, stats: FilterOrGroup[], corrupted?: CorruptedSearch): boolean {
  if (item.rarity !== ItemRarity.Unique) return true
  if (item.isFoulborn || corrupted === 'corrupted') return false
  if (item.isCorrupted && corrupted !== 'not-corrupted') return false
  return !stats.some(s => {
    if (s.group || s.disabled || s.hidden || s.statRef === BASE_PERCENTILE) return false
    const { roll } = s
    if (!roll?.bounds) return false
    const span = roll.bounds.max - roll.bounds.min
    if (!(span > 0)) return false
    // The top half of the range: below that, the going rate still applies.
    return (typeof roll.min === 'number' && (roll.min - roll.bounds.min) / span > GOOD_ROLL) ||
      (typeof roll.max === 'number' && (roll.bounds.max - roll.max) / span > GOOD_ROLL)
  })
}

/** A rare searched without one of its T1 or T2 mods: too low a bar to call it worthless. */
export function skipsTopMods (item: ParsedItem, stats: FilterOrGroup[]): boolean {
  if (item.rarity !== ItemRarity.Rare || item.isVeiled) return false
  return stats.some(s => !s.group && s.disabled && !s.hidden && isTopTierFilter(s, item))
}
