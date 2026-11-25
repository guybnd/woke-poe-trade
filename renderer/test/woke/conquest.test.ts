// The keystone each conqueror gives (related-family/conquest.ts) and a click
// on one in the side list (conquest-pick.ts).
import fs from 'fs'
import path from 'path'
import { describe, it, expect, beforeAll } from 'vitest'
import { loadGameData, fixture, parseItem } from '../helpers/game-data'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import type { FilterGroup } from '@/web/price-check/filters/interfaces'
import { ABYSS, CONQUEST_TRADE_PREFIX, EMBLEMS, TIMELESS, ownConquerorId } from '@/web/woke/related-family/conquest'
import { applyConquestPick } from '@/web/woke/related-family/conquest-pick'

const STATS = fs.readFileSync(path.resolve(__dirname, '../../public/data/en/stats.ndjson'), 'utf-8')
const ITEMS = fs.readFileSync(path.resolve(__dirname, '../../public/data/en/items.ndjson'), 'utf-8')

describe('conquest keystones', () => {
  beforeAll(loadGameData)

  it('names a trade id the stat data has, for every conqueror', () => {
    const ids = [...Object.values(TIMELESS).flat(), ...ABYSS].map(c => `"${CONQUEST_TRADE_PREFIX}${c.id}"`)
    expect(ids).toHaveLength(23)
    for (const id of ids) expect(STATS.includes(id), id).toBe(true)
  })

  it('has three conquerors and keystones on each Timeless jewel', () => {
    expect(Object.keys(TIMELESS).sort()).toEqual(['Brutal Restraint', 'Elegant Hubris', 'Glorious Vanity', 'Heroic Tragedy', 'Lethal Pride', 'Militant Faith'])
    for (const list of Object.values(TIMELESS)) {
      expect(list).toHaveLength(3)
      for (const c of list) expect(c.keystone?.stats.length).toBeGreaterThan(0)
    }
    expect(TIMELESS['Elegant Hubris'].map(c => [c.name, c.keystone!.name])).toEqual([
      ['Cadiro', 'Supreme Decadence'], ['Victario', 'Supreme Grandstanding'], ['Caspiro', 'Supreme Ostentation']
    ])
  })

  it('lists items the data has', () => {
    for (const name of [...ABYSS.map(a => a.jewel), ...EMBLEMS.map(e => e.emblem), ...EMBLEMS.map(e => e.jewel)]) {
      expect(ITEMS.includes(`"refName":"${name}"`), name).toBe(true)
    }
  })

  it('finds the checked jewel\'s conqueror and searches another one with no number', () => {
    const item = parseItem(fixture('items/unique-brutal-restraint-330.txt'))
    expect(ownConquerorId(item.statsByType)).toBeTruthy()
    const stats = initUiModFilters(item, { searchStatRange: 10 })
    expect(applyConquestPick(stats, 'nasima')).toBe(true)
    const group = stats.find((f): f is FilterGroup => 'group' in f && f.group === 'one')!
    expect(group.meta.disabled).toBe(false)
    const on = group.stats.filter(f => !f.disabled)
    expect(on).toHaveLength(1)
    expect(on[0].tradeId).toContain(`${CONQUEST_TRADE_PREFIX}nasima`)
    expect([on[0].roll?.min, on[0].roll?.max]).toEqual(['', ''])
    // The others keep their numbers.
    expect(group.stats.filter(f => f.disabled).every(f => f.roll?.min === 7993)).toBe(true)
    expect(applyConquestPick(stats, 'cadiro')).toBe(false)
  })
})
