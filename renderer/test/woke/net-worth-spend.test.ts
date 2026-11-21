import { describe, expect, it } from 'vitest'
import { classify, countedChaos, markAction, openSpend, spentChaos, RETURN_WINDOW_MS } from '@/web/woke/net-worth/spend'
import type { SpendFields } from '@/web/woke/net-worth/spend'
import { gainsBetween } from '@/web/woke/net-worth/valuation'
import type { StashGain } from '@/web/woke/net-worth/valuation'
import { playRate } from '@/web/woke/net-worth/play-time'

const DIV = 200
const H = 3_600_000

describe('classify', () => {
  it('a big drop that is mostly currency is a purchase', () => {
    expect(classify({ netChaos: -50 * DIV, cashChaos: -50 * DIV }, 1, [], DIV)).toEqual({ auto: 'spend' })
  })
  it('small drops, item losses and old diffs are left alone', () => {
    expect(classify({ netChaos: -5 * DIV, cashChaos: -5 * DIV }, 1, [], DIV)).toEqual({})
    // Scarabs and maps used up: fragments, not currency.
    expect(classify({ netChaos: -20 * DIV, cashChaos: 0 }, 1, [], DIV)).toEqual({})
    expect(classify({ netChaos: -50 * DIV }, 1, [], DIV)).toEqual({})
  })
  it('currency back soon after a purchase cancels it', () => {
    const spend = { at: 0, netChaos: -50 * DIV, cashChaos: -50 * DIV, auto: 'spend' as const }
    expect(classify({ netChaos: 50 * DIV, cashChaos: 50 * DIV }, H, [spend], DIV)).toEqual({ auto: 'return', back: 50 * DIV })
    // Past the window it's profit again.
    expect(classify({ netChaos: 50 * DIV, cashChaos: 50 * DIV }, RETURN_WINDOW_MS + 1, [spend], DIV)).toEqual({})
    // A sale (item out, currency in) nets 0: not a return.
    expect(classify({ netChaos: 0, cashChaos: 50 * DIV }, H, [spend], DIV)).toEqual({})
  })
  it('only cancels what is still out', () => {
    const before = [
      { at: 0, netChaos: -20 * DIV, cashChaos: -20 * DIV, auto: 'spend' as const },
      { at: 10, netChaos: 15 * DIV, cashChaos: 15 * DIV, auto: 'return' as const, back: 15 * DIV }
    ]
    expect(openSpend(before, 20)).toBe(5 * DIV)
    expect(classify({ netChaos: 30 * DIV, cashChaos: 30 * DIV }, 20, before, DIV)).toEqual({ auto: 'return', back: 5 * DIV })
  })
})

describe('counted', () => {
  it('a purchase counts at most 0, keeping loot found in the same refresh', () => {
    const g: SpendFields = { netChaos: -47 * DIV, cashChaos: -50 * DIV, auto: 'spend' }
    expect(countedChaos(g)).toBe(0)
    expect(spentChaos(g)).toBe(47 * DIV)
    // Currency into a priced item kept in the stash is a swap, never profit.
    expect(countedChaos({ netChaos: -12 * DIV, cashChaos: -50 * DIV, auto: 'spend' })).toBe(0)
    // Other losses in the same refresh still count.
    expect(countedChaos({ netChaos: -60 * DIV, cashChaos: -45 * DIV, mark: 'spend' })).toBe(-15 * DIV)
  })
  it('your mark wins over the guess', () => {
    expect(countedChaos({ netChaos: -50, cashChaos: -50, auto: 'spend', mark: 'counted' })).toBe(-50)
    expect(countedChaos({ netChaos: -50, mark: 'spend' })).toBe(0)
    expect(countedChaos({ netChaos: 50, auto: 'return', back: 50 })).toBe(0)
    expect(countedChaos({ netChaos: 50, auto: 'return', back: 50, mark: 'counted' })).toBe(50)
  })
  it('offers the right switch', () => {
    expect(markAction({ netChaos: 20 })).toBeNull()
    expect(markAction({ netChaos: -20 })).toEqual({ label: 'Count as purchase', mark: 'spend' })
    expect(markAction({ netChaos: -20, mark: 'spend' })).toEqual({ label: 'Count as loss', mark: null })
    expect(markAction({ netChaos: -20, auto: 'spend' })).toEqual({ label: 'Count as loss', mark: 'counted' })
    expect(markAction({ netChaos: -20, auto: 'spend', mark: 'counted' })).toEqual({ label: 'Count as purchase', mark: null })
    expect(markAction({ netChaos: 20, auto: 'return', back: 20 })).toEqual({ label: 'Count as profit', mark: 'counted' })
  })
})

describe('session and per hour', () => {
  const gain = (at: number, net: number, extra: Partial<StashGain> = {}): StashGain =>
    ({ at, since: null, netChaos: net, netDivine: net / DIV, added: 0, removed: 0, ...extra })
  it('the session total leaves purchases out', () => {
    const gains = [gain(1, 3 * DIV), gain(2, -50 * DIV, { cashChaos: -50 * DIV, auto: 'spend' }), gain(3, 4 * DIV)]
    const r = gainsBetween(gains, 0, 10)
    expect(r.chaos).toBe(7 * DIV)
    expect(r.divine).toBeCloseTo(7)
    expect(r.spent).toBe(50 * DIV)
  })
  it('per hour uses what counts', () => {
    // The store feeds playRate counted values for purchases.
    const pts = [{ at: 0, netChaos: null }, { at: H, netChaos: 9 * DIV }, { at: 2 * H, netChaos: 0 }]
    expect(playRate(pts, [], 0, 2 * H).perHour).toBeCloseTo(4.5 * DIV)
  })
})

describe('a purchase marked with an amount', () => {
  it('leaves that much out, the rest of the drop still counts', () => {
    expect(countedChaos({ netChaos: -30 * DIV, mark: 'spend', markChaos: 20 * DIV })).toBe(-10 * DIV)
    expect(countedChaos({ netChaos: -30 * DIV, mark: 'spend', markChaos: 50 * DIV })).toBe(0)
    expect(spentChaos({ netChaos: -30 * DIV, mark: 'spend', markChaos: 20 * DIV })).toBe(20 * DIV)
    // Small ones too: any losing refresh can be marked.
    expect(countedChaos({ netChaos: -40, mark: 'spend', markChaos: 40 })).toBe(0)
  })
})
