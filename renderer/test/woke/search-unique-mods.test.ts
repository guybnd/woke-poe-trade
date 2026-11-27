// Ctrl+Space finds uniques by their mods (search/mod-index.ts), from the
// tooltip's real unique and Vestigial files.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildModIndex, litParts, modQueryWords, queryAtLeast, readMods, rollMax, searchMods } from '@/web/woke/search/mod-index'
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
  })
  it('takes a number as the least roll', () => {
    expect(queryAtLeast('item rarity 50')).toBe(50)
    expect(queryAtLeast('+30% rarity')).toBe(30)
    expect(queryAtLeast('item rarity')).toBeNull()
    expect(rollMax('(20-30)% increased Rarity of Items found')).toBe(30)
    expect(rollMax('+250 to maximum Life')).toBe(250)
    expect(rollMax('(-10-40)% increased Rarity')).toBe(40)
    expect(rollMax('Adds 1 to (650-850) Lightning Damage')).toBe(850)
    expect(rollMax('Adds (10-15) to (20-30) Physical Damage')).toBe(30)
    expect(rollMax('1% increased Rarity of Items found per 15 Rampage Kills')).toBe(1)
    expect(queryAtLeast('rarity 50%.')).toBe(50)
    const all = searchMods(index, 'item rarity')
    const fifty = searchMods(index, 'item rarity 50')
    expect(fifty.length).toBeGreaterThan(0)
    expect(fifty.length).toBeLessThan(all.length)
    expect(fifty.every(h => (rollMax(h.line) ?? 0) >= 50)).toBe(true)
    expect(fifty.map(h => h.unique)).toContain("Greed's Embrace")
    expect(fifty.map(h => h.unique)).not.toContain('Goldrim')
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

describe('loose mod words', () => {
  const ITEMS = join(__dirname, '../../public/data/en/items.ndjson')
  const cats = new Map<string, string>()
  for (const l of readFileSync(ITEMS, 'utf8').split('\n')) {
    if (!l) continue
    const i = JSON.parse(l)
    if (i.namespace === 'ITEM' && i.craftable) cats.set(i.refName, i.craftable.category)
  }
  const slotted = buildModIndex({ ...read('unique-extras.json'), ...read('uniques.json') }, read('vestigial.json'), b => cats.get(b))
  const names = (q: string) => readMods(slotted, q).hits.map(h => h.unique).sort()
  it('reads a kind word as a filter', () => {
    const r = readMods(slotted, 'rarity vestig')
    expect(r.notes).toEqual(['Vestigial'])
    expect(r.hits.every(h => h.kind === 'vestigial')).toBe(true)
    expect(names('rarity vestig')).toEqual(expect.arrayContaining(["Greed's Embrace", 'Goldwyrm', 'Wondertrap']))
    expect(r.hits.every(h => /rarity/i.test(h.line))).toBe(true)
  })
  it('reads a slot word as a filter', () => {
    const r = readMods(slotted, 'rarity boots')
    expect(r.notes).toEqual(['Boots'])
    expect(names('rarity boots')).toContain('Goldwyrm')
    expect(names('rarity boots')).not.toContain("Greed's Embrace")
  })
  it('keeps words the mods have together', () => {
    const r = readMods(slotted, 'energy shield')
    expect(r.notes).toEqual([])
    expect(r.hits.length).toBeGreaterThan(50)
  })
  it('reads short names', () => {
    const r = readMods(slotted, 'iir')
    expect(r.notes).toEqual(['Item Rarity'])
    expect(r.words).toEqual(['item', 'rarity'])
    expect(r.hits.map(h => h.unique)).toContain("Greed's Embrace")
    expect(readMods(slotted, 'es boots').notes).toEqual(['Energy Shield', 'Boots'])
  })
  it('reads "can roll" as jewel pools', () => {
    const r = readMods(slotted, 'can roll life')
    expect(r.notes).toEqual(['Can roll'])
    expect(r.hits.length).toBeGreaterThan(1)
    expect(r.hits.every(h => h.pool)).toBe(true)
  })
  it('reads a filter word as mod text when the filter finds nothing', () => {
    // No Vestigial line has "unholy might", but no line says "vestigial" either.
    expect(readMods(slotted, 'unholy might vestigial').hits).toEqual([])
    // "ring" on its own lists unique rings; with words no ring has, it's mod text.
    expect(readMods(slotted, 'ring').notes).toEqual(['Rings'])
  })
  it('lights the read words', () => {
    expect(litParts('+(40-60) to maximum Energy Shield', ['energy', 'shield']).filter(p => p.lit).map(p => p.text)).toEqual(['Energy', 'Shield'])
  })
})
