// The search palette's calculator: plain sums and currency sums.
import { describe, it, expect } from 'vitest'
import { calcLookup, calcNumber, evaluate } from '@/web/woke/search/lookups/calc'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const PRICES: Record<string, number> = { 'Chaos Orb': 1, 'Divine Orb': 240, 'Exalted Orb': 12 }
const UNITS: Record<string, string> = { c: 'Chaos Orb', chaos: 'Chaos Orb', 'chaos orb': 'Chaos Orb', d: 'Divine Orb', div: 'Divine Orb', 'divine orb': 'Divine Orb', ex: 'Exalted Orb' }
const unit = (w: string) => UNITS[w.toLowerCase()] ?? null
const price = (n: string) => PRICES[n] ?? null
const val = (q: string) => evaluate(q, unit, price)?.value ?? null
const ctx = (over: Partial<LookupContext> = {}): LookupContext => ({
  price, items: [], tools: new Set(), divine: 240, now: 0, league: null, ...over
})
const calc = calcLookup(unit)

describe('evaluate', () => {
  it('does the four sums with the usual order', () => {
    expect(val('70 * 38')).toBe(2660)
    expect(val('70x38')).toBe(2660)
    expect(val('70 × 38')).toBe(2660)
    expect(val('1 + 2 * 3')).toBe(7)
    expect(val('(1 + 2) * 3')).toBe(9)
    expect(val('10 / 4')).toBe(2.5)
    expect(val('10 ÷ 4 - 1')).toBe(1.5)
    expect(val('2 ^ 10')).toBe(1024)
    expect(val('-3 * -2')).toBe(6)
    expect(val('.5 + 1,5')).toBe(2)
    expect(val('1,200 / 2')).toBe(600)
    expect(val('2k * 3')).toBe(6000)
    expect(val('1.5m / 3')).toBe(500000)
  })
  it('reads percent', () => {
    expect(val('50% * 2')).toBe(1)
    expect(val('200 + 10%')).toBeCloseTo(220)
    expect(val('200 - 10%')).toBeCloseTo(180)
    expect(val('15% * 200')).toBe(30)
    expect(val('(200) + (10%)')).toBeCloseTo(220)
  })
  it('prices currency', () => {
    expect(evaluate('50d / 7', unit, price)).toEqual({ value: 50 * 240 / 7, units: ['Divine Orb'], deg: 1 })
    expect(val('2 div + 30c')).toBe(510)
    expect(val('3 chaos orb * 2')).toBe(6)
    expect(val('div / ex')).toBe(20)
    expect(evaluate('div / ex', unit, price)?.deg).toBe(0)
  })
  it('leaves what is not a sum alone', () => {
    expect(evaluate('70', unit, price)).toBeNull()
    expect(evaluate('-5', unit, price)).toBeNull()
    expect(evaluate('(5)', unit, price)).toBeNull()
    expect(evaluate('50 div', unit, price)).toBeNull()
    expect(evaluate('3 div in chaos', unit, price)).toBeNull()
    expect(evaluate('1 +', unit, price)).toBeNull()
    expect(evaluate('5 / 0', unit, price)).toBeNull()
    expect(evaluate('+1 gems', unit, price)).toBeNull()
    expect(evaluate('6-link', unit, price)).toBeNull()
    expect(evaluate('alert(1)', unit, price)).toBeNull()
    expect(evaluate('2 div * 3 div', unit, price)).toBeNull()
    expect(evaluate('2 div + 3', unit, price)).toBeNull()
    expect(evaluate('9 ^ 999', unit, price)).toBeNull()
    expect(evaluate('20%', unit, price)).toBeNull()
    expect(evaluate('('.repeat(5000) + '1', unit, price)).toBeNull()
  })
  it('needs a price for currency', () => {
    expect(evaluate('50d / 7', unit, () => null)).toBeNull()
  })
})

describe('calcNumber', () => {
  it('groups and trims', () => {
    expect(calcNumber(2660)).toBe('2,660')
    expect(calcNumber(0.1 + 0.2)).toBe('0.3')
    expect(calcNumber(10 / 3)).toBe('3.333333')
    expect(calcNumber(10 / 3, 2)).toBe('3.33')
  })
})

describe('calcLookup', () => {
  it('shows a plain answer that copies', () => {
    const [card] = calc(' 70 *  38 ', ctx())
    expect(card.group).toBe('Answer')
    expect(card.name).toBe('70 * 38 = 2,660')
    expect(card.actions[0]).toEqual({ label: 'Copy 2660', copy: '2660' })
  })
  it('answers divines in divines, with chaos beside', () => {
    const [card] = calc('50d / 7', ctx())
    expect(card.name).toBe('50d / 7 = 7.14 div')
    expect(card.actions[0]).toEqual({ label: 'Copy 7.14', copy: '7.14' })
    expect(card.sections[0].rows?.map(r => r.value)).toEqual(['1,714.29 c', '7.14 div'])
  })
  it('answers other currency in chaos', () => {
    const [card] = calc('10 ex * 3', ctx())
    expect(card.name).toBe('10 ex * 3 = 360 c')
  })
  it('keeps small and tiny answers readable', () => {
    expect(calc('1 c / 300', ctx())[0].name).toBe('1 c / 300 = 0.00333 c')
    expect(calc('1 div / 100000', ctx())[0].actions[0]).toEqual({ label: 'Copy 0.00001', copy: '0.00001' })
    expect(calc('1 / 3000000', ctx())[0].actions[0]).toEqual({ label: 'Copy 0.000000333', copy: '0.000000333' })
  })
  it('stays out of the way otherwise', () => {
    expect(calc('mageblood', ctx())).toEqual([])
    expect(calc('3.5 div', ctx())).toEqual([])
  })
})
