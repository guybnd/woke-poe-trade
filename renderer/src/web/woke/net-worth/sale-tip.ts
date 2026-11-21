// A sold item's tooltip: gear with its own mods, the way a trade listing's is
// drawn (the history sends the same item data); gems, currency and cards by
// name. Nothing is fetched for it.
import { listingTipItem } from '../price-insight/listing-tip'
import type { ListingItem } from '../price-insight/listing-tip'
import type { PobItem } from '../pob-builds/widget'
import { hideTip, showTip } from '../ui/tooltip/tooltip'
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

// For v-item-tip: null when the item's own tooltip is shown instead.
export function saleNameTip (s: Sale): ItemTipRef | null {
  if (saleItem(s)) return null
  const name = s.name || s.typeLine
  const gem = s.frameType === 4 ? { fallback: { kind: 'gem' as const, name: s.typeLine, level: s.gemLevel ?? null, quality: s.quality ?? null } } : {}
  return { name, ...(s.name ? { type: s.typeLine } : {}), count: s.stack, ...gem }
}

export function onSaleEnter (e: MouseEvent, s: Sale) {
  const item = saleItem(s)
  if (item) showTip(e, { kind: 'item', item })
}

export function onSaleLeave (s: Sale) {
  if (saleItem(s)) hideTip()
}
