import { describe, expect, it } from 'vitest'
import { feedDays, graphGaps, graphHistory, leagueDays, parseDenseChunks } from '@/web/woke/market/parse'
import { parseCategory } from '@/web/woke/market/browser'

// A league two days old: poe.ninja's graph has nulls before day one.
const DAY2 = [null, null, null, null, null, 0, 54.36]

describe('thin-market gaps', () => {
  it('counts history from the first priced day', () => {
    expect(graphHistory(DAY2)).toBe(2)
    expect(graphHistory([0, 1, 2, 3, 4, 5, 6])).toBe(7)
    expect(graphHistory([null, null])).toBe(0)
    expect(graphHistory([3, 4])).toBe(2)
    expect(graphHistory(undefined)).toBe(0)
  })

  it('takes the longest history as the league days', () => {
    expect(leagueDays([DAY2, [null, null, null, null, null, null, 5], undefined])).toBe(2)
    expect(leagueDays([DAY2, [1, null, 2, 3, 4, 5, 6]])).toBe(7)
    expect(leagueDays([])).toBe(0)
  })

  it('ignores days before the league started, scaled to 7 days', () => {
    expect(graphGaps(DAY2)).toBe(5)
    expect(graphGaps(DAY2, 2)).toBe(0)
    // Day 2, priced only today: 1 of 2 days reads as 4 of 7, so still thin.
    expect(graphGaps([null, null, null, null, null, null, 5], 2)).toBe(4)
    expect(graphGaps([null, null, null, null, null, null, null], 2)).toBe(7)
    expect(graphGaps([null, null, null, null, null, null, 5], 1)).toBe(0)
    expect(graphGaps([null, null, null, null, null, null, null], 1)).toBe(7)
    // Day 3, missed one day: 2 of 7, not thin.
    expect(graphGaps([null, null, null, null, 1, null, 5], 3)).toBe(2)
    expect(graphGaps([5], 3)).toBe(5)
    expect(graphGaps(DAY2, 0)).toBe(0)
  })

  it('keeps the 7-day count in a week-old league', () => {
    expect(graphGaps([1, null, null, 3, null, 5, 6])).toBe(3)
    expect(graphGaps([1, null, null, 3, null, 5, 6], 7)).toBe(3)
    expect(graphGaps([5, 6], 7)).toBe(5)
    expect(graphGaps(undefined)).toBe(0)
  })

  const entry = (name: string, graph: unknown[]) => JSON.stringify({ name, variant: null, chaos: 2, graph })
  const chunk = (url: string, rows: string[]) => ({ ns: 'ITEM', url, lines: rows.join('\n') })

  it('a snapshot from a league\'s second day has no thin prices', () => {
    const items = parseDenseChunks([
      chunk('currency', [entry('Divine Orb', DAY2)]),
      chunk('delirium-orbs', [entry('Fine Delirium Orb', DAY2), entry('Rare Orb', [null, null, null, null, null, null, 4])])
    ])
    expect(items.map(i => [i.name, i.gaps])).toEqual([['Divine Orb', 0], ['Fine Delirium Orb', 0], ['Rare Orb', 4]])
  })

  it('reads the league days from Divine Orb', () => {
    expect(feedDays([chunk('currency', [entry('Chaos Orb', [null, null, null, null, null, null, 1]), entry('Divine Orb', DAY2)])])).toBe(2)
    expect(feedDays([chunk('delirium-orbs', [entry('Fine Delirium Orb', DAY2)])])).toBe(7)
  })

  it('the Market window counts gaps the same way, with the feed days', () => {
    const cat = chunk('delirium-orbs', [entry('Fine Delirium Orb', DAY2), entry('Rare Orb', [null, null, null, null, null, null, 4])])
    expect(parseCategory('DeliriumOrb', cat, 2).map(r => r.gaps)).toEqual([0, 4])
    // A mature league: a category poe.ninja only tracks for 2 days counts those
    // 2 days (3.30's Viscera), so only the item missing one of them is thin.
    expect(parseCategory('DeliriumOrb', cat, 7).map(r => r.gaps)).toEqual([0, 4])
  })
})
