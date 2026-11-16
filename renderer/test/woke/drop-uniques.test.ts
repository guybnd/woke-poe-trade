import { describe, expect, it } from 'vitest'
import { dropUniques, setterName } from '@/web/woke/loot-filter/drop-uniques'
import type { PriceItem } from '@/web/woke/market/types'

const T = ['UniqueWeapon']
const item = (name: string, variant: string, chaos: number, gaps = 0): PriceItem =>
  ({ type: 'UniqueWeapon', name, variant, chaos, gaps } as PriceItem)

// Covens prices on 2026-11-16 for the uniques on Imperial Claw.
const ITEMS = [
  item('Foulborn Hand of Thought and Motion', 'Strength, Int Accuracy, Imperial Claw', 243.7, 5),
  item('Foulborn Hand of Thought and Motion', 'Strength, Imperial Claw', 1, 2),
  item('Foulborn Hand of Wisdom and Action', 'Dex Multi, Imperial Claw', 1, 2),
  item('Foulborn Hand of Wisdom and Action', 'Strength, Dex Multi, Imperial Claw', 132.9, 5),
  item('Foulborn Touch of Anguish', '6L, Imperial Claw', 900),
  item('Hand of Thought and Motion', 'Imperial Claw', 2, 2)
]
const LIST = [
  { name: 'Touch of Anguish', chaos: 1, thin: false },
  { name: 'Hand of Thought and Motion', chaos: 2, thin: false },
  { name: 'Hand of Wisdom and Action', chaos: 2, thin: false },
  { name: 'Unpriced', chaos: null, thin: false }
]

describe('dropUniques', () => {
  it('sorts dearest first with unpriced last, tags the setter and the copied item', () => {
    const rows = dropUniques(LIST, ITEMS, T, 'Imperial Claw', 'Hand of Thought and Motion', 'Touch of Anguish')
    expect(rows.map(r => r.name)).toEqual(['Hand of Thought and Motion', 'Hand of Wisdom and Action', 'Touch of Anguish', 'Unpriced'])
    expect(rows.filter(r => r.setsTier).map(r => r.name)).toEqual(['Hand of Thought and Motion'])
    expect(rows.filter(r => r.own).map(r => r.name)).toEqual(['Touch of Anguish'])
  })

  it('gives each unique its Foulborn range, thin by the dearest line, skipping linked lines', () => {
    const rows = dropUniques(LIST, ITEMS, T, 'Imperial Claw', null, null)
    const by = Object.fromEntries(rows.map(r => [r.name, r.foulborn]))
    expect(by['Hand of Thought and Motion']).toEqual({ min: 1, max: 243.7, thin: true })
    expect(by['Hand of Wisdom and Action']).toEqual({ min: 1, max: 132.9, thin: true })
    expect(by['Touch of Anguish']).toBeNull()
  })

  it('keeps only this base\'s Foulborn lines when the unique has several bases', () => {
    const items = [item('Foulborn X', 'Life, Iron Ring', 50), item('Foulborn X', 'Life, Gold Ring', 5)]
    const [row] = dropUniques([{ name: 'X', chaos: 1, thin: false }], items, T, 'Gold Ring', null, null)
    expect(row.foulborn).toEqual({ min: 5, max: 5, thin: false })
  })
})

describe('setterName', () => {
  it('reads the unique out of the lookup note', () => {
    expect(setterName('Hand of Thought and Motion, 1 of 3')).toBe('Hand of Thought and Motion')
    expect(setterName('Touch of Anguish')).toBe('Touch of Anguish')
    expect(setterName(undefined)).toBeNull()
  })
})
