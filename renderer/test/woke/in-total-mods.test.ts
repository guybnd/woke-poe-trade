// The local mods behind a property total (Energy Shield, weapon DPS) come back
// as unticked rows, so PoE mode can list them as the game's tooltip does.
import { describe, it, expect, beforeAll } from 'vitest'
import { loadGameData, fixture, parseItem } from '../helpers/game-data'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { skipsTopMods } from '@/web/woke/price-insight/search-scope'

function rows (name: string) {
  const item = parseItem(fixture(`items/${name}`))
  return initUiModFilters(item, { searchStatRange: 10 }).filter((f): f is StatFilter => !f.group)
}

describe('local mods in a property total', () => {
  beforeAll(loadGameData)

  it('lists the Energy Shield mods once each, unticked, after the total', () => {
    const list = rows('rare-body-armour-es.txt')
    const es = list.findIndex(f => f.tradeId[0] === 'item.energy_shield')
    const local = list.filter(f => f.inTotal)
    expect(es).toBeGreaterThanOrEqual(0)
    expect(local.map(f => f.statRef)).toEqual(['#% increased Energy Shield'])
    expect(local[0].roll?.value).toBe(162)
    expect(local[0].sources).toHaveLength(2)
    expect(local[0].tradeId[0]).toMatch(/^explicit\./)
    expect(local.every(f => f.disabled && !f.hidden)).toBe(true)
    expect(list.indexOf(local[0])).toBeGreaterThan(es)
  })

  it('keeps the item order: the ES prefix sits before the life total and the recovery line', () => {
    const list = rows('rare-body-armour-es.txt')
    const at = (ref: string) => list.findIndex(f => f.statRef === ref && f.tag !== 'pseudo')
    expect(at('#% increased Energy Shield')).toBeLessThan(at('#% increased Stun and Block Recovery'))
    const life = list.findIndex(f => f.statRef === '+# total maximum Life')
    expect(life).toBeGreaterThanOrEqual(0)
    expect(at('#% increased Energy Shield')).toBeLessThan(life)
  })

  it('adds nothing for items without a property total', () => {
    expect(rows('rare-ring.txt').some(f => f.inTotal)).toBe(false)
  })
})

describe('local mods in a property total, other uses', () => {
  beforeAll(loadGameData)

  it('a fractured local mod is listed once', () => {
    const list = rows('rare-fractured.txt')
    const local = list.filter(f => f.inTotal)
    expect(local.length).toBeGreaterThan(0)
    for (const f of local) {
      expect(list.filter(o => o.sources === f.sources)).toHaveLength(1)
    }
  })

  it('an unticked local mod does not count as a skipped top mod', () => {
    const item = parseItem(fixture('items/rare-body-armour-es.txt'))
    const stats = initUiModFilters(item, { searchStatRange: 10 })
    const plain = stats.filter(f => f.group || !f.inTotal)
    expect(skipsTopMods(item, stats)).toBe(skipsTopMods(item, plain))
  })
})
