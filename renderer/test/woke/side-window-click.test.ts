// The price check's side window: every row it lists, in every section, opens
// a price check through the item menu's one path when clicked.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { ITEM_BY_REF, ITEM_DROP } from '@/assets/data'
import type { BaseType } from '@/assets/data'
import { parseClipboard } from '@/parser'
import { priceCheckRequest } from '@/web/woke/ui/tooltip/item-price-check'
import { sideRow } from '@/web/price-check/related-items/side-row'
import { loadGameData } from '../helpers/game-data'

vi.mock('@/web/Config', () => ({ AppConfig: () => ({ language: 'en' }) }))
// The tooltip's unique mods file isn't on disk in tests: uniques price by name.
vi.mock('@/web/woke/ui/tooltip/item-tip', () => ({ loadUniqueMods: async () => null }))

beforeAll(loadGameData)

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
      const row = sideRow(info(id)!, undefined, false, id)
      expect(row.clickable, id).toBe(true)
      const input = (await priceCheckRequest(row.ref, row.info))!
      const parsed = input.item ?? parseClipboard(input.clipboard)._unsafeUnwrap()
      expect(parsed.info.refName, id).toBe(row.info.refName)
    }
  })

  it('opens a unique on the base its row lists', async () => {
    for (const base of ['Leviathan Greaves', 'Warlock Boots', 'Velour Boots']) {
      const id = `UNIQUE::Doryani's Delusion // ${base}`
      const row = sideRow(info(id)!, undefined, false, id)
      const input = (await priceCheckRequest(row.ref, row.info))!
      expect(input.item?.info.refName).toBe("Doryani's Delusion")
      expect(input.item?.info.unique?.base, base).toBe(base)
    }
  })

  it('reads back every clickable row of every drop group as its own item', async () => {
    let clickable = 0
    for (const entry of ITEM_DROP) {
      for (const id of [...entry.query, ...entry.items]) {
        const i = info(id)
        if (!i) continue
        const row = sideRow(i, undefined, false, id)
        if (!row.clickable) continue
        clickable++
        const input = (await priceCheckRequest(row.ref, row.info))!
        const parsed = input.item ?? parseClipboard(input.clipboard)._unsafeUnwrap()
        expect(parsed.info.refName, id).toBe(i.refName)
      }
    }
    expect(clickable).toBeGreaterThan(300)
  })
})
