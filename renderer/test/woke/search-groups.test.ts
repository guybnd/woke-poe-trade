// Search palette: which result groups show, how much of each, and the cog's settings.
import { describe, it, expect } from 'vitest'
import { GROUP_CAP, SEARCH_GROUPS, chipOf, groupMode, isLocked, shapeSections, withMode } from '@/web/woke/search/groups'

const rows = (...names: string[]) => names.map(name => ({ name }))
const none = new Set<string>()

describe('groupMode', () => {
  it('starts every group folded, a new one too', () => {
    expect(groupMode('Viscera', undefined)).toBe('folded')
    expect(groupMode('Bosses', undefined)).toBe('folded')
    expect(groupMode('Something new', undefined)).toBe('folded')
    expect(SEARCH_GROUPS.every(g => g.mode === 'folded')).toBe(true)
  })
  it('keeps prices, answers and the empty box lists whole, whatever is saved', () => {
    for (const label of ['Answer', 'Prices', 'Recent', 'Things to try', 'Uniques on Shagreen Boots']) {
      expect(isLocked(label)).toBe(true)
      expect(groupMode(label, { [label]: 'off' })).toBe('open')
    }
  })
  it('ignores a saved value it does not know', () => {
    expect(groupMode('Bosses', { Bosses: 'nope' as 'off' })).toBe('folded')
  })
  it('saves only changes from the defaults', () => {
    let m = withMode(undefined, 'Viscera', 'off')
    expect(m).toEqual({ Viscera: 'off' })
    m = withMode(m, 'Bosses', 'open')
    m = withMode(m, 'Viscera', 'folded')
    expect(m).toEqual({ Bosses: 'open' })
  })
  it('lists each group once', () => {
    const ids = SEARCH_GROUPS.map(g => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('shapeSections', () => {
  const tree = { label: 'Passive tree', entries: rows('Fire Walker', 'Fire Attunement', 'Avatar of Fire', 'Elemental Overload') }
  it('shows a folded group\'s top 3 and counts the rest', () => {
    const { sections } = shapeSections('fire', [tree], undefined, none)
    expect(sections[0].entries.map(e => e.name)).toEqual(['Fire Walker', 'Fire Attunement', 'Avatar of Fire'])
    expect(sections[0]).toMatchObject({ hidden: 1, firstHidden: { name: 'Elemental Overload' } })
    expect(GROUP_CAP).toBe(3)
  })
  it('shows an open group in full', () => {
    expect(shapeSections('fire', [tree], { 'Passive tree': 'open' }, none).sections[0]).toMatchObject({ hidden: 0 })
    expect(shapeSections('fire', [tree], { 'Passive tree': 'open' }, none).sections[0].entries).toHaveLength(4)
  })
  it('never shortens prices', () => {
    const many = rows(...Array.from({ length: 12 }, (_, i) => `Essence ${i}`))
    const { sections } = shapeSections('essence', [{ label: 'Prices', entries: many }], { Prices: 'off' }, none)
    expect(sections[0].entries).toHaveLength(12)
  })
  it('puts a row named like the query in a folded group\'s top 3', () => {
    const viscera = rows('Diseased Wing', 'Bloated Gut', "Eradicator's Head", "Chaos Golem's Core")
    const out = shapeSections('chaos', [{ label: 'Viscera', entries: viscera }], undefined, none).sections[0]
    expect(out.entries.map(e => e.name)).toEqual(["Chaos Golem's Core", 'Diseased Wing', 'Bloated Gut'])
    expect(out).toMatchObject({ hidden: 1, firstHidden: { name: "Eradicator's Head" } })
  })
  it('leaves off groups out and says which', () => {
    const { sections, off } = shapeSections('he', [{ label: 'Settings', entries: rows('a', 'b') }, { label: 'Tools', entries: rows('Heist') }], { Settings: 'off' }, none)
    expect(sections.map(s => s.label)).toEqual(['Tools'])
    expect(off).toEqual([{ label: 'Settings', count: 2 }])
  })
  it('shows a group you opened in full, even when off', () => {
    const s = { label: 'Settings', entries: rows('a', 'b', 'c', 'd', 'e') }
    expect(shapeSections('x', [s], { Settings: 'off' }, new Set(['Settings'])).sections[0]).toMatchObject({ hidden: 0 })
    expect(shapeSections('x', [s], undefined, new Set(['Settings'])).sections[0].entries).toHaveLength(5)
  })
  it('leaves out a small off group too', () => {
    expect(shapeSections('x', [{ label: 'Bosses', entries: rows('a') }], { Bosses: 'off' }, none).off).toEqual([{ label: 'Bosses', count: 1 }])
  })
  it('keeps the name-first order when a folded group is opened', () => {
    const viscera = { label: 'Viscera', entries: rows('Diseased Wing', 'Bloated Gut', "Eradicator's Head", "Chaos Golem's Core") }
    const out = shapeSections('chaos', [viscera], undefined, new Set(['Viscera'])).sections[0]
    expect(out.entries.map(e => e.name)).toEqual(["Chaos Golem's Core", 'Diseased Wing', 'Bloated Gut', "Eradicator's Head"])
  })
  it('drops empty groups', () => {
    expect(shapeSections('x', [{ label: 'Bosses', entries: [] }], undefined, none).sections).toEqual([])
  })
})

describe('chipOf', () => {
  it('sorts each group under one chip', () => {
    expect(['Answer', 'Prices', 'Uniques on Shagreen Boots'].map(chipOf)).toEqual(['prices', 'prices', 'prices'])
    expect(chipOf('Other items')).toBe('items')
    expect(chipOf('Do it now')).toBe('tools')
    expect(chipOf('Settings')).toBe('settings')
    expect(chipOf('Search the web')).toBe('web')
    expect(chipOf('Viscera')).toBe('facts')
  })
})
