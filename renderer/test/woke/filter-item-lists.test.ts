// The loot filter's own item lists (scripts/gen-item-lists.mjs): released
// currency, fragments and cards from the game data, one row per name, with
// the filter's Class name and the art path; a table that can't be right is
// refused.
import { describe, expect, it } from 'vitest'

// The script is plain .mjs outside the app; loaded by path, untyped.
const SCRIPT = '../../../scripts/gen-item-lists.mjs'
type Row = [name: string, cls: string, art: string]
interface Script {
  listItems: (bases: Record<string, unknown>, classes: Record<string, { name: string }>) => Row[]
  checkItems: (items: Row[]) => void
  packItems: (items: Row[], made: string, source: string) => string
}
const load = async () => await import(/* @vite-ignore */ SCRIPT) as Script

const CLASSES = { StackableCurrency: { name: 'Stackable Currency' }, MapFragment: { name: 'Map Fragments' }, Ring: { name: 'Rings' } }
const base = (name: string, cls: string, dds: string, state = 'released') => ({ name, item_class: cls, release_state: state, visual_identity: { dds_file: `Art/2DItems/${dds}.dds` } })

describe('item lists from the game data', () => {
  it('keeps released items of the listed classes, once each, with class and art', async () => {
    const { listItems } = await load()
    const rows = listItems({
      a: base('Chaos Orb', 'StackableCurrency', 'Currency/CurrencyRerollRare'),
      b: base('Chaos Orb', 'StackableCurrency', 'Currency/CurrencyRerollRareAlt'),
      c: base('Fragment of the Phoenix', 'MapFragment', 'Maps/AtlasMaps/Phoenix'),
      d: base('Unreleased Orb', 'StackableCurrency', 'Currency/X', 'unreleased'),
      e: base('Two-Stone Ring', 'Ring', 'Rings/TwoStone'),
      f: base('[DNT] Test Orb', 'StackableCurrency', 'Currency/Y')
    }, CLASSES)
    expect(rows).toEqual([
      ['Chaos Orb', 'Stackable Currency', 'Currency/CurrencyRerollRare'],
      ['Fragment of the Phoenix', 'Map Fragments', 'Maps/AtlasMaps/Phoenix']
    ])
  })

  it('lists corpses by their filter class', async () => {
    const { listItems } = await load()
    const rows = listItems({ a: base('Wretched Defiler', 'ItemisedCorpse', 'Currency/Necropolis/Corpse1') }, { ItemisedCorpse: { name: 'Corpses' } })
    expect(rows).toEqual([['Wretched Defiler', 'Corpses', 'Currency/Necropolis/Corpse1']])
  })

  it('writes each class once, and the app reads the rows back', async () => {
    const { packItems } = await load()
    const { readLists } = await import('@/web/woke/loot-filter/own-lists')
    const rows: Row[] = [['Chaos Orb', 'Stackable Currency', 'a'], ['Rain of Chaos', 'Divination Cards', 'b'], ['Divine Orb', 'Stackable Currency', 'c']]
    const json = JSON.parse(packItems(rows, '2026-11-28', 'local'))
    expect(json.classes).toEqual(['Stackable Currency', 'Divination Cards'])
    expect(readLists(json)).toEqual(rows)
  })

  it('refuses a table without the items every league has', async () => {
    const { checkItems } = await load()
    expect(() => checkItems([['Chaos Orb', 'Stackable Currency', '']])).toThrow(/Not writing/)
  })
})
