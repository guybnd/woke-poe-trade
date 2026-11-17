// League variant names (Foulborn, Replica, Fated, transfigured gems): what each
// tool makes of them. The first block pins how the tools read names, so the
// shared reader can't change it; the second tests the reader itself.
import { beforeAll, describe, expect, it } from 'vitest'
import { kindOfName, plainName, priceCheckInput, tradeQuery } from '@/web/woke/ui/tooltip/item-menu-logic'
import { ITEM_BY_REF } from '@/assets/data'
import { baseUniqueName } from '@/web/woke/search/search'
import { dropOf } from '@/web/woke/ui/tooltip/tip-content'
import { cheapestPrices } from '@/web/woke/disenchant/calc'
import { readCounts } from '@/web/woke/disenchant/listings'
import { dropUniques, ownUnique } from '@/web/woke/loot-filter/drop-uniques'
import { dataUniqueName, isFated, isFoulborn, isReplica, readItemName, unfatedBase } from '@/web/woke/shared/item-identity'
import { loadGameData } from '../helpers/game-data'
import type { PriceItem } from '@/web/woke/market/types'

beforeAll(loadGameData)

const price = (type: string, name: string, chaos: number, variant = ''): PriceItem =>
  ({ type, name, chaos, variant } as unknown as PriceItem)

describe('how the tools read variant names', () => {
  it('item menu: a Foulborn name is a unique, under its plain name', () => {
    expect(kindOfName('Foulborn Headhunter')).toBe('unique')
    expect(kindOfName('Foulborn Not A Real Unique')).toBe('unique')
    expect(plainName('Foulborn Headhunter')).toBe('Headhunter')
    expect(plainName('Headhunter')).toBe('Headhunter')
    // Only a leading word counts.
    expect(plainName('The Foulborn Headhunter')).toBe('The Foulborn Headhunter')
    expect(plainName('Replica Farrul\'s Fur')).toBe('Replica Farrul\'s Fur')
  })

  it('item menu: no price check for a Foulborn unique, trade searches the plain one', () => {
    const hh = ITEM_BY_REF('UNIQUE', 'Headhunter')![0]
    expect(priceCheckInput({ name: 'Foulborn Headhunter' }, 'unique', hh)).toBeNull()
    expect(tradeQuery({ name: 'Foulborn Headhunter' }, 'unique', hh)).toEqual({ name: 'Headhunter', type: 'Leather Belt' })
  })

  it('search: Foulborn rows share their unique\'s page', () => {
    expect(baseUniqueName('Foulborn Headhunter')).toBe('Headhunter')
    expect(baseUniqueName('Replica Farrul\'s Fur')).toBe('Replica Farrul\'s Fur')
  })

  it('tooltip: a Foulborn unique drops where its plain one does', () => {
    const drops = { Headhunter: { d: 'x' } } as never
    expect(dropOf(drops, 'Foulborn Headhunter')).toEqual({ d: 'x' })
    expect(dropOf(drops, 'Headhunter')).toEqual({ d: 'x' })
    expect(dropOf(drops, 'Replica Headhunter')).toBeUndefined()
  })

  it('disenchant: Foulborn prices and listings count as the unique', () => {
    const items = [price('UniqueArmour', 'Foulborn Hat', 2), price('UniqueArmour', 'Hat', 5)]
    expect(cheapestPrices(items).get('Hat')?.chaos).toBe(2)
    expect(cheapestPrices(items, false).get('Hat')?.chaos).toBe(5)
    expect(readCounts([{ lines: [{ name: 'Foulborn Hat', listingCount: 2 }, { name: 'Hat', listingCount: 3 }] }]).get('Hat')).toBe(5)
  })

  it('Alt+F: an identified Foulborn copy is its plain unique; Foulborn lines group by name', () => {
    expect(ownUnique('Foulborn Touch of Anguish Imperial Claw', 'Imperial Claw')).toBe('Touch of Anguish')
    const out = dropUniques(
      [{ name: 'X', chaos: 1 } as never],
      [price('UniqueAccessory', 'Foulborn X', 7, 'Iron Ring'), price('UniqueAccessory', 'X', 1, 'Iron Ring')],
      ['UniqueAccessory'], 'Iron Ring', null, null)
    expect(out[0].foulborn?.max).toBe(7)
  })
})

describe('readItemName', () => {
  it('reads each league variant and its original', () => {
    expect(readItemName('Foulborn Headhunter')).toEqual({ name: 'Foulborn Headhunter', plain: 'Headhunter', variant: 'foulborn' })
    expect(readItemName('Replica Farrul\'s Fur')).toEqual({ name: 'Replica Farrul\'s Fur', plain: 'Farrul\'s Fur', variant: 'replica' })
    expect(readItemName('Fated Lathi')).toEqual({ name: 'Fated Lathi', plain: 'Lathi', variant: 'fated' })
    expect(readItemName('Headhunter')).toEqual({ name: 'Headhunter', plain: 'Headhunter', variant: null })
  })

  it('knows a transfigured gem only from the item data', () => {
    const gem = ITEM_BY_REF('GEM', 'Ice Nova')![0]
    const trans = ITEM_BY_REF('GEM', 'Ice Nova of Frostbolts')?.[0]
    expect(trans?.gem?.transfigured).toBe(true)
    expect(readItemName('Ice Nova of Frostbolts', ITEM_BY_REF)).toEqual({ name: 'Ice Nova of Frostbolts', plain: 'Ice Nova', variant: 'transfigured' })
    expect(readItemName('Ice Nova of Frostbolts').variant).toBeNull()
    expect(readItemName(gem.refName, ITEM_BY_REF).variant).toBeNull()
  })

  it('has one-word checks the tools use', () => {
    expect(isFoulborn('Foulborn X')).toBe(true)
    expect(isFoulborn('X Foulborn')).toBe(false)
    expect(isReplica('Replica X')).toBe(true)
    expect(isFated('Fated Lathi')).toBe(true)
    expect(dataUniqueName('Foulborn X')).toBe('X')
    expect(dataUniqueName('Replica X')).toBe('Replica X')
    expect(unfatedBase('Fated Lathi')).toBe('Lathi')
    expect(unfatedBase('Lathi')).toBe('Lathi')
  })
})
