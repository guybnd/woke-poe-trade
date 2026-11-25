import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
vi.mock('@/web/background/Prices', () => ({
  usePoeninja: () => ({
    updatedAt: ref(1),
    xchgRate: ref(200),
    findPriceByQuery: (q: { ns: string, name: string }) => q.ns === 'UNIQUE' && q.name === 'Mageblood' ? { chaos: 40000, url: 'x' } : null,
    findPricesByName: (ns: string, name: string) => ns === 'UNIQUE' && name === 'Mageblood' ? [{ name: 'Mageblood', chaos: 40000 }] : []
  })
}))
vi.mock('@/web/woke/market/hook', () => ({ lastWokePrices: () => null }))
vi.mock('@/web/woke/shared/price', () => ({ useUnidPrice: () => () => null }))
vi.mock('@/web/woke/shared/unid-art', () => ({ uniqueFromArt: (base: string, icon: string) => base === 'Heavy Belt' && icon.includes('Mageblood') ? 'Mageblood' : null }))
const { ninjaPriceOf } = await import('@/web/woke/net-worth/prices')
const { valueStash, baselineOf, diffStash, BASELINE_V4 } = await import('@/web/woke/net-worth/valuation')

describe('an unidentified unique', () => {
  const unid = { name: '', typeLine: 'Heavy Belt', baseType: 'Heavy Belt', frame: 3, stack: 1, icon: 'x/Mageblood.png' }
  const id = { ...unid, name: 'Mageblood' }
  const white = { ...unid, frame: 0, icon: 'x/Belt.png' }

  it('has its unique price', () => {
    expect(ninjaPriceOf()(id)?.chaos).toBe(40000)
    expect(ninjaPriceOf()(unid)?.chaos).toBe(40000)
  })

  it('identifying it is not profit', () => {
    const before = baselineOf(valueStash([{ name: 't', items: [unid] }], ninjaPriceOf()))
    const after = valueStash([{ name: 't', items: [id] }], ninjaPriceOf())
    const d = diffStash(before, after, 2)
    expect(d.netChaos).toBe(0)
    expect(d.added).toEqual([])
    expect(d.removed).toEqual([])
  })

  it('is its own line, apart from a white item of its base', () => {
    const v = valueStash([{ name: 't', items: [unid, white] }], ninjaPriceOf())
    expect(v.lines.find(l => l.name === 'Mageblood')?.chaos).toBe(40000)
    expect(v.unpricedLines.map(l => l.key)).toEqual(['Heavy Belt'])
  })

  it('a read from before it had a price books nothing on update', () => {
    // Baselines before BASELINE_V4 kept it unpriced, by its base.
    const read = baselineOf(valueStash([{ name: 't', items: [unid, white] }], () => null))
    const old = Object.fromEntries(Object.entries(read).filter(([k]) => k !== BASELINE_V4))
    expect(old['Heavy Belt'].count).toBe(2)
    const d = diffStash(old, valueStash([{ name: 't', items: [unid, white] }], ninjaPriceOf()), 2)
    expect(d.netChaos).toBe(0)
    expect(d.added).toEqual([])
    expect(d.unpricedOut).toBeUndefined()
  })
})
