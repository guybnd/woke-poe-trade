// A bulk search waits for its turn under the exchange rate limit. If the player
// checks another item meanwhile, the old search must not be sent when its turn
// comes: it would spend a trade search on an item nobody is looking at.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const proxyBodies: string[] = []
let nextResult: () => unknown
vi.mock('@/web/background/IPC', () => ({
  Host: {
    proxy: async (_url: string, init: { body: string }) => {
      proxyBodies.push(init.body)
      return new Response(JSON.stringify(nextResult()), { status: 200, headers: { 'content-type': 'application/json' } })
    }
  }
}))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import-x/first */
import { BULK_SEARCH_STALE, execBulkSearch } from '@/web/price-check/trade/pathofexile-bulk'
import { RATE_LIMIT_RULES } from '@/web/price-check/trade/common'
/* eslint-enable import-x/first */

let league = 0
function args (have: string[]) {
  // A fresh league each time, so the search cache never answers.
  league += 1
  const item = { info: { tradeTag: 'exalted', refName: 'Exalted Orb' } } as never
  const filters = { trade: { league: `L${league}`, offline: false, onlineInLeague: false } } as never
  return [item, filters, have] as const
}

function listing (id: string, currency: string, amount: number) {
  return {
    id,
    listing: {
      indexed: '2026-11-23T00:00:00Z',
      offers: [{ exchange: { currency, amount }, item: { amount: 1, stock: 10 } }],
      account: { name: 'x', lastCharacterName: 'x', online: null }
    }
  }
}

describe('bulk search replaced while it waits', () => {
  beforeEach(() => {
    proxyBodies.length = 0
    RATE_LIMIT_RULES.EXCHANGE.clear()
    nextResult = () => ({ id: 'q', total: 0, result: {} })
  })

  it('is not sent once a newer search replaced it', async () => {
    const [item, filters, have] = args(['divine', 'chaos'])
    await expect(execBulkSearch(item, filters, have, { accountName: '', isCurrent: () => false }))
      .rejects.toThrow(BULK_SEARCH_STALE)
    expect(proxyBodies).toHaveLength(0)
  })

  it('is sent while it is still the current search', async () => {
    const [item, filters, have] = args(['divine', 'chaos'])
    await execBulkSearch(item, filters, have, { accountName: '', isCurrent: () => true })
    expect(proxyBodies).toHaveLength(1)
  })

  it('checks the search is current after waiting its turn, not before', async () => {
    let current = true
    const [item, filters, have] = args(['divine', 'chaos'])
    const isCurrent = vi.fn(() => current)
    const pending = execBulkSearch(item, filters, have, { accountName: '', isCurrent })
    current = false // another item checked while this one waited
    await expect(pending).rejects.toThrow(BULK_SEARCH_STALE)
    expect(proxyBodies).toHaveLength(0)
  })
})

describe('chaos side held back', () => {
  beforeEach(() => {
    proxyBodies.length = 0
    RATE_LIMIT_RULES.EXCHANGE.clear()
  })

  const manyDivines = () => ({
    id: 'q',
    total: 500,
    result: Object.fromEntries([
      ...Array.from({ length: 95 }, (_, i) => listing(`d${i}`, 'divine', 1)),
      ...Array.from({ length: 5 }, (_, i) => listing(`c${i}`, 'chaos', 100))
    ].map(r => [r.id, r]))
  })

  it('holds the chaos side back from a search shared with divines', async () => {
    nextResult = manyDivines
    const [item, filters, have] = args(['divine', 'chaos'])
    const [divine, chaos] = await execBulkSearch(item, filters, have, { accountName: '' })
    expect(divine?.haveTag).toBe('divine')
    expect(chaos).toBeNull()
  })

  it('never holds back a chaos-only search (a Divine Orb check): it has nothing else to show', async () => {
    nextResult = () => ({ ...manyDivines(), total: 500 })
    const [item, filters, have] = args(['chaos'])
    const [chaos] = await execBulkSearch(item, filters, have, { accountName: '' })
    expect(chaos?.haveTag).toBe('chaos')
    expect(chaos?.listed).toHaveLength(5)
  })
})
