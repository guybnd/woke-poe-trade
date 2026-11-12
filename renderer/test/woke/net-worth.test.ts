// Net worth (personal stash reader): absent without personal.flag, and the
// reusable data layer: valuing, categories, "since last refresh", snapshots.
import { describe, it, expect } from 'vitest'
import { MODULES } from '@/web/woke/modules'
import { personalOn, loadPersonal } from '@/web/woke/personal'
import {
  baselineOf, diffStash, emptyHistory, itemKey, perHourToday, recordRead, sinceYesterday, valueStash
} from '@/web/woke/net-worth/valuation'
import { valueByTab } from '@/web/woke/net-worth/ledger'
import type { PriceOf, StashItemLike } from '@/web/woke/net-worth/valuation'

const item = (typeLine: string, stack = 1, extra: Partial<StashItemLike> = {}): StashItemLike =>
  ({ name: '', typeLine, baseType: typeLine, frame: 5, stack, icon: '', ...extra })

const PRICES: Record<string, { chaos: number, category: 'currency' | 'fragments' | 'cards' | 'gear' | 'other' }> = {
  'Chaos Orb': { chaos: 1, category: 'currency' },
  'Divine Orb': { chaos: 200, category: 'currency' },
  'The Apothecary': { chaos: 1000, category: 'cards' },
  'Sacrifice at Dawn': { chaos: 2, category: 'fragments' }
}
const priceOf: PriceOf = (i) => PRICES[i.typeLine] ?? null

describe('personal gate', () => {
  it('has no net worth module without the flag', async () => {
    await loadPersonal()
    expect(personalOn.value).toBe(false)
    expect(MODULES.some(m => m.id === 'net-worth')).toBe(false)
    expect(MODULES.some(m => m.widgetTypes.includes('woke-net-worth'))).toBe(false)
  })
})

describe('valueStash', () => {
  it('sums by category, across tabs, and counts what has no price', () => {
    const v = valueStash([
      { name: 'Currency', items: [item('Chaos Orb', 300), item('Divine Orb', 2)] },
      { name: 'Dump', items: [item('Divine Orb', 1), item('The Apothecary', 1, { frame: 6 }), item('Doom Shell', 1, { frame: 2 })] }
    ], priceOf)
    expect(v.chaos).toBe(300 + 600 + 1000)
    expect(v.byCategory).toEqual({ currency: 900, fragments: 0, cards: 1000, gear: 0, other: 0 })
    expect(v.unpriced).toBe(1)
    const div = v.lines.find(l => l.name === 'Divine Orb')!
    expect(div.count).toBe(3)
    expect(div.tabs).toEqual(['Currency', 'Dump'])
    expect(v.lines[0].name).toBe('The Apothecary')
  })
})

describe('since last refresh', () => {
  it('lists what came and went, at current prices', () => {
    const before = baselineOf(valueStash([{ name: 'A', items: [item('Divine Orb', 2), item('Sacrifice at Dawn', 10)] }], priceOf))
    const after = valueStash([{ name: 'B', items: [item('Divine Orb', 3), item('The Apothecary', 1, { frame: 6 })] }], priceOf)
    const d = diffStash(before, after, 123)
    expect(d.added.map(l => [l.name, l.count, l.chaos])).toEqual([['The Apothecary', 1, 1000], ['Divine Orb', 1, 200]])
    expect(d.removed.map(l => [l.name, l.count, l.chaos])).toEqual([['Sacrifice at Dawn', 10, 20]])
    expect(d.netChaos).toBe(1180)
  })

  it('moving between tabs is no change', () => {
    const before = baselineOf(valueStash([{ name: 'A', items: [item('Divine Orb', 2)] }], priceOf))
    const d = diffStash(before, valueStash([{ name: 'B', items: [item('Divine Orb', 2)] }], priceOf), 1)
    expect(d.added).toEqual([])
    expect(d.removed).toEqual([])
  })
})

describe('your prices and ignored items', () => {
  const rare = item('Hubris Circlet', 1, { frame: 2, name: 'Doom Crown' })
  const tabs = [
    { id: 't1', name: 'A', items: [item('Divine Orb', 2), item('Sacrifice at Dawn', 10), rare] },
    { id: 't2', name: 'B', items: [item('Divine Orb', 1)] }
  ]

  it('your price wins over poe.ninja and keeps its price for the hover', () => {
    const v = valueStash(tabs, priceOf, { prices: { 'Divine Orb': 150 }, ignored: [] })
    const div = v.lines.find(l => l.key === 'Divine Orb')!
    expect([div.unitChaos, div.chaos, div.mine, div.ninjaChaos]).toEqual([150, 450, true, 200])
    expect(v.chaos).toBe(450 + 20)
    expect(v.byCategory.currency).toBe(450)
  })

  it('gives an unpriced rare a price, by its own name', () => {
    const before = valueStash(tabs, priceOf)
    expect(before.unpriced).toBe(1)
    expect(before.unpricedLines.map(l => [l.key, l.name, l.state, l.chaos])).toEqual([['R:Doom Crown Hubris Circlet', 'Doom Crown, Hubris Circlet', 'unpriced', 0]])
    const v = valueStash(tabs, priceOf, { prices: { [itemKey(rare)]: 300 }, ignored: [] })
    expect(v.unpriced).toBe(0)
    expect(v.unpricedLines).toEqual([])
    const line = v.lines.find(l => l.key === itemKey(rare))!
    expect([line.chaos, line.category, line.mine, line.ninjaChaos]).toEqual([300, 'gear', true, null])
    expect(v.chaos).toBe(600 + 20 + 300)
  })

  it('two rares on one base are two things', () => {
    expect(itemKey(rare)).not.toBe(itemKey({ ...rare, name: 'Grim Halo' }))
  })

  it('ignored items leave the totals and tab values but stay listed', () => {
    const prefs = { prices: {}, ignored: ['Divine Orb', itemKey(rare)] }
    const v = valueStash(tabs, priceOf, prefs)
    expect(v.chaos).toBe(20)
    expect(v.lines.map(l => l.key)).toEqual(['Sacrifice at Dawn'])
    expect(v.unpriced).toBe(0)
    expect(v.ignoredLines.map(l => [l.key, l.count, l.state])).toEqual([['Divine Orb', 3, 'ignored'], ['R:Doom Crown Hubris Circlet', 1, 'ignored']])
    expect(valueByTab(tabs, priceOf, prefs).map(t => t.chaos)).toEqual([20, 0])
    expect(valueByTab(tabs, priceOf, { prices: { 'Divine Orb': 100 }, ignored: [] }).map(t => t.chaos)).toEqual([220, 100])
  })

  it('ignoring, un-ignoring or pricing an item is never a gain or a loss', () => {
    const plain = valueStash(tabs, priceOf)
    const ignored = valueStash(tabs, priceOf, { prices: {}, ignored: ['Divine Orb'] })
    const priced = valueStash(tabs, priceOf, { prices: { [itemKey(rare)]: 300 }, ignored: [] })
    for (const [a, b] of [[plain, ignored], [ignored, plain], [plain, priced]]) {
      const d = diffStash(baselineOf(a), b, 1)
      expect([d.added, d.removed, d.netChaos]).toEqual([[], [], 0])
    }
  })

  it('an ignored item that leaves is no loss', () => {
    const before = baselineOf(valueStash(tabs, priceOf))
    const d = diffStash(before, valueStash([{ id: 't1', name: 'A', items: [item('Sacrifice at Dawn', 10)] }], priceOf, { prices: {}, ignored: ['Divine Orb'] }), 1)
    expect(d.removed.map(l => l.key)).toEqual([])
  })

  it('an unidentified rare map is not a normal one: no gain every read', () => {
    const map = (frame: number, n: number) => item('Strand Map', n, { frame, mapTier: 16 })
    const priceMap: PriceOf = (i) => i.typeLine === 'Strand Map' && i.frame === 0 ? { chaos: 5, category: 'other' } : null
    const read = valueStash([{ name: 'M', items: [map(0, 20), map(2, 5)] }], priceMap)
    expect(read.lines.map(l => [l.key, l.count])).toEqual([['Strand Map|T16', 20]])
    expect(read.unpricedLines.map(l => [l.key, l.count])).toEqual([['R:Strand Map|T16', 5]])
    const d = diffStash(baselineOf(read), read, 1)
    expect([d.added, d.removed]).toEqual([[], []])
  })

  it('a baseline from before your prices: pricing a rare is no gain', () => {
    const old = { 'Divine Orb': { name: 'Divine Orb', icon: '', count: 3, unitChaos: 200 }, 'Sacrifice at Dawn': { name: 'Sacrifice at Dawn', icon: '', count: 10, unitChaos: 2 } }
    const d = diffStash(old, valueStash(tabs, priceOf, { prices: { [itemKey(rare)]: 300 }, ignored: [] }), 1)
    expect([d.added, d.removed]).toEqual([[], []])
  })

  it('spending what was ignored at the last read is still a loss', () => {
    const base = baselineOf(valueStash(tabs, priceOf, { prices: {}, ignored: ['Divine Orb'] }))
    const d = diffStash(base, valueStash([{ id: 't1', name: 'A', items: [item('Sacrifice at Dawn', 10), rare] }], priceOf), 1)
    expect(d.removed.map(l => [l.key, l.count, l.chaos])).toEqual([['Divine Orb', 3, 600]])
  })

  it('selling a rare you priced since the last read is a loss at your price', () => {
    const base = baselineOf(valueStash(tabs, priceOf))
    const d = diffStash(base, valueStash([{ id: 't1', name: 'A', items: [item('Divine Orb', 3), item('Sacrifice at Dawn', 10)] }], priceOf, { prices: { [itemKey(rare)]: 300 }, ignored: [] }), 1)
    expect(d.removed.map(l => [l.key, l.chaos])).toEqual([[itemKey(rare), 300]])
  })

  it('an unpriced item that comes or goes is worth nothing', () => {
    const before = baselineOf(valueStash([{ name: 'A', items: [rare] }], priceOf))
    expect(diffStash(before, valueStash([{ name: 'A', items: [] }], priceOf), 1).removed).toEqual([])
    const fresh = diffStash(baselineOf(valueStash([{ name: 'A', items: [] }], priceOf)), valueStash([{ name: 'A', items: [rare] }], priceOf), 1)
    expect(fresh.added).toEqual([])
  })
})

describe('history', () => {
  const day = (d: number, h = 12) => new Date(2026, 10, d, h).getTime()
  const v = (chaos: number) => ({ chaos, byCategory: { currency: chaos, fragments: 0, cards: 0, gear: 0, other: 0 }, lines: [], unpriced: 0, unpricedLines: [], ignoredLines: [] })

  it('keeps the last read of each day and today\'s points', () => {
    let h = emptyHistory()
    h = recordRead(h, v(1000), 200, day(11, 20))
    h = recordRead(h, v(2000), 250, day(12, 10))
    h = recordRead(h, v(2500), 250, day(12, 12))
    expect(Object.keys(h.days)).toEqual(['2026-11-11', '2026-11-12'])
    expect(h.today.points).toHaveLength(2)
    expect(h.countedReadAt).toBe(day(12, 12))
    // 2500/250 - 1000/200 = 10 - 5
    expect(sinceYesterday(h, 2500, 250, day(12, 13))).toBe(5)
    // 500 chaos over 2 hours
    expect(perHourToday(h, day(12, 13))).toBe(250)
  })

  it('has no per hour with one read', () => {
    const h = recordRead(emptyHistory(), v(10), 200, day(12))
    expect(perHourToday(h, day(12))).toBeNull()
    expect(sinceYesterday(h, 10, 200, day(12))).toBeNull()
  })
})

describe('stash gains', () => {
  it('sums refreshes inside a time range', async () => {
    const { addGain, gainOf, gainsBetween } = await import('@/web/woke/net-worth/valuation')
    const diff = (at: number, netChaos: number) => ({ at, added: [], removed: [], netChaos })
    let gains = addGain([], gainOf(diff(100, 400), null, 200))
    gains = addGain(gains, gainOf(diff(200, -100), 100, 200))
    gains = addGain(gains, gainOf(diff(300, 1000), 200, null))
    gains = addGain(gains, gainOf(diff(200, -100), 100, 200))
    expect(gains).toHaveLength(3)
    expect(gainsBetween(gains, 100, 250)).toEqual({ chaos: 300, divine: 1.5, reads: 2, first: 100, last: 200 })
    expect(gainsBetween(gains, 0, 1000).divine).toBeNull()
    expect(gainsBetween(gains, 400, 500).reads).toBe(0)
  })
})

describe('gem variants', () => {
  it('names gems like poe.ninja', async () => {
    const { gemVariant } = await import('@/web/woke/net-worth/valuation')
    const gem = (gemLevel: number, quality: number, corrupted = false) => item('Empower Support', 1, { frame: 4, gemLevel, quality, corrupted })
    expect(gemVariant(gem(1, 0))).toBe('1')
    expect(gemVariant(gem(20, 0))).toBe('20')
    expect(gemVariant(gem(21, 20, true))).toBe('21/20c')
    expect(gemVariant(gem(5, 18))).toBe('1/20')
    expect(gemVariant(gem(20, 23, true))).toBe('20/23c')
  })
})
