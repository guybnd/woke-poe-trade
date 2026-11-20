// Unique roll quality (WOKEPOET-420): each rolling line's % up its range, and
// the "High roll" chip when the copy beats the average one poe.ninja prices.
import { describe, it, expect, beforeAll } from 'vitest'
import { loadGameData, parseItem } from '../helpers/game-data'
import { ItemRarity } from '@/parser'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { highRoll, uniqueLineRanges, uniqueRollPct } from '@/web/woke/price-insight/unique-roll'

// Kaom's Heart with a rolling life line, as the advanced copy shows ranges.
function kaom (fire: string, life: string) {
  return parseItem([
    'Item Class: Body Armours', 'Rarity: Unique', "Kaom's Heart", 'Glorious Plate', '--------',
    'Armour: 1013 (augmented)', '--------', 'Requirements:', 'Level: 68', 'Str: 191', '--------',
    'Sockets: R', '--------', 'Item Level: 86', '--------',
    '{ Unique Modifier — Damage, Elemental, Fire }', `${fire}% increased Fire Damage`,
    '{ Unique Modifier — Life }', `${life} to maximum Life`, '--------',
    'The warrior who fears will fall.', ''
  ].join('\n'))
}

function line (stats: StatFilter[], text: string) {
  return stats.find(s => !s.group && s.text === text)!
}

const FIRE = '#% increased Fire Damage'
const LIFE = '# to maximum Life'

describe('unique roll quality', () => {
  beforeAll(loadGameData)

  it('gives each rolling line its % up the range, and fixed lines nothing', () => {
    const item = kaom('35(20-40)', '+450(400-500)')
    const stats = initUiModFilters(item, { searchStatRange: 10 }) as StatFilter[]
    expect(uniqueRollPct(line(stats, FIRE), item)).toBe(75)
    expect(uniqueRollPct(line(stats, LIFE), item)).toBe(50)
    const fixed = kaom('35(20-40)', '+500')
    expect(uniqueRollPct(line(initUiModFilters(fixed, { searchStatRange: 10 }) as StatFilter[], LIFE), fixed)).toBeUndefined()
  })

  it('flags a copy whose lines average 75% or more', () => {
    const high = kaom('39(20-40)', '+490(400-500)')
    const hs = initUiModFilters(high, { searchStatRange: 10 }) as StatFilter[]
    expect(highRoll(hs, high)).toMatchObject({ pct: 93 })
    expect(highRoll(hs, high)!.lines).toHaveLength(2)

    const avg = kaom('30(20-40)', '+450(400-500)')
    expect(highRoll(initUiModFilters(avg, { searchStatRange: 10 }), avg)).toBeUndefined()
  })

  it('ignores rares', () => {
    const item = kaom('39(20-40)', '+490(400-500)')
    const stats = initUiModFilters(item, { searchStatRange: 10 }) as StatFilter[]
    expect(uniqueRollPct(line(stats, FIRE), { ...item, rarity: ItemRarity.Rare })).toBeUndefined()
  })

  it('shows each number with its range, gold near the top', () => {
    const item = kaom('30(20-40)', '+495(400-500)')
    const stats = initUiModFilters(item, { searchStatRange: 10 }) as StatFilter[]
    expect(uniqueLineRanges(line(stats, FIRE), item))
      .toEqual({ ranges: [{ min: 20, max: 40 }], top: false, pct: 50 })
    expect(uniqueLineRanges(line(stats, LIFE), item))
      .toMatchObject({ ranges: [{ min: 400, max: 500 }], top: true })
  })
})
