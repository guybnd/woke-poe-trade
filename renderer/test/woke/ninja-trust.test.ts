// How far to trust poe.ninja's price on the instant card and cached verdict (WOKEPOET-534).
import { describe, expect, it } from 'vitest'
import { ninjaDoubt, dailySeries, categoryOfType, doubtText, savedStep } from '@/web/woke/price-insight/ninja-trust'

const flat = (n: number, v: number) => Array.from({ length: n }, () => v)

describe('ninjaDoubt', () => {
  it('flags a spike over the saved daily prices, at its usual price (Rain Tempter)', () => {
    expect(ninjaDoubt({ chaos: 20_140, graph: [0, 10, 20, 30, 40, 50, 60], history: flat(14, 1), category: 'cards' }))
      .toEqual({ kind: 'spike', usual: 1 })
  })

  it("falls back to poe.ninja's own line without saved prices", () => {
    // 100x today over every earlier day.
    expect(ninjaDoubt({ chaos: 100, graph: [0, 0, 0, 0, 0, 0, 9900], category: 'cards' }))
      .toEqual({ kind: 'spike', usual: 1 })
  })

  it('leaves a steady price alone', () => {
    expect(ninjaDoubt({ chaos: 10, graph: [0, 1, 2, 1, 0, 2, 3], history: flat(14, 10), category: 'currency' })).toBeNull()
  })

  it('flags a price poe.ninja has today only, at 10c or more', () => {
    expect(ninjaDoubt({ chaos: 28_886, graph: [null, null, null, null, null, null, 0], category: 'cards' }))
      .toEqual({ kind: 'one-day', usual: null })
    expect(ninjaDoubt({ chaos: 2, graph: [null, null, null, null, null, null, 0], category: 'cards' })?.kind).not.toBe('one-day')
  })

  it("names a one-day price's last saved price, and lets a close one through", () => {
    const graph = [null, null, null, null, null, null, 0]
    expect(ninjaDoubt({ chaos: 200, graph, history: [...flat(13, null as unknown as number), 2], category: 'cards' }))
      .toEqual({ kind: 'one-day', usual: 2 })
    expect(ninjaDoubt({ chaos: 12, graph, history: [...flat(13, null as unknown as number), 11], category: 'cards' })?.kind).not.toBe('one-day')
  })

  it('marks a thin market, but never on gear', () => {
    const graph = [0, null, null, null, 0, 0, 0]
    expect(ninjaDoubt({ chaos: 5, graph, category: 'cards' })).toEqual({ kind: 'thin', gaps: 3 })
    expect(ninjaDoubt({ chaos: 5, graph, category: 'gear' })).toBeNull()
  })

  it("doesn't call a new league's few days thin", () => {
    expect(ninjaDoubt({ chaos: 5, graph: [0, 0], days: 2, category: 'cards' })).toBeNull()
  })
})

describe('dailySeries', () => {
  it('lays saved days out before today, oldest first, gaps as null', () => {
    const s = dailySeries([{ date: '2026-11-22', chaos: 3 }, { date: '2026-11-23', chaos: 4 }, { date: '2026-11-24', chaos: 99 }], '2026-11-24', 3)
    expect(s).toEqual([null, 3, 4])
  })

  it('drops a series whose newest price is too old', () => {
    expect(dailySeries([{ date: '2026-11-10', chaos: 3 }], '2026-11-24')).toBeUndefined()
    expect(dailySeries([], '2026-11-24')).toBeUndefined()
  })
})

describe('categoryOfType', () => {
  it('maps poe.ninja types to Net worth categories', () => {
    expect(categoryOfType('DivinationCard')).toBe('cards')
    expect(categoryOfType('UniqueJewel')).toBe('gear')
    expect(categoryOfType('SkillGem')).toBe('gear')
    expect(categoryOfType('Currency')).toBe('currency')
    expect(categoryOfType('Scarab')).toBe('other')
    expect(categoryOfType(undefined)).toBeUndefined()
  })
})

describe('doubtText', () => {
  it('reads in plain words', () => {
    const c = (v: number) => `${v}c`
    expect(doubtText({ kind: 'spike', usual: 1 }, c)).toBe('Usually 1c. A sudden step like this is often a few fake listings.')
    expect(doubtText({ kind: 'thin', gaps: 4 }, c)).toContain('no price on 4 of the last 7 days')
  })
})

describe('savedStep (Ctrl+Space)', () => {
  it('flags a 5x step over the lower of a day and a week ago', () => {
    expect(savedStep(100, 2, 20)).toBe(2)
    // Stepped days ago and held since yesterday: not sudden.
    expect(savedStep(100, 90, 2)).toBeUndefined()
    expect(savedStep(100, undefined, 2)).toBe(2)
    expect(savedStep(100, 30, 40)).toBeUndefined()
    expect(savedStep(0.5, 0.05)).toBeUndefined()
    expect(savedStep(10)).toBeUndefined()
  })
})
