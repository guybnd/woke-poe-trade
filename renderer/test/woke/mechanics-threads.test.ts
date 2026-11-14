// 3.30: each mechanic's Thread takes its scarabs' place on the mechanics card.
import { describe, it, expect } from 'vitest'
import { mechanicById, priceGroup, priceScarabs } from '@/web/woke/mechanics/data'
import type { PriceItem } from '@/web/woke/market/types'

const item = (type: string, name: string, chaos: number) => ({ type, name, variant: '', chaos }) as unknown as PriceItem

const COVENS = [
  item('Fragment', 'Legion Thread', 0.26),
  item('Fragment', 'Timeless Templar Splinter', 1),
  item('Fragment', 'Blight Thread', 0.87),
  item('Fragment', 'Royal Visage', 54),
  item('Vial', 'Vial of Fate', 30)
]

describe('mechanics card in 3.30', () => {
  it("prices the mechanic's Thread and nothing else from the fragments", () => {
    expect(priceScarabs(mechanicById('legion')!.scarabs!, COVENS).map(r => r.item.name)).toEqual(['Legion Thread'])
    expect(priceScarabs(mechanicById('blight')!.scarabs!, COVENS).map(r => r.item.name)).toEqual(['Blight Thread'])
  })

  it('still prices scarabs in a league that has them', () => {
    const old = [item('Scarab', 'Legion Scarab of Eras', 2), item('Scarab', 'Breach Scarab', 1)]
    expect(priceScarabs(mechanicById('legion')!.scarabs!, old).map(r => r.item.name)).toEqual(['Legion Scarab of Eras'])
  })

  it('Incursion prices the Royal Visage, not the vials that no longer drop', () => {
    const rows = mechanicById('incursion')!.groups.flatMap(g => priceGroup(g, COVENS))
    expect(rows.map(r => r.item.name)).toEqual(['Royal Visage'])
  })
})
