// The Net worth window's numbers (A1 Ledger): per-tab value, liquid, chart
// points and big gains, the goal's ETA, price moves and the change view.
import { describe, it, expect } from 'vitest'
import { nudgeHide, valueFloor } from '@/web/woke/net-worth/widget'
import type { NetWorthWidget } from '@/web/woke/net-worth/widget'
import {
  addPoint, bigGains, filterLines, selectedFirst, tipPlacement, toggleTab, change24h, goalEta, groupByRefresh, groupByRuns, keepDiff, liquidChaos, priceMoves, seriesFor, topChanges, valueByTab
} from '@/web/woke/net-worth/ledger'
import type { LedgerPoint, SeriesPoint } from '@/web/woke/net-worth/ledger'
import { valueStash } from '@/web/woke/net-worth/valuation'
import type { Category, PriceOf, StashDiff, StashItemLike } from '@/web/woke/net-worth/valuation'

const item = (typeLine: string, stack = 1, frame = 5): StashItemLike => ({ name: '', typeLine, baseType: typeLine, frame, stack, icon: '' })
const PRICES: Record<string, { chaos: number, category: Category, graph?: number[] }> = {
  'Chaos Orb': { chaos: 1, category: 'currency' },
  'Divine Orb': { chaos: 200, category: 'currency' },
  'The Apothecary': { chaos: 1000, category: 'cards', graph: [0, 1, 2, 4, 5, 3, 7.7] },
  'Maven\'s Writ': { chaos: 600, category: 'fragments' }
}
const priceOf: PriceOf = (i) => PRICES[i.typeLine] ?? null
const cats = (c: Partial<Record<Category, number>>): Record<Category, number> => ({ currency: 0, fragments: 0, cards: 0, gear: 0, other: 0, ...c })
const H = 3_600_000
const DAY = 24 * H

describe('per tab and liquid', () => {
  const tabs = [
    { id: 'a', name: 'Currency', colour: '#7c5436', items: [item('Divine Orb', 3), item('Chaos Orb', 50)] },
    { id: 'b', name: 'Divs', colour: null, items: [item('The Apothecary', 1, 6), item('Rare thing', 1, 2)] }
  ]

  it('values each tab, skipping what has no price', () => {
    expect(valueByTab(tabs, priceOf)).toEqual([
      { id: 'a', name: 'Currency', type: '', colour: '#7c5436', chaos: 650 },
      { id: 'b', name: 'Divs', type: '', colour: null, chaos: 1000 }
    ])
  })

  it('lines know their tabs, and liquid is currency and fragments', () => {
    const v = valueStash([...tabs, { id: 'c', name: 'Frags', colour: null, items: [item('Maven\'s Writ', 2), item('Divine Orb', 1)] }], priceOf)
    expect(v.lines.find(l => l.name === 'Divine Orb')!.tabIds).toEqual(['a', 'c'])
    expect(v.lines.find(l => l.name === 'The Apothecary')!.graph).toEqual(PRICES['The Apothecary'].graph)
    expect(liquidChaos(v)).toBe(650 + 1200 + 200)
  })
})

describe('chart points', () => {
  const diff: StashDiff = {
    at: 5,
    added: [{ key: 'd', name: 'Divine Orb', icon: '', count: 12, chaos: 2400 }, { key: 'c', name: 'Chaos Orb', icon: '', count: 240, chaos: 240 }],
    removed: [{ key: 'w', name: 'Maven\'s Writ', icon: '', count: 4, chaos: 2400 }],
    netChaos: 240
  }

  it('names the biggest changes, both ways', () => {
    expect(topChanges(diff, 2)).toEqual(['12 × Divine Orb', '−4 × Maven\'s Writ'])
    expect(topChanges(null)).toEqual([])
  })

  it('keeps one point per read, in time order', () => {
    const p = (at: number): LedgerPoint => ({ at, chaos: at, divine: 200, byCategory: cats({}), netChaos: null, top: [] })
    expect(addPoint([p(1), p(3)], p(2)).map(x => x.at)).toEqual([1, 2, 3])
    expect(addPoint([p(1)], { ...p(1), chaos: 9 })).toHaveLength(1)
  })

  it('keeps points small: chaos to 0.1, and old points lose their "what changed"', () => {
    const p = (at: number): LedgerPoint => ({ at, chaos: 1.234, divine: 200, byCategory: cats({ currency: 1.26 }), netChaos: 0.04, top: ['x'] })
    const out = addPoint([p(0)], p(8 * DAY))
    expect(out[1]).toMatchObject({ chaos: 1.2, netChaos: 0, top: ['x'] })
    expect(out[1].byCategory.currency).toBe(1.3)
    expect(out[0].top).toEqual([])
  })

  it('fills days before the first refresh point from the daily snapshots, in each day\'s rate', () => {
    const now = 10 * DAY
    const days = {
      d1: { at: now - 5 * DAY, chaos: 2000, divine: 100, byCategory: cats({ currency: 2000 }) },
      d2: { at: now - 30 * DAY, chaos: 1000, divine: 100, byCategory: cats({ currency: 1000 }) },
      d3: { at: now - 1 * H, chaos: 9999, divine: 100, byCategory: cats({}) }
    }
    const points: LedgerPoint[] = [{ at: now - 2 * H, chaos: 4000, divine: 200, byCategory: cats({ currency: 4000 }), netChaos: 400, top: ['x'] }]
    const s = seriesFor(points, days, '7d', now, 200)
    expect(s.map(p => [p.div, p.daily])).toEqual([[20, true], [20, false]])
    expect(s[1].netDiv).toBe(2)
    expect(seriesFor(points, days, 'league', now, 200)).toHaveLength(3)
    expect(seriesFor(points, days, '24h', now, 200)).toHaveLength(1)
  })

  it('marks refreshes that added a lot', () => {
    const s = [1, 2, 1.5, 40, 2, -30].map((n, i): SeriesPoint => ({ at: i, div: 0, byCategory: cats({}), netDiv: n, top: [], daily: false }))
    expect([...bigGains(s)]).toEqual([3])
  })
})

describe('goal ETA', () => {
  const pt = (at: number, div: number): SeriesPoint => ({ at, div, byCategory: cats({}), netDiv: null, top: [], daily: false })

  it('days to go at the rate over the range', () => {
    expect(goalEta([pt(0, 100), pt(2 * DAY, 120)], 220)).toEqual({ reached: false, days: 10 })
  })

  it('reached, falling, or too little to go on', () => {
    expect(goalEta([pt(0, 100), pt(2 * DAY, 300)], 220).reached).toBe(true)
    expect(goalEta([pt(0, 100), pt(2 * DAY, 90)], 220).days).toBeNull()
    expect(goalEta([pt(0, 100), pt(H, 120)], 220).days).toBeNull()
    expect(goalEta([], 220).days).toBeNull()
  })
})

describe('price moves on what you hold', () => {
  it('reads the last day from poe.ninja\'s 7-day line', () => {
    expect(change24h([0, 10, 21])).toBeCloseTo(0.1)
    expect(change24h([5])).toBeNull()
    expect(change24h([null, 0, null, 10])).toBeCloseTo(0.1)
  })

  it('the 3 that moved your value most, either way', () => {
    const lines = [
      { key: 'a', name: 'A', chaos: 1100 },
      { key: 'b', name: 'B', chaos: 50 },
      { key: 'c', name: 'C', chaos: 900 },
      { key: 'd', name: 'D', chaos: 10 }
    ]
    const ch: Record<string, number | null> = { a: 0.1, b: 0.5, c: -0.1, d: null }
    const m = priceMoves(lines, k => ch[k])
    expect(m.map(x => x.key)).toEqual(['a', 'c', 'b'])
    expect(m[0].valueChaos).toBeCloseTo(100)
    expect(m[1].valueChaos).toBeCloseTo(-100)
  })
})

describe('what changed', () => {
  const d = (at: number, net: number, name = 'Divine Orb', count = 1): StashDiff => ({
    at,
    added: net > 0 ? [{ key: name, name, icon: '', count, chaos: net }] : [],
    removed: net < 0 ? [{ key: name, name, icon: '', count, chaos: -net }] : [],
    netChaos: net
  })

  it('keeps recent changes small', () => {
    const big: StashDiff = { at: 1, added: Array.from({ length: 30 }, (_, i) => ({ key: `${i}`, name: `${i}`, icon: '', count: 1, chaos: 1 })), removed: [], netChaos: 30 }
    expect(keepDiff([], big)[0].added).toHaveLength(8)
  })

  it('groups a session\'s refreshes per map run before them', () => {
    const runs = [{ name: 'Strand', enteredAt: 1000, mapMs: 200_000 }, { name: 'Crimson Temple', enteredAt: 5000, mapMs: 252_000 }]
    const groups = groupByRuns([d(500, 99), d(2000, 200), d(3000, 100, 'Chaos Orb', 50), d(6000, -50)], runs, 600)
    expect(groups.map(g => [g.title, g.netChaos])).toEqual([
      ['Map 2 · Crimson Temple · 4:12', -50],
      ['Map 1 · Strand · 3:20', 300]
    ])
    expect(groups[1].lines.map(l => [l.name, l.count, l.dir])).toEqual([['Divine Orb', 1, 'add'], ['Chaos Orb', 50, 'add']])
  })

  it('without a session, one group per refresh, newest first', () => {
    const g = groupByRefresh([d(1, 5), d(2, -3), d(3, 7), d(4, 1)])
    expect(g.map(x => x.netChaos)).toEqual([1, 7, -3])
  })
})

describe('End session from Net worth', () => {
  it('ends only the Farming window it shows, and says when none is there', async () => {
    const { onEndSessionRequest, requestEndSession } = await import('@/web/woke/farming/farming')
    const ended: number[] = []
    const stop1 = onEndSessionRequest(1, () => ended.push(1))
    const stop2 = onEndSessionRequest(2, () => ended.push(2))
    expect(requestEndSession(2)).toBe(true)
    expect(ended).toEqual([2])
    stop1(); stop2()
    expect(requestEndSession(1)).toBe(false)
  })
})

describe('table filters', () => {
  // Guy's two "Currency" tabs, a Fragment tab, and a category picked too.
  const lines = [
    { key: 'd', name: 'Divine Orb', category: 'currency' as const, tabIds: ['cur1'], chaos: 7000 },
    { key: 'c', name: 'Chaos Orb', category: 'currency' as const, tabIds: ['cur2'], chaos: 2 },
    { key: 'w', name: 'Simulacrum', category: 'fragments' as const, tabIds: ['frag'], chaos: 300 }
  ]
  const none = { cat: 'all' as const, tabs: [] as string[], query: '', minChaos: 0 }

  it('clicking tab labels picks several; All clears', () => {
    let t = toggleTab([], 'cur1')
    t = toggleTab(t, 'cur2')
    expect(t).toEqual(['cur1', 'cur2'])
    expect(filterLines(lines, { ...none, tabs: t }).map(l => l.key)).toEqual(['d', 'c'])
    expect(toggleTab(t, 'cur1')).toEqual(['cur2'])
    expect(toggleTab(t, 'all')).toEqual([])
  })

  it('tabs and a category combine; with nothing in common the table is empty (pills show why)', () => {
    expect(filterLines(lines, { ...none, tabs: ['frag', 'cur2'], cat: 'currency' }).map(l => l.key)).toEqual(['c'])
    expect(filterLines(lines, { ...none, tabs: ['frag'], cat: 'currency' })).toEqual([])
  })

  it('two tabs of the same name stay apart: tabs filter by id', () => {
    expect(filterLines(lines, { ...none, tabs: ['cur2'] }).map(l => l.key)).toEqual(['c'])
  })
})

describe('chart hover card', () => {
  it('goes below a point near the top, and opens inwards at the sides', () => {
    expect(tipPlacement(50, 5)).toEqual({ below: true, align: 'center' })
    expect(tipPlacement(50, 90)).toEqual({ below: false, align: 'center' })
    expect(tipPlacement(2, 90).align).toBe('left')
    expect(tipPlacement(98, 10)).toEqual({ below: true, align: 'right' })
  })
})

describe('units as icons', () => {
  it('shows the divine icon, or chaos when asked, with a short text fallback', async () => {
    const { createSSRApp, h } = await import('vue')
    const { renderToString } = await import('vue/server-renderer')
    const Coin = (await import('@/web/woke/net-worth/Coin.vue')).default
    const div = await renderToString(createSSRApp({ render: () => h(Coin) }))
    expect(div).toContain('/images/divine.png')
    expect(div).toContain('alt="d"')
    const chaos = await renderToString(createSSRApp({ render: () => h(Coin, { chaos: true, title: '120 chaos' }) }))
    expect(chaos).toContain('/images/chaos.png')
    expect(chaos).toContain('alt="c"')
    expect(chaos).toContain('title="120 chaos"')
  })
})

describe('sections', () => {
  it('a section switched off stays off until switched on', async () => {
    const { sectionOn, setSection } = await import('@/web/woke/net-worth/widget')
    const w = { hiddenSections: [] } as never as Parameters<typeof sectionOn>[0]
    expect(sectionOn(w, 'chart')).toBe(true)
    setSection(w, 'chart', false)
    setSection(w, 'chart', false)
    expect(w.hiddenSections).toEqual(['chart'])
    setSection(w, 'chart', true)
    expect(sectionOn(w, 'chart')).toBe(true)
  })
})

describe('selectedFirst', () => {
  it('puts picked tabs first, each group in tab order', () => {
    const list = ['a', 'b', 'c', 'd'].map(id => ({ id }))
    expect(selectedFirst(list, ['d', 'b']).map(t => t.id)).toEqual(['b', 'd', 'a', 'c'])
    expect(selectedFirst(list, []).map(t => t.id)).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('value chips', () => {
  const w = (x: Partial<NetWorthWidget>) => x as NetWorthWidget
  it('the higher limit in chaos wins, and says which', () => {
    expect(valueFloor(w({}), 200)).toEqual({ minChaos: 0, limiting: null })
    expect(valueFloor(w({ hideDivOn: true }), 200)).toEqual({ minChaos: 200, limiting: 'div' })
    expect(valueFloor(w({ hideChaosOn: true }), 200)).toEqual({ minChaos: 10, limiting: 'chaos' })
    expect(valueFloor(w({ hideDivOn: true, hideChaosOn: true }), 200)).toEqual({ minChaos: 200, limiting: 'div' })
    expect(valueFloor(w({ hideDivOn: true, hideChaosOn: true, hideBelowChaos: 500 }), 200)).toEqual({ minChaos: 500, limiting: 'chaos' })
    expect(valueFloor(w({ hideDivOn: true, hideBelowDiv: 0.5, hideChaosOn: true }), 200)).toEqual({ minChaos: 100, limiting: 'div' })
  })
  it('the divine limit needs a rate', () => {
    expect(valueFloor(w({ hideDivOn: true }), null)).toEqual({ minChaos: 0, limiting: null })
    expect(valueFloor(w({ hideDivOn: true, hideChaosOn: true }), null)).toEqual({ minChaos: 10, limiting: 'chaos' })
  })
  it('scrolls in small steps low and bigger ones higher', () => {
    expect([nudgeHide(10, 1, true), nudgeHide(20, 1, true), nudgeHide(20, -1, true), nudgeHide(100, 1, true), nudgeHide(100, -1, true), nudgeHide(0, -1, true)]).toEqual([11, 25, 19, 125, 95, 0])
    expect([nudgeHide(1, 1, false), nudgeHide(2, 1, false), nudgeHide(2, -1, false), nudgeHide(0.5, -1, false), nudgeHide(1.3, 1, false)]).toEqual([1.5, 3, 1.5, 0, 2])
  })
})
