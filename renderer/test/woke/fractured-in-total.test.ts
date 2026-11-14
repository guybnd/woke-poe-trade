// A fractured mod whose explicit copy is folded into a pseudo total still gets
// a row of its own, so PoE mode's "Fractured only" can search it.
import { describe, it, expect, beforeAll } from 'vitest'
import { loadGameData, fixture, parseItem } from '../helpers/game-data'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { fracturedIds } from '@/web/woke/price-insight/poe-kind'

function rows (text: string) {
  return initUiModFilters(parseItem(text), { searchStatRange: 10 }).filter((f): f is StatFilter => !f.group)
}

describe('fractured mod inside a total', () => {
  beforeAll(loadGameData)

  it('lists the fractured res line as an unticked explicit row with Fractured only', () => {
    const list = rows(fixture('items/rare-shield-fractured-res.txt'))
    const frac = list.filter(f => f.statRef === '+#% to Cold and Chaos Resistances')
    expect(frac).toHaveLength(1)
    expect(frac[0].tag).toBe('explicit')
    expect(frac[0].hidden).toBeFalsy()
    expect(frac[0].disabled).toBe(true)
    expect(frac[0].tradeId).toEqual(['explicit.stat_3393628375'])
    expect(fracturedIds(frac[0])).toEqual(['fractured.stat_3393628375'])
    // The totals still count it and stay ticked.
    expect(list.find(f => f.statRef === '+#% total to Chaos Resistance')?.disabled).toBe(false)
  })

  it('sits where the mod sits on the item, before the next suffix', () => {
    const list = rows(fixture('items/rare-shield-fractured-res.txt'))
    const at = (ref: string) => list.findIndex(f => f.statRef === ref)
    expect(at('+#% to Cold and Chaos Resistances')).toBeLessThan(at('#% increased Stun and Block Recovery'))
  })

  it('keeps the hidden twin when the explicit row is still listed', () => {
    const text = fixture('items/rare-shield-fractured-res.txt')
      .replace('{ Suffix Modifier "of Steel Skin"', '{ Fractured Suffix Modifier "of Steel Skin"')
    const stun = rows(text).filter(f => f.statRef === '#% increased Stun and Block Recovery')
    expect(stun.map(f => f.tag).sort()).toEqual(['explicit', 'fractured'])
    expect(stun.find(f => f.tag === 'fractured')?.hidden).toBeTruthy()
  })
})
