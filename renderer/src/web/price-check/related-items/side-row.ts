// A row of the price check's side window, whatever its section (the item's
// family, its drop group, what it drops). Every row opens its price check the
// same way: through item-price-check, with the row's own data item.
import type { BaseType } from '@/assets/data'
import type { CurrencyValue } from '@/web/background/Prices'
import type { ItemMenuRef } from '@/web/woke/ui/tooltip/item-menu-logic'
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
}

const KIND_OF_NS: Partial<Record<BaseType['namespace'], Partial<ItemMenuRef>>> = {
  UNIQUE: { rarity: 'unique' },
  DIVINATION_CARD: { type: 'DivinationCard' },
  GEM: { type: 'SkillGem' }
}

export function sideRow (info: BaseType, price: CurrencyValue | undefined, highlight: boolean, key: string): SideRow {
  const ref: ItemMenuRef = { name: info.refName, ...KIND_OF_NS[info.namespace] }
  return { key, name: info.name, icon: info.icon, price, highlight, ref, info, clickable: canPriceCheck(ref, info) }
}
