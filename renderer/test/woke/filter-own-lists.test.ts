// The Loot tab's own item lists (own-lists.ts): rows come from the game
// data, not NeverSink's lists; an item gets one while it still drops (priced
// now, or last league); each lands in the same section NeverSink's list put
// it in; no prices keeps NeverSink's lists; a guess comes from last league.
import { describe, expect, it } from 'vitest'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import { currencyItems } from '@/web/woke/loot-filter/currency-weights'
import { baseGuess, ownType } from '@/web/woke/loot-filter/own-lists'
import type { ListRow, OwnTables } from '@/web/woke/loot-filter/own-lists'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import table from '@/web/woke/loot-filter/item-lists.json'
import { neverSink } from '../helpers/neversink'

const doc = parseFilter(neverSink('0-SOFT'))
const lists = (table as unknown as { items: ListRow[] }).items
const tables = (guesses: Record<string, number> = {}): OwnTables => ({ lists, guesses: new Map(Object.entries(guesses)) })
const SCOPE_KINDS = new Set(['currency', 'fragments', 'cards'])
const plain = (items: ReturnType<typeof currencyItems>) => items.filter(i => !i.conds && !i.bts && i.cls !== 'Unique' && i.type !== 'uniques' && i.type !== 'gems' && i.type !== 'maps' && i.type !== 'jewels' && i.type !== 'league' && i.type !== 'gold')

describe('own item lists', () => {
  it('has the table from the game data', () => {
    expect(lists.length).toBeGreaterThan(1000)
    expect(lists.find(r => r[0] === 'Chaos Orb')?.[1]).toBe('Stackable Currency')
    expect(lists.find(r => r[0] === 'The Doctor')?.[1]).toBe('Divination Cards')
  })

  it('lists every priced item NeverSink lists, in the same section and class', () => {
    // NeverSink's own list, everything priced at 1c.
    const ns = plain(currencyItems(doc, () => ({ chaos: 1, thin: false })))
    const names = new Set(ns.map(i => i.name))
    const priced: PriceLookup = (_g, base) => names.has(base) ? { chaos: 1, thin: false } : null
    const ours = new Map(plain(currencyItems(doc, priced, {}, null, null, tables())).map(i => [i.name, i]))
    const missing = ns.filter(i => !ours.has(i.name)).map(i => i.name)
    // Not in the game data's released items.
    expect(missing.filter(n => !['Eternal Orb', 'Imprint'].includes(n))).toEqual([])
    const moved = ns.filter(i => ours.has(i.name) && ours.get(i.name)!.cat !== i.cat).map(i => `${i.name}: ${i.cat} -> ${ours.get(i.name)!.cat}`)
    expect(moved).toEqual([])
    // NeverSink's fossil rule names two classes, which read as one
    // (Stackable Currency); the game data gives resonators their own.
    const cls = ns.filter(i => ours.has(i.name) && !ours.get(i.name)!.cls.split('|').every(c => i.cls.split('|').includes(c))).map(i => `${i.name}: ${ours.get(i.name)!.cls}`)
    expect(cls.every(x => /Resonator: Delve Stackable Socketable Currency$/.test(x))).toBe(true)
  })

  it('gives no row to what no longer drops, unless last league priced it', () => {
    const lookup: PriceLookup = (_g, base) => base === 'Divine Orb' ? { chaos: 200, thin: false } : null
    const names = (t: OwnTables) => plain(currencyItems(doc, lookup, {}, null, null, t)).map(i => i.name)
    expect(names(tables())).toContain('Divine Orb')
    expect(names(tables())).not.toContain('Simple Sextant')
    // No guesses read yet: what the base filter lists keeps its row.
    expect(names(tables())).toContain('Orb of Unmaking')
    expect(names(tables({ 'Divine Orb': 200 }))).not.toContain('Orb of Unmaking')
    expect(names(tables())).not.toContain('Abyss Scarab')
    expect(names(tables({ 'Orb of Binding': 0.5 }))).toContain('Orb of Binding')
  })

  it('guesses from last league, not NeverSink\'s tier', () => {
    const lookup: PriceLookup = (_g, base) => base === 'Divine Orb' ? { chaos: 200, thin: false } : null
    const it = plain(currencyItems(doc, lookup, {}, null, null, tables({ 'Orb of Unmaking': 3 }))).find(i => i.name === 'Orb of Unmaking')
    expect(it).toMatchObject({ chaos: 3, est: true, tier: null })
  })

  it('keeps NeverSink\'s lists without prices', () => {
    expect(currencyItems(doc, null, {}, null, null, tables()).map(i => i.name)).toEqual(currencyItems(doc, null).map(i => i.name))
  })

  it('sorts by art and name', () => {
    expect(ownType('Deafening Essence of Greed', 'Stackable Currency', 'Currency/Essence/GreedEssence7')).toBe('currency->essence')
    expect(ownType('Abyss Scarab', 'Map Fragments', 'Currency/Scarabs/Abyss')).toBeNull()
    expect(ownType('Rain of Chaos', 'Divination Cards', 'Divination/InventoryIcon')).toBe('divination')
    expect(ownType('Two-Stone Ring', 'Rings', 'Rings/TwoStone')).toBeNull()
    expect(SCOPE_KINDS.size).toBe(3)
  })

  it('lists unique bases from the game data, in sections from our own data', () => {
    const t: OwnTables = {
      ...tables({ 'Headhunter': 5000, 'Mageblood Lite': 1, 'Bonehead': 2, 'Wolfsong': 3, 'Forgotten': 0.5 }),
      day1: new Map([['Bonehead', 30]]),
      bases: () => new Map([
        ['Leather Belt', ['Headhunter', 'Mageblood Lite']],
        ['Bone Helmet', ['Bonehead']],
        ['Small Cluster Jewel', ['Wolfsong']],
        ['Plank Kite Shield', ['Never Priced']]
      ]),
      variable: new Set(['Wolfsong'])
    }
    const lookup: PriceLookup = (g, base) => g.unique && base === 'Leather Belt' ? { chaos: 9000, thin: false } : !g.unique && base === 'Divine Orb' ? { chaos: 200, thin: false } : null
    const u = new Map(currencyItems(parseFilter(neverSink('1-REGULAR')), lookup, {}, null, null, t).filter(i => i.type === 'uniques' && i.cls === 'Rarity Unique' && !i.conds && !i.bts).map(i => [i.name, i]))
    expect(u.get('Leather Belt')).toMatchObject({ cat: 'uniqplain', chaos: 9000, est: false })
    // Started at 15x its usual 2c: Early league, guessed at its first days' price.
    expect(u.get('Bone Helmet')).toMatchObject({ cat: 'uniqearly', chaos: 30, est: true })
    expect(u.get('Small Cluster Jewel')).toMatchObject({ cat: 'uniqvar', chaos: 3, est: true })
    // Never priced, now or last league: no row. Nor what NeverSink lists
    // that the game data has no unique for.
    expect(u.has('Plank Kite Shield')).toBe(false)
    expect(u.has('Simple Robe')).toBe(false)
    expect(baseGuess(t, 'Leather Belt')).toMatchObject({ chaos: 2500.5, early: false })
  })
})
