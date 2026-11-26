// A new league's item, before the item data has it, is searched by name.
import { describe, expect, it } from 'vitest'
import { looksTransfigured, newItemNote, newItemQuery, newItemTradeUrl } from '@/web/woke/new-item/query'
import { loadGameData } from '../helpers/game-data'

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
    expect(newItemQuery(text('Item Class: Stackable Currency', 'Rarity: Currency', 'Orb of Veils'))).toEqual({ type: 'Orb of Veils', kind: 'stack' })
    expect(newItemQuery(text('Item Class: Skill Gems', 'Rarity: Gem', 'Veil Strike'))).toEqual({ type: 'Veil Strike', kind: 'gem' })
    expect(newItemQuery(text('Item Class: Divination Cards', 'Rarity: Divination Card', 'The Veil'))).toEqual({ type: 'The Veil', kind: 'stack' })
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
    expect(newItemQuery('Rarity: Currency\r\nOrb of Veils\r\n--------\r\nStack Size: 1/10')).toEqual({ type: 'Orb of Veils', kind: 'stack' })
  })
  it('never promises mod filters for currency, cards or gems', () => {
    expect(newItemNote({ type: 'Orb of Veils', kind: 'stack' })).not.toMatch(/mod filters/i)
    expect(newItemNote({ type: 'Veil Strike', kind: 'gem' })).not.toMatch(/mod filters/i)
    expect(newItemNote({ type: 'Veil Ring', rarity: 'nonunique' })).toMatch(/mod filters/i)
  })
  it('builds a trade link for the league', () => {
    const url = newItemTradeUrl('Veilborn', { name: 'A', type: 'B', rarity: 'unique' })
    expect(url.startsWith('https://www.pathofexile.com/trade/search/Veilborn?q=')).toBe(true)
    const q = JSON.parse(decodeURIComponent(url.split('?q=')[1]))
    expect(q.query).toMatchObject({ name: 'A', type: 'B', filters: { type_filters: { filters: { rarity: { option: 'unique' } } } } })
  })
  it('searches a Foulborn unique and a Vestigial base by their trade names plus the filter', () => {
    const foul = newItemQuery(text('Item Class: Helmets', 'Rarity: Unique', 'Foulborn Brand New Crest', 'Vestigial Great Crown'))
    expect(foul).toEqual({ name: 'Brand New Crest', type: 'Great Crown', rarity: 'unique', foulborn: true, vestigial: true })
    const q = JSON.parse(decodeURIComponent(newItemTradeUrl('Veilborn', foul!).split('?q=')[1]))
    expect(q.query.filters.misc_filters.filters).toEqual({ foulborn_item: { option: 'true' }, vestigial: { option: 'true' } })
    expect(q.query.filters.type_filters.filters.rarity.option).toBe('unique')
    expect(newItemQuery(text('Item Class: Rings', 'Rarity: Rare', 'Doom Loop', 'Vestigial Veil Ring')))
      .toEqual({ type: 'Veil Ring', rarity: 'nonunique', vestigial: true })
  })
})

// Guy's pick: a new league's transfigured gem gets a note, not a trade search
// the trade site can't answer.
describe('a new transfigured gem', () => {
  const known = (name: string) => ['Ice Nova', 'Herald of Ash', 'Vaal Rain of Arrows'].includes(name)
  it('is a gem the data lacks named "<known gem> of <something>"', () => {
    expect(looksTransfigured('Ice Nova of Snowfall', known)).toBe(true)
    expect(looksTransfigured('Herald of Ash of Embers', known)).toBe(true)
    expect(looksTransfigured('Ice Nova', known)).toBe(false)
    expect(looksTransfigured('Wave of Veils', known)).toBe(false)
    expect(looksTransfigured('Vaal Rain of Arrows', known)).toBe(false)
    expect(looksTransfigured('Veil Strike', known)).toBe(false)
  })
  it('is marked, and its note says no price until the data update', () => {
    const q = newItemQuery(text('Item Class: Skill Gems', 'Rarity: Gem', 'Superior Ice Nova of Snowfall'), known)
    expect(q).toEqual({ type: 'Ice Nova of Snowfall', kind: 'gem', transfigured: true })
    expect(newItemNote(q!)).toBe('New gem: no price until the next data update.')
    expect(newItemQuery(text('Item Class: Skill Gems', 'Rarity: Gem', 'Veil Strike'), known)).toEqual({ type: 'Veil Strike', kind: 'gem' })
  })
  it('reads the real item data', async () => {
    await loadGameData()
    expect(looksTransfigured('Ice Nova of Snowfall')).toBe(true)
    expect(looksTransfigured('Ice Nova of Frostbolts')).toBe(false)
    expect(looksTransfigured('Veil Strike of Veils')).toBe(false)
  })
})
