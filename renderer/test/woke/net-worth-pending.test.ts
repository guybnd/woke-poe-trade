import { describe, expect, it } from 'vitest'
import { ageText, confidenceOf, glanceOfPending, mergeRead, pendingRows, pendingTotals, sortPending } from '@/web/woke/net-worth/pending'
import type { PendingDoc } from '@/web/woke/net-worth/pending'
import { staleCount } from '@/web/woke/net-worth/pending-glance'
import type { Sale } from '@/web/woke/net-worth/sales'
import { listedLookup } from '@/web/woke/search/lookups/listed'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const H = 3_600_000
const D = 24 * H
const T0 = 1_000_000_000_000
const RATES = { chaos: 1, divine: 200 }
const item = (id: string, at: number, amount: number, currency = 'chaos', extra: Partial<Sale> = {}): Sale =>
  ({ id, at, name: id, typeLine: id, baseType: id, frameType: 3, icon: '', stack: 1, price: { amount, currency }, ...extra })
const noNinja = () => null

describe('pending sales', () => {
  it('keeps the first time an item was seen across reprices', () => {
    const first = mergeRead(null, 'L', { at: T0, listings: [item('a', T0 - 2 * D, 100)] })
    expect(first.firstSeen.a).toBe(T0 - 2 * D)
    // Repriced: the trade site's listed time moved, the first stays.
    const next = mergeRead(first, 'L', { at: T0 + H, listings: [item('a', T0 + H - 60_000, 80), item('b', T0, 10)] })
    expect(next.firstSeen).toEqual({ a: T0 - 2 * D, b: T0 })
    // Gone from a read (sold or taken down): dropped.
    const last = mergeRead(next, 'L', { at: T0 + 2 * H, listings: [item('b', T0, 10)] })
    expect(Object.keys(last.firstSeen)).toEqual(['b'])
    // Another league's doc doesn't carry over; an older read changes nothing.
    expect(mergeRead(first, 'M', { at: T0 + H, listings: [item('a', T0, 1)] }).firstSeen.a).toBe(T0)
    expect(mergeRead(next, 'L', { at: T0 - D, listings: [] })).toBe(next)
  })

  it('a read cut at 100 keeps the first times of older listings it did not see', () => {
    const first = mergeRead(null, 'L', { at: T0, listings: [item('old', T0 - 5 * D, 1), item('new', T0 - H, 1)] })
    const cut = mergeRead(first, 'L', { at: T0 + H, listings: [item('new', T0 - H, 1)], more: true })
    expect(cut.firstSeen.old).toBe(T0 - 5 * D)
    // The old one repriced comes back: still 5 days old.
    const back = mergeRead(cut, 'L', { at: T0 + 2 * H, listings: [item('old', T0 + 2 * H, 1)] })
    expect(back.firstSeen.old).toBe(T0 - 5 * D)
  })

  it('drops sold items, flags stale ones and sums the asking prices', () => {
    const doc = mergeRead(null, 'L', { at: T0, listings: [item('a', T0 - 4 * D, 2, 'divine'), item('b', T0 - H, 50), item('c', T0 - 5 * D, 30)] })
    // c sold after it was listed; an older sale of the same id (relisted) doesn't count.
    const sales = [item('c', T0 - D, 30), item('a', T0 - 10 * D, 1, 'divine')]
    const rows = pendingRows(doc, sales, RATES, noNinja, T0, 3)
    expect(rows.map(r => r.item.id).sort()).toEqual(['a', 'b'])
    expect(rows.find(r => r.item.id === 'a')!.stale).toBe(true)
    expect(rows.find(r => r.item.id === 'b')!.stale).toBe(false)
    const t = pendingTotals(rows)
    expect(t).toMatchObject({ count: 2, askChaos: 450, worthChaos: 450, stale: 1, staleChaos: 400, unpriced: 0 })
    expect(sortPending(rows).map(r => r.item.id)).toEqual(['a', 'b'])
  })

  it('suggests poe.ninja prices it can trust, and marks rolled ones rough', () => {
    expect(confidenceOf(item('Mageblood', 0, 1), { chaos: 100 })).toBe('sure')
    expect(confidenceOf(item("Watcher's Eye", 0, 1), { chaos: 100 })).toBe('rough')
    expect(confidenceOf(item('Mageblood', 0, 1, 'chaos', { corrupted: true }), { chaos: 100 })).toBe('rough')
    expect(confidenceOf(item('x', 0, 1, 'chaos', { frameType: 6 }), { chaos: 5, thin: true })).toBe('rough')
    expect(confidenceOf(item('x', 0, 1), null)).toBeNull()

    const doc = mergeRead(null, 'L', { at: T0, listings: [item('a', T0, 120), item('b', T0, 900), item('c', T0, 5, 'chaos', { stack: 10 })] })
    const ninja = (l: Sale) => ({ a: { chaos: 100 }, b: { chaos: 100 }, c: { chaos: 0.5 } } as Record<string, { chaos: number }>)[l.id] ?? null
    const rows = pendingRows(doc, [], RATES, ninja, T0)
    const a = rows.find(r => r.item.id === 'a')!
    expect(a.confidence).toBe('sure')
    expect(a.vs).toBeCloseTo(0.2)
    // 9x poe.ninja: most likely another version, so rough.
    expect(rows.find(r => r.item.id === 'b')!.confidence).toBe('rough')
    // A stack's suggestion is for the whole stack.
    expect(rows.find(r => r.item.id === 'c')!.ninja).toBe(5)
    // Worth: poe.ninja's where sure and lower, else the ask.
    expect(pendingTotals(rows).worthChaos).toBe(100 + 900 + 5)
  })

  it('the dock glance counts stale, unsold listings', () => {
    const doc: PendingDoc = mergeRead(null, 'L', { at: T0, listings: [item('a', T0 - 4 * D, 1), item('b', T0 - 5 * D, 1), item('c', T0 - H, 1)] })
    const g = glanceOfPending(doc)
    expect(staleCount(g, [], T0, 3)).toBe(2)
    expect(staleCount(g, [{ id: 'b', at: T0 - D }], T0, 3)).toBe(1)
    expect(staleCount(g, [], T0, 7)).toBe(0)
    expect(staleCount(null, [], T0)).toBe(0)
  })

  it('reads ages short', () => {
    expect(ageText(5 * 60_000)).toBe('5m')
    expect(ageText(30 * H)).toBe('30h')
    expect(ageText(4 * D + H)).toBe('4d')
  })
})

describe('Ctrl+Space: listed', () => {
  const ctx = { price: (n: string) => n === 'Mageblood' ? 400 : null, items: [], tools: new Set<string>(), divine: 200, now: T0, league: null } as unknown as LookupContext
  const doc = mergeRead(null, 'L', { at: T0, listings: [item('Mageblood', T0 - 4 * D, 3, 'divine'), item('Doom', T0 - H, 50)] })
  it('answers "listed" with the count, worth and longest unsold', () => {
    const cards = listedLookup(doc, [], 3)('listed', ctx)
    expect(cards[0].name).toBe('Listed at Faustus: 2 unsold')
    expect(cards[0].sections[0].rows![0].chaos).toBe(650)
    expect(cards[0].sections[1].rows![0].label).toBe('Mageblood · 4d')
    expect(cards[0].sections[1].rows![0].item?.name).toBe('Mageblood')
    expect(cards[0].sub).toContain('counted in your net worth')
    expect(listedLookup(doc, [], 3, false)('listed', ctx)[0].sub).toContain('left out of your net worth')
  })
  it('finds a listed item by name', () => {
    const cards = listedLookup(doc, [], 3)('mageblood', ctx)
    expect(cards.map(c => c.name)).toEqual(['Listed Mageblood'])
    expect(listedLookup(doc, [item('Mageblood', T0, 3, 'divine')], 3)('mageblood', ctx)).toEqual([])
    expect(listedLookup(null, null)('listed', ctx)).toEqual([])
  })
})
