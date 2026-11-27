// The price check side list's Loot filter line: which tier the active filter
// puts a checked unique in, and whether that tier goes by base alone.
import fs from 'fs'
import path from 'path'
import { describe, it, expect, beforeAll } from 'vitest'
import { shallowRef } from 'vue'
import { parseClipboard } from '@/parser'
import type { ParsedItem } from '@/parser'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import type { FilterDoc } from '@/web/woke/loot-filter/parse'
import { shortTier, uniqueTier } from '@/web/woke/loot-filter/unique-tier'
import { dropTierWord, rankOnBase } from '@/web/woke/loot-filter/drop-tier'
import type { LootFilterStore } from '@/web/woke/loot-filter/store'
import { loadGameData } from '../helpers/game-data'
import { neverSink } from '../helpers/neversink'

const ITEMS = path.join(__dirname, '../../../testing/fixtures/items')
const item = (file: string): ParsedItem => parseClipboard(fs.readFileSync(path.join(ITEMS, file), 'utf8').replace(/\r\n/g, '\n'))._unsafeUnwrap()

type Priced = Array<{ name: string, chaos: number | null, thin: boolean }>
function fakeStore (doc: FilterDoc, prices: Priced = [], moves: Array<{ type: string, base: string, note?: string }> = []): LootFilterStore {
  return {
    doc: shallowRef(doc),
    areaLevel: shallowRef(null),
    config: { fallbackAreaLevel: 83, priceTiers: { on: moves.length > 0, moves } },
    prices: { breakdown: shallowRef(() => prices), currentLeague: shallowRef(null) }
  } as unknown as LootFilterStore
}

const SMALL = parseFilter([
  'Show # $type->uniques $tier->t2',
  '\tRarity Unique',
  '\tBaseType == "Glorious Plate"',
  '\tSetFontSize 45',
  '\tSetBackgroundColor 175 96 37 255',
  '',
  'Show # $type->uniques $tier->ex6link',
  '\tLinkedSockets 6',
  '\tRarity Unique',
  ''
].join('\n'))

let regular: FilterDoc
beforeAll(async () => {
  await loadGameData()
  regular = parseFilter(neverSink('1-REGULAR'))
})

describe('drop tier words and rank on a base', () => {
  const tiers = { A: 0, B: 3, C: 5, D: 3 }
  it('names tiers as the game labels them', () => {
    expect(dropTierWord(0)).toBe('extremely rare')
    expect(dropTierWord(2)).toBe('very rare')
    expect(dropTierWord(5)).toBe('common')
  })
  it('says where a unique stands among its base\'s uniques', () => {
    expect(rankOnBase('A', 'Ring', ['A', 'B', 'C'], tiers)).toBe('The rarest of the 3 uniques on Ring that drop anywhere.')
    expect(rankOnBase('C', 'Ring', ['A', 'B', 'C'], tiers)).toBe('The most common of the 3 uniques on Ring that drop anywhere.')
    expect(rankOnBase('B', 'Ring', ['A', 'B', 'C'], tiers)).toBe('The 3 uniques on Ring that drop anywhere are T0 to T5.')
    expect(rankOnBase('B', 'Ring', ['B', 'D'], tiers)).toBe('All 2 uniques on Ring that drop anywhere are T3.')
    expect(rankOnBase('B', 'Ring', ['B', 'X'], tiers)).toBeNull()
  })
  it('the shipped table names real uniques with tiers 0 to 5', () => {
    const table = JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/data/tips/unique-drop-tiers.json'), 'utf8')) as Record<string, number>
    expect(Object.keys(table).length).toBeGreaterThan(600)
    expect(table.Headhunter).toBe(0)
    expect(table["Wurm's Molt"]).toBe(5)
    expect(Object.values(table).every(t => Number.isInteger(t) && t >= 0 && t <= 5)).toBe(true)
  })
})

describe('unique filter tier', () => {
  it('names plain tiers T1-T3 and the rest by their words', () => {
    expect(shortTier('t1')).toBe('T1')
    expect(shortTier('t3')).toBe('T3')
    expect(shortTier('hideable')).toBe('Can be hidden')
    expect(shortTier('ex6link')).toBe('Special 6 link')
  })

  it('reads the tier from the filter, with its look, and says the base decides it', () => {
    const t = uniqueTier(fakeStore(SMALL, [{ name: "Kaom's Heart", chaos: 500, thin: false }, { name: 'Other', chaos: 3, thin: false }]), item('unique-kaoms-heart.txt'))!
    expect(t.short).toBe('T2')
    expect(t.where).toBe('All uniques › Tier 2')
    expect(t.byBase).toBe('plain')
    expect(t.base).toBe('Glorious Plate')
    expect(t.rule).toEqual({ type: 'uniques', tier: 't2' })
    expect(t.actions.some(a => a.key === 'SetBackgroundColor')).toBe(true)
    expect(t.dearest).toEqual({ name: "Kaom's Heart", chaos: 500, setsTier: false })
  })

  it('says a price move set the tier only when it names that unique', () => {
    const prices = [{ name: "Kaom's Heart", chaos: 500, thin: false }]
    const set = uniqueTier(fakeStore(SMALL, prices, [{ type: 'uniques', base: 'Glorious Plate', note: "Kaom's Heart" }]), item('unique-kaoms-heart.txt'))!
    expect(set.dearest?.setsTier).toBe(true)
    const other = uniqueTier(fakeStore(SMALL, prices, [{ type: 'uniques', base: 'Glorious Plate', note: 'Someone else, 1 of 2' }]), item('unique-kaoms-heart.txt'))!
    expect(other.dearest?.setsTier).toBe(false)
  })

  it('a special tier is not called a base tier', () => {
    const six = parseFilter(['Show # $type->uniques $tier->ex6link', '\tLinkedSockets >= 0', '\tRarity Unique', ''].join('\n'))
    const t = uniqueTier(fakeStore(six, [{ name: "Kaom's Heart", chaos: 500, thin: false }]), item('unique-kaoms-heart.txt'))!
    expect(t.short).toBe('Special 6 link')
    expect(t.byBase).toBeNull()
    expect(t.dearest).toBeNull()
  })

  it('reads the real NeverSink filter', () => {
    const t = uniqueTier(fakeStore(regular), item('unique-kaoms-heart.txt'))!
    expect(t.rule?.type).toBe('uniques')
    expect(t.short).toBeTruthy()
  })

  it('a Foulborn unique reads its Foulborn tier', () => {
    const t = uniqueTier(fakeStore(regular), item('unique-carcass-jack-foulborn.txt'))!
    expect(t.rule?.type).toBe('uniques->foulborn')
    expect(t.where).toBe('Uniques › Foulborn › Tier 3')
    expect(t.byBase).toBe('foulborn')
    // A plain unique's price doesn't say what a Foulborn tier is.
    expect(t.dearest).toBeNull()
  })

  it('an own rule and the safety net read as such, and keep Go to rule', () => {
    const own = parseFilter(['Show # $type->woke->own $tier->e1', '\tRarity Unique', '\tBaseType == "Glorious Plate"', ''].join('\n'))
    const t = uniqueTier(fakeStore(own), item('unique-kaoms-heart.txt'))!
    expect(t.short).toBe('Your rule')
    expect(t.rule).toEqual({ type: 'woke->own', tier: 'e1' })
    expect(t.byBase).toBeNull()
    const net = parseFilter(['Show # $type->woke->safety $tier->net', '\tRarity Unique', ''].join('\n'))
    const s = uniqueTier(fakeStore(net), item('unique-kaoms-heart.txt'))!
    expect(s.short).toBe('Safety net')
    expect(s.safety).toBe(true)
  })

  it('a unique checked by name (no copied text) still reads its base tier', () => {
    const real = item('unique-kaoms-heart.txt')
    const byName = { ...real, rawText: 'VIRTUAL_ITEM' } as ParsedItem
    const t = uniqueTier(fakeStore(SMALL), byName)!
    expect(t.short).toBe('T2')
    expect(t.base).toBe('Glorious Plate')
  })

  it('shows nothing without a filter or for an item that is not unique', () => {
    expect(uniqueTier(null, item('unique-kaoms-heart.txt'))).toBeNull()
    const rare = parseClipboard('Item Class: Rings\nRarity: Rare\nDoom Loop\nRuby Ring\n--------\nItem Level: 80\n')._unsafeUnwrap()
    expect(uniqueTier(fakeStore(SMALL), rare)).toBeNull()
  })
})
