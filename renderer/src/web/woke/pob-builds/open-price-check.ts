import { elementPoint, openPriceCheck as openCheck } from '../ui/tooltip/item-price-check'
import { pobItemText } from './item-text'
import type { PobItem } from './widget'

// Opens the price check on a build's item, from the control that was clicked.
export async function openPriceCheck (item: PobItem, e: MouseEvent) {
  await openCheck({ name: item.name, text: pobItemText(item) }, elementPoint(e))
}
