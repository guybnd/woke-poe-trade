// Guy's pick (2026-11-14): on a fractured item the fractured mod leads. No total
// takes it in, and its own row sits at the top, ticked, searching fractured.
import { describe, it, expect, beforeAll } from 'vitest'
import { loadGameData, fixture, parseItem } from '../helpers/game-data'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { fracturedIds } from '@/web/woke/price-insight/poe-kind'

const REF = '+#% to Cold and Chaos Resistances'
const SHIELD = 'items/rare-shield-fractured-res.txt'

function rows (text: string) {
  return initUiModFilters(parseItem(text), { searchStatRange: 10 }).filter((f): f is StatFilter => !f.group)
}

describe('fractured mod first', () => {
  beforeAll(loadGameData)

  it('lists the fractured mod once, first after the properties, ticked and fractured only', () => {
    const list = rows(fixture(SHIELD))
    const frac = list.filter(f => f.statRef === REF)
    expect(frac).toHaveLength(1)
    expect(frac[0].hidden).toBeFalsy()
    expect(frac[0].disabled).toBe(false)
    expect(frac[0].tradeId).toEqual(['fractured.stat_3393628375'])
    // PoE mode's chip is there, on, so it can switch back to any copy.
    expect(fracturedIds(frac[0])).toEqual(['fractured.stat_3393628375'])
    const firstMod = list.findIndex(f => f.tag !== 'property')
    expect(list[firstMod]).toBe(frac[0])
  })

  it('leaves it out of every total', () => {
    const list = rows(fixture(SHIELD))
    for (const f of list.filter(f => f.tag === 'pseudo')) {
      expect(f.sources.some(s => s.modifier.info.type === 'fractured')).toBe(false)
    }
    // Only the +5% all-res line is left: 5 to each of three.
    expect(list.find(f => f.statRef === '+#% total Elemental Resistance')?.roll?.value).toBe(15)
    expect(list.some(f => f.statRef === '+#% total to Chaos Resistance')).toBe(false)
  })

  it('a same-stat mod stays in the total while the fractured one leads', () => {
    const text = fixture(SHIELD).replace(
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
      ].join('\n')).replace('{ Fractured Suffix Modifier "of the Order"', '{ Suffix Modifier "of the Order"')
    const list = rows(text)
    const frac = list.filter(f => f.tradeId[0]?.startsWith('fractured.'))
    expect(frac.map(f => [f.statRef, f.roll?.value])).toEqual([['+# to maximum Life', 80]])
    const life = list.find(f => f.statRef === '+# total maximum Life')
    expect(life?.roll?.value).toBe(20)
  })

  it('a corrupted fractured item leads with it too', () => {
    const list = rows(fixture(SHIELD).replace('Fractured Item', 'Fractured Item\n--------\nCorrupted'))
    const frac = list.filter(f => f.statRef === REF)
    expect(frac).toHaveLength(1)
    expect(frac[0].tradeId).toEqual(['fractured.stat_3393628375'])
  })

  it('an item without a fractured mod is untouched', () => {
    const list = rows(fixture(SHIELD).replace('Fractured Suffix Modifier', 'Suffix Modifier').replace('\n--------\nFractured Item', ''))
    expect(list.some(f => f.tradeId[0]?.startsWith('fractured.'))).toBe(false)
    expect(list.find(f => f.statRef === '+#% total to Chaos Resistance')?.roll?.value).toBe(18)
  })
})
