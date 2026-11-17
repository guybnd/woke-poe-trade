// The price check's side window: every row it lists, in every section, opens
// a price check through the item menu's one path when clicked.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { ITEM_BY_REF, ITEM_DROP } from '@/assets/data'
import type { BaseType } from '@/assets/data'
import { parseClipboard } from '@/parser'
import { canPriceCheck, priceCheckRequest } from '@/web/woke/ui/tooltip/item-price-check'
import type { ItemMenuRef } from '@/web/woke/ui/tooltip/item-menu-logic'
import { loadGameData } from '../helpers/game-data'

vi.mock('@/web/Config', () => ({ AppConfig: () => ({ language: 'en' }) }))
// The tooltip's unique mods file isn't on disk in tests: uniques price by name.
vi.mock('@/web/woke/ui/tooltip/item-tip', () => ({ loadUniqueMods: async () => null }))

beforeAll(loadGameData)

const KIND: Partial<Record<BaseType['namespace'], Partial<ItemMenuRef>>> = {
  UNIQUE: { rarity: 'unique' },
  DIVINATION_CARD: { type: 'DivinationCard' },
  GEM: { type: 'SkillGem' }
}

function info (queryId: string) {
  const [ns, encoded] = queryId.split('::')
  const [name, variant] = encoded.split(' // ')
  const found = ITEM_BY_REF(ns as BaseType['namespace'], name) ?? []
  return found.find(u => ns !== 'UNIQUE' || u.unique?.base === variant) ?? found[0]
}

describe('side window rows', () => {
  it('opens The Nurse group and its drop', async () => {
    const entry = ITEM_DROP.find(e => e.query.includes('DIVINATION_CARD::The Nurse'))!
    expect(entry).toBeTruthy()
    for (const id of [...entry.query, ...entry.items]) {
      const i = info(id)!
      const ref: ItemMenuRef = { name: i.refName, ...KIND[i.namespace] }
      expect(canPriceCheck(ref), id).toBe(true)
      const input = (await priceCheckRequest(ref))!
      const parsed = input.item ?? parseClipboard(input.clipboard)._unsafeUnwrap()
      expect(parsed.info.refName, id).toBe(i.refName)
    }
  })

  it('reads back every clickable row of every drop group as its own item', async () => {
    let clickable = 0
    for (const entry of ITEM_DROP) {
      for (const id of [...entry.query, ...entry.items]) {
        const i = info(id)
        if (!i) continue
        const ref: ItemMenuRef = { name: i.refName, ...KIND[i.namespace] }
        if (!canPriceCheck(ref)) continue
        clickable++
        const input = (await priceCheckRequest(ref))!
        const parsed = input.item ?? parseClipboard(input.clipboard)._unsafeUnwrap()
        expect(parsed.info.refName, id).toBe(i.refName)
      }
    }
    expect(clickable).toBeGreaterThan(300)
  })
})
