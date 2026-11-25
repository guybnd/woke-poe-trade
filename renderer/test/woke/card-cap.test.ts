import { describe, expect, it } from 'vitest'
import { DROP_RATE_CAP, cardCap, cardChance, dropRateHeld, loadCardChances, withDropRate } from '@/web/woke/shared/card-cap'
import { heldText } from '@/web/woke/shared/price-trust'
import { baselineOf, valueStash } from '@/web/woke/net-worth/valuation'
import type { Priced, PriceOf, StashItemLike } from '@/web/woke/net-worth/valuation'
import { heldNote } from '@/web/woke/net-worth/tips'
import { dropChance } from '@/web/woke/stacked-decks/weights'

describe('card drop-rate check (shared)', () => {
  it('loads the same chances the deck tracker uses', async () => {
    await loadCardChances()
    expect(cardChance('Loyalty')).toBeCloseTo(dropChance('Loyalty'))
    expect(cardChance('Not A Card')).toBe(0)
  })

  it('caps a card at DROP_RATE_CAP decks for how often it drops', async () => {
    await loadCardChances()
    const cap = cardCap(cardChance('Loyalty'), 3)!
    expect(cap).toBeCloseTo(DROP_RATE_CAP * 3 / dropChance('Loyalty'))
    expect(cap).toBeGreaterThan(200)
    expect(cap).toBeLessThan(400)
    expect(cardCap(0, 3)).toBeNull()
    expect(cardCap(cardChance('Loyalty'), null)).toBeNull()
  })

  it("holds a fake, keeps the line check's reason, and catches a climb past an earlier fake", () => {
    const c = dropChance('Loyalty')
    expect(withDropRate(10_000, null, c, 3)).toEqual({ ninja: 10_000, chaos: null, kind: 'drop-rate' })
    const oneDay = { ninja: 10_000, chaos: null, kind: 'one-day' as const }
    expect(withDropRate(10_000, oneDay, c, 3)).toBe(oneDay)
    expect(withDropRate(60_000, { ninja: 60_000, chaos: 10_000, kind: 'spike' }, c, 3)?.kind).toBe('drop-rate')
    expect(withDropRate(2, null, c, 3)).toBeNull()
    expect(dropRateHeld(10_000, c, null)).toBeNull()
  })

  it('the tooltip says why', () => {
    const text = heldText({ ninja: 10_000, chaos: null, kind: 'drop-rate' }, c => `${c}c`)
    expect(text).toContain('poe.ninja: 10000c')
    expect(text).toContain('far more than a card this common can be worth')
    expect(text).toContain('counts as nothing')
    expect(text).not.toContain('until the price holds')
  })
})

describe('Net worth: a card over its drop-rate cap', () => {
  const card = (typeLine: string, stack: number): StashItemLike => ({ name: '', typeLine, baseType: typeLine, frame: 6, stack, icon: '' })
  const tabs = [{ name: 'Cards', id: 't1', items: [card('Loyalty', 4), card('The Doctor', 1)] }]
  const pricesOf = (p: Record<string, Priced>): PriceOf => (i) => p[i.typeLine] ?? null
  const cap = 2 * 3 / dropChance('Loyalty')

  it("doesn't count it, and says why", () => {
    const v = valueStash(tabs, pricesOf({
      'Loyalty': { chaos: 10_000, category: 'cards', cap },
      'The Doctor': { chaos: 8_000, category: 'cards', cap: 2 * 3 / dropChance('The Doctor') }
    }))
    const loyalty = v.lines.find(l => l.name === 'Loyalty')!
    expect(loyalty.heldKind).toBe('drop-rate')
    expect(loyalty.unitChaos).toBe(0)
    expect(loyalty.ninjaChaos).toBe(10_000)
    expect(v.chaos).toBe(8_000)
    expect(heldNote(loyalty, c => `${c}c`)).toMatch(/^Not counted\. poe\.ninja says 10000c, far more than this card can be worth/)
  })

  it("isn't made the trusted price, and counts again once poe.ninja's price comes down", () => {
    const fake = valueStash(tabs, pricesOf({ Loyalty: { chaos: 10_000, category: 'cards', cap } }))
    const b = baselineOf(fake)
    expect(b[Object.keys(b).find(k => b[k].name === 'Loyalty')!].ref ?? null).toBeNull()
    const real = valueStash(tabs, pricesOf({ Loyalty: { chaos: 2, category: 'cards', cap } }), undefined, { before: b, now: Date.now() })
    const loyalty = real.lines.find(l => l.name === 'Loyalty')!
    expect(loyalty.heldKind).toBeUndefined()
    expect(loyalty.chaos).toBe(8)
  })

  it('a card under its cap, or with no cap, counts as before', () => {
    const v = valueStash(tabs, pricesOf({ 'Loyalty': { chaos: 2, category: 'cards', cap }, 'The Doctor': { chaos: 8_000, category: 'cards' } }))
    expect(v.chaos).toBe(8 + 8_000)
  })
})
