// The name the price check's save box offers for a search.
import { describe, expect, it } from 'vitest'
import { ItemRarity } from '@/parser'
import { createVirtualItem } from '@/parser/ParsedItem'
import type { BaseType } from '@/assets/data'
import { FilterTag } from '@/web/price-check/filters/interfaces'
import type { FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'
import { proposeSearchName, shortStatLabel } from '@/web/woke/trade-searches/propose-name'

const info = (name: string) => ({ name, refName: name, namespace: 'ITEM' } as unknown as BaseType)
const stat = (text: string, extra: Partial<StatFilter> = {}) => ({ text, disabled: false, ...extra } as unknown as StatFilter)

describe('shortStatLabel', () => {
  it.each([
    ['+# to maximum Life', 'maximum Life'],
    ['+#% to Fire Resistance', 'Fire Resistance'],
    ['#% increased Spell Damage', 'Spell Damage'],
    ['Adds # to # Cold Damage to Attacks', 'Adds Cold Damage to Attacks'],
    ['+#% total Elemental Resistance', 'total Elemental Resistance']
  ])('%s → %s', (text, out) => {
    expect(shortStatLabel(text)).toBe(out)
  })
})

describe('proposeSearchName', () => {
  it('names a unique by its name, with links', () => {
    expect(proposeSearchName(createVirtualItem({ info: info('Tabula Rasa'), rarity: ItemRarity.Unique }))).toBe('Tabula Rasa')
    expect(proposeSearchName(createVirtualItem({ info: info('Kaom\'s Heart'), rarity: ItemRarity.Unique, sockets: { linked: 6, white: 0 } }))).toBe('Kaom\'s Heart 6L')
  })

  it('names a rare by its base and first two ticked stats', () => {
    const stats: FilterOrGroup[] = [
      stat('Total DPS: #', { tag: FilterTag.Property }),
      stat('+# to maximum Life', { disabled: true }),
      stat('+#% to Fire Resistance'),
      stat('+#% to Fire Resistance'),
      stat('+# to Strength', { not: true }),
      stat('#% increased Movement Speed'),
      stat('+# to Dexterity')
    ]
    expect(proposeSearchName(createVirtualItem({ info: info('Two-Toned Boots'), rarity: ItemRarity.Rare }), stats))
      .toBe('Two-Toned Boots: Fire Resistance, Movement Speed')
  })

  it('falls back to the base with nothing ticked', () => {
    expect(proposeSearchName(createVirtualItem({ info: info('Hubris Circlet'), rarity: ItemRarity.Rare }), [])).toBe('Hubris Circlet')
  })

  it('adds gem level and quality, and map tier', () => {
    expect(proposeSearchName(createVirtualItem({ info: info('Spark'), gemLevel: 21, quality: 20 }))).toBe('Spark 21/20')
    expect(proposeSearchName(createVirtualItem({ info: info('Strand Map'), mapTier: 16 }))).toBe('Strand Map T16')
  })

  it('keeps a long name short', () => {
    const stats = [stat('#% increased Damage with Hits against Enemies that are on Low Life'), stat('#% increased Critical Strike Chance for Spells while Dual Wielding')]
    const name = proposeSearchName(createVirtualItem({ info: info('Imperial Claw'), rarity: ItemRarity.Rare }), stats)
    expect(name.length).toBeLessThanOrEqual(60)
    expect(name.endsWith('…')).toBe(true)
  })
})
