import { describe, expect, it } from 'vitest'
import type { Sale } from '@/web/woke/net-worth/sales'
import { salesLookup } from '@/web/woke/search/lookups/sales'

const H = 3_600_000
const NOW = new Date(2026, 10, 21, 12, 0).getTime()
const sale = (id: string, amount: number): Sale => ({
  id,
  at: NOW - H,
  name: '',
  typeLine: 'Chaos Orb',
  baseType: 'Chaos Orb',
  frameType: 5,
  icon: '',
  stack: 1,
  price: { amount, currency: 'chaos' }
})

describe('a sale you left out', () => {
  const ctx = { price: () => null, items: [], tools: new Set<string>(), divine: 200, now: NOW, league: null }
  const list = [sale('a', 100), sale('b', 900)]

  it("isn't in Ctrl+Space's sold today and this week", () => {
    expect(salesLookup(list)('sold', ctx)[0].sections[0].rows?.[0]).toMatchObject({ chaos: 1000 })
    const rows = salesLookup(list, new Set(['b']))('sold', ctx)[0].sections[0].rows
    expect(rows?.[0]).toMatchObject({ label: 'Today · 1', chaos: 100 })
    expect(rows?.[1]).toMatchObject({ label: 'Last 7 days · 1', chaos: 100 })
  })
})
