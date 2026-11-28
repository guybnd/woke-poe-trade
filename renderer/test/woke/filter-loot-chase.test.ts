// Unique bases by their average drop, and Chase uniques (Guy's picks A, K1,
// S1, 2026-11-28): Leather Belt is mostly 1c uniques plus a rare Headhunter,
// so it's worth its average (only T0 is a chase) and goes to Chase uniques (Always, own look); a
// boss base that also drops world uniques is priced by those.
import { describe, it, expect } from 'vitest'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import { currencyItems, currencyLook, defaultCurrency, sectionMode } from '@/web/woke/loot-filter/currency-weights'
import { NET_GROUPS, dropLookup } from '@/web/woke/loot-filter/economy'
import type { PriceItem } from '@/web/woke/market/types'
import { neverSink } from '../helpers/neversink'

const line = (name: string, chaos: number, type = 'UniqueAccessory'): PriceItem => ({ type, name, variant: '', chaos, gaps: 0 } as PriceItem)
const ITEMS = [
  line('Headhunter', 50000), line('Wurm\'s Molt', 1), line('Immortal Flesh', 2), line('Leash of Oblation', 3),
  line('The Primordial Chain', 4), line('Araku Tiki', 1), line('Tavukai', 1),
  line('Voll\'s Devotion', 7)
]
const ON: Record<string, string[]> = {
  'Leather Belt': ['Headhunter', 'Wurm\'s Molt', 'Immortal Flesh', 'Leash of Oblation'],
  'Coral Amulet': ['The Primordial Chain', 'Araku Tiki', 'Tavukai'],
  // Eternal Damnation (Lycia) isn't a random drop: left out already.
  'Agate Amulet': ['Voll\'s Devotion']
}
const TIERS: Record<string, number> = { 'Headhunter': 0, 'Wurm\'s Molt': 5, 'Immortal Flesh': 5, 'Leash of Oblation': 3, 'The Primordial Chain': 4, 'Araku Tiki': 5, 'Tavukai': 3, 'Voll\'s Devotion': 2 }
const U = NET_GROUPS.find(g => g.unique)!
const look = dropLookup(ITEMS, b => ON[b] ?? [], TIERS)

describe('unique bases by their average drop', () => {
  it('a rare jackpot is a chase, left out of the average', () => {
    const p = look(U, 'Leather Belt')!
    expect(p.chaos).toBeGreaterThan(1)
    expect(p.chaos).toBeLessThan(3)
    expect(p.drop).toEqual({ of: 3, chase: [{ name: 'Headhunter', chaos: 50000 }] })
  })

  it('one 4c unique among 1c ones doesn\'t carry the base', () => {
    const p = look(U, 'Coral Amulet')!
    expect(p.chaos).toBeLessThan(2)
    expect(p.drop?.chase).toEqual([])
  })

  it('only T0 is a chase: a valuable T2 unique still counts', () => {
    expect(look(U, 'Agate Amulet')?.chaos).toBe(7)
    expect(look(U, 'Agate Amulet')?.drop?.chase).toEqual([])
  })

  it('a base whose only unique is T0 is a chase base at that price', () => {
    const one = dropLookup([line('Kalandra\'s Touch', 4000)], () => ['Kalandra\'s Touch'], { 'Kalandra\'s Touch': 0 })
    expect(one(U, 'Ring')).toMatchObject({ chaos: 4000, drop: { of: 1, chase: [{ name: 'Kalandra\'s Touch', chaos: 4000 }] } })
  })

  it('chase bases go to Chase uniques, Always, with their own look; boss bases with world drops are priced', () => {
    const doc = parseFilter(neverSink('1-REGULAR'))
    const items = new Map(currencyItems(doc, look).map(i => [i.name, i]))
    expect(items.get('Leather Belt')).toMatchObject({ cat: 'uniqchase', avg: true, of: 3, chase: [{ name: 'Headhunter', chaos: 50000 }] })
    expect(items.get('Coral Amulet')?.cat).not.toBe('uniqchase')
    expect(items.get('Agate Amulet')?.cat).toBe('uniqplain')
    const cfg = defaultCurrency()
    expect(sectionMode(cfg, 'uniqchase')).toBe('always')
    const small = currencyLook(1, 'uniqchase', cfg)
    expect(small.icon).toMatchObject({ shape: 'Kite', color: 'Yellow' })
    expect(small.background?.slice(0, 3)).toEqual([255, 228, 175])
  })
})
