// The sales store: poe.ninja's price for a sale is looked up with its links
// (a 6L unique has its own row), and one league's sales never show for another.
import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import type { Sale, SalesReply } from '@/web/woke/net-worth/sales'
import type { StashItemLike } from '@/web/woke/net-worth/valuation'

const asked: StashItemLike[] = []
vi.mock('@/web/woke/net-worth/prices', () => ({
  ninjaPriceOf: () => (i: StashItemLike) => {
    asked.push(i)
    return (i.links ?? 0) >= 6 ? { chaos: 900, category: 'gear' } : { chaos: 30, category: 'gear' }
  }
}))
vi.mock('@/web/background/Prices', () => ({
  usePoeninja: () => ({ updatedAt: ref(1), xchgRate: ref(200), findPriceByQuery: () => null })
}))
vi.mock('@/web/background/IPC', () => ({ MainProcess: { onEvent: () => {} } }))
const replies = new Map<string, SalesReply>()
vi.mock('@/web/woke/shared/host', () => ({
  hostRequest: async (_op: string, args: { league: string }) => replies.get(args.league) ?? null
}))

const { loadSales, ninjaEach, ninjaPriced, sales } = await import('@/web/woke/net-worth/sales-store')

const sale = (over: Partial<Sale> = {}): Sale => ({
  id: 's1', at: 1, name: 'Tabula Rasa', typeLine: 'Simple Robe', baseType: 'Simple Robe', frameType: 3, stack: 1, icon: '', price: { amount: 1, currency: 'divine' }, ...over
})

describe('sales store', () => {
  it('prices a 6L sale from poe.ninja\'s 6L row', () => {
    expect(ninjaEach(sale({ links: 6 }))).toBe(900)
    expect(ninjaPriced(sale({ links: 6 }))?.chaos).toBe(900)
    expect(asked.every(i => i.links === 6)).toBe(true)
    expect(ninjaEach(sale())).toBe(30)
  })

  it('drops the last league\'s sales when the next league\'s read fails', async () => {
    replies.set('A', { league: 'A', readAt: 1, sales: [sale()], error: null })
    await loadSales('A')
    expect(sales.value.length).toBe(1)
    await loadSales('B')
    expect(sales.value).toEqual([])
  })
})
