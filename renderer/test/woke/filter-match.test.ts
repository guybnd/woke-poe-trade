// Item-to-block matching: a copied item of every class, at every strictness
// level of NeverSink's real filter, with and without APT's parser's help.
import { describe, it, expect, beforeAll } from 'vitest'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import type { FilterBlock } from '@/web/woke/loot-filter/parse'
import { itemFacts } from '@/web/woke/loot-filter/item-facts'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { evalCondition, matchItem } from '@/web/woke/loot-filter/match'
import { parseClipboard } from '@/parser'
import { fixture, fixtureFiles, loadGameData } from '../helpers/game-data'
import { LEVELS, neverSink } from '../helpers/neversink'
import { CLASS_ITEMS, STATE_ITEMS } from '../helpers/filter-items'

beforeAll(loadGameData)

function parsedFacts (text: string): ItemFacts {
  const res = parseClipboard(text)
  return itemFacts(text, res.isOk() ? res.value : null)
}

const ALL = [...CLASS_ITEMS, ...STATE_ITEMS]

// NeverSink 8.21's 3.30 item tier and Fated mark: no copy shows them until we
// read them from a real 3.30 copy (WOKEPOET-153), so a rule with them stays open.
const UNREAD_330 = ['UnidentifiedItemTier', 'Fated']
const undecidedKeys = (m: { uncertain: Array<{ conditions: Array<{ condition: { key: string }, result: boolean | null }> }> }) =>
  m.uncertain.flatMap(u => u.conditions.filter(c => c.result === null).map(c => c.condition.key))
    .filter(key => !UNREAD_330.includes(key))

describe('the corpus', () => {
  it('has an item for every class NeverSink names', () => {
    const classes = new Set<string>()
    for (const b of parseFilter(neverSink('1-REGULAR')).blocks) {
      for (const c of b.conditions) if (c.key === 'Class') c.values.forEach(v => classes.add(v))
    }
    const have = new Set(ALL.map(i => i.facts.itemClass))
    // Substring conditions without a real class of that name.
    // Viscera (3.30 Wickerman trophies) wait for a real copy (WOKEPOET-153).
    const loose = new Set(['Chart', 'Cursed Ducat', 'Idols', 'Viscera'])
    expect([...classes].filter(c => !have.has(c) && !loose.has(c))).toEqual([])
  })
})

describe.each(ALL)('$name', ({ text, facts }) => {
  it('reads what the copy says, with the parser', () => {
    expect(parsedFacts(text)).toMatchObject(facts)
  })

  it('reads the same without the parser', () => {
    // Magic names and unique bases need the parser's item data, nothing else does.
    const { baseType, ...rest } = facts
    const out = itemFacts(text, null)
    expect(out).toMatchObject(rest)
    if (facts.rarity !== 'Magic' || facts.itemClass === 'Maps') {
      if (!/Synthesised/.test(text)) expect(out.baseType, 'base').toBe(baseType)
    }
  })

  it.each(LEVELS)('finds a deciding rule at %s', (level) => {
    const m = matchItem(parseFilter(neverSink(level)), { ...parsedFacts(text), areaLevel: 83 })
    expect(m.visibility === 'Show' || m.visibility === 'Hide').toBe(true)
    // No condition NeverSink uses may be left undecided by the copy.
    const undecided = undecidedKeys(m)
    expect([...new Set(undecided)]).toEqual([])
  })

  it('never shows at a stricter level what a softer one hides, unless a rule says so', () => {
    const seq = LEVELS.map(l => matchItem(parseFilter(neverSink(l)), { ...parsedFacts(text), areaLevel: 83 }).visibility)
    const firstHide = seq.indexOf('Hide')
    if (firstHide >= 0) expect(seq.slice(firstHide).every(v => v === 'Hide'), seq.join()).toBe(true)
  })
})

describe('real captures', () => {
  it.each(fixtureFiles('items', '.txt'))('%s reaches a block at every level', (file) => {
    const text = fixture(`items/${file}`)
    for (const level of LEVELS) {
      expect(matchItem(parseFilter(neverSink(level)), { ...parsedFacts(text), areaLevel: 83 }).final, level).not.toBeNull()
    }
  })
})

describe('conditions, one by one', () => {
  const base: ItemFacts = { name: 'x', influences: [], explicitModNames: [] }
  const cond = (line: string): FilterBlock['conditions'][number] => parseFilter(`Show\n\t${line}\n`).blocks[0].conditions[0]
  const ev = (line: string, facts: Partial<ItemFacts>) => evalCondition(cond(line), { ...base, ...facts })

  it('numbers and every operator', () => {
    expect(ev('ItemLevel 80', { itemLevel: 80 })).toBe(true)
    expect(ev('ItemLevel = 80', { itemLevel: 81 })).toBe(false)
    expect(ev('ItemLevel == 80', { itemLevel: 80 })).toBe(true)
    expect(ev('ItemLevel != 80', { itemLevel: 80 })).toBe(false)
    expect(ev('ItemLevel ! 80', { itemLevel: 79 })).toBe(true)
    expect(ev('ItemLevel < 80', { itemLevel: 79 })).toBe(true)
    expect(ev('ItemLevel <= 80', { itemLevel: 81 })).toBe(false)
    expect(ev('ItemLevel > 80', { itemLevel: 80 })).toBe(false)
    expect(ev('ItemLevel >= 80', { itemLevel: 80 })).toBe(true)
    expect(ev('ItemLevel >= 80', {})).toBeNull()
  })

  it('names: bare is a substring, == is whole', () => {
    expect(ev('BaseType "Orb"', { baseType: 'Chaos Orb' })).toBe(true)
    expect(ev('BaseType == "Orb"', { baseType: 'Chaos Orb' })).toBe(false)
    expect(ev('BaseType == "Chaos Orb"', { baseType: 'Chaos Orb' })).toBe(true)
    expect(ev('BaseType "Mirror" "Chaos"', { baseType: 'Chaos Orb' })).toBe(true)
    expect(ev('Class "Gems"', { itemClass: 'Skill Gems' })).toBe(true)
    expect(ev('Class != "Gems"', { itemClass: 'Skill Gems' })).toBe(false)
  })

  it('rarity order', () => {
    expect(ev('Rarity Normal Magic', { rarity: 'Magic' })).toBe(true)
    expect(ev('Rarity < Rare', { rarity: 'Magic' })).toBe(true)
    expect(ev('Rarity <= Rare', { rarity: 'Unique' })).toBe(false)
    expect(ev('Rarity > Magic', { rarity: 'Rare' })).toBe(true)
    expect(ev('Rarity != Unique', { rarity: 'Unique' })).toBe(false)
  })

  it('sockets count colours across the item, groups within a link', () => {
    const f = { socketGroups: ['RRG', 'BB', 'G'] }
    expect(ev('Sockets 6', f)).toBe(true)
    expect(ev('Sockets >= 7', f)).toBe(false)
    expect(ev('Sockets >= 2GG', f)).toBe(true)
    expect(ev('Sockets >= 3GGG', f)).toBe(false)
    expect(ev('SocketGroup >= 3', f)).toBe(true)
    expect(ev('SocketGroup >= 4', f)).toBe(false)
    expect(ev('SocketGroup "RRG"', f)).toBe(true)
    expect(ev('SocketGroup "RGB"', f)).toBe(false)
    expect(ev('Sockets >= AA', { socketGroups: ['A', 'A'] })).toBe(true)
    expect(ev('Sockets < 1', {})).toBe(true)
    expect(ev('LinkedSockets >= 3', f)).toBe(true)
    expect(ev('LinkedSockets >= 4', f)).toBe(false)
    expect(ev('LinkedSockets 0', { socketGroups: ['R', 'G'] })).toBe(true)
  })

  it('explicit mods with counts', () => {
    const f = { explicitModNames: ['Merciless', 'of the Ranger'], identified: true }
    expect(ev('HasExplicitMod "Merciless"', f)).toBe(true)
    expect(ev('HasExplicitMod >=2 "Merciless" "of the Ranger" "Hale"', f)).toBe(true)
    expect(ev('HasExplicitMod >= 3 "Merciless" "of the Ranger" "Hale"', f)).toBe(false)
    expect(ev('HasExplicitMod =0 "Hale"', f)).toBe(true)
    expect(ev('HasExplicitMod =1 "Merciless"', f)).toBe(true)
    expect(ev('HasExplicitMod =0 "Merciless"', f)).toBe(false)
  })

  it('an unidentified item has no explicit mods to count', () => {
    const f = { identified: false }
    expect(ev('HasExplicitMod "Merciless"', f)).toBe(false)
    expect(ev('HasExplicitMod >=1 "Merciless"', f)).toBe(false)
    expect(ev('HasExplicitMod =0 "Merciless"', f)).toBe(true)
    expect(ev('HasExplicitMod <2 "Merciless"', f)).toBe(true)
  })

  it('influence', () => {
    expect(ev('HasInfluence Shaper Elder', { influences: ['Elder'] })).toBe(true)
    expect(ev('HasInfluence None', {})).toBe(true)
    expect(ev('HasInfluence None', { influences: ['Elder'] })).toBe(false)
    expect(ev('HasInfluence == Crusader Hunter', { influences: ['Crusader'] })).toBe(false)
    expect(ev('HasInfluence == Crusader Hunter', { influences: ['Crusader', 'Hunter'] })).toBe(true)
  })

  it('true and false', () => {
    expect(ev('Corrupted True', { corrupted: true })).toBe(true)
    expect(ev('Corrupted False', { corrupted: true })).toBe(false)
    expect(ev('Corrupted != True', { corrupted: false })).toBe(true)
    expect(ev('Mirrored False', {})).toBeNull()
  })

  it('zana memories and every other condition NeverSink uses are decided', () => {
    const keys = new Set<string>()
    for (const b of parseFilter(neverSink('1-REGULAR')).blocks) if (!b.disabled) for (const c of b.conditions) keys.add(c.key)
    for (const i of ALL) {
      const full = parsedFacts(i.text)
      // A copy with no "Item Level" line can't tell, and neither can we.
      const skip = (k: string) => k === 'AreaLevel' || UNREAD_330.includes(k) || (k === 'ItemLevel' && !i.text.includes('Item Level:'))
      const unknown = [...keys].filter(k => !skip(k) && evalCondition({ key: k, op: '', count: null, values: ['1'] }, full) === null)
      // Only gear has these in our table; the "deciding rule" tests cover the rest.
      expect(unknown.filter(k => !['DropLevel', 'Width', 'Height'].includes(k)), i.name).toEqual([])
      if (full.itemClass === 'Bows') expect(unknown).toEqual([])
    }
  })
})

describe('what the game shows at a glance', () => {
  it('rare gear is decided by its real drop level', () => {
    const doc = parseFilter(neverSink('1-REGULAR'))
    const facts = parsedFacts(STATE_ITEMS.find(i => i.name === 'dropped level')!.text)
    expect(facts.dropLevel).toBe(64)
    const m = matchItem(doc, { ...facts, areaLevel: 83 })
    expect(undecidedKeys(m)).toEqual([])
  })

  it('reads a thousands separator in a stack', () => {
    expect(itemFacts(CLASS_ITEMS.find(i => i.name === 'currency with thousands')!.text, null).stackSize).toBe(1234)
  })
})

describe('walking the file', () => {
  const doc = (lines: string[]) => parseFilter(lines.join('\n'))
  const f: ItemFacts = { name: 'x', rarity: 'Rare', itemLevel: 80, influences: [], explicitModNames: [] }

  it('the first match wins; nothing matching shows by default', () => {
    const d = doc(['Hide', '\tRarity Rare', '', 'Show', '\tRarity Rare', ''])
    expect(matchItem(d, f).visibility).toBe('Hide')
    expect(matchItem(d, { ...f, rarity: 'Magic' })).toMatchObject({ final: null, visibility: 'Show' })
  })

  it('Continue layers style, and a later block can overturn it', () => {
    const d = doc(['Hide', '\tItemLevel < 85', '\tSetFontSize 20', '\tContinue', '', 'Show', '\tItemLevel > 70', '\tSetTextColor 1 2 3', ''])
    const m = matchItem(d, f)
    expect(m.visibility).toBe('Show')
    expect(m.layers).toHaveLength(1)
    expect(m.actions.map(a => a.key)).toEqual(['SetFontSize', 'SetTextColor'])
  })

  it('running off the end after Continue keeps the last block\'s verdict', () => {
    const m = matchItem(doc(['Hide', '\tRarity Rare', '\tContinue', '']), f)
    expect(m.visibility).toBe('Hide')
    expect(m.final?.block.visibility).toBe('Hide')
  })

  it('a later action replaces the earlier one of its kind', () => {
    const d = doc(['Show', '\tSetFontSize 20', '\tContinue', '', 'Show', '\tSetFontSize 40', ''])
    expect(matchItem(d, f).actions).toEqual([{ key: 'SetFontSize', args: ['40'] }])
  })

  it('commented-out blocks never match', () => {
    expect(matchItem(doc(['#Hide', '#\tRarity Rare', '', 'Show', '']), f).visibility).toBe('Show')
  })

  it('an undecidable block is noted but does not take the item', () => {
    const m = matchItem(doc(['Hide', '\tDropLevel > 10', '', 'Show', '\tRarity Rare', '']), f)
    expect(m.final?.block.visibility).toBe('Show')
    expect(m.uncertain).toHaveLength(1)
  })
})
