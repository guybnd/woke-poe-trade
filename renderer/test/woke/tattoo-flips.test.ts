// Tattoos in Flips: 3 of one tribe vendor for 1 random of that tribe.
import { describe, it, expect } from 'vitest'
import { tattooTribe, tribeRows, tattooProfitEach } from '@/web/woke/scarab-flip/tattoos'
import { familyById, priceFlip, pricedFamilies, shortName } from '@/web/woke/scarab-flip/families'
import { flipsLookup } from '@/web/woke/search/lookups/flips'
import { MECHANICS, priceGroup } from '@/web/woke/mechanics/data'
import type { Quote } from '@/web/woke/scarab-flip/calc'
import type { LookupContext } from '@/web/woke/search/lookups/types'
import type { PriceItem } from '@/web/woke/market/types'
import type { ScarabFlipWidget } from '@/web/woke/scarab-flip/widget'

const item = (name: string, chaos: number): PriceItem => ({ type: 'Tattoo', name, variant: '', chaos })
const items = [
  item('Tattoo of the Kitava Blood Drinker', 60), item('Tattoo of the Kitava Rebel', 2), item('Tattoo of the Kitava Warrior', 4),
  item('Tattoo of the Ngamahu Woodcarver', 3), item('Tattoo of the Ngamahu Warrior', 6),
  item('Journey Tattoo of the Body', 50), item('Loyalty Tattoo of Kaom', 10)
]
const quote = (chaos: number, tradedChaos: number | null = null): Quote => ({ chaos, tradedChaos })
const equal = () => ({ weight: 1, source: 'estimate' as const })

describe('tattoo tribes', () => {
  it('reads the tribe from the name, and only tribe Tattoos have one', () => {
    expect(tattooTribe('Tattoo of the Kitava Blood Drinker')).toBe('Kitava')
    expect(tattooTribe('Tattoo of the Rongokurai Turtle')).toBe('Rongokurai')
    expect(tattooTribe('Journey Tattoo of the Body')).toBeNull()
    expect(tattooTribe('Honoured Tattoo of the Oak')).toBeNull()
    expect(tattooTribe('Loyalty Tattoo of Kaom')).toBeNull()
  })

  it('averages a tribe and sets it against 3 of its cheapest', () => {
    const quotes = new Map(items.filter(i => tattooTribe(i.name)).map(i => [i.name, quote(i.chaos)]))
    const [best, next] = tribeRows(quotes, 0, equal, true)
    expect(best.tribe).toBe('Kitava')
    expect(best.average).toBeCloseTo(22)
    expect(best.cheapest?.name).toBe('Tattoo of the Kitava Rebel')
    expect(best.profitEach).toBeCloseTo((22 - 6) / 3)
    expect(best.tattoos.map(t => t.name)[0]).toBe('Tattoo of the Kitava Blood Drinker')
    expect(best.tattoos[0].share).toBeCloseTo(1 / 3)
    expect(next.tribe).toBe('Ngamahu')
    expect(next.profitEach).toBeCloseTo((4.5 - 9) / 3)
    expect(tattooProfitEach(best, 4)).toBeCloseTo((22 - 12) / 3)
  })

  it('takes the sell discount off the result and your own weights into the average', () => {
    const quotes = new Map([['Tattoo of the Kitava Blood Drinker', quote(60)], ['Tattoo of the Kitava Rebel', quote(2)]])
    const weights = (name: string) => ({ weight: name.endsWith('Drinker') ? 1 : 3, source: 'yours' as const })
    const [row] = tribeRows(quotes, 0.5, weights, true)
    expect(row.average).toBeCloseTo((60 * 0.25 + 2 * 0.75) * 0.5)
  })

  it('never puts in a Tattoo nobody trades, but it can still come back', () => {
    const quotes = new Map([['Tattoo of the Kitava Rebel', quote(1, 0)], ['Tattoo of the Kitava Warrior', quote(4, 40)]])
    const [row] = tribeRows(quotes, 0, equal, true)
    expect(row.cheapest?.name).toBe('Tattoo of the Kitava Warrior')
    expect(row.average).toBeCloseTo(2.5)
    expect(row.supplyPerDay).toBeCloseTo(10)
    const [all] = tribeRows(quotes, 0, equal, false)
    expect(all.cheapest?.name).toBe('Tattoo of the Kitava Rebel')
  })

  it('gets its own Flips tab, priced by tribe', () => {
    const family = familyById('tattoos')
    expect(family.id).toBe('tattoos')
    expect(pricedFamilies(items).map(f => f.id)).toContain('tattoos')
    expect(shortName('Tattoo of the Kitava Rebel')).toBe('Kitava Rebel')
    const flip = priceFlip(family, family.methods[0], items, new Map(), { sellDiscount: 0, reroll: false }, 30)
    expect(flip?.kind).toBe('tribes')
    if (flip?.kind !== 'tribes') return
    expect(flip.rows.map(r => r.tribe)).toEqual(['Kitava', 'Ngamahu'])
    expect(flip.rows.flatMap(r => r.tattoos).some(t => t.name.startsWith('Journey'))).toBe(false)
  })
})

describe('tattoos in search', () => {
  const ctx: LookupContext = {
    price: name => items.find(i => i.name === name)?.chaos ?? null,
    items,
    tools: new Set(['woke-scarab-flip']),
    divine: 200,
    now: 0,
    league: null
  }
  const lookup = flipsLookup({ sellDiscount: 0, reroll: false } as ScarabFlipWidget)

  it('"tattoos" ranks the tribes', () => {
    const [card] = lookup('tattoos', ctx)
    expect(card.name).toBe('Tattoo tribes')
    expect(card.sub).toBe('Best 3 for 1: Kitava, average 22c, 3 for 1 +5.3c each')
    expect(card.sections[0].rows!.map(r => r.label)).toEqual(['Kitava', 'Ngamahu'])
  })

  it('a tribe name lists its Tattoos', () => {
    const [card] = lookup('kitava', ctx)
    expect(card.name).toBe('Kitava Tattoos')
    expect(card.sections[0].rows!.map(r => r.item?.name)).toEqual(['Tattoo of the Kitava Blood Drinker', 'Tattoo of the Kitava Warrior', 'Tattoo of the Kitava Rebel'])
  })

  it('a Tattoo says what putting it in makes', () => {
    const card = lookup('kitava rebel', ctx).find(c => c.title === 'Tattoo of the Kitava Rebel')!
    expect(card.sections[1].rows![0]).toEqual({ label: 'Vendor 3 of a tribe for 1', value: '+5.3c each' })
  })
})

describe('Settlers in League mechanics', () => {
  it('lists Tattoos with a chip per tribe, and Runegrafts', () => {
    const settlers = MECHANICS.find(m => m.id === 'settlers')!
    expect(settlers.zone?.test('Kingsmarch')).toBe(true)
    const tattoos = settlers.groups[0]
    expect(tattoos.kinds).toHaveLength(10)
    const rows = priceGroup(tattoos, items)
    expect(rows[0].item.name).toBe('Tattoo of the Kitava Blood Drinker')
    expect(rows[0].kind?.id).toBe('Kitava')
    expect(rows.find(r => r.item.name === 'Journey Tattoo of the Body')?.kind).toBeUndefined()
  })
})
