// A price check opened from a list ("Related to" rows, Search) gets text the
// app wrote: the loot filter chip must judge it as the real item.
import { describe, it, expect, beforeAll } from 'vitest'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import type { FilterDoc } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import { checkedItemFacts } from '@/web/woke/loot-filter/checked-facts'
import { isStackText, stackText } from '@/web/woke/ui/tooltip/item-menu-logic'
import { loadGameData } from '../helpers/game-data'
import { neverSink } from '../helpers/neversink'

let doc: FilterDoc
beforeAll(async () => {
  await loadGameData()
  doc = parseFilter(neverSink('1-REGULAR'))
})

// The game's own copy of one, as Ctrl+C gives it.
const REAL_EYE = [
  'Item Class: Map Fragments',
  'Rarity: Normal',
  "Zorath's Eye of Malevolence",
  '--------',
  'Can be used in a personal Map Device to open portals to Zorath.',
  ''
].join('\n')

const verdict = (text: string) => matchItem(doc, { ...checkedItemFacts(doc, text, null), areaLevel: 83 })

describe('an item price checked by name', () => {
  it('knows its own text from a real copy', () => {
    expect(isStackText(stackText('Divine Orb', 'Currency', 'Stackable Currency'))).toBe(true)
    expect(isStackText(stackText('The Doctor', 'Divination Card', 'Divination Cards'))).toBe(true)
    expect(isStackText(REAL_EYE)).toBe(false)
  })

  it("takes a fragment's class from the filter, so it shows as the real one does", () => {
    const byName = stackText("Zorath's Eye of Malevolence", 'Currency', 'Stackable Currency')
    expect(checkedItemFacts(doc, byName, null).itemClass).toBe('Map Fragments')
    const real = verdict(REAL_EYE)
    expect(real.visibility).toBe('Show')
    expect(verdict(byName).visibility).toBe(real.visibility)
    expect(verdict(byName).final?.block).toBe(real.final?.block)
  })

  it('leaves a real copy and real currency as they are', () => {
    expect(checkedItemFacts(doc, REAL_EYE, null).itemClass).toBe('Map Fragments')
    expect(checkedItemFacts(doc, stackText('Divine Orb', 'Currency', 'Stackable Currency'), null).itemClass).toBe('Stackable Currency')
  })

  it('keeps its class when the filter names it among others (fossils)', () => {
    const fossil = stackText('Pristine Fossil', 'Currency', 'Stackable Currency')
    expect(checkedItemFacts(doc, fossil, null).itemClass).toBe('Stackable Currency')
  })

  it('takes scarabs as fragments, though the filter no longer lists them', () => {
    const scarab = stackText('Gilded Ambush Scarab', 'Currency', 'Stackable Currency')
    expect(checkedItemFacts(doc, scarab, null).itemClass).toBe('Map Fragments')
  })

  it("ignores the app's own rules, which may carry the old wrong class", () => {
    const own = parseFilter([
      'Hide # $type->woke->own $tier->t1',
      '\tClass == "Stackable Currency"',
      '\tBaseType == "Zorath\'s Eye of Malevolence"',
      '',
      neverSink('1-REGULAR')
    ].join('\n'))
    const byName = stackText("Zorath's Eye of Malevolence", 'Currency', 'Stackable Currency')
    expect(checkedItemFacts(own, byName, null).itemClass).toBe('Map Fragments')
  })
})
