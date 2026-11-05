import { describe, expect, it } from 'vitest'
import { BOSSES } from '@/web/woke/boss-runs/bosses'
import { bossesAtLevel, cardDrops, evaluateBoss, killDropPrice, priceResolver } from '@/web/woke/boss-runs/calc'
import type { BossPrefs, DropRow } from '@/web/woke/boss-runs/calc'
import { arenaBosses } from '@/web/woke/shared/zone'

const prefs = (over: Partial<BossPrefs> = {}) => ({
  runSeconds: {}, rates: {}, extraDrops: {}, kills: {}, ownEntry: false, plannedRuns: 0, dropToggles: {}, priceModes: {}, customPrices: {}, ...over
}) as BossPrefs
const boss = (id: string) => BOSSES.find(b => b.id === id)!
const noPrices = priceResolver([])
const inArena = (areaId: string) => BOSSES.filter(b => arenaBosses(areaId, '').includes(b.id))

describe('boss runs card', () => {
  it('picks the tier from the area level', () => {
    const ids = (areaId: string, level: number | null) => bossesAtLevel(inArena(areaId), level).map(b => b.id)
    expect(ids('MapWorldsPrimordialBoss4', 84)).toEqual(['eater'])
    expect(ids('MapWorldsPrimordialBoss4', 85)).toEqual(['uber-eater'])
    expect(ids('MapWorldsElderArenaUber', 84)).toEqual(['uber-elder'])
    expect(ids('MapWorldsElderArenaUber', 85)).toEqual(['uber-uber-elder'])
    expect(ids('AtlasExilesBoss5', 84)).toEqual(['sirus'])
    expect(ids('Synthesis_MapBoss', 85)).toEqual(['uber-cortex'])
    expect(ids('MapWorldsPrimordialBoss4', null).sort()).toEqual(['eater', 'uber-eater'])
    // Only one tier in this arena: keep it at any level.
    expect(ids('MapAtziri2', 80)).toEqual(['uber-atziri'])
  })

  it('only bosses with no known source lack a drop list', () => {
    expect(BOSSES.filter(b => !b.drops.length).map(b => b.id)).toEqual(['lazeth', 'feared'])
  })

  it('leads with the most valuable drops, known chance or not', () => {
    const row = (name: string, price: number | null, value: number) => ({ name, price, value }) as DropRow
    const rows = [row('cheap', 40, 16), row('key', 8000, 0), row('unpriced', null, 0)]
    expect(cardDrops(rows, 2).map(d => d.name)).toEqual(['key', 'cheap'])
    expect(rows[0].name).toBe('cheap')
  })

  it("doesn't turn a few kills into rates for a boss with none", () => {
    const kills = (n: number) => Array.from({ length: n }, (_, i) => ({ ts: i, drops: [{ name: 'Forbidden Flame', qty: 1 }] }))
    const flame = (n: number) => evaluateBoss(boss('exarch'), prefs({ kills: { exarch: kills(n) } }), noPrices)
      .drops.find(d => d.name === 'Forbidden Flame')!
    expect(flame(1).chance).toBeNull()
    expect(flame(4).chance).toBeNull()
    expect(flame(5).chance).toBe(1)
  })

  it('prices a logged drop like its row', () => {
    const prices = priceResolver([
      { name: 'Forbidden Flame', variant: 'a', chaos: 100 },
      { name: 'Forbidden Flame', variant: 'b', chaos: 300 },
      { name: 'Forbidden Flame', variant: 'c', chaos: 900 }
    ] as Parameters<typeof priceResolver>[0])
    expect(killDropPrice({ name: 'Forbidden Flame' }, prices, prefs())).toBe(300)
    expect(killDropPrice({ name: 'Forbidden Flame' }, prices, prefs({ priceModes: { 'Forbidden Flame': 'custom' }, customPrices: { 'Forbidden Flame': 5000 } }))).toBe(5000)
  })
})
