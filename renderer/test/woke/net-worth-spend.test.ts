import { describe, expect, it } from 'vitest'
import { classify, markAction, resolveSpends, RETURN_WINDOW_MS } from '@/web/woke/net-worth/spend'
import type { SpendFields } from '@/web/woke/net-worth/spend'
import { gainsBetween } from '@/web/woke/net-worth/valuation'
import type { StashGain } from '@/web/woke/net-worth/valuation'

const DIV = 200
const H = 3_600_000
const one = (g: SpendFields) => resolveSpends([g]).get(g.at)!

describe('classify', () => {
  it('a big drop that is mostly currency is a purchase', () => {
    expect(classify({ netChaos: -50 * DIV, cashChaos: -50 * DIV }, DIV)).toEqual({ auto: 'spend' })
  })
  it('small drops, item losses and old diffs are left alone', () => {
    expect(classify({ netChaos: -5 * DIV, cashChaos: -5 * DIV }, DIV)).toEqual({})
    // Scarabs and maps used up: fragments, not currency.
    expect(classify({ netChaos: -20 * DIV, cashChaos: 0 }, DIV)).toEqual({})
    expect(classify({ netChaos: -50 * DIV }, DIV)).toEqual({})
  })
})

describe('a purchase', () => {
  it('counts at most 0', () => {
    expect(one({ at: 1, netChaos: -50 * DIV, cashChaos: -50 * DIV, auto: 'spend' })).toEqual({ counted: 0, spent: 50 * DIV, back: 0 })
    // Loot in the same refresh is lost with it (counts 0, not +3).
    expect(one({ at: 1, netChaos: -47 * DIV, cashChaos: -50 * DIV, auto: 'spend' }).counted).toBe(0)
    // Currency into a priced item kept in the stash is a swap, never profit.
    expect(one({ at: 1, netChaos: -12 * DIV, cashChaos: -50 * DIV, auto: 'spend' }).counted).toBe(0)
    // Other losses in the same refresh still count.
    expect(one({ at: 1, netChaos: -60 * DIV, cashChaos: -45 * DIV, mark: 'spend' }).counted).toBe(-15 * DIV)
  })
  it('your mark wins over the guess', () => {
    expect(one({ at: 1, netChaos: -50, cashChaos: -50, auto: 'spend', mark: 'counted' }).counted).toBe(-50)
    expect(one({ at: 1, netChaos: -50, mark: 'spend' }).counted).toBe(0)
  })
  it('marked with an amount leaves that much out, small ones too', () => {
    expect(one({ at: 1, netChaos: -30 * DIV, mark: 'spend', markChaos: 20 * DIV })).toEqual({ counted: -10 * DIV, spent: 20 * DIV, back: 0 })
    expect(one({ at: 1, netChaos: -30 * DIV, mark: 'spend', markChaos: 50 * DIV }).counted).toBe(0)
    expect(one({ at: 1, netChaos: -40, mark: 'spend', markChaos: 40 }).counted).toBe(0)
  })
})

describe('what comes back after a purchase', () => {
  const spend: SpendFields = { at: 0, netChaos: -50 * DIV, cashChaos: -50 * DIV, auto: 'spend' }
  it('the currency back, or the bought item stashed, cancels it', () => {
    expect(resolveSpends([spend, { at: H, netChaos: 50 * DIV, cashChaos: 50 * DIV }]).get(H)).toEqual({ counted: 0, spent: 0, back: 50 * DIV })
    // The item bought, priced a bit under what it cost.
    expect(resolveSpends([spend, { at: H, netChaos: 40 * DIV, cashChaos: 0, topAddChaos: 40 * DIV }]).get(H)!.counted).toBe(0)
  })
  it('gains of another size, or later, are profit', () => {
    expect(resolveSpends([spend, { at: H, netChaos: 12 * DIV }]).get(H)!.counted).toBe(12 * DIV)
    expect(resolveSpends([spend, { at: H, netChaos: 80 * DIV }]).get(H)!.counted).toBe(80 * DIV)
    expect(resolveSpends([spend, { at: RETURN_WINDOW_MS + 1, netChaos: 50 * DIV }]).get(RETURN_WINDOW_MS + 1)!.counted).toBe(50 * DIV)
  })
  it('farming loot after a purchase stays profit', () => {
    // Many small things, little currency: not the purchase coming back.
    expect(resolveSpends([spend, { at: H, netChaos: 40 * DIV, cashChaos: 2 * DIV, topAddChaos: 3 * DIV }]).get(H)!.counted).toBe(40 * DIV)
    // One gain closes a purchase; the next one is profit.
    const r = resolveSpends([spend, { at: H, netChaos: 30 * DIV, cashChaos: 30 * DIV }, { at: 1.5 * H, netChaos: 20 * DIV, cashChaos: 20 * DIV }])
    expect(r.get(H)!.back).toBe(30 * DIV)
    expect(r.get(1.5 * H)!.counted).toBe(20 * DIV)
    // Small marked purchases are never cancelled.
    const small = resolveSpends([{ at: 0, netChaos: -2 * DIV, mark: 'spend' }, { at: H, netChaos: 2 * DIV, cashChaos: 2 * DIV }])
    expect(small.get(H)!.counted).toBe(2 * DIV)
  })
  it('flipping the purchase moves what comes back too', () => {
    const back = { at: H, netChaos: 50 * DIV, cashChaos: 50 * DIV }
    const r = resolveSpends([{ ...spend, mark: 'counted' }, back])
    expect(r.get(0)!.counted).toBe(-50 * DIV)
    expect(r.get(H)!.counted).toBe(50 * DIV)
    // A gain you count as profit keeps the purchase out.
    const r2 = resolveSpends([spend, { ...back, mark: 'counted' }])
    expect(r2.get(0)!.counted + r2.get(H)!.counted).toBe(50 * DIV)
  })
  it('matches each purchase once, oldest first', () => {
    const r = resolveSpends([
      { at: 0, netChaos: -50 * DIV, cashChaos: -50 * DIV, auto: 'spend' },
      { at: 1.5 * H, netChaos: 50 * DIV, cashChaos: 50 * DIV },
      { at: 1.6 * H, netChaos: -30 * DIV, cashChaos: -30 * DIV, auto: 'spend' },
      { at: 1.7 * H, netChaos: 30 * DIV, cashChaos: 30 * DIV }
    ])
    expect(r.get(1.5 * H)!.back).toBe(50 * DIV)
    expect(r.get(1.7 * H)!.back).toBe(30 * DIV)
  })
})

describe('the switch', () => {
  it('offers the right one', () => {
    expect(markAction({ at: 1, netChaos: 20 }, undefined)).toBeNull()
    expect(markAction({ at: 1, netChaos: -20 }, undefined)).toEqual({ label: 'Count as purchase', mark: 'spend' })
    expect(markAction({ at: 1, netChaos: -20, mark: 'spend' }, undefined)).toEqual({ label: 'Not a purchase', mark: null })
    expect(markAction({ at: 1, netChaos: -20, auto: 'spend' }, undefined)).toEqual({ label: 'Not a purchase', mark: 'counted' })
    expect(markAction({ at: 1, netChaos: -20, auto: 'spend', mark: 'counted' }, undefined)).toEqual({ label: 'Count as purchase', mark: null })
    expect(markAction({ at: 1, netChaos: 20 }, { counted: 0, spent: 0, back: 20 })).toEqual({ label: 'Count as profit', mark: 'counted' })
    expect(markAction({ at: 1, netChaos: 20, mark: 'counted' }, undefined)).toEqual({ label: 'Cancel the purchase', mark: null })
  })
})

describe('session total', () => {
  const gain = (at: number, net: number, extra: Partial<StashGain> = {}): StashGain =>
    ({ at, since: null, netChaos: net, netDivine: net / DIV, added: 0, removed: 0, ...extra })
  it('leaves purchases out', () => {
    const gains = [gain(1, 3 * DIV), gain(2, -50 * DIV, { cashChaos: -50 * DIV, auto: 'spend' }), gain(3, 4 * DIV)]
    const r = gainsBetween(gains, 0, 10)
    expect(r.chaos).toBe(7 * DIV)
    expect(r.divine).toBeCloseTo(7)
    expect(r.spent).toBe(50 * DIV)
  })
  it('a purchase before the session can be cancelled inside it', () => {
    const gains = [gain(0, -50 * DIV, { cashChaos: -50 * DIV, auto: 'spend' }), gain(H, 50 * DIV, { cashChaos: 50 * DIV })]
    expect(gainsBetween(gains, 1, 2 * H).chaos).toBe(0)
  })
})

describe('chart range', () => {
  it('3h shows only the last three hours of refreshes', async () => {
    const { seriesFor } = await import('@/web/woke/net-worth/ledger')
    const cats = { currency: 0, fragments: 0, cards: 0, gear: 0, other: 0 }
    const pt = (at: number) => ({ at, chaos: 100, divine: 100, byCategory: cats, netChaos: 0, top: [] })
    const now = 10 * H
    expect(seriesFor([pt(now - 4 * H), pt(now - 2 * H), pt(now - H)], {}, '3h', now, 100).map(p => p.at)).toEqual([now - 2 * H, now - H])
  })
})
