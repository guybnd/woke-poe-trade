// Price checking an item known only by name: one path for every place that
// does it (the item menu's Price button, the price check's side window).
import type { BaseType } from '@/assets/data'
import { AppConfig } from '@/web/Config'
import { infoOf, kindOf, priceCheckInput } from './item-menu-logic'
import type { ItemMenuRef, PriceCheckInput } from './item-menu-logic'

// `info`: the data item when the caller already knows it (a unique on one of
// several bases); otherwise it's looked up by name.
function resolve (ref: ItemMenuRef, info?: BaseType) {
  const kind = kindOf(ref)
  return { kind, info: info ?? infoOf(ref, kind), english: AppConfig().language === 'en' }
}

// Whether the item can be price checked by name at all.
export function canPriceCheck (ref: ItemMenuRef, info?: BaseType): boolean {
  const r = resolve(ref, info)
  return priceCheckInput(ref, r.kind, r.info, r.english) != null
}

// What the price check reads. A unique gets its mods as stat rows, once the
// tooltip data loads; without them it is priced by name.
export async function priceCheckRequest (ref: ItemMenuRef, info?: BaseType): Promise<PriceCheckInput | null> {
  const r = resolve(ref, info)
  if (!ref.text && r.kind === 'unique' && r.english && r.info) {
    try {
      const { loadUniqueMods } = await import('./item-tip')
      const withMods = priceCheckInput(ref, r.kind, r.info, r.english, await loadUniqueMods(r.info.refName, ref.variant))
      if (withMods) return withMods
    } catch {}
  }
  return priceCheckInput(ref, r.kind, r.info, r.english)
}
