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
    expect(t.byBase).toBe(true)
    expect(t.base).toBe('Glorious Plate')
    expect(t.rule).toEqual({ type: 'uniques', tier: 't2' })
    expect(t.actions.some(a => a.key === 'SetBackgroundColor')).toBe(true)
    expect(t.dearest).toEqual({ name: "Kaom's Heart", chaos: 500, thin: false, setsTier: false })
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
    expect(t.byBase).toBe(false)
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
    expect(t.byBase).toBe(true)
  })

  it('shows nothing without a filter or for an item that is not unique', () => {
    expect(uniqueTier(null, item('unique-kaoms-heart.txt'))).toBeNull()
    const rare = parseClipboard('Item Class: Rings\nRarity: Rare\nDoom Loop\nRuby Ring\n--------\nItem Level: 80\n')._unsafeUnwrap()
    expect(uniqueTier(fakeStore(SMALL), rare)).toBeNull()
  })
})
