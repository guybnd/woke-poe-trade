import { describe, expect, it } from 'vitest'
import { countedPrices, parseDenseChunks } from '@/web/woke/market/parse'
import { heldPrice, heldText } from '@/web/woke/shared/price-trust'

const line = (name: string, chaos: number, graph: Array<number | null>) => JSON.stringify({ name, chaos, graph })
const chunk = (type: string, url: string, rows: string[]) => ({ ns: 'ITEM', url, lines: `{"type":"${type}","lines":[${rows.join(',')}]}` })

describe('heldPrice', () => {
  it('holds a price poe.ninja had on one day only, at nothing (Thirst for Knowledge)', () => {
    expect(heldPrice(14139, [null, null, null, null, null, null, 0], 7, 'cards')).toEqual({ ninja: 14139, chaos: null, kind: 'one-day' })
  })

  it('holds a sudden step at the usual price', () => {
    const h = heldPrice(200, [-99.5, -99.5, -99.5, -99.5, -99.5, -99.5, 0], 7, 'cards')
    expect(h?.kind).toBe('spike')
    expect(h?.chaos).toBeCloseTo(1)
  })

  it('keeps steady, thin and cheap prices, and gear priced on one day', () => {
    expect(heldPrice(165.8, [18.69, 35.62, 37.53, 35.85, 32.92, 29.36, 21.21], 7, 'cards')).toBeNull()
    expect(heldPrice(4, [null, 21.08, 6.87, 193.8, 317.7, 92.19, 500.0], 7, 'cards')).toBeNull()
    expect(heldPrice(3, [null, null, null, null, null, null, 0], 7, 'cards')).toBeNull()
    expect(heldPrice(500, [null, null, null, null, null, null, 0], 7, 'gear')).toBeNull()
    // A league's first day has nothing before.
    expect(heldPrice(14139, [null, null, null, null, null, null, 0], 1, 'cards')).toBeNull()
  })

  it('says what poe.ninja had and what counts', () => {
    expect(heldText({ ninja: 14139, chaos: null, kind: 'one-day' }, c => `${c}c`)).toContain('poe.ninja: 14139c, on the one day it had a price')
    expect(heldText({ ninja: 200, chaos: 1, kind: 'spike' }, c => `${c}c`)).toContain('it counts at its usual 1c')
  })
})

describe('snapshot prices', () => {
  const items = parseDenseChunks([
    chunk('Currency', 'currency', [line('Divine Orb', 195, [21, 39, 41, 41, 36, 31, 26])]),
    chunk('DivinationCard', 'divination-cards', [
      line('Thirst for Knowledge', 14139, [null, null, null, null, null, null, 0]),
      line('The Sephirot', 165.8, [18.69, 35.62, 37.53, 35.85, 32.92, 29.36, 21.21]),
      line('Rain Tempter', 200, [-99.5, -99.5, -99.5, -99.5, -99.5, -99.5, 0])
    ])
  ])

  it("marks fakes and keeps poe.ninja's price on them", () => {
    const by = new Map(items.map(i => [i.name, i]))
    expect(by.get('Thirst for Knowledge')).toMatchObject({ chaos: 14139, held: { kind: 'one-day', chaos: null } })
    expect(by.get('Rain Tempter')?.held?.kind).toBe('spike')
    expect(by.get('The Sephirot')?.held).toBeUndefined()
    expect(by.get('Divine Orb')?.held).toBeUndefined()
  })

  it('counts a held price at the usual one, or leaves it out', () => {
    const counted = countedPrices(items)
    expect(counted.map(i => i.name)).toEqual(['Divine Orb', 'The Sephirot', 'Rain Tempter'])
    expect(counted.find(i => i.name === 'Rain Tempter')?.chaos).toBeCloseTo(1)
    const plain = items.filter(i => !i.held)
    expect(countedPrices(plain)).toBe(plain)
  })
})

describe('snapshot prices, new categories and gear', () => {
  it("doesn't call a category's first tracked day fake, or hold gear", () => {
    const items = parseDenseChunks([
      chunk('Currency', 'currency', [line('Divine Orb', 195, [21, 39, 41, 41, 36, 31, 26])]),
      chunk('Viscera', 'viscera', [line('New Thing', 50, [null, null, null, null, null, null, 0])]),
      chunk('UniqueArmour', 'unique-armours', [
        line('Old Armour', 10, [0, 0, 0, 0, 0, 0, 0]),
        line('Kaom\'s Heart', 500, [-99, -99, -99, -99, -99, -99, 0])
      ])
    ])
    expect(items.filter(i => i.held)).toEqual([])
  })
})
