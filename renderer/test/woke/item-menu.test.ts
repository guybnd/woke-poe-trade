// The right-click item menu: what it hands the price check, and what it
// searches the trade site for.
import { beforeAll, describe, expect, it } from 'vitest'
import { ITEM_BY_REF } from '@/assets/data'
import { parseClipboard, ItemCategory, ItemRarity } from '@/parser'
import { priceCheckInput, tradeQuery, uniqueBaseOf } from '@/web/woke/ui/tooltip/item-menu-logic'
import { closeMenu, menuState, offerMenuItem, openMenu } from '@/web/woke/ui/layer'
import { loadGameData } from '../helpers/game-data'

beforeAll(loadGameData)

function input (name: string, kind: 'unique' | 'gem' | 'card' | 'item') {
  const ns = { unique: 'UNIQUE', gem: 'GEM', card: 'DIVINATION_CARD', item: 'ITEM' } as const
  const info = ITEM_BY_REF(ns[kind], name)?.[0]
  expect(info, name).toBeTruthy()
  return priceCheckInput({ name }, kind, info)
}

describe('priceCheckInput', () => {
  it.each([
    'Tainted Chromatic Orb',
    'Horned Scarab of Tradition',
    'Deafening Essence of Misery',
    'Tattoo of the Ngamahu Warmonger'
  ])('gives the price check game text it reads back as %s', (name) => {
    const res = input(name, 'item')
    expect(res?.item).toBeUndefined()
    const parsed = parseClipboard(res!.clipboard)._unsafeUnwrap()
    expect(parsed.info.refName).toBe(name)
  })

  it('reads a divination card as a card', () => {
    const parsed = parseClipboard(input('The Enlightened', 'card')!.clipboard)._unsafeUnwrap()
    expect(parsed.info.refName).toBe('The Enlightened')
    expect(parsed.category).toBe(ItemCategory.DivinationCard)
  })

  it('makes a unique and a gem the way the item search does', () => {
    expect(input('Headhunter', 'unique')!.item!.rarity).toBe(ItemRarity.Unique)
    expect(input('Cleave', 'gem')!.item!.category).toBe(ItemCategory.Gem)
  })

  it('checks a Vaal gem as corrupted', () => {
    expect(input('Vaal Grace', 'gem')!.item!.isCorrupted).toBe(true)
  })

  it('has no price check for a Foulborn unique, or a currency outside English', () => {
    const hh = ITEM_BY_REF('UNIQUE', 'Headhunter')![0]
    expect(priceCheckInput({ name: 'Foulborn Headhunter' }, 'unique', hh)).toBeNull()
    const orb = ITEM_BY_REF('ITEM', 'Divine Orb')![0]
    expect(priceCheckInput({ name: 'Divine Orb' }, 'item', orb, false)).toBeNull()
  })

  it('has no price check for a plain base, and uses a build item\'s own text', () => {
    expect(input('Rustic Sash', 'item')).toBeNull()
    expect(priceCheckInput({ name: 'Dread Shell', text: 'TEXT' }, 'item', undefined)).toEqual({ clipboard: 'TEXT' })
  })
})

describe('tradeQuery', () => {
  it('searches a unique by name and base, anything else by type', () => {
    const hh = ITEM_BY_REF('UNIQUE', 'Headhunter')![0]
    expect(tradeQuery({ name: 'Headhunter' }, 'unique', hh)).toEqual({ name: 'Headhunter', type: 'Leather Belt' })
    expect(tradeQuery({ name: 'Foulborn Headhunter' }, 'unique', hh)).toEqual({ name: 'Headhunter', type: 'Leather Belt' })
    expect(tradeQuery({ name: 'Dread Shell', base: 'Two-Stone Ring' }, 'item', undefined)).toEqual({ type: 'Two-Stone Ring' })
    expect(tradeQuery({ name: 'Cleave' }, 'gem', undefined)).toEqual({ type: 'Cleave' })
  })

  it('searches a unique on several bases by name alone', () => {
    for (const name of ['Grand Spectrum', "Precursor's Emblem"]) {
      const all = ITEM_BY_REF('UNIQUE', name)!
      expect(new Set(all.map(u => u.unique?.base)).size, name).toBeGreaterThan(1)
      expect(uniqueBaseOf(name)).toBeUndefined()
      for (const info of all) expect(tradeQuery({ name }, 'unique', info)).toEqual({ name: info.name })
    }
    expect(uniqueBaseOf('Headhunter')).toBe('Leather Belt')
  })

  it('searches a transfigured gem as its plain gem and which one', () => {
    const t = ITEM_BY_REF('GEM', 'Cleave of Rage')![0]
    expect(t.gem?.transfigured).toBe(true)
    expect(tradeQuery({ name: 'Cleave of Rage' }, 'gem', t)).toEqual({ type: { option: 'Cleave', discriminator: t.tradeDisc } })
  })
})

describe('openMenu with an offered item', () => {
  const head = { name: 'Cleave', actions: [] }

  function click () {
    const e = { clientX: 10, clientY: 20, defaultPrevented: false, preventDefault () { e.defaultPrevented = true } }
    return e as unknown as MouseEvent
  }

  it('puts the item on top of the row menu the same click opens', () => {
    const e = click()
    offerMenuItem(e, () => head)
    openMenu(e, [{ label: 'Row', action: () => {} }])
    expect(menuState.value?.item).toBe(head)
    expect(menuState.value?.items).toHaveLength(1)
    expect(e.defaultPrevented).toBe(true)
    closeMenu()
  })

  it('leaves another click\'s menu alone', () => {
    offerMenuItem(click(), () => head)
    openMenu(click(), [{ label: 'Row', action: () => {} }])
    expect(menuState.value?.item).toBeUndefined()
    closeMenu()
  })

  it('opens nothing with no entries and no item', () => {
    const e = click()
    openMenu(e, [])
    expect(menuState.value).toBeNull()
    expect(e.defaultPrevented).toBe(false)
  })
})
