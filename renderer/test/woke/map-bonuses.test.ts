// What each map mod gives (poedb, 3.30): the data file, Map mods' row numbers
// and the search palette's cards.
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadGameData } from '../helpers/game-data'
import { allAreaMods, tier17Mods } from '@/web/woke/map-mods/data'
import { bestBonus, bonusTip, modsOfLine, rowBonus, sortValue, wantsFor } from '@/web/woke/map-mods/bonuses'
import type { MapBonusData } from '@/web/woke/map-mods/bonuses'
import { mapBonusLookup } from '@/web/woke/search/lookups/map-bonus'
import type { LookupContext } from '@/web/woke/search/lookups/types'

beforeAll(loadGameData)

const data = JSON.parse(readFileSync(join(__dirname, '../../public/data/map-bonuses.json'), 'utf8')) as MapBonusData
const ctx: LookupContext = { price: () => null, items: [], tools: new Set(['woke-map-mods']), divine: 100, now: 0, league: null }
const lookup = mapBonusLookup(data)

describe('map bonus data', () => {
  it('has every tier page and the T17 more-X bonuses', () => {
    expect(data.mods.length).toBeGreaterThan(150)
    const fecund17 = data.mods.find(m => m.n === 'Fecund' && m.t.includes('t17'))!
    expect(fecund17).toMatchObject({ d: 13, r: 8, p: 5, m: { currency: 47 } })
    expect(data.mods.filter(m => m.m && !m.t.includes('t17'))).toEqual([])
    // Every line is tied to a stat, so a Map mods row can find it.
    for (const m of data.mods) expect(m.refs.length, m.n).toBeGreaterThan(0)
  })

  it('most Map mods rows get numbers', () => {
    const rows = allAreaMods()
    const withData = rows.filter(r => modsOfLine(data, r).length)
    expect(withData.length / rows.length).toBeGreaterThan(0.5)
  })
})

describe('row numbers', () => {
  it('a T17-only line shows the T17 mod', () => {
    const line = [...tier17Mods()].find(l => l.startsWith('Players are assaulted by Bloodstained Sawblades'))!
    const b = rowBonus(modsOfLine(data, line))!
    expect(b).toMatchObject({ d: 13, r: 8, p: 5 })
    expect(b.more).toEqual([{ kind: 'currency', pct: 47, t17: false }])
  })

  it('a shared line shows the regular numbers and the T17 bonus, marked T17', () => {
    const mods = modsOfLine(data, '#% more Monster Life')
    const b = rowBonus(mods)!
    expect(b.more).toEqual([{ kind: 'currency', pct: 47, t17: true }])
    expect(bestBonus(mods, 'currency')).toBe(47)
    // With T17 mods hidden, no T17 bonus.
    const regular = modsOfLine(data, '#% more Monster Life', false)
    expect(bestBonus(regular, 'currency')).toBe(0)
    expect(rowBonus(regular)!.more).toEqual([])
  })

  it('sorts by the numbers the row shows', () => {
    // of Giants shows 13 Atlas Drops; T17 Magnifying's 19 shares the line.
    const mods = modsOfLine(data, 'Monsters have #% increased Area of Effect')
    expect(sortValue(mods, 'd')).toBe(rowBonus(mods)!.d)
    expect(sortValue(mods, 'd')).toBeLessThan(bestBonus(mods, 'd'))
  })

  it('want all skips lines a T17 mod shares with a regular one', () => {
    expect(wantsFor(modsOfLine(data, '#% more Monster Life'), 'currency')).toBe(false)
    const saw = [...tier17Mods()].find(l => l.startsWith('Players are assaulted by Bloodstained Sawblades'))!
    expect(wantsFor(modsOfLine(data, saw), 'currency')).toBe(true)
    expect(wantsFor(modsOfLine(data, saw), 'maps')).toBe(false)
  })

  it('the tooltip names each mod, its tiers, lines and bonuses', () => {
    const tip = bonusTip(modsOfLine(data, '#% more Monster Life'), '2026-11-23')
    expect(tip).toContain('Fecund (T17)\n(90-100)% more Monster Life\n13% Atlas Drops · 8% rarity · 5% pack size · 47% more Currency')
    expect(tip).toContain('Fecund (top tier)')
    expect(tip.endsWith('Bonuses from poedb, 2026-11-23')).toBe(true)
  })
})

describe('search palette', () => {
  it('"more currency" lists the mods with that bonus, best first', () => {
    const [card] = lookup('more currency', ctx)
    expect(card.name).toBe('Map mods with more Currency')
    const rows = card.sections[0].table!.rows
    expect(rows[0].cells[1]).toBe('+64%')
    expect(card.actions[0]).toEqual({ label: 'Open Map mods', tool: 'woke-map-mods' })
    expect(lookup('threads map mods', ctx)[0].name).toBe('Map mods with more Threads')
    expect(lookup('maps', ctx)).toEqual([])
  })

  it('a mod name shows each tier, and text finds mods too', () => {
    const [card] = lookup('fecund', ctx)
    expect(card.name).toBe('Map mod: Fecund')
    expect(card.sections.map(s => s.label)).toContain('Fecund · T17')
    expect(lookup('grasping vines mod', ctx)[0].name).toBe('Map mods with "grasping vines"')
    expect(lookup('map mods of ven', ctx)[0].name).toBe('Map mod: of Venom')
  })

  it('stays out of ordinary searches', () => {
    for (const q of ['chaos', 'power', 'flask', 'grasping vines', 'solar guard']) expect(lookup(q, ctx), q).toEqual([])
  })
})
