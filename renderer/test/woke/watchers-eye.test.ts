// Watcher's Eye finder: the aura mods come from the tooltip's unique data,
// every one reads back in the price check as a ticked trade filter, and the
// trade search names them.
import fs from 'fs'
import path from 'path'
import { beforeAll, describe, expect, it } from 'vitest'
import { loadGameData, parseItem } from '../helpers/game-data'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { weStatId } from '@/web/woke/watchers-eye/trade'
import { WATCHERS_EYE, WE_AURAS, auraOfGem, byAura, clampMin, rolledLine, weItemText, weMods, weTradeQuery } from '@/web/woke/watchers-eye/mods'

beforeAll(loadGameData)

const UNIQUES = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../public/data/tips/uniques.json'), 'utf8'))
const LINES: string[] = UNIQUES[WATCHERS_EYE].v[0].e
const MODS = weMods(LINES)

function filtersOf (text: string): StatFilter[] {
  return initUiModFilters(parseItem(text), { searchStatRange: 10 }).filter((f): f is StatFilter => !('group' in f && f.group))
}

describe("Watcher's Eye mods", () => {
  it('lists 87 aura mods across 17 auras, without the base lines', () => {
    expect(MODS.length).toBe(87)
    expect(new Set(MODS.map(m => m.aura)).size).toBe(WE_AURAS.length)
    expect(MODS.some(m => /maximum Life$/.test(m.line))).toBe(false)
    // A line the data wraps reads as one line.
    expect(MODS.some(m => m.line.includes('\n'))).toBe(false)
    // "Unaffected by Bleeding while affected by Malevolence" is Malevolence's, not an aura called Bleeding.
    expect(MODS.find(m => m.line.startsWith('Unaffected by Bleeding'))?.aura).toBe('Malevolence')
    expect(MODS.find(m => m.line.includes('Intimidate'))?.aura).toBe('Pride')
  })

  it('groups by the auras asked for, in a fixed order', () => {
    const g = byAura(MODS, ['Grace', 'Hatred'])
    expect(g.map(x => x.aura)).toEqual(['Hatred', 'Grace'])
    expect(g[0].mods.length).toBe(5)
  })

  it('reads aura gems, Vaal ones too', () => {
    expect(auraOfGem('Vaal Grace')).toBe('Grace')
    expect(auraOfGem('Purity of Fire')).toBe('Purity of Fire')
    expect(auraOfGem('Fireball')).toBe(null)
  })

  it('every mod reads back in the price check as a ticked filter with a trade id', () => {
    for (const m of MODS) {
      const fs = filtersOf(weItemText(MODS, [{ id: m.id }]))
      const mine = fs.filter(f => !/maximum (Life|Mana|Energy Shield)$/.test(f.statRef))
      expect(mine.length, m.line).toBe(1)
      expect(mine[0].tradeId[0], m.line).toMatch(/^explicit\./)
      expect(mine[0].disabled, m.line).toBe(false)
      // The window's own lookup (for the trade site) finds the same stat.
      expect(weStatId(m), m.line).toBe(mine[0].tradeId[0])
      // Any roll: the filter starts at the bottom of the range.
      if (m.tunable && mine[0].roll) expect(mine[0].roll.min, m.line).toBeLessThanOrEqual(m.ranges[0].lo)
    }
    // The base lines stay off: they barely move the price.
    const base = filtersOf(weItemText(MODS, [{ id: MODS[0].id }])).filter(f => /maximum Life$/.test(f.statRef))
    expect(base.every(f => f.disabled)).toBe(true)
  })

  it('a minimum rolls the line there, inside its range', () => {
    const pen = MODS.find(m => m.line.startsWith('Damage Penetrates (10-15)% Cold'))!
    expect(clampMin(pen, 13)).toBe(13)
    expect(clampMin(pen, 99)).toBe(15)
    expect(clampMin(pen, 10)).toBe(null)
    expect(rolledLine(pen, 13)).toBe('Damage Penetrates 13(10-15)% Cold Resistance while affected by Hatred')
    const f = filtersOf(weItemText(MODS, [{ id: pen.id, min: 13 }])).find(f => f.statRef.includes('Cold Resistance while affected by Hatred'))!
    expect(f.roll!.min).toBeGreaterThanOrEqual(12)
    const adds = MODS.find(m => m.line.startsWith('Adds'))!
    expect(adds.tunable).toBe(false)
  })

  it('the trade search asks for all picks, or a count of them', () => {
    const picks = MODS.filter(m => m.aura === 'Hatred').slice(0, 3).map(m => ({ id: m.id }))
    const stat = () => 'explicit.stat_1'
    const all = weTradeQuery(MODS, picks, stat, { status: 'securable' })
    expect(all.query.name).toBe(WATCHERS_EYE)
    expect(all.query.stats[0].type).toBe('and')
    expect(all.query.stats[0].filters.length).toBe(3)
    const two = weTradeQuery(MODS, picks, stat, { status: 'securable', atLeast: 2 })
    expect(two.query.stats[0]).toMatchObject({ type: 'count', value: { min: 2 } })
  })
})
