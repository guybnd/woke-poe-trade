// Disenchant: dust and gold maths, the ranked list, the price check verdict,
// listing counts, and the loot filter's dust preset.
import { describe, it, expect, beforeAll } from 'vitest'
import { loadGameData } from '../helpers/game-data'
import { neverSink } from '../helpers/neversink'
import {
  cheapestCatalyst, cheapestPrices, dustBases, dustFor, dustRows, dustVerdict, filterRows, goldFee, rankRows, rankValue, totalCost
} from '@/web/woke/disenchant/calc'
import type { DustUnique } from '@/web/woke/disenchant/calc'
import { dustUniques } from '@/web/woke/disenchant/data'
import { readCounts } from '@/web/woke/disenchant/listings'
import { tradeLink } from '@/web/woke/disenchant/widget'
import type { PriceItem } from '@/web/woke/market/types'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { insertBuildBlocks } from '@/web/woke/loot-filter/build-rules'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { DUST_ILVL, applyPresetChanges, defaultPresets, isNeverSinkDustTier, normalizePresets, presetBlocks } from '@/web/woke/loot-filter/presets'

const at84 = (quality: number) => ({ itemLevel: 84, quality, influences: 0, corruptionImplicits: 0 })
const price = (type: string, name: string, chaos: number, variant = '', gaps = 0): PriceItem => ({ type, name, variant, chaos, gaps })

const wreath: DustUnique = { name: "Speaker's Wreath", base: 'Prophet Crown', dust: 7.81, kind: 'gear', noQuality: false, slots: 4 }
const quiver: DustUnique = { name: 'Soul Strike', base: 'Spike-Point Arrow Quiver', dust: 8.05, kind: 'gear', noQuality: true, slots: 6 }
const ring: DustUnique = { name: 'Ring A', base: 'Gold Ring', dust: 10, kind: 'jewellery', noQuality: false, slots: 1 }

describe('dust and gold', () => {
  it('matches the game at item level 84 (same numbers as poe-disenchant-tool)', () => {
    expect(dustFor(7.81, at84(20))).toBe(27335)
    expect(dustFor(8.05, at84(0))).toBe(20125)
    expect(goldFee(7.81)).toBe(5040)
    expect(goldFee(8.05)).toBe(5120)
  })

  it('gives less dust for a lower item level, and more for influences and corruptions', () => {
    const base = dustFor(10, at84(0))
    expect(dustFor(10, { ...at84(0), itemLevel: 82 })).toBe(Math.floor(base * 0.9))
    expect(dustFor(10, { ...at84(0), itemLevel: 90 })).toBe(base)
    expect(dustFor(10, { ...at84(0), influences: 1, corruptionImplicits: 1 })).toBe(base * 2)
  })
})

describe('the ranked list', () => {
  it('takes the cheapest plain price: no 6-link, no relic, Foulborn counts as the unique', () => {
    const p = cheapestPrices([
      price('UniqueArmour', "Speaker's Wreath", 3, 'Prophet Crown'),
      price('UniqueArmour', "Speaker's Wreath", 0.1, 'Prophet Crown, 6L'),
      price('UniqueArmour', "Foulborn Speaker's Wreath", 0.36, 'Prophet Crown'),
      price('UniqueArmour', 'Relic thing', 0.1, 'Relic'),
      price('UniqueJewel', 'Watcher\'s Eye', 0.1)
    ])
    expect(p.get("Speaker's Wreath")?.chaos).toBe(0.36)
    expect(p.has('Relic thing')).toBe(false)
    expect(p.has("Watcher's Eye")).toBe(false)
  })

  it('picks the cheapest catalyst, never a Tainted one', () => {
    expect(cheapestCatalyst([price('Currency', 'Tainted Catalyst', 0.1), price('Currency', 'Abrasive Catalyst', 0.5), price('Currency', 'Fertile Catalyst', 0.3)])).toBe(0.3)
  })

  it('uses q20 for gear, q0 for quivers, and catalyses jewellery only when it pays', () => {
    const items = [
      price('UniqueArmour', "Speaker's Wreath", 0.36),
      price('UniqueArmour', 'Soul Strike', 0.41),
      price('UniqueAccessory', 'Ring A', 50),
      price('Currency', 'Fertile Catalyst', 0.2)
    ]
    const rows = dustRows([wreath, quiver, ring], items)
    const by = (n: string) => rows.find(r => r.name === n)!
    expect(by("Speaker's Wreath")).toMatchObject({ dust: 27335, quality: 20, catalyse: false, gold: 5040 })
    expect(by('Soul Strike')).toMatchObject({ dust: 20125, quality: 0 })
    // 20 catalysts at 0.2c add 4c to a 50c ring for 40% more dust: worth it.
    expect(by('Ring A')).toMatchObject({ quality: 20, catalyse: true, cost: 54 })
    // A cheap ring isn't worth 4c of catalysts.
    const cheap = dustRows([ring], [price('UniqueAccessory', 'Ring A', 1), price('Currency', 'Fertile Catalyst', 0.2)])[0]
    expect(cheap).toMatchObject({ quality: 0, catalyse: false, cost: 1 })
  })

  it('ranks by each mode, and filters', () => {
    const rows = dustRows([wreath, quiver], [price('UniqueArmour', "Speaker's Wreath", 0.36), price('UniqueArmour', 'Soul Strike', 0.41, '', 4)])
    expect(rankRows(rows, { mode: 'per-chaos', goldChaosPer10k: 5 })[0].name).toBe("Speaker's Wreath")
    const w = rows[0]
    expect(totalCost(w, 5)).toBeCloseTo(0.36 + 5040 / 10000 * 5)
    expect(rankValue(w, { mode: 'per-slot', goldChaosPer10k: 5 })).toBeCloseTo(w.dustPerChaos / 4)
    expect(rankValue(w, { mode: 'per-gold', goldChaosPer10k: 5 })).toBeCloseTo(27335 / 5040)
    const f = { minDust: 0, maxGold: null, maxChaos: null, hideThin: true, text: '' }
    expect(filterRows(rows, f).map(r => r.name)).toEqual(["Speaker's Wreath"])
    expect(filterRows(rows, { ...f, hideThin: false, text: 'quiver' }).map(r => r.name)).toEqual(['Soul Strike'])
    expect(filterRows(rows, { ...f, hideThin: false, minDust: 25000 }).map(r => r.name)).toEqual(["Speaker's Wreath"])
    expect(filterRows(rows, { ...f, hideThin: false, maxGold: 5100 }).map(r => r.name)).toEqual(["Speaker's Wreath"])
  })

  it('builds trade links for the league, with the item level', () => {
    const url = tradeLink('Allflame', wreath, 84, 'www.pathofexile.com', true)
    expect(url.startsWith('https://www.pathofexile.com/trade/search/Allflame?q=')).toBe(true)
    const q = JSON.parse(decodeURIComponent(url.split('?q=')[1]))
    expect(q.query).toMatchObject({ name: "Speaker's Wreath", type: 'Prophet Crown', filters: { misc_filters: { filters: { ilvl: { min: 84 } } } } })
  })
})

describe('real item data', () => {
  beforeAll(() => loadGameData())

  it('reads the disenchantable uniques with their base, kind and size', () => {
    const list = dustUniques()
    expect(list.length).toBeGreaterThan(1000)
    expect(list.find(u => u.name === "Speaker's Wreath")).toMatchObject({ base: 'Prophet Crown', dust: 7.81, kind: 'gear', slots: 4 })
    expect(list.find(u => u.name === 'Headhunter')).toMatchObject({ kind: 'jewellery' })
    expect(list.find(u => u.name === "Kalandra's Touch")?.noQuality).toBe(true)
    expect(list.some(u => /Piece of /.test(u.name) || u.name.startsWith('Curio of'))).toBe(false)
  })
})

describe('price check verdict', () => {
  it('says disenchant at the line or above, and nothing without a price', () => {
    expect(dustVerdict(20000, 2, 5000)).toEqual({ dustPerChaos: 10000, disenchant: true })
    expect(dustVerdict(20000, 10, 5000)).toEqual({ dustPerChaos: 2000, disenchant: false })
    expect(dustVerdict(20000, null, 5000)).toBeNull()
    expect(dustVerdict(20000, 0, 5000)).toBeNull()
  })
})

describe('listing counts', () => {
  it('adds up plain versions and Foulborn, leaving out links and relics', () => {
    const counts = readCounts([{
      lines: [
        { name: 'A', detailsId: 'a-prophet-crown', listingCount: 4 },
        { name: 'Foulborn A', detailsId: 'foulborn-a', listingCount: 3 },
        { name: 'A', detailsId: 'a-6l', listingCount: 50 },
        { name: 'B', detailsId: 'b-relic', listingCount: 9 },
        { name: 'C', detailsId: 'c' }
      ]
    }])
    expect(counts.get('A')).toBe(7)
    expect(counts.has('B')).toBe(false)
    expect(counts.has('C')).toBe(false)
  })
})

describe('loot filter dust preset', () => {
  const unique = (base: string, ilvl = 84, replica = false): ItemFacts =>
    ({ name: 'x', baseType: base, itemClass: 'Helmets', rarity: 'Unique', itemLevel: ilvl, replica, foulborn: false, influences: [], explicitModNames: [], areaLevel: 83 })

  it('switches on NeverSink\'s dust tiers, which ship switched off', () => {
    const doc = parseFilter(neverSink())
    const tiers = doc.blocks.filter(isNeverSinkDustTier)
    expect(tiers.length).toBe(3)
    expect(tiers.every(b => b.disabled)).toBe(true)
    const off = applyPresetChanges(doc, defaultPresets())
    expect(off).toBe(0)
    const changed = applyPresetChanges(doc, normalizePresets({ dust: { on: true, fromPrices: false, line: 5000 } }))
    expect(changed).toBe(3)
    expect(doc.blocks.filter(isNeverSinkDustTier).every(b => !b.disabled)).toBe(true)
    const text = serializeFilter(doc)
    expect(text).toMatch(/^Show # \$type->uniques \$tier->exdust1/m)
    expect(text).not.toMatch(/^#Show # \$type->uniques \$tier->exdust1/m)
    expect(validateFilter(parseFilter(text))).toEqual([])
  })

  it('lists only bases where every priced unique is worth disenchanting', () => {
    const uniques: DustUnique[] = [
      { ...wreath },
      { name: 'Valuable', base: 'Prophet Crown', dust: 7, kind: 'gear', noQuality: false, slots: 4 },
      { name: 'Cheap only', base: 'Iron Hat', dust: 10, kind: 'gear', noQuality: false, slots: 4 },
      { name: 'Thin', base: 'Leather Cap', dust: 10, kind: 'gear', noQuality: false, slots: 4 }
    ]
    const items = [
      price('UniqueArmour', "Speaker's Wreath", 0.4),
      price('UniqueArmour', 'Valuable', 300),
      price('UniqueArmour', 'Cheap only', 1),
      price('UniqueArmour', 'Thin', 1, '', 5)
    ]
    expect(dustBases(uniques, items, 5000, DUST_ILVL)).toEqual(['Iron Hat'])
    // A unique with no dust number on the base keeps it out too.
    expect(dustBases(uniques, items, 5000, DUST_ILVL, ['Iron Hat'])).toEqual([])
    // A cheap Foulborn price doesn't make a valuable unique look cheap.
    expect(dustBases(uniques, [...items, price('UniqueArmour', 'Foulborn Valuable', 0.1)], 5000, DUST_ILVL)).toEqual(['Iron Hat'])
  })

  it('adds a rule for drops at item level 82+ that are not replicas', () => {
    const doc = parseFilter(neverSink())
    const p = normalizePresets({ dust: { on: true, fromPrices: true, line: 5000 } })
    insertBuildBlocks(doc, presetBlocks(doc, p, null, ['Iron Hat']))
    expect(matchItem(doc, unique('Iron Hat')).final?.block.tier).toBe('dust')
    expect(matchItem(doc, unique('Iron Hat', 70)).final?.block.tier).not.toBe('dust')
    expect(matchItem(doc, unique('Iron Hat', 84, true)).final?.block.tier).not.toBe('dust')
    expect(matchItem(doc, { ...unique('Iron Hat'), foulborn: true }).final?.block.tier).not.toBe('dust')
    expect(validateFilter(doc)).toEqual([])
    // Off, or no bases: no rule.
    expect(presetBlocks(doc, normalizePresets({ dust: { on: true, fromPrices: false, line: 5000 } }), null, ['Iron Hat'])).toEqual([])
    expect(presetBlocks(doc, p, null, [])).toEqual([])
  })
})
