// Rare weights: a pasted rare (Ctrl+C text) lands on the test ground with its marks.
import { describe, it, expect } from 'vitest'
import { itemFacts } from '@/web/woke/loot-filter/item-facts'
import { pastedRare } from '@/web/woke/loot-filter/weight-samples'
import type { BaseRow } from '@/web/woke/loot-filter/weights'

const ROW: BaseRow = { name: 'Vaal Regalia', rank: 'r1', cls: 'Body Armours', width: 2, height: 3, old: false } as BaseRow
const TEXT = `Item Class: Body Armours
Rarity: Rare
Vaal Regalia
--------
Sockets: R-G-B-B-B G
--------
Item Level: 86
--------
Unidentified (Tier 4)
--------
Corrupted
--------
Shaper Item
Fractured Item`

describe('pasted rare', () => {
  it('reads tier, links, influence, fractured and corruption', () => {
    const got = pastedRare(itemFacts(TEXT, null), [ROW])
    expect(got).not.toBeNull()
    const it = got!.it
    expect(it.tier).toBe(4)
    expect(it.itemLevel).toBe(86)
    expect(it.links).toBe(5)
    expect(it.rgb).toBe(true)
    expect(it.influenced).toBe(true)
    expect(it.fractured).toBe(true)
    expect(it.corruption).toBe('plain')
  })
  it('skips uniques and unknown bases', () => {
    expect(pastedRare(itemFacts(TEXT.replace('Rarity: Rare', 'Rarity: Unique'), null), [ROW])).toBeNull()
    expect(pastedRare(itemFacts(TEXT, null), [])).toBeNull()
  })
})
