// A build's item, read back by the price check's own parser.
import { beforeAll, describe, expect, it } from 'vitest'
import { parseClipboard, ItemCategory, ItemRarity, ItemInfluence } from '@/parser'
import { pobItemText } from '@/web/woke/pob-builds/item-text'
import { parseItemText } from '../../../main/src/woke/pob-parse'
import { loadGameData } from '../helpers/game-data'

beforeAll(loadGameData)

function read (text: string) {
  const item = parseItemText(text)
  return parseClipboard(pobItemText(item as never))._unsafeUnwrap()
}

describe('pobItemText', () => {
  it('reads a rare with its base, sockets, implicit and resistances', () => {
    const item = read(`
      Rarity: RARE
      Dread Shell
      Two-Stone Ring
      Crusader Item
      Item Level: 84
      Implicits: 1
      +14% to Fire and Cold Resistances
      +64 to maximum Life
      +38% to Fire Resistance
      {crafted}+20% to Cold Resistance
      {fractured}+46% to Lightning Resistance
      Corrupted
    `)
    expect(item.rarity).toBe(ItemRarity.Rare)
    expect(item.category).toBe(ItemCategory.Ring)
    expect(item.itemLevel).toBe(84)
    expect(item.isCorrupted).toBe(true)
    expect(item.influences).toEqual([ItemInfluence.Crusader])
    expect(item.unknownModifiers).toEqual([])
    const refs = item.statsByType.map(s => s.stat.ref)
    expect(refs).toContain('+#% to Fire Resistance')
    expect(refs).toContain('+#% to Lightning Resistance')
    expect(refs).toContain('+# to maximum Life')
  })

  it('reads armour numbers and sockets', () => {
    const item = read(`
      Rarity: RARE
      Grim March
      Warlock Boots
      Item Level: 86
      Quality: 20
      Energy Shield: 173
      Sockets: B-B-B-B
      Implicits: 0
      +108 to maximum Life
      30% increased Movement Speed
    `)
    expect(item.category).toBe(ItemCategory.Boots)
    expect(item.armourES).toBe(173)
    expect(item.sockets).toBeDefined()
  })

  it('reads an enchant as an enchant', () => {
    const item = read(`
      Rarity: RARE
      Grim March
      Warlock Boots
      Implicits: 1
      {crafted}10% increased Movement Speed if you haven't been Hit Recently
      +108 to maximum Life
    `)
    expect(item.unknownModifiers).toEqual([])
    expect(item.statsByType.some(s => s.sources.some(x => x.modifier.info.type === 'enchant'))).toBe(true)
  })

  it('reads a base PoB tells apart in brackets', () => {
    const item = read(`
      Rarity: RARE
      Day 1
      Two-Stone Ring (Fire/Cold)
      Implicits: 1
      +14% to Fire and Cold Resistances
    `)
    expect(item.category).toBe(ItemCategory.Ring)
    expect(item.info.refName).toBe('Two-Stone Ring')
  })

  it('reads a unique and a Foulborn unique by name', () => {
    expect(read(`
      Rarity: UNIQUE
      Kaom's Binding
      Heavy Belt
      Implicits: 1
      +25 to Strength
      +30 to Strength
    `).info.refName).toBe("Kaom's Binding")
    expect(read(`
      Rarity: UNIQUE
      Foulborn Romira's Banquet
      Diamond Ring
      Implicits: 1
      25% increased Global Critical Strike Chance
      +(30-50) to maximum Life
    `).info.refName).toBe("Romira's Banquet")
  })

  it('reads a magic flask from its full name', () => {
    const item = read(`
      Rarity: MAGIC
      Seething Divine Life Flask of Staunching
      Implicits: 0
    `)
    expect(item.category).toBe(ItemCategory.Flask)
    expect(item.info.refName).toBe('Divine Life Flask')
  })
})
