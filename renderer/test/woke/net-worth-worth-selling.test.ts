// Net worth's Worth selling: holdings falling over the week that you hold a
// real amount of, with thin markets, held prices and your own prices left out.
import { describe, it, expect } from 'vitest'
import { change7d, sellMinChaos, worthSelling } from '@/web/woke/net-worth/ledger'
import { worthSellingLookup } from '@/web/woke/search/lookups/net-worth'
import type { Glance } from '@/web/woke/net-worth/glance'
import type { LookupContext } from '@/web/woke/search/lookups/types'

type L = Parameters<typeof worthSelling>[0][number]
const line = (key: string, chaos: number, graph: Array<number | null>, more: Partial<L> = {}): L =>
  ({ key, name: key, icon: '', count: 10, chaos, graph, ...more })

describe('change7d', () => {
  it('is the first priced day to the last', () => {
    expect(change7d([0, -5, -10, -15, -20, -25, -50])).toBeCloseTo(-0.5)
    expect(change7d([null, null, 10, 5, 0, -5, -12])).toBeCloseTo(0.88 / 1.1 - 1)
  })
  it('needs 3 days apart and a price today', () => {
    expect(change7d([null, null, null, null, 0, -5, -12])).toBeNull()
    expect(change7d([0, -5, -10, -15, -20, -25, null])).toBeNull()
    expect(change7d(undefined)).toBeNull()
  })
})

describe('worthSelling', () => {
  const min = 150
  it('lists a slide over the week, biggest holding first', () => {
    const out = worthSelling([
      line('ember', 1600, [0, -5, -10, -15, -20, -25, -57]),
      line('hh', 31500, [0, -2, -4, -6, -8, -10, -20])
    ], min)
    expect(out.map(x => x.key)).toEqual(['hh', 'ember'])
    expect(out[1].d1).toBeCloseTo(0.43 / 0.75 - 1)
    expect(out[1].d7).toBeCloseTo(-0.57)
    // Worth 1600 / 0.43 a week ago.
    expect(out[1].lostChaos).toBeCloseTo(1600 / 0.43 - 1600)
  })
  it('skips a one-day dip on a steady week and a slow week with a flat day', () => {
    expect(worthSelling([line('dip', 500, [0, 1, 2, 1, 2, 1, -8])], min)).toEqual([])
    expect(worthSelling([line('flat', 500, [0, -5, -10, -15, -20, -25, -25])], min)).toEqual([])
  })
  it('takes a sharp drop today when the week is down too', () => {
    expect(worthSelling([line('sharp', 500, [0, 2, 3, 4, 5, 6, -16])], min).map(x => x.key)).toEqual(['sharp'])
    // Up on the week even after the drop: not falling.
    expect(worthSelling([line('up', 500, [0, 20, 40, 60, 80, 100, 50])], min)).toEqual([])
  })
  it('skips small holdings, thin markets, held and own prices', () => {
    const g = [0, -5, -10, -15, -20, -25, -50]
    expect(worthSelling([
      line('small', 100, g),
      line('thin', 500, [0, null, -10, null, -20, null, -50]),
      line('mine', 500, g, { mine: true }),
      line('held', 500, g, { heldSince: 1, heldKind: 'jump' }),
      line('unpriced', 500, g, { state: 'unpriced' }),
      line('short', 500, [-50])
    ], min)).toEqual([])
  })
  it('counts 1 divine, or 150 chaos with no rate', () => {
    expect(sellMinChaos(220)).toBe(220)
    expect(sellMinChaos(null)).toBe(150)
  })
})

describe('Ctrl+Space worth selling', () => {
  const ctx = { divine: 200, now: 0 } as unknown as LookupContext
  const glance: Glance = { league: 'L', at: 0, chaos: 1, netChaos: null, divine: 200, selling: [{ name: 'Allflame Ember of the Ethereal', count: 20, chaos: 2140, d1: -0.43, d7: -0.55, lostChaos: 2600 }] }
  it('answers "sell" with the saved list, each row an item', () => {
    const [card] = worthSellingLookup(glance)('sell', ctx)
    expect(card.name).toBe('Worth selling: 1 item falling')
    expect(card.sections[0].rows?.[0]).toMatchObject({ label: '20 × Allflame Ember of the Ethereal', item: { name: 'Allflame Ember of the Ethereal' }, note: '−43% · 7d −55%', chaos: 2140 })
  })
  it('stays out of item searches and older glances', () => {
    expect(worthSellingLookup(glance)('sel', ctx)).toEqual([])
    expect(worthSellingLookup(glance)('selling', ctx)).toHaveLength(1)
    expect(worthSellingLookup({ ...glance, selling: undefined })('sell', ctx)).toEqual([])
  })
})
