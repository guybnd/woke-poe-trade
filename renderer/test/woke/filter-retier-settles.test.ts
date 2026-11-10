// Re-tiering settles: applying a plan's moves never turns up another batch
// while prices stay the same.
import { describe, it, expect } from 'vitest'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import { applyPriceMoves, mergeMoves, movesOutOfPlace, planRetier, priceLookup } from '@/web/woke/loot-filter/economy'
import type { PriceMove } from '@/web/woke/loot-filter/economy'
import type { PriceItem } from '@/web/woke/market/types'

const block = (tier: string, bases: string[]) => [
  `Show # %H1 $type->divination $tier->${tier}`,
  '\tClass == "Divination Cards"',
  `\tBaseType == ${bases.map(b => `"${b}"`).join(' ')}`,
  '\tSetFontSize 40',
  ''
].join('\n')

// NeverSink's tiers, with prices that drifted a long way from them.
const TIERS: Record<string, Array<[string, number]>> = {
  t1: [['A1', 900], ['A2', 400], ['A3', 120], ['A4', 60]],
  t2: [['B1', 300], ['B2', 90], ['B3', 50], ['B4', 30], ['B5', 12]],
  t3: [['C1', 80], ['C2', 25], ['C3', 14], ['C4', 9], ['C5', 5], ['C6', 3]],
  t4: [['D1', 20], ['D2', 6], ['D3', 3], ['D4', 2], ['D5', 1.2], ['D6', 0.8]],
  t5: [['E1', 4], ['E2', 1], ['E3', 0.5], ['E4', 0.3], ['E5', 0.2]]
}
const TEXT = Object.entries(TIERS).map(([t, l]) => block(t, l.map(x => x[0]))).join('\n')
const PRICES: PriceItem[] = Object.values(TIERS).flat().map(([name, chaos]) => ({ type: 'DivinationCard', name, variant: '', chaos, gaps: 0 }))
const lookup = priceLookup(PRICES, () => [])

// What the editor does to a fresh parse: notes the moves that take an item out
// of NeverSink's tier, puts them on, then plans.
function moveOn (doc: ReturnType<typeof parseFilter>, stored: PriceMove[]): PriceMove[] {
  const out = movesOutOfPlace(doc, stored)
  applyPriceMoves(doc, stored)
  return out
}

// What the editor does: stored moves go on a fresh parse, then it plans.
function round (stored: PriceMove[], withMoved: boolean) {
  const doc = parseFilter(TEXT)
  const moved = moveOn(doc, stored)
  return planRetier(doc, lookup, withMoved ? { moved } : {})
}

// Filters with tiers whose prices drifted at random: medians that move with
// every apply cascade in most of them.
function drifted (seed: number) {
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const tiers: Record<string, Array<[string, number]>> = {}
  let n = 0
  for (let t = 1; t <= 5; t++) {
    tiers[`t${t}`] = Array.from({ length: 3 + Math.floor(rnd() * 8) }, () => [`X${n++}`, Math.exp(Math.log(1000) * (1 - t / 5) + (rnd() - 0.5) * 4)])
  }
  const text = Object.entries(tiers).map(([t, l]) => block(t, l.map(x => x[0]))).join('\n')
  const look = priceLookup(Object.values(tiers).flat().map(([name, chaos]) => ({ type: 'DivinationCard', name, variant: '', chaos, gaps: 0 })), () => [])
  return { text, look }
}

// How many applies until nothing is left to move (up to 6).
function applies (text: string, look: ReturnType<typeof priceLookup>, withMoved: boolean): number {
  let stored: PriceMove[] = []
  for (let n = 0; n < 6; n++) {
    const doc = parseFilter(text)
    const moved = moveOn(doc, stored)
    const plan = planRetier(doc, look, withMoved ? { moved } : {})
    if (!plan.moves.length) return n
    stored = mergeMoves(stored, plan.moves)
  }
  return 6
}

describe('re-tiering settles', () => {
  it('one apply leaves nothing more to move', () => {
    const first = round([], true)
    expect(first.moves.length).toBeGreaterThan(0)
    const stored = mergeMoves([], first.moves)
    expect(round(stored, true).moves).toEqual([])
  })

  it('settles in one apply on any filter, where tier prices taken from moved items did not', () => {
    let cascaded = 0
    for (let seed = 1; seed <= 60; seed++) {
      const { text, look } = drifted(seed)
      expect(applies(text, look, true)).toBeLessThanOrEqual(1)
      if (applies(text, look, false) > 1) cascaded++
    }
    expect(cascaded).toBeGreaterThan(10)
  })

  it('a move a price change undoes still goes back', () => {
    const stored = mergeMoves([], round([], true).moves)
    expect(stored.find(m => m.base === 'D1')).toBeTruthy()
    const cheap = priceLookup(PRICES.map(p => p.name === 'D1' ? { ...p, chaos: 2 } : p), () => [])
    const doc = parseFilter(TEXT)
    const moved = moveOn(doc, stored)
    const back = planRetier(doc, cheap, { moved }).moves.find(m => m.base === 'D1')
    expect(back?.to).toBe('t4')
  })

  it('a move NeverSink has since made itself doesn\'t count for the old tier', () => {
    const stored = mergeMoves([], round([], true).moves)
    const d1 = stored.find(m => m.base === 'D1')!
    // NeverSink's update lists D1 where the price move put it.
    const text = Object.entries(TIERS).map(([t, l]) => block(t, [
      ...l.map(x => x[0]).filter(b => b !== 'D1'),
      ...(t === d1.to ? ['D1'] : [])
    ])).join('\n')
    const plan = (moves: PriceMove[]) => {
      const doc = parseFilter(text)
      return planRetier(doc, lookup, { moved: moveOn(doc, moves) })
    }
    expect(movesOutOfPlace(parseFilter(text), stored).some(m => m.base === 'D1')).toBe(false)
    // The same plan as if the move had never been stored.
    expect(plan(stored).moves).toEqual(plan(stored.filter(m => m.base !== 'D1')).moves)
  })
})
