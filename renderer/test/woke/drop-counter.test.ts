import { describe, expect, it } from 'vitest'
import { addLine, changeMaps, findLine, lineDetail, minusOne, peekText, plusOne, removeLine, resetCounts, restoreCounts, restoreLine } from '@/web/woke/drop-counter/drop-counter'
import type { DropLine } from '@/web/woke/drop-counter/drop-counter'

const state = (maps = 0, items: DropLine[] = []) => ({ maps, items })
const line = (drops: number[] = []): DropLine => ({ type: 'Currency', name: 'Divine Orb', drops })

describe('addLine', () => {
  it('adds a typed name with no category, trimmed', () => {
    const w = state()
    expect(addLine(w, { type: '', name: '  Foil unique ' })?.name).toBe('Foil unique')
    expect(w.items).toHaveLength(1)
  })

  it('returns the line already there, whatever the case', () => {
    const w = state()
    const first = addLine(w, { type: 'Currency', name: 'Divine Orb' })
    expect(addLine(w, { type: '', name: 'divine orb' })).toBe(first)
    expect(w.items).toHaveLength(1)
  })

  it('ignores a blank name', () => {
    const w = state()
    expect(addLine(w, { type: '', name: '   ' })).toBeNull()
    expect(w.items).toHaveLength(0)
  })

  it('finds a line by name', () => {
    const w = state(0, [line()])
    expect(findLine(w.items, 'DIVINE ORB')).toBe(w.items[0])
    expect(findLine(w.items, 'Mirror of Kalandra')).toBeUndefined()
  })
})

describe('counting', () => {
  it('a +1 remembers the map, and taking it off brings back the last drop', () => {
    const w = state(10)
    const l = line([4])
    plusOne(w, l)
    expect(l.drops).toEqual([4, 10])
    minusOne(l)
    expect(l.drops).toEqual([4])
  })

  it('taking one off at zero does nothing', () => {
    const l = line()
    minusOne(l)
    expect(l.drops).toEqual([])
  })

  it('the maps count stops at zero', () => {
    const w = state(0)
    changeMaps(w, -1)
    expect(w.maps).toBe(0)
  })
})

describe('lineDetail', () => {
  it('says how long it has been and the rate', () => {
    expect(lineDetail(line([100, 298]), 312)).toBe('14 maps ago · 1 in 156')
  })
  it('one map ago reads as one map', () => {
    expect(lineDetail(line([311]), 312)).toBe('1 map ago · 1 in 312')
  })
  it('in the current map', () => {
    expect(lineDetail(line([312]), 312)).toBe('This map · 1 in 312')
  })
  it('none yet, with and without maps', () => {
    expect(lineDetail(line(), 312)).toBe('None in 312 maps')
    expect(lineDetail(line(), 0)).toBe('None yet')
  })
  it('more drops than maps stays 1 in 1', () => {
    expect(lineDetail(line([3, 3, 3, 3, 3]), 3)).toBe('This map · 1 in 1')
  })
  it('no maps counted: no rate', () => {
    expect(lineDetail(line([0]), 0)).toBe('This map')
  })
  it('maps corrected below the last drop never goes negative', () => {
    expect(lineDetail(line([50]), 40)).toBe('This map · 1 in 40')
  })
})

describe('peekText', () => {
  it('the first one is only the count', () => {
    expect(peekText(line([312]), 312)).toBe('Divine Orb 1')
  })
  it('later ones say the gap', () => {
    expect(peekText(line([298, 312]), 312)).toBe('Divine Orb 2 · 14 maps since the last')
  })
  it('maps corrected below the last drop show no gap', () => {
    expect(peekText(line([5, 3]), 3)).toBe('Divine Orb 2')
  })
  it('two in one map have no gap to show', () => {
    expect(peekText(line([312, 312]), 312)).toBe('Divine Orb 2')
  })
})

describe('resetCounts', () => {
  it('zeroes everything and keeps the list', () => {
    const w = state(12, [line([1, 2])])
    resetCounts(w)
    expect(w.maps).toBe(0)
    expect(w.items.map(l => l.drops)).toEqual([[]])
  })

  it('undo works on the config of that moment, as saving swaps it for a copy', () => {
    const w = state(12, [line([1, 2]), { type: '', name: 'Foil unique', drops: [5] }])
    const backup = resetCounts(w)
    const copy = JSON.parse(JSON.stringify(w)) as typeof w
    copy.items = [copy.items[0]]
    restoreCounts(copy, backup)
    expect(copy.maps).toBe(12)
    expect(copy.items).toEqual([line([1, 2])])
  })
})

describe('removeLine', () => {
  it('undo puts back only that line, keeping what changed since', () => {
    const w = state(5, [line([1]), { type: '', name: 'Foil unique', drops: [] }])
    const removed = removeLine(w, 'Divine Orb')!
    expect(w.items.map(l => l.name)).toEqual(['Foil unique'])
    const copy = JSON.parse(JSON.stringify(w)) as typeof w
    plusOne(copy, copy.items[0])
    restoreLine(copy, removed)
    expect(copy.items).toEqual([line([1]), { type: '', name: 'Foil unique', drops: [5] }])
  })

  it('undo does not double a line added back by hand', () => {
    const w = state(5, [line([1])])
    const removed = removeLine(w, 'Divine Orb')!
    addLine(w, { type: 'Currency', name: 'Divine Orb' })
    restoreLine(w, removed)
    expect(w.items).toHaveLength(1)
  })

  it('an unknown name removes nothing', () => {
    expect(removeLine(state(0, [line()]), 'Mirror of Kalandra')).toBeNull()
  })
})
