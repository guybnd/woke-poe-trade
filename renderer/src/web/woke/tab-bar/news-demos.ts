// What's new lines with nothing to open on a tab (the price check, Search):
// Show me runs a sample instead, then flashes the feature in it
// (goto-flash.ts). Read only by the dock's card, so not at startup.
import type { ItemMenuRef } from '../ui/tooltip/item-menu-logic'

export type NewsDemo =
  // A price check of this item (one trade search, as a check is), and the
  // spot in it, data-goto-spot on the element.
  | { check: ItemMenuRef, spot: string }
  // Ctrl+Space with this typed.
  | { search: string }

export const NEWS_DEMOS: Record<string, NewsDemo> = {
  'price-check-seller-spread': { check: { name: 'Exalted Orb' }, spot: 'seller-spread' },
  'div-card-map-chance': { search: 'Strand Map' }
}
