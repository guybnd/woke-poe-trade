import { describe, it, expect } from 'vitest'
import { mechanicById, priceGroup } from '@/web/woke/mechanics/data'
import type { PriceItem } from '@/web/woke/market/types'

const item = (type: string, name: string, chaos: number) => ({ type, name, variant: '', chaos }) as unknown as PriceItem

const items = [
  item('Omen', 'Omen of Fortune', 1200),
  item('Corpse', 'Perfect Blasphemer', 120),
  item('Corpse', 'Perfect Astral Lich', 300),
  item('AllflameEmber', 'Allflame Ember of Flesh', 15),
  item('AllflameEmber', 'Allflame Ember of Toads', 40)
]

describe('corpses and Allflame Embers', () => {
  it('prices corpses on the Ritual tab, dearest first', () => {
    const group = mechanicById('ritual')!.groups.find(g => g.label === 'Corpses')!
    expect(priceGroup(group, items).map(r => r.item.name)).toEqual(['Perfect Astral Lich', 'Perfect Blasphemer'])
  })

  it('gives Allflame Embers their own tab', () => {
    const mech = mechanicById('allflame')!
    expect(priceGroup(mech.groups[0], items).map(r => r.item.name)).toEqual(['Allflame Ember of Toads', 'Allflame Ember of Flesh'])
  })
})
