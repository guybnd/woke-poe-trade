// The right-click menu's tier lines (Next tier up, All tiers) and remembered ticks.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { loadGameData, parseItem } from '../helpers/game-data'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { boundAt, splitFilters } from '@/web/woke/price-insight/pseudo-split'
import { tierLadder } from '@/web/woke/ui/tooltip/mod-tiers'
import type { TierData } from '@/web/woke/ui/tooltip/mod-tiers'
import { rowLadder } from '@/web/woke/price-insight/tier-ladder'

const config: { wokeTickPrefs?: Record<string, 'on' | 'off'> } = {}
vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}'), onEvent: () => {}, sendEvent: () => {} } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => config,
  saveConfig: () => {},
  saveConfigQuietly: () => {},
  poeWebApi: () => 'www.pathofexile.com'
}))

const DATA = JSON.parse(readFileSync(join(__dirname, '../../public/data/mod-tiers.json'), 'utf8')) as TierData

const RING = `Item Class: Rings
Rarity: Rare
Woe Loop
Gold Ring
--------
Item Level: 84
--------
{ Prefix Modifier "Rotund" (Tier: 4) — Life }
+64(55-69) to maximum Life
`

describe('tier ladder', () => {
  beforeAll(loadGameData)

  it("lists a ring's life tiers best first and marks the roll's tier", () => {
    const ladder = tierLadder(DATA, 'Rings', '# to maximum Life', 64, 'prefix')!
    expect(ladder.steps[ladder.mine - 1]).toMatchObject({ min: 55, max: 69 })
    expect(ladder.steps[0].min).toBeGreaterThan(69)
    // Best first, no tier repeated.
    for (let i = 1; i < ladder.steps.length; i++) expect(ladder.steps[i].max).toBeLessThan(ladder.steps[i - 1].min)
  })

  it("gives the price check row's tiers when they agree with the item's own", () => {
    const item = parseItem(RING)
    const all = initUiModFilters(item, { searchStatRange: 10 }).filter((f): f is StatFilter => !f.group)
    const total = all.find(f => f.statRef === '+# total maximum Life')!
    const ladder = rowLadder(DATA, item, total)!
    expect(ladder.mine).toBe(4)
    const up = ladder.steps[1]
    expect(boundAt(total, up.min, up.max)).toBe(up.min)
    // The split row (one line per mod) has them too.
    const row = splitFilters(total, all, item, 10)[0]
    expect(rowLadder(DATA, item, row)?.mine).toBe(4)
  })

  it('gives none when the item shows a different tier than the data', () => {
    const item = parseItem(RING.replace('(Tier: 4)', '(Tier: 6)'))
    const all = initUiModFilters(item, { searchStatRange: 10 }).filter((f): f is StatFilter => !f.group)
    expect(rowLadder(DATA, item, all.find(f => f.statRef === '+# total maximum Life')!)).toBeNull()
  })
})

describe('remembered ticks', () => {
  beforeAll(loadGameData)

  it('ticks and unticks new price checks by the saved choice, and forgets it', async () => {
    const { applyTickPrefs, setTickPref, tickPref } = await import('@/web/woke/price-insight/tick-prefs')
    const rows = () => initUiModFilters(parseItem(RING), { searchStatRange: 10 }).filter((f): f is StatFilter => !f.group)
    const life = rows().find(f => f.statRef === '+# total maximum Life')!
    setTickPref(life, 'off')
    expect(life.disabled).toBe(true)
    const next = rows()
    applyTickPrefs(next)
    expect(next.find(f => f.statRef === '+# total maximum Life')!.disabled).toBe(true)
    setTickPref(life, 'on')
    const again = rows()
    applyTickPrefs(again)
    expect(again.find(f => f.statRef === '+# total maximum Life')!.disabled).toBe(false)
    setTickPref(life, undefined)
    expect(tickPref(life)).toBeUndefined()
    expect(config.wokeTickPrefs).toEqual({})
  })
})
