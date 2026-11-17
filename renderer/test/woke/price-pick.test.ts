// Which price row an item gets when only its name is known: the tooltip
// (live poe.ninja) and the Boss runs / Analytics resolver (Market snapshot).
import { describe, expect, it, vi } from 'vitest'
import { priceResolver } from '@/web/woke/boss-runs/calc'
import { divineRate, pickRow } from '@/web/woke/shared/price-row'
import type { PriceItem } from '@/web/woke/market/types'

// The tooltip module styles the page as it loads: a page that takes anything.
vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>
  const any: unknown = new Proxy(function () {}, {
    get: (_t, k) => k === Symbol.toPrimitive ? () => '' : k === 'then' ? undefined : any,
    apply: () => any,
    construct: () => any as object
  })
  for (const k of ['document', 'window', 'localStorage', 'matchMedia']) if (!(k in g)) g[k] = any
})

// A live poe.ninja feed of a few rows, answered the way Prices.ts does.
interface NinjaRow { name: string, variant?: string, chaos: number, graph: Array<number | null> }
const NINJA: Record<string, NinjaRow[]> = {
  UNIQUE: [
    { name: 'Two Variants', variant: 'Dear', chaos: 90, graph: [] },
    { name: 'Two Variants', variant: 'Cheap', chaos: 10, graph: [] },
    { name: 'Has Plain', variant: '6L', chaos: 500, graph: [] },
    { name: 'Has Plain', chaos: 40, graph: [] }
  ],
  ITEM: [],
  GEM: [],
  DIVINATION_CARD: []
}
vi.mock('@/web/background/Prices', () => ({
  usePoeninja: () => ({
    queuePricesFetch () {},
    xchgRate: { value: 200 },
    findPriceByQuery: ({ ns, name, variant }: { ns: string, name: string, variant?: string }) =>
      NINJA[ns]?.find(r => r.name === name && r.variant === variant) ?? null,
    findPriceByName: (ns: string, name: string) => NINJA[ns]?.find(r => r.name === name && r.variant !== undefined) ?? null,
    findPricesByName: (ns: string, name: string) => NINJA[ns]?.filter(r => r.name === name && r.variant !== undefined) ?? []
  })
}))
vi.mock('@/web/background/Leagues', () => ({ useLeagues: () => ({ selectedId: { value: 'Test' } }) }))

const snap = (name: string, variant: string, chaos: number, type = 'UniqueArmour'): PriceItem =>
  ({ type, name, variant, chaos } as PriceItem)
const SNAPSHOT = [
  snap('Two Variants', 'Dear', 90),
  snap('Two Variants', 'Cheap', 10),
  snap('Has Plain', '6L', 500),
  snap('Has Plain', '', 40)
]

describe('price row by name', () => {
  it('Boss runs: the asked variant, else the plain row, else the cheapest', () => {
    const p = priceResolver(SNAPSHOT)
    expect(p.price('Two Variants', 'Dear')).toBe(90)
    expect(p.price('Two Variants')).toBe(10)
    expect(p.price('Has Plain')).toBe(40)
    expect(p.price('Has Plain', '6L')).toBe(500)
    expect(p.price('Has Plain', 'Missing')).toBe(40)
    expect(p.price('Nothing')).toBeNull()
  })

  it('tooltip: the asked variant only; with none, the plain row', { timeout: 60_000 }, async () => {
    const { marketFor } = await import('@/web/woke/ui/tooltip/item-tip')
    expect(marketFor({ name: 'Has Plain' }, 'unique')?.chaos).toBe(40)
    expect(marketFor({ name: 'Has Plain', variant: '6L' }, 'unique')?.chaos).toBe(500)
    expect(marketFor({ name: 'Has Plain', variant: 'Missing' }, 'unique')).toBeNull()
    expect(marketFor({ name: 'Nothing' }, 'unique')).toBeNull()
  })

  it('tooltip: no plain row takes the cheapest variant, as every window does', async () => {
    const { marketFor } = await import('@/web/woke/ui/tooltip/item-tip')
    expect(marketFor({ name: 'Two Variants' }, 'unique')?.chaos).toBe(10)
  })

  it('a row and its tooltip show the same price for the same item', async () => {
    const { marketFor } = await import('@/web/woke/ui/tooltip/item-tip')
    const boss = priceResolver(SNAPSHOT)
    for (const [name, variant] of [['Two Variants'], ['Two Variants', 'Dear'], ['Has Plain'], ['Has Plain', '6L']] as Array<[string, string?]>) {
      expect(marketFor({ name, variant }, 'unique')?.chaos, `${name} ${variant ?? ''}`).toBe(boss.price(name, variant))
    }
  })
})

describe('pickRow', () => {
  const r = (variant: string, chaos: number, type = 'UniqueArmour') => ({ variant, chaos, type })
  it('takes the asked variant only, unless told to fall back', () => {
    expect(pickRow([r('A', 5), r('', 9)], 'A')?.chaos).toBe(5)
    expect(pickRow([r('A', 5), r('', 9)], 'B')).toBeNull()
    expect(pickRow([r('A', 5), r('', 9)], 'B', { fallback: true })?.chaos).toBe(9)
  })
  it("takes the plain row, a currency's first, else the cheapest", () => {
    expect(pickRow([r('A', 5), r('', 9)])?.chaos).toBe(9)
    expect(pickRow([r('', 9, 'Fragment'), r('', 7, 'Currency')])?.chaos).toBe(7)
    expect(pickRow([r('A', 5), r('B', 3)])?.chaos).toBe(3)
    expect(pickRow([])).toBeNull()
  })
  it('reads a missing variant as plain', () => {
    expect(pickRow([{ chaos: 4 }, { variant: 'X', chaos: 1 }])?.chaos).toBe(4)
  })
})

describe('divineRate', () => {
  it("is live poe.ninja's, else the window's snapshot", () => {
    expect(divineRate(200, 150)).toBe(200)
    expect(divineRate(null, 150)).toBe(150)
    expect(divineRate(undefined, null)).toBeNull()
  })
})
