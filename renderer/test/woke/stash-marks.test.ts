// The Flips stash outlines: which slots get one, and in what colour.
import { describe, it, expect } from 'vitest'
import { CLOSE_EACH, buildMarks, clearStashMarks, justCleared, stashClearCount, stashMarks } from '@/web/woke/scarab-flip/stash-marks'
import type { StashSlot } from '@/web/woke/scarab-flip/stash-marks'

function slot (name: string, filled = true): StashSlot {
  return { name, x: 0.1, y: 0.2, width: 0.02, height: 0.03, filled }
}

const green = (color: string) => {
  const [r, g, b] = /\d+/g.exec(color) ? color.match(/\d+/g)!.map(Number) : [0, 0, 0]
  return { r, g, b }
}

describe('stash marks', () => {
  it('marks worthwhile flips and near break-even, and leaves the rest alone', () => {
    const marks = buildMarks([slot('good'), slot('close'), slot('keep')], new Map([['good', 1.5], ['close', 0.1], ['keep', -3]]))
    expect(marks.map(m => m.name)).toEqual(['good', 'close'])
    expect(marks[0].text).toBe('+1.5c')
    expect(marks[1].color).toBe('rgb(240, 190, 70)')
  })

  it('grades by profit per item across the tab: the best is brightest', () => {
    const marks = buildMarks([slot('low'), slot('mid'), slot('high')], new Map([['low', 0.4], ['mid', 1], ['high', 2]]))
    const [low, mid, high] = marks.map(m => green(m.color))
    expect(low.r).toBeGreaterThan(mid.r)
    expect(mid.r).toBeGreaterThan(high.r)
    expect(high).toEqual({ r: 40, g: 255, b: 70 })
    expect(low).toEqual({ r: 196, g: 226, b: 178 })
  })

  it('gives one lone flip the full colour', () => {
    const [mark] = buildMarks([slot('only')], new Map([['only', 1]]))
    expect(mark.color).toBe('rgb(40, 255, 70)')
  })

  it('skips empty slots and items with no price', () => {
    expect(buildMarks([slot('empty', false), slot('unpriced')], new Map([['empty', 2]]))).toEqual([])
  })

  it('treats the edge of break-even as a flip, not as close', () => {
    const [mark] = buildMarks([slot('edge')], new Map([['edge', CLOSE_EACH]]))
    expect(mark.color).not.toBe('rgb(240, 190, 70)')
  })

  it('keeps labels short, whatever the profit', () => {
    const [tiny] = buildMarks([slot('tiny')], new Map([['tiny', -0.0004]]))
    expect(tiny.text).toBe('0c')
    const [long] = buildMarks([slot('long')], new Map([['long', 1.23456]]))
    expect(long.text).toBe('+1.2c')
  })

  it('clears once per set of outlines and remembers the press that did it', () => {
    stashMarks.value = buildMarks([slot('a')], new Map([['a', 1]]))
    const before = stashClearCount()
    clearStashMarks()
    expect(stashMarks.value).toEqual([])
    expect(stashClearCount()).toBe(before + 1)
    expect(justCleared()).toBe(true)
    clearStashMarks()
    expect(stashClearCount()).toBe(before + 1)
  })

  it('shows a small loss with a minus sign', () => {
    const [mark] = buildMarks([slot('close')], new Map([['close', -0.2]]))
    expect(mark.text).toBe('-0.2c')
  })
})
