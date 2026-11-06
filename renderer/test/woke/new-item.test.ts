// A new league's item, before the item data has it, is searched by name.
import { describe, expect, it } from 'vitest'
import { newItemQuery, newItemTradeUrl } from '@/web/woke/new-item/query'

const text = (...head: string[]) => [...head, '--------', 'Item Level: 84', '--------', 'Some mod'].join('\n')

describe('newItemQuery', () => {
  it('searches a unique by name and base', () => {
    expect(newItemQuery(text('Item Class: Gloves', 'Rarity: Unique', 'Veilwoven Grasp', 'Vaal Gauntlets')))
      .toEqual({ name: 'Veilwoven Grasp', type: 'Vaal Gauntlets', rarity: 'unique' })
  })
  it('searches an unidentified unique by base', () => {
    expect(newItemQuery(text('Item Class: Gloves', 'Rarity: Unique', 'Veil Gauntlets')))
      .toEqual({ type: 'Veil Gauntlets', rarity: 'unique' })
  })
  it('searches a rare by its base only', () => {
    expect(newItemQuery(text('Item Class: Rings', 'Rarity: Rare', 'Doom Loop', 'Veil Ring')))
      .toEqual({ type: 'Veil Ring', rarity: 'nonunique' })
  })
  it('searches currency, gems and cards by name', () => {
    expect(newItemQuery(text('Item Class: Stackable Currency', 'Rarity: Currency', 'Orb of Veils'))).toEqual({ type: 'Orb of Veils' })
    expect(newItemQuery(text('Item Class: Skill Gems', 'Rarity: Gem', 'Veil Strike'))).toEqual({ type: 'Veil Strike' })
    expect(newItemQuery(text('Item Class: Divination Cards', 'Rarity: Divination Card', 'The Veil'))).toEqual({ type: 'The Veil' })
  })
  it('gives up on magic items and other languages', () => {
    expect(newItemQuery(text('Item Class: Rings', 'Rarity: Magic', 'Glinting Veil Ring of the Fox'))).toBeNull()
    expect(newItemQuery(text('Класс предмета: Кольца', 'Редкость: Уникальный', 'X', 'Y'))).toBeNull()
  })
  it('reads past the line about an item the character can\'t use', () => {
    const raw = ['Item Class: Gloves', 'Rarity: Unique', 'You cannot use this item. Its stats will be ignored', '--------', 'Veilwoven Grasp', 'Vaal Gauntlets', '--------', 'Some mod'].join('\n')
    expect(newItemQuery(raw)).toEqual({ name: 'Veilwoven Grasp', type: 'Vaal Gauntlets', rarity: 'unique' })
  })
  it('handles Windows line ends', () => {
    expect(newItemQuery('Rarity: Currency\r\nOrb of Veils\r\n--------\r\nStack Size: 1/10')).toEqual({ type: 'Orb of Veils' })
  })
  it('builds a trade link for the league', () => {
    const url = newItemTradeUrl('Veilborn', { name: 'A', type: 'B', rarity: 'unique' })
    expect(url.startsWith('https://www.pathofexile.com/trade/search/Veilborn?q=')).toBe(true)
    const q = JSON.parse(decodeURIComponent(url.split('?q=')[1]))
    expect(q.query).toMatchObject({ name: 'A', type: 'B', filters: { type_filters: { filters: { rarity: { option: 'unique' } } } } })
  })
})
