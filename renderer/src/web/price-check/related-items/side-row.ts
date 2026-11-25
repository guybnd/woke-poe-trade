// A row of the price check's side window, whatever its section (the item's
// family, its drop group, what it drops). Every row opens its price check the
// same way: through item-price-check, with the row's own data item.
import type { BaseType } from '@/assets/data'
import type { CurrencyValue } from '@/web/background/Prices'
import type { ItemMenuRef } from '@/web/woke/ui/tooltip/item-menu-logic'
import type { ItemTipRef } from '@/web/woke/ui/tooltip/item-tip'
import { canPriceCheck } from '@/web/woke/ui/tooltip/item-price-check'

export interface SideRow {
  // Unique within its section: a unique can be listed once per base or variant.
  key: string
  name: string
  icon: string
  price?: CurrencyValue
  highlight: boolean
  ref: ItemMenuRef
  info: BaseType
  clickable: boolean
  // woke: a recipe part's count, and the caption above a recipe's result row.
  qty?: number
  lead?: string
  // How many of the checked item a card's full stack gives: "→ 2".
  gives?: number
  // Said after the name ("corrupted" on a card's reward).
  tag?: string
  // The tag is a plain note, not a warning (red is for "corrupted").
  ownTag?: boolean
  // woke: a second name after the item's, with its own tooltip (the keystone
  // an Abyss conquest jewel gives).
  sub?: { text: string, tip: ItemTipRef | null }
}

const KIND_OF_NS: Partial<Record<BaseType['namespace'], Partial<ItemMenuRef>>> = {
  UNIQUE: { rarity: 'unique' },
  DIVINATION_CARD: { type: 'DivinationCard' },
  GEM: { type: 'SkillGem' },
  CAPTURED_BEAST: { type: 'Beast' }
}

export function sideRow (info: BaseType, price: CurrencyValue | undefined, highlight: boolean, key: string): SideRow {
  const ref: ItemMenuRef = { name: info.refName, ...KIND_OF_NS[info.namespace] }
  return { key, name: info.name, icon: info.icon, price, highlight, ref, info, clickable: canPriceCheck(ref, info) }
}
