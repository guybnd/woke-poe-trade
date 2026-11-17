// Which price row an item gets when only its name is known: the tooltip
// (live poe.ninja) and the Boss runs / Analytics resolver (Market snapshot).
import { describe, expect, it, vi } from 'vitest'
import { priceResolver } from '@/web/woke/boss-runs/calc'
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

  it('tooltip today: no plain row takes the first variant listed, not the cheapest', async () => {
    const { marketFor } = await import('@/web/woke/ui/tooltip/item-tip')
    expect(marketFor({ name: 'Two Variants' }, 'unique')?.chaos).toBe(90)
  })
})
