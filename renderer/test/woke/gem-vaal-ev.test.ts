// Vaal it? on a 20/20 gem: outcomes, their odds and prices, and the average.
import { describe, expect, it } from 'vitest'
import { corruptedPrice, vaalEv } from '@/web/woke/gem-versions/vaal-ev'
import { listVersions } from '@/web/woke/gem-versions/versions'

const OWN = { vaal: false, level: 20, quality: 20, corrupted: false }
const row = (variant: string, chaos: number, name = 'Tempest Shield') => ({ name, variant, chaos })

// Tempest Shield on poe.ninja, Guy's screenshot 2026-11-21 (1 div = 210c).
const TEMPEST = listVersions([
  row('1', 1), row('1/20', 7), row('1/23c', 10), row('20', 24), row('20c', 15), row('20/20', 116),
  row('20/20c', 119), row('20/23c', 180), row('21c', 200), row('21/20c', 483), row('21/23c', 1680)
], [], OWN)

describe('vaal it', () => {
  it('prices a missing corrupted version from the best one under it', () => {
    expect(corruptedPrice(TEMPEST, false, 20, 23)).toEqual({ chaos: 180 })
    expect(corruptedPrice(TEMPEST, false, 20, 15)).toEqual({ chaos: 15, est: 'priced as 20/0' })
    expect(corruptedPrice(TEMPEST, false, 19, 20).chaos).toBeNull()
  })

  it('adds up the outcomes of a gem with no Vaal form', () => {
    const r = vaalEv(TEMPEST, 1, false)!
    expect(r.now).toBe(116)
    const by = Object.fromEntries(r.outcomes.map(o => [o.id, o]))
    expect(by.same.chance).toBeCloseTo(0.5)
    expect(by.same.label).toMatch(/no Vaal form/)
    expect(by['level-up']).toMatchObject({ chance: 0.125, chaos: 483 })
    // A 19 levels back to 20.
    expect(by['level-down']).toMatchObject({ chance: 0.125, chaos: 119 })
    expect(by['q-cap']).toMatchObject({ chaos: 180 })
    expect(by['q-cap'].chance).toBeCloseTo(0.1)
    expect(by['q-up'].label).toBe('Quality 21–22')
    expect(by['q-up'].chance).toBeCloseTo(0.025)
    expect(by['q-down'].label).toBe('Quality 10–19')
    expect(by['q-down']).toMatchObject({ chaos: 15 })
    expect(by['q-down'].chance).toBeCloseTo(0.125)
    expect(r.outcomes.reduce((s, o) => s + o.chance, 0)).toBeCloseTo(1)
    // 0.625×119 + 0.125×483 + 0.1×180 + 0.025×119 + 0.125×15 − 1
    expect(r.ev).toBeCloseTo(0.625 * 119 + 0.125 * 483 + 0.1 * 180 + 0.025 * 119 + 0.125 * 15 - 1)
    expect(r.profit).toBeCloseTo(r.ev - 116)
    expect(r.gain + r.same + r.lose).toBeCloseTo(1)
    expect(r.unpriced).toBe(0)
  })

  it('uses the Vaal gem\'s own price for the Vaal form', () => {
    const rows = listVersions([row('20/20', 20, 'Arc'), row('20/20c', 18, 'Arc')], [row('20/20c', 60, 'Vaal Arc')], { ...OWN })
    const r = vaalEv(rows, 2, true)!
    const vaal = r.outcomes.find(o => o.id === 'vaal')!
    expect(vaal).toMatchObject({ chance: 0.25, chaos: 60, delta: 40 })
    expect(r.cost).toBe(2)
    // Level 21 has no row: no price, counted as nothing and said so.
    expect(r.outcomes.find(o => o.id === 'level-up')!.chaos).toBeNull()
    // Level 21 and quality 10–19.
    expect(r.unpriced).toBeCloseTo(0.25)
  })

  it('needs a clean and a corrupted 20/20 price', () => {
    expect(vaalEv(listVersions([row('20/20', 20)], [], OWN), 1, false)).toBeNull()
    expect(vaalEv(listVersions([row('20/20c', 20)], [], OWN), 1, false)).toBeNull()
  })
})

describe('vaal it in the search', async () => {
  const { vaalGemLookup } = await import('@/web/woke/search/lookups/vaal-gem')
  const items = [
    ['20/20', 116], ['20/20c', 119], ['20/23c', 180], ['20c', 15], ['21/20c', 483]
  ].map(([variant, chaos]) => ({ type: 'SkillGem', name: 'Tempest Shield', variant: variant as string, chaos: chaos as number }))
  const ctx = {
    price: (name: string) => name === 'Vaal Orb' ? 1 : null,
    items,
    tools: new Set<string>(),
    divine: 210,
    now: 0,
    league: null
  }

  it('answers "vaal <gem>" with the expected profit', () => {
    const [card] = vaalGemLookup('vaal tempest', ctx)
    expect(card.name).toBe('Tempest Shield 20/20: Vaal it?')
    expect(card.sub).toMatch(/^\+\d+ c on average/)
    expect(card.sections[1].table!.rows).toHaveLength(6)
  })

  it('stays out of other searches', () => {
    expect(vaalGemLookup('tempest shield', ctx)).toEqual([])
    expect(vaalGemLookup('vaal orb', ctx)).toEqual([])
  })
})

describe('versions table, clean and corrupted side by side', async () => {
  const { versionRows } = await import('@/web/woke/gem-versions/table')
  it('puts each level/quality on one row and measures it against your gem', () => {
    const own = listVersions([row('20/20', 116), row('20/20c', 119), row('21/20c', 483), row('1', 1)], [row('20/20c', 300, 'Vaal X')], { vaal: false, level: 20, quality: 20, corrupted: true })
    const rows = versionRows(own)
    expect(rows.map(r => `${r.level}/${r.quality}`)).toEqual(['1/0', '20/20', '21/20'])
    const r20 = rows[1]
    expect(r20).toMatchObject({ own: true, firstOfLevel: true })
    expect(r20.clean!.chaos).toBe(116)
    expect(r20.corrupted!.chaos).toBe(119)
    expect(r20.vaal!.chaos).toBe(300)
    expect(r20.delta).toBe(300 - 119)
    expect(rows[2].delta).toBe(483 - 119)
    expect(rows[0].firstOfLevel).toBe(false)
  })
})

describe('vaal it search, narrow', async () => {
  const { vaalGemLookup } = await import('@/web/woke/search/lookups/vaal-gem')
  const gem = (name: string) => [['20/20', 20], ['20/20c', 18]].map(([variant, chaos]) => ({ type: 'SkillGem', name, variant: variant as string, chaos: chaos as number }))
  const ctx = { price: () => null, items: [...gem('Arc'), ...gem('Arcane Cloak'), ...gem('Corrupting Fever')], tools: new Set<string>(), divine: 210, now: 0, league: null }
  it('prefers names that start with the query, and leaves "corrupting ..." gem names alone', () => {
    // Names that start with it, shortest first; "fever" deep inside a name doesn't count.
    expect(vaalGemLookup('vaal arc', ctx).map(c => c.id)).toEqual(['vaal-gem:Arc', 'vaal-gem:Arcane Cloak'])
    expect(vaalGemLookup('vaal fever', ctx).map(c => c.id)).toEqual(['vaal-gem:Corrupting Fever'])
    expect(vaalGemLookup('corrupting fever', ctx)).toEqual([])
  })
})
