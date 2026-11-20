import { describe, expect, it } from 'vitest'
import { evaluateBoss, priceResolver } from '@/web/woke/boss-runs/calc'
import type { BossPrefs } from '@/web/woke/boss-runs/calc'
import { expectedFragments, NIGHTMARE_MAPS, nightmareBosses, UBER_FRAGMENTS } from '@/web/woke/boss-runs/nightmare'
import type { PriceItem } from '@/web/woke/market/types'

const prefs = (over: Partial<BossPrefs> = {}) => ({
  runSeconds: {}, rates: {}, extraDrops: {}, kills: {}, ownEntry: false, plannedRuns: 0, dropToggles: {}, priceModes: {}, customPrices: {}, ...over
}) as BossPrefs

const item = (type: string, name: string, chaos: number) => ({ type, name, variant: '', chaos }) as unknown as PriceItem
// poe.ninja Covens, 2026-11-20.
const prices = priceResolver([
  item('Map', 'Nightmare Map', 65),
  item('Fragment', 'Reality Fragment', 143.4),
  item('Fragment', 'Awakening Fragment', 19.7),
  item('Fragment', 'Decaying Fragment', 78.76),
  item('Fragment', 'Blazing Fragment', 19.48),
  item('Fragment', 'Devouring Fragment', 177.2),
  item('Fragment', 'Cosmic Fragment', 130.6),
  item('Fragment', 'Synthesising Fragment', 12.58),
  item('Fragment', 'Lonely Fragment', 11.6),
  item('Fragment', 'Traumatic Fragment', 7.7),
  item('Fragment', 'Reverent Fragment', 126.2),
  item('UniqueArmour', 'Wraithlord', 6),
  item('UniqueWeapon', 'The Dark Seer', 646.2)
])

const result = (id: string, over: Partial<BossPrefs> = {}) =>
  evaluateBoss(nightmareBosses(over.nightmareFrags).find(b => b.id === id)!, prefs(over), prices)

describe('nightmare map bosses', () => {
  it('favours each boss\'s fragments and keeps the fragment count', () => {
    for (const map of NIGHTMARE_MAPS) {
      const e = expectedFragments(map, 2)
      const total = [...e.values()].reduce((a, b) => a + b, 0)
      expect(total).toBeCloseTo(2)
      const favoured = map.favoured.reduce((n, f) => n + e.get(f)!, 0)
      expect(favoured).toBeCloseTo(1.6)
      for (const f of map.favoured) expect(UBER_FRAGMENTS).toContain(f)
    }
  })

  it('costs a Nightmare Map and prices the fragments as estimates', () => {
    const r = result('nightmare-ziggurat')
    expect(r.entry).toBe(65)
    expect(r.ready).toBe(true)
    // Ten fragments and the boss's unique.
    expect(r.estimated).toBe(UBER_FRAGMENTS.length + 1)
    // 2 a kill: Devouring and Blazing 0.8 each, the other 8 at 0.05 each; Wraithlord 5%.
    expect(r.loot).toBeCloseTo(0.8 * (177.2 + 19.48) + 0.05 * (727.22 - 196.68) + 0.05 * 6, 1)
    expect(r.drops.find(d => d.name === 'Devouring Fragment')!.rateSource).toBe('estimate')
  })

  it("counts the boss's own unique", () => {
    const d = result('nightmare-sanctuary').drops.find(d => d.name === 'The Dark Seer')!
    expect(d.rateSource).toBe('estimate')
    expect(d.value).toBeCloseTo(0.05 * 646.2)
  })

  it('ranks Ziggurat above Fortress at these prices', () => {
    expect(result('nightmare-ziggurat').profit).toBeGreaterThan(result('nightmare-fortress').profit)
  })

  it('moves copies past one a kill into the quantity', () => {
    const r = result('nightmare-abomination', { nightmareFrags: 4 })
    const reality = r.drops.find(d => d.name === 'Reality Fragment')!
    expect(reality.chance).toBe(1)
    expect(reality.qty).toBeCloseTo(1.6)
    expect(r.loot).toBeCloseTo(2 * result('nightmare-abomination').loot, 1)
  })

  it('lets a typed rate win over the estimate', () => {
    const r = result('nightmare-fortress', { rates: { 'nightmare-fortress': { 'Decaying Fragment': 1 } } })
    const d = r.drops.find(d => d.name === 'Decaying Fragment')!
    expect(d.rateSource).toBe('custom')
    expect(d.value).toBeCloseTo(78.76)
  })

  it('drops the estimate\'s extra copies once a typed rate replaces it', () => {
    const r = result('nightmare-abomination', { nightmareFrags: 4, rates: { 'nightmare-abomination': { 'Reality Fragment': 0.8 } } })
    const d = r.drops.find(d => d.name === 'Reality Fragment')!
    expect(d.qty).toBe(1)
    expect(d.value).toBeCloseTo(0.8 * 143.4)
  })

  it('reads the kill log as copies a kill', () => {
    const kill = (qty: number) => ({ ts: 0, drops: [{ name: 'Reverent Fragment', qty }] })
    const kills = { 'nightmare-sanctuary': [kill(2), kill(2), kill(1), kill(2), kill(1)] }
    const d = result('nightmare-sanctuary', { kills }).drops.find(d => d.name === 'Reverent Fragment')!
    expect(d.rateSource).toBe('mine')
    expect(d.chance! * d.qty).toBeCloseTo(1.6)
    expect(d.value).toBeCloseTo(1.6 * 126.2)
  })

  it('falls back to 2 a kill for a bad setting', () => {
    expect(nightmareBosses(0)[0].estimates).toEqual(nightmareBosses(undefined)[0].estimates)
    expect(nightmareBosses(Number.NaN)[0].estimates).toEqual(nightmareBosses(2)[0].estimates)
  })
})
