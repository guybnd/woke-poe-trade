// The price check's side window lists captured beasts beside the uniques they
// drop with (Watcher's Eye and Wild Hellion Alpha): a click price checks the
// beast too, as the item menu's Price does.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { ITEM_BY_REF, ITEM_DROP } from '@/assets/data'
import type { BaseType } from '@/assets/data'
import { ItemCategory } from '@/parser'
import { sideRow } from '@/web/price-check/related-items/side-row'
import { canPriceCheck, priceCheckRequest } from '@/web/woke/ui/tooltip/item-price-check'
import { loadGameData } from '../helpers/game-data'

vi.mock('@/web/Config', () => ({ AppConfig: () => ({ language: 'en' }) }))
vi.mock('@/web/woke/ui/tooltip/item-tip', () => ({ loadUniqueMods: async () => null }))

beforeAll(loadGameData)

describe('captured beasts', () => {
  it('a beast row opens a price check of that beast', async () => {
    const info = ITEM_BY_REF('CAPTURED_BEAST', 'Wild Hellion Alpha')![0]
    const row = sideRow(info, undefined, false, 'CAPTURED_BEAST::Wild Hellion Alpha')
    expect(row.clickable).toBe(true)
    const input = (await priceCheckRequest(row.ref, row.info))!
    expect(input.item?.category).toBe(ItemCategory.CapturedBeast)
    expect(input.item?.info.refName).toBe('Wild Hellion Alpha')
  })

  it('every beast in a drop group can be clicked', () => {
    const ids = ITEM_DROP.flatMap(e => [...e.query, ...e.items]).filter(id => id.startsWith('CAPTURED_BEAST::'))
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) {
      const info = ITEM_BY_REF('CAPTURED_BEAST', id.split('::')[1]) as BaseType[] | undefined
      if (!info?.length) continue
      expect(sideRow(info[0], undefined, false, id).clickable, id).toBe(true)
    }
  })

  it('the item menu prices a poe.ninja beast row by its type', () => {
    expect(canPriceCheck({ name: 'Wild Hellion Alpha', type: 'Beast' })).toBe(true)
  })
})
