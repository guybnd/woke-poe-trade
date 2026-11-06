// A build's item, or a trade listing drawn as one, for the right-click item menu.
import { AppConfig } from '@/web/Config'
import { parseClipboard } from '@/parser'
import type { ItemMenuRef } from '../ui/tooltip/item-menu'
import { pobItemText } from './item-text'
import type { PobItem } from './widget'

// The game text the price check reads, when the price check can read it: PoB
// writes items in English, which only the English item data can read, and it
// knows old uniques the item data doesn't.
export function pobCheckText (it: PobItem): string | null {
  if (AppConfig().language !== 'en') return null
  const text = pobItemText(it)
  return parseClipboard(text).isOk() ? text : null
}

export function pobMenuRef (it: PobItem | null | undefined, text?: string | null): ItemMenuRef | null {
  if (!it?.name) return null
  const unique = it.rarity === 'UNIQUE' || it.rarity === 'RELIC'
  const rarity = unique ? 'unique' : it.rarity === 'RARE' ? 'rare' : it.rarity === 'MAGIC' ? 'magic' : 'normal'
  return {
    name: it.name,
    rarity,
    // A rare's name is its own; trade and the wiki go by its base.
    base: unique || !it.base ? undefined : it.base,
    text: (text === undefined ? pobCheckText(it) : text) ?? undefined
  }
}
