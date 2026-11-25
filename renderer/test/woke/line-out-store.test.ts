import { beforeEach, describe, expect, it, vi } from 'vitest'

const calls: Array<{ op: string, args: any }> = [] // eslint-disable-line @typescript-eslint/no-explicit-any
let saved: Record<string, unknown> = {}
let failGet = false
vi.mock('@/web/woke/shared/host', () => ({
  hostRequest: async (op: string, args: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    calls.push({ op, args })
    // As main answers a locked file: doc-get says null, doc-get-strict throws.
    if (op === 'doc-get') return failGet ? null : saved[args.key] ?? null
    if (op === 'doc-get-strict') { if (failGet) throw new Error('EBUSY'); return saved[args.key] ?? null }
    if (op === 'doc-put') { saved[args.key] = args.value; return null }
    return null
  }
}))

describe('line-out store', () => {
  beforeEach(() => { calls.length = 0; saved = {}; failGet = false; vi.resetModules() })

  it('keeps each league apart and adds to what was saved', async () => {
    saved['line-out:A'] = { league: 'A', sale: ['s1'], listed: [] }
    const st = await import('@/web/woke/net-worth/line-out-store')
    await st.setLineOut('A', 'sale', 's2', true)
    await st.setLineOut('B', 'listed', 'l1', true)
    expect(saved['line-out:A']).toEqual({ league: 'A', sale: ['s1', 's2'], listed: [] })
    expect(saved['line-out:B']).toEqual({ league: 'B', sale: [], listed: ['l1'] })
    expect([...st.outIdsOf(st.lineOutDoc.value, 'A', 'sale')]).toEqual(['s1', 's2'])
    await st.setLineOut('A', 'sale', 's1', false)
    expect([...st.outIdsOf(st.lineOutDoc.value, 'A', 'sale')]).toEqual(['s2'])
  })

  it('never writes over a doc it could not read', async () => {
    saved['line-out:A'] = { league: 'A', sale: ['s1'], listed: [] }
    failGet = true
    const st = await import('@/web/woke/net-worth/line-out-store')
    await expect(st.setLineOut('A', 'sale', 's2', true)).rejects.toThrow()
    expect(saved['line-out:A']).toEqual({ league: 'A', sale: ['s1'], listed: [] })
    expect(calls.some(c => c.op === 'doc-put')).toBe(false)
  })
})
