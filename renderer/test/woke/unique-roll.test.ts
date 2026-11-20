// Unique roll quality (WOKEPOET-420): each rolling line's % up its range, and
// the "High roll" chip when the copy beats the average one poe.ninja prices.
import { describe, it, expect, beforeAll } from 'vitest'
import { loadGameData, parseItem } from '../helpers/game-data'
import { ItemRarity } from '@/parser'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { highRoll, uniqueLineRanges, uniqueRollPct } from '@/web/woke/price-insight/unique-roll'

function knife (crit: string, chaos: string) {
  return parseItem([
    'Item Class: Daggers', 'Rarity: Unique', "Bino's Kitchen Knife", 'Slaughter Knife', '--------',
    'Dagger', 'Physical Damage: 143-230 (augmented)', 'Critical Strike Chance: 7.00%', 'Attacks per Second: 1.40', '--------',
    'Requirements:', 'Level: 70', '--------', 'Item Level: 84', '--------',
    '{ Implicit Modifier — Damage, Critical }', '30% increased Global Critical Strike Chance (implicit)', '--------',
    '{ Unique Modifier — Damage, Critical }', `${crit} increased Critical Strike Chance`,
    '{ Unique Modifier — Chaos, Resistance }', `${chaos} to Chaos Resistance`,
    '{ Unique Modifier — Life }', '+40 to maximum Life', '--------', ''
  ].join('\n'))
}

function line (stats: StatFilter[], text: string) {
  return stats.find(s => s.text === text)!
}

describe('unique roll quality', () => {
  beforeAll(loadGameData)

  it('gives each rolling line its % up the range, and fixed lines nothing', () => {
    const item = knife('45(30-50)%', '+19(17-21)%')
    const stats = initUiModFilters(item, { searchStatRange: 10 }) as StatFilter[]
    expect(uniqueRollPct(line(stats, '#% increased Critical Strike Chance'), item)).toBe(75)
    expect(uniqueRollPct(line(stats, '+#% to Chaos Resistance'), item)).toBe(50)
    // No range: a fixed line.
    expect(uniqueRollPct(line(stats, '+# to maximum Life'), item)).toBeUndefined()
  })

  it('flags a copy whose lines average 75% or more', () => {
    const high = knife('48(30-50)%', '+21(17-21)%')
    const hs = initUiModFilters(high, { searchStatRange: 10 }) as StatFilter[]
    expect(highRoll(hs, high)).toMatchObject({ pct: 95 })
    expect(highRoll(hs, high)!.lines).toHaveLength(2)

    const avg = knife('40(30-50)%', '+19(17-21)%')
    expect(highRoll(initUiModFilters(avg, { searchStatRange: 10 }), avg)).toBeUndefined()
  })

  it('ignores rares', () => {
    const item = knife('48(30-50)%', '+21(17-21)%')
    const stats = initUiModFilters(item, { searchStatRange: 10 }) as StatFilter[]
    expect(uniqueRollPct(line(stats, '+#% to Chaos Resistance'), { ...item, rarity: ItemRarity.Rare })).toBeUndefined()
  })
  it('shows each number with its range, gold near the top', () => {
    const item = knife('45(30-50)%', '+21(17-21)%')
    const stats = initUiModFilters(item, { searchStatRange: 10 }) as StatFilter[]
    expect(uniqueLineRanges(line(stats, '#% increased Critical Strike Chance'), item))
      .toEqual({ ranges: [{ min: 30, max: 50 }], top: false, pct: 75 })
    expect(uniqueLineRanges(line(stats, '+#% to Chaos Resistance'), item))
      .toMatchObject({ ranges: [{ min: 17, max: 21 }], top: true })
  })
})
