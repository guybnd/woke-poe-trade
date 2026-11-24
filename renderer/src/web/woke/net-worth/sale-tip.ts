// A sold item's tooltip: gear with its own mods, the way a trade listing's is
// drawn (the history sends the same item data); gems, currency and cards by
// name. Nothing is fetched for it. One v-item-tip owns the hover either way.
import { listingTipItem, modDomain, modText } from '../price-insight/listing-tip'
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
    if (item?.vestigial) item.implicitKinds = vestigialKinds(s.tip as ListingItem)
    items.set(s, item)
  }
  return items.get(s)!
}

// A Vestigial unique's inherited implicit, light purple in the tooltip. A trade
// listing's tooltip reads it from the listing; a sale has only the item. Kept
// here, out of the startup code.
export function vestigialKinds (item: ListingItem): Array<'' | 'vestigial'> {
  // Same order as listingTipItem's implicits.
  const of = (domain: string) => (item.explicitMods ?? []).filter(m => modDomain(m) === domain)
  const implicits = [...(item.enchantMods ?? []), ...of('enchant'), ...(item.implicitMods ?? []), ...of('implicit')]
  return implicits.filter(m => modText(m)).map(m => typeof m !== 'string' && m.flags?.vestigial ? 'vestigial' : '')
}

export function saleTip (s: Sale): ItemTipRef {
  const name = s.name || s.typeLine
  const item = saleItem(s)
  if (item) return { name, content: { kind: 'item', item } }
  const gem = s.frameType === 4 ? { fallback: { kind: 'gem' as const, name: s.typeLine, level: s.gemLevel ?? null, quality: s.quality ?? null } } : {}
  // Gear read before its mods were kept: a rare's own name ("Doom Loop") finds
  // nothing, so its base's tooltip.
  if (s.frameType <= 2 && s.name) return { name: s.typeLine, count: s.stack }
  // A unique is found by its name. Its base isn't a poe.ninja type: passed as
  // one, the lookup came back empty and the row had no tooltip.
  const unique = s.frameType === 3 || s.frameType === 9 || s.frameType === 10
  return { name, ...(s.name && !unique ? { type: s.typeLine } : {}), count: s.stack, ...gem }
}

// saleTip as a Ctrl+Space card or row takes it (no count or gem fallback).
export function saleLookupTip (s: Sale): { name: string, type?: string, content?: ItemTipRef['content'] } {
  const tip = saleTip(s)
  return { name: tip.name, ...(tip.type ? { type: tip.type } : {}), ...(tip.content ? { content: tip.content } : {}) }
}
