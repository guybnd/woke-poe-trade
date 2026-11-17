// Price checking an item known only by name: one path for every place that
// does it (the item menu's Price button, the price check's side window).
import { AppConfig } from '@/web/Config'
import { infoOf, kindOf, priceCheckInput } from './item-menu-logic'
import type { ItemMenuRef, PriceCheckInput } from './item-menu-logic'

// Whether the item can be price checked by name at all.
export function canPriceCheck (ref: ItemMenuRef): boolean {
  const kind = kindOf(ref)
  return priceCheckInput(ref, kind, infoOf(ref, kind), AppConfig().language === 'en') != null
}

// What the price check reads. A unique gets its mods as stat rows, once the
// tooltip data loads.
export async function priceCheckRequest (ref: ItemMenuRef): Promise<PriceCheckInput | null> {
  const kind = kindOf(ref)
  const info = infoOf(ref, kind)
  const english = AppConfig().language === 'en'
  if (kind === 'unique' && english && info) {
    const { loadUniqueMods } = await import('./item-tip')
    const withMods = priceCheckInput(ref, kind, info, english, await loadUniqueMods(info.refName, ref.variant))
    if (withMods) return withMods
  }
  return priceCheckInput(ref, kind, info, english)
}
