// The price check's "Base" step, the part the strip needs up front: which items
// get it, and whether it's still in effect. The step itself is base-preset.ts,
// loaded on the first click.
import { ItemCategory, ItemRarity, type ParsedItem } from '@/parser'
import type { FilterOrGroup, ItemFilters } from '@/web/price-check/filters/interfaces'

const BASE_CATEGORIES = new Set<ItemCategory>([
  ItemCategory.Helmet, ItemCategory.BodyArmour, ItemCategory.Gloves, ItemCategory.Boots,
  ItemCategory.Shield, ItemCategory.Quiver, ItemCategory.Amulet, ItemCategory.Ring, ItemCategory.Belt,
  ItemCategory.AbyssJewel,
  ItemCategory.Claw, ItemCategory.Bow, ItemCategory.Sceptre, ItemCategory.Wand, ItemCategory.FishingRod,
  ItemCategory.Staff, ItemCategory.Warstaff, ItemCategory.Dagger, ItemCategory.RuneDagger,
  ItemCategory.OneHandedAxe, ItemCategory.TwoHandedAxe, ItemCategory.OneHandedMace, ItemCategory.TwoHandedMace,
  ItemCategory.OneHandedSword, ItemCategory.TwoHandedSword
])

/** Gear that isn't unique: the items a base price means something for. */
export function canUseBasePreset (item: ParsedItem): boolean {
  return item.rarity !== ItemRarity.Unique &&
    !item.isUnidentified &&
    item.category != null && BASE_CATEGORIES.has(item.category)
}

/** What the Base step changes, to tell when a later edit undid it. */
export function baseSignature (filters: ItemFilters, stats: FilterOrGroup[]): string {
  return JSON.stringify([{ ...filters, trade: undefined }, stats.flatMap(s => s.group ? [s.meta, ...s.stats] : [s]).map(f => [f.disabled, f.roll?.min, f.roll?.max])])
}
