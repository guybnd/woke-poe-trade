// Net worth: the item tooltip for every item it names (tips.ts).
import { describe, it, expect } from 'vitest'
import { parseTop, plainItemName, tipFor, tipIndex } from '@/web/woke/net-worth/tips'

const lines = [
  { key: 'Mageblood Heavy Belt', name: 'Mageblood', tipName: 'Mageblood', frame: 3 },
  { key: 'Enlighten Support|L4|Q20', name: 'Enlighten Support 4/20', tipName: 'Enlighten Support', variant: '1/20', frame: 4 },
  { key: 'Divine Orb', name: 'Divine Orb', tipName: 'Divine Orb', frame: 5 }
]
const index = tipIndex(lines)

describe('tipFor', () => {
  it('a held item uses its line: game name, variant, unique menu', () => {
    expect(tipFor(index, 'Mageblood Heavy Belt', 'Mageblood', 1)).toEqual({ name: 'Mageblood', type: 'Unique', variant: undefined, count: 1, note: undefined, menu: { name: 'Mageblood', variant: undefined, rarity: 'unique' } })
    expect(tipFor(index, 'Enlighten Support|L4|Q20', 'x').menu).toEqual({ name: 'Enlighten Support', variant: '1/20', rarity: undefined })
  })
  it('finds it by the shown name when there is no key (the chart card)', () => {
    expect(tipFor(index, null, 'Enlighten Support 4/20', 2)).toMatchObject({ name: 'Enlighten Support', variant: '1/20', count: 2 })
  })
  it('an item that is gone falls back to its plain name', () => {
    expect(tipFor(index, 'Old|L21|Q20|C', 'Awakened Added Fire Damage Support 5/20 corrupted')).toEqual({ name: 'Awakened Added Fire Damage Support', count: undefined, menu: { name: 'Awakened Added Fire Damage Support' } })
  })
})

describe('plainItemName', () => {
  it('drops gem level, map tier, links and a rare base', () => {
    expect(['Vaal Grace 20/20 corrupted', 'Strand Map (T16)', 'Tabula Rasa 6L', 'Doom Crown, Hubris Circlet', 'Divine Orb'].map(plainItemName))
      .toEqual(['Vaal Grace', 'Strand Map', 'Tabula Rasa', 'Doom Crown', 'Divine Orb'])
  })
})

describe('parseTop', () => {
  it('reads the chart card strings', () => {
    expect(['12 × Divine Orb', '−4 × Maven\'s Writ', '−Sacred Orb', 'Mageblood'].map(parseTop)).toEqual([
      { count: 12, name: 'Divine Orb' },
      { count: -4, name: 'Maven\'s Writ' },
      { count: -1, name: 'Sacred Orb' },
      { count: 1, name: 'Mageblood' }
    ])
  })
})
