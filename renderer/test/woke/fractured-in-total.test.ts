// A fractured mod folded into a pseudo total keeps one line on the main screen
// (the total); splitting the total lists it with PoE mode's "Fractured only".
import { describe, it, expect, beforeAll } from 'vitest'
import { loadGameData, fixture, parseItem } from '../helpers/game-data'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { fracturedIds } from '@/web/woke/price-insight/poe-kind'
import { splitFilters } from '@/web/woke/price-insight/pseudo-split'

const REF = '+#% to Cold and Chaos Resistances'

describe('fractured mod inside a total', () => {
  beforeAll(loadGameData)

  it('has no visible line of its own beside the totals', () => {
    const item = parseItem(fixture('items/rare-shield-fractured-res.txt'))
    const stats = initUiModFilters(item, { searchStatRange: 10 }).filter((f): f is StatFilter => !f.group)
    expect(stats.filter(f => f.statRef === REF && !f.hidden)).toHaveLength(0)
  })

  it.each([
    '+#% total Elemental Resistance',
    '+#% total to Chaos Resistance'
  ])('splitting %s lists it with Fractured only', (total) => {
    const item = parseItem(fixture('items/rare-shield-fractured-res.txt'))
    const stats = initUiModFilters(item, { searchStatRange: 10 })
    const row = stats.find((f): f is StatFilter => !f.group && f.statRef === total)!
    const frac = splitFilters(row, stats, item, 10).filter(f => f.statRef === REF)
    expect(frac).toHaveLength(1)
    // "of the Order" is a Jun mod name, so the row is tagged explicit-veiled.
    expect(frac[0].tag).toBe('explicit-veiled')
    expect(frac[0].tradeId).toEqual(['explicit.stat_3393628375'])
    expect(fracturedIds(frac[0])).toEqual(['fractured.stat_3393628375'])
  })

  it('keeps a fractured mod apart from a same-stat mod when splitting', () => {
    const text = fixture('items/rare-shield-fractured-res.txt').replace(
      [
        '{ Prefix Modifier "Consecrated" (Tier: 2) — Defences, Armour, Energy Shield }',
        '+155(146-220) to Armour',
        '+60(49-60) to maximum Energy Shield'
      ].join('\n'),
      [
        '{ Fractured Prefix Modifier "Rotund" (Tier: 3) — Life }',
        '+80(80-89) to maximum Life',
        '{ Prefix Modifier "Rhino\'s" (Tier: 4) — Life, Defences, Armour }',
        '+30(25-34) to Armour',
        '+20(19-23) to maximum Life'
      ].join('\n'))
    const item = parseItem(text)
    const stats = initUiModFilters(item, { searchStatRange: 10 })
    const life = stats.find((f): f is StatFilter => !f.group && f.statRef === '+# total maximum Life')!
    expect(life.sources.length).toBeGreaterThanOrEqual(2)
    const rows = splitFilters(life, stats, item, 10).filter(f => f.statRef === '+# to maximum Life')
    expect(rows).toHaveLength(2)
    expect(rows.filter(f => fracturedIds(f)).map(f => f.roll?.value)).toEqual([80])
  })
})
