// Flips in the search palette: an item's flip verdict, and the best flip.
import { describe, it, expect } from 'vitest'
import { flipsLookup } from '@/web/woke/search/lookups/flips'
import { recipeLookup } from '@/web/woke/search/lookups/recipes'
import type { LookupContext } from '@/web/woke/search/lookups/types'
import type { PriceItem } from '@/web/woke/market/types'
import type { ScarabFlipWidget } from '@/web/woke/scarab-flip/widget'

const item = (type: string, name: string, chaos: number): PriceItem => ({ type, name, variant: '', chaos })
const items = [
  item('Thread', 'Legion Thread', 4), item('Thread', 'Abyss Thread', 3.6), item('Thread', 'Expedition Thread', 0.2),
  item('Oil', 'Clear Oil', 1), item('Oil', 'Sepia Oil', 5), item('Currency', 'Chaos Orb', 1)
]
const ctx: LookupContext = {
  price: name => items.find(i => i.name === name)?.chaos ?? null,
  items,
  tools: new Set(['woke-scarab-flip']),
  divine: 200,
  now: 0,
  league: null
}
const config = { sellDiscount: 0, reroll: false } as ScarabFlipWidget
const lookup = flipsLookup(config)

describe('flips in search', () => {
  it('says whether flipping an item pays, per method', () => {
    const [card] = lookup('expedition thread', ctx)
    expect(card.title).toBe('Expedition Thread')
    expect(card.tip).toEqual({ name: 'Expedition Thread', type: 'Thread' })
    const row = card.sections[1].rows![0]
    expect(row.label).toBe('Vendor 3 for 1')
    // ((4 + 3.6) / 2 - 3 x 0.2) / 3 = 1.07, in the panel's rounding.
    expect(row.value).toBe('+1.1c each')
    // Threads have no measured weights, and the card says so.
    expect(card.sections[2].text![0]).toMatch(/Low confidence/)
    expect(card.actions).toEqual([{ label: 'Open Flips', tool: 'woke-scarab-flip' }])
  })

  it('marks a losing flip', () => {
    const [card] = lookup('legion thread', ctx)
    expect(card.sections[1].rows![0].value).toMatch(/^−.*not worth it$/)
  })

  it('shows tier upgrades with their result', () => {
    const [card] = lookup('clear oil', ctx)
    expect(card.sections[1].rows![0]).toEqual({ label: 'Vendor up a tier to Sepia Oil', value: '+0.7c each' })
  })

  it('answers "flips" with the best one, leaving low-confidence families out', () => {
    const [card] = lookup('flips', ctx)
    expect(card.name).toBe('Best flip right now')
    expect(card.sub).toMatch(/^Clear Oil:/)
  })

  it('stays quiet with Flips switched off or for other items', () => {
    expect(flipsLookup(null)('legion thread', ctx)).toEqual([])
    expect(lookup('chaos orb', ctx)).toEqual([])
    expect(lookup('le', ctx)).toEqual([])
  })
})

describe('3.30 vendor recipes', () => {
  it('has the Thread recipe and not the removed map one', () => {
    expect(recipeLookup('thread recipe', ctx)[0].title).toBe('Random Thread')
    expect(recipeLookup('map upgrade', ctx).map(c => c.title)).not.toContain('Higher tier map')
  })
})
