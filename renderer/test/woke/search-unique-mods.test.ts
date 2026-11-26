// Ctrl+Space finds uniques by their mods (search/mod-index.ts), from the
// tooltip's real unique and Vestigial files.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildModIndex, litParts, modQueryWords, searchMods } from '@/web/woke/search/mod-index'
import { namedUniquePrices } from '@/web/woke/search/search'
import { MOD_GROUP, chipOf, groupMode } from '@/web/woke/search/groups'
import type { PriceItem } from '@/web/woke/market/types'

const TIPS = join(__dirname, '../../public/data/tips')
const read = (f: string) => JSON.parse(readFileSync(join(TIPS, f), 'utf8'))
const index = buildModIndex({ ...read('unique-extras.json'), ...read('uniques.json') }, read('vestigial.json'))
const hit = (q: string, name: string) => searchMods(index, q).find(h => h.unique === name)

describe('unique mod search', () => {
  it('lists uniques with the mod, in any word order', () => {
    expect(hit('item rarity', "Greed's Embrace")?.line).toBe('100% increased Rarity of Items found')
    expect(hit('rarity of items', "Ventor's Gamble")?.kind).toBe('implicit')
    expect(hit('item rarity', 'Andvarius')).toBeTruthy()
  })
  it('gives one hit per unique, its best line', () => {
    const names = searchMods(index, 'item rarity').map(h => h.unique)
    expect(new Set(names).size).toBe(names.length)
    // Its own explicit, not the weaker Vestigial copy.
    expect(hit('item rarity', "Greed's Embrace")?.kind).not.toBe('vestigial')
  })
  it('finds Vestigial implicits', () => {
    const h = hit('no life modifiers', "Utula's Hunger")
    expect(h).toBeTruthy()
    const vest = index.find(m => m.unique === "Utula's Hunger" && m.kind === 'vestigial')
    expect(vest?.line).toMatch(/\+250 to maximum Life/)
  })
  it('finds Foulborn mods under the Foulborn name, not its copied lines', () => {
    const foul = index.filter(m => m.unique.startsWith('Foulborn '))
    expect(foul.length).toBeGreaterThan(100)
    expect(foul.every(m => m.kind === 'foulborn')).toBe(true)
  })
  it('marks jewel pools as can roll', () => {
    expect(index.some(m => m.unique === "Watcher's Eye" && m.pool)).toBe(true)
  })
  it('waits for 4 letters, words must start words, numbers are ignored', () => {
    expect(searchMods(index, 'rar')).toEqual([])
    expect(searchMods(index, 'arity')).toEqual([])
    expect(searchMods(index, 'a b c d')).toEqual([])
    expect(modQueryWords('30% item rarity')).toEqual(['item', 'rarity'])
    expect(searchMods(index, '30% item rarity').length).toBe(searchMods(index, 'item rarity').length)
  })
  it('ranks the words in order first', () => {
    expect(hit('item rarity', 'Kingmaker')?.rank).toBe(0)
    expect(hit('item rarity', "Greed's Embrace")?.rank).toBe(1)
  })
  it('lights the typed starts of words', () => {
    expect(litParts('100% increased Rarity of Items found', 'item rar')).toEqual([
      { text: '100% increased ', lit: false },
      { text: 'Rar', lit: true },
      { text: 'ity of ', lit: false },
      { text: 'Item', lit: true },
      { text: 's found', lit: false }
    ])
  })
})

describe('mod hits priced', () => {
  const row = (name: string, chaos: number): PriceItem => ({ type: 'UniqueArmour', name, variant: '', chaos } as PriceItem)
  it('keeps Foulborn copies apart from the plain unique', () => {
    const items = [row('Goldrim', 1), row('Foulborn Goldrim', 50), row('Kaom\'s Heart', 30)]
    expect(namedUniquePrices(items, new Set(['Goldrim'])).map(g => g.name)).toEqual(['Goldrim'])
    expect(namedUniquePrices(items, new Set(['Foulborn Goldrim', 'Goldrim'])).map(g => g.name)).toEqual(['Foulborn Goldrim', 'Goldrim'])
  })
  it('is a folded group under the Prices chip', () => {
    expect(groupMode(MOD_GROUP, undefined)).toBe('folded')
    expect(chipOf(MOD_GROUP)).toBe('prices')
  })
})
