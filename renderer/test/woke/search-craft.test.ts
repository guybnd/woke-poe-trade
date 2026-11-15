// Search palette crafting bench and Harvest costs, on the real 3.30 table.
import { describe, it, expect } from 'vitest'
import { craftLookup, harvestName, itemText, parseQuery, rollText } from '@/web/woke/search/lookups/craft'
import type { CraftData } from '@/web/woke/search/lookups/craft'
import type { LookupContext } from '@/web/woke/search/lookups/types'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const data = JSON.parse(readFileSync(join(__dirname, '../../public/data/craft-data.json'), 'utf8')) as CraftData
const PRICES: Record<string, number> = {
  'Chaos Orb': 1,
  'Orb of Alchemy': 0.02,
  'Orb of Alteration': 0.1,
  'Orb of Transmutation': 0.025,
  'Wild Crystallised Lifeforce': 0.01,
  'Primal Crystallised Lifeforce': 0.01,
  'Crystallised Rancour': 30
}
const ctx: LookupContext = { price: n => PRICES[n] ?? null, items: [], tools: new Set(), divine: 100, now: 0, league: null }
const lookup = craftLookup(data)
const names = (q: string) => lookup(q, ctx).map(c => c.name)

describe('craft data', () => {
  it('holds 3.30 bench and Harvest crafts', () => {
    const texts = data.bench.flatMap(f => f.r.map(r => r[0]))
    expect(texts).toContain('1 Prefix Modifiers cannot be changed')
    expect(data.harvest.some(h => h[1].some(([, c]) => data.cur[c] === 'Crystallised Rancour'))).toBe(true)
  })
})

describe('craftLookup', () => {
  it('shows a bench mod as one card with its tiers and prices', () => {
    const card = lookup('life', ctx).find(c => c.name === '+# to maximum Life')!
    expect(card.group).toBe('Crafting bench')
    const rows = card.sections[1].table!.rows
    expect(rows).toHaveLength(5)
    expect(rows[0].cells[0]).toBe('15–25')
    expect(rows[3].cells[1]).toEqual({ text: '4 Alchemy', sub: 'Mausoleum' })
    expect(rows[3].chaos).toBeCloseTo(0.08)
    expect(rows[4].chaos).toBe(4)
    expect(card.sub).toBe('5 tiers · prefix · up to 4c')
  })
  it('keeps only tiers for an item word', () => {
    const card = lookup('life ring', ctx).find(c => c.name === '+# to maximum Life')!
    expect(card.sections[1].table!.rows.map(r => r.cells[0])).toEqual(['15–25', '26–40', '41–55'])
    expect(lookup('life ring', ctx).every(c => c.group === 'Crafting bench')).toBe(true)
  })
  it('reads "cold to fire" in that order, with a priced total', () => {
    expect(names('cold to fire')).toEqual(['Cold Damage mod to Fire Damage', 'Cold Resistance mod to Fire Resistance'])
    expect(lookup('cold to fire', ctx)[0].group).toBe('Harvest crafts')
    const dmg = lookup('cold damage to fire', ctx).find(c => c.name === 'Cold Damage mod to Fire Damage')!
    const rows = dmg.sections[1].rows!
    expect(rows.at(-1)).toEqual({ label: 'Total', chaos: 36 })
    expect(names('cold to fire')).not.toContain('Fire Resistance mod to Cold Resistance')
  })
  it('knows sockets, links and nicknames', () => {
    expect(names('6 link')).toContain('Socket Links')
    expect(lookup('6l', ctx)[0].sections[1].table!.rows.map(r => r.cells[0])).toContain('Six Linked Sockets')
    expect(names('prefixes cannot')).toContain('# Prefix Modifiers cannot be changed')
    expect(names('harvest speed')).toContain('Reforge with a Speed modifier')
  })
  it('handles repeated words, mod words that look like items, and Harvest item words', () => {
    expect(names('cold res to fire res')).toEqual(['Cold Resistance mod to Fire Resistance'])
    expect(lookup('energy shield', ctx).find(c => c.name === '+# to maximum Energy Shield')!.sections[1].table!.rows.length).toBeGreaterThan(3)
    expect(names('flask duration')).toContain('#% increased Flask Effect Duration')
    expect(names('harvest body armour life')).toContain('Body Armour enchant: +1 Maximum Life per 2% quality')
    expect(rollText('Channelling Skills have -1 to Total Mana Cost')).toBe('-1')
  })
  it('stays out of the way for item names and short text', () => {
    expect(lookup('chaos orb', ctx)).toEqual([])
    expect(lookup('es', ctx)).toEqual([])
    expect(lookup("kaom's heart", ctx)).toEqual([])
  })
  it('gives a hint for a bare trigger word', () => {
    expect(lookup('harvest', ctx)[0].id).toBe('harvest:hint')
    expect(lookup('bench', ctx)[0].id).toBe('bench:hint')
  })
  it('is empty before the table loads', () => {
    expect(craftLookup(null)('life', ctx)).toEqual([])
  })
})

describe('craft text helpers', () => {
  it('pulls the roll out of mod text', () => {
    expect(rollText('+(15–25) to maximum Life')).toBe('15–25')
    expect(rollText('(12–14)% increased Armour\n+(8–9) to maximum Life')).toBe('12–14 / 8–9')
    expect(rollText('Six Linked Sockets')).toBe('Six Linked Sockets')
  })
  it('shortens item lists and Harvest text', () => {
    expect(itemText(['Body Armour', 'Gloves', 'Boots', 'Helmet', 'Shield', 'Ring', 'Amulet'])).toBe('Armour, ring, amulet')
    expect(harvestName('Reforge a Rare item with random modifiers, including a Elemental modifier')).toBe('Reforge with an Elemental modifier')
    expect(harvestName('Add a new Fire modifier and remove another random modifier from a non-Influenced item')).toBe('Add a Fire mod, remove one')
  })
  it('turns link and socket counts into the game\'s words', () => {
    expect(parseQuery('5l').words).toEqual(['five', 'linked', 'sockets'])
    expect(parseQuery('bench 6 sockets')).toMatchObject({ only: 'bench', words: ['six', 'sockets'] })
  })
})
