// A category poe.ninja adds for a new league, such as its currency, is read and
// priced; the categories we list still win a name they share with it.
import { describe, expect, it, vi } from 'vitest'
import { nextTick, shallowRef } from 'vue'
import { parseDenseChunks } from '@/web/woke/market/parse'
import { namespaceForType, slugForType, typeForSlug } from '@/web/woke/market/types'

let body = ''
let chunksSeen: Array<{ ns: string, url: string, lines: string }> = []
vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response(body) } }))
vi.mock('@/web/background/Leagues', () => ({
  useLeagues: () => ({
    selected: shallowRef({ id: 'Veilborn', isPopular: true, realm: 'pc-ggg' }),
    selectedId: shallowRef('Veilborn')
  })
}))
vi.mock('@/web/woke/market/hook', () => ({ emitWokePricesLoaded: (_l: string, chunks: typeof chunksSeen) => { chunksSeen = chunks } }))

/* eslint-disable import/first */
import { usePoeninja } from '@/web/background/Prices'
/* eslint-enable import/first */

async function settle () {
  for (let i = 0; i < 8; i++) { await Promise.resolve(); await nextTick() }
  await new Promise(resolve => setTimeout(resolve, 0))
}

describe('poe.ninja categories', () => {
  it('names a new category like poe.ninja does', () => {
    expect(slugForType('AllflameEmber')).toBe('allflame-embers')
    expect(slugForType('VeilShard')).toBe('veil-shards')
    expect(typeForSlug('veil-shards')).toBe('VeilShard')
    expect(slugForType('Memory')).toBe('memories')
    expect(slugForType('Remnants')).toBe('remnants')
    expect(namespaceForType('UniqueIdol')).toBe('UNIQUE')
    expect(namespaceForType('VeilShard')).toBe('ITEM')
  })

  it('prices a new league currency, and tracks it', async () => {
    body = '{"currencyOverviews":[{"type":"Currency","lines":[{"name":"Divine Orb","chaos":180,"graph":[]}]}],' +
      '"itemOverviews":[{"type":"VeilShard","lines":[{"name":"Divine Orb","chaos":1,"graph":[]},{"name":"Shard of the Veil","chaos":12,"graph":[]}]}]}'
    const ninja = usePoeninja()
    ninja.queuePricesFetch()
    await settle()
    expect(ninja.findPriceByQuery({ ns: 'ITEM', name: 'Shard of the Veil', variant: undefined })?.chaos).toBe(12)
    expect(ninja.findPriceByQuery({ ns: 'ITEM', name: 'Shard of the Veil', variant: undefined })?.url).toContain('/veil-shards/')
    // Currency, which we list, still answers for a name both have.
    expect(ninja.findPriceByQuery({ ns: 'ITEM', name: 'Divine Orb', variant: undefined })?.chaos).toBe(180)
    expect(parseDenseChunks(chunksSeen).map(i => i.type)).toContain('VeilShard')
  })
})

describe('a big category we don\'t list', () => {
  it('is left out', async () => {
    const rows = Array.from({ length: 600 }, (_, i) => `{"name":"Enchant ${i}","chaos":1,"graph":[]}`).join(',')
    body = `{"currencyOverviews":[{"type":"Currency","lines":[{"name":"Divine Orb","chaos":180,"graph":[]}]}],"itemOverviews":[{"type":"HelmetEnchant","lines":[${rows}]}]}`
    vi.resetModules()
    const { usePoeninja: fresh } = await import('@/web/background/Prices')
    const ninja = fresh()
    ninja.queuePricesFetch()
    await settle()
    expect(ninja.findPriceByQuery({ ns: 'ITEM', name: 'Divine Orb', variant: undefined })?.chaos).toBe(180)
    expect(ninja.findPriceByQuery({ ns: 'ITEM', name: 'Enchant 3', variant: undefined })).toBeNull()
  })
})
