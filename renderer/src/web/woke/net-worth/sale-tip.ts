// A sold item's tooltip: gear with its own mods, the way a trade listing's is
// drawn (the history sends the same item data); gems, currency and cards by
// name. Nothing is fetched for it. One v-item-tip owns the hover either way.
import { listingTipItem } from '../price-insight/listing-tip'
import type { ListingItem } from '../price-insight/listing-tip'
import type { PobItem } from '../pob-builds/widget'
import type { ItemTipRef } from '../ui/tooltip/item-tip'
import type { Sale } from './sales'

const items = new WeakMap<Sale, PobItem | null>()

export function saleItem (s: Sale): PobItem | null {
  if (!s.tip) return null
  if (!items.has(s)) {
    let item: PobItem | null = null
    try { item = listingTipItem(s.tip as ListingItem) } catch { item = null }
    items.set(s, item)
  }
  return items.get(s)!
}

export function saleTip (s: Sale): ItemTipRef {
  const name = s.name || s.typeLine
  const item = saleItem(s)
  if (item) return { name, content: { kind: 'item', item } }
  const gem = s.frameType === 4 ? { fallback: { kind: 'gem' as const, name: s.typeLine, level: s.gemLevel ?? null, quality: s.quality ?? null } } : {}
  return { name, ...(s.name ? { type: s.typeLine } : {}), count: s.stack, ...gem }
}
