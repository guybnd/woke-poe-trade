// Captured beasts' Bestiary group and family (mechanics/beast-kinds.ts).
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { BEAST_FAMILIES, beastKind, beastKindLabel } from '@/web/woke/mechanics/beast-kinds'
import { mechanicById, priceGroup } from '@/web/woke/mechanics/data'
import type { PriceItem } from '@/web/woke/market/types'

describe('beast kinds', () => {
  it('knows every captured beast in the item data', () => {
    const file = path.resolve(__dirname, '../../public/data/en/items.ndjson')
    const names = fs.readFileSync(file, 'utf-8').split('\n')
      .filter(l => l.includes('"CAPTURED_BEAST"'))
      .map(l => JSON.parse(l).name as string)
    expect(names.length).toBeGreaterThan(200)
    expect(names.filter(n => !beastKind(n))).toEqual([])
  })

  it('labels group and family', () => {
    expect(beastKindLabel('Craicic Croaker')).toBe('Amphibian · Deep')
    expect(beastKindLabel('Fenumal Plagued Arachnid')).toBe('Arachnid · Caverns')
    expect(beastKindLabel('Wild Bristle Matron')).toBe('Ursa · Wilds')
    expect(beastKindLabel('Vivid Vulture')).toBe('Avian · Sands')
    // poe.ninja and the game spell it with and without the accent.
    expect(beastKindLabel('Black Morrigan')).toBe('Unnatural · Wilds')
    expect(beastKindLabel('Mirror of Kalandra')).toBeUndefined()
  })
})

describe('Bestiary price list kinds', () => {
  const beast = (name: string, chaos: number): PriceItem => ({ name, type: 'Beast', variant: '', chaos })
  const items = [beast('Craicic Croaker', 200), beast('Wild Hellion Alpha', 199), beast('Fenumal Plagued Arachnid', 140), beast('Vivid Vulture', 60)]
  const group = mechanicById('bestiary')!.groups[0]

  it('ships an icon per family', () => {
    for (const f of BEAST_FAMILIES) {
      expect(fs.existsSync(path.resolve(__dirname, '../../public', f.icon.slice(1)))).toBe(true)
    }
  })

  it('gives each row its family and group', () => {
    const rows = priceGroup(group, items)
    expect(rows.map(r => [r.kind?.label, r.tag])).toEqual([['Deep', 'Amphibian'], ['Wilds', 'Feline'], ['Caverns', 'Arachnid'], ['Sands', 'Avian']])
  })

  it('narrows to one family before the limit', () => {
    const rows = priceGroup(group, items, item => group.kindOf!(item) !== 'The Wilds')
    expect(rows.map(r => r.item.name)).toEqual(['Wild Hellion Alpha'])
  })
})
