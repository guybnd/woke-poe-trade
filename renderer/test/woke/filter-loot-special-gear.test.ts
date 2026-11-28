// Special gear on the Loot tab (NeverSink retirement M4b): our own rules for
// exotic mods, item kinds, variations, influenced gear, enshrouded items and
// idols; NeverSink's copies stop in maps.
import { describe, it, expect, beforeAll } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import type { FilterDoc } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { CURRENCY_TYPE, applyCurrency, currencyItems, defaultCurrency, kindOf, sectionMode } from '@/web/woke/loot-filter/currency-weights'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { SPECIAL_CATEGORIES, SPECIAL_NS_TYPE, SPECIAL_ROWS } from '@/web/woke/loot-filter/special-gear'
import { LEVELS, neverSink } from '../helpers/neversink'
import { loadGameData } from '../helpers/game-data'
import { WEIGHT_TYPE, applyWeights, defaultWeights, filterBases } from '@/web/woke/loot-filter/weights'
import { idGroups } from '@/web/woke/loot-filter/id-mods'
import type { AffixTable } from '@/web/woke/loot-filter/id-mods'
import fs from 'node:fs'
import path from 'node:path'

const lookup: PriceLookup = (_g, base) => base === 'Divine Orb' ? { chaos: 160, thin: false } : null
const gear = (baseType: string, itemClass: string, more: Partial<ItemFacts> = {}): ItemFacts => ({
  name: baseType, baseType, itemClass, rarity: 'Rare', areaLevel: 83, itemLevel: 84, identified: true, corrupted: false, mirrored: false, influences: [], explicitModNames: [], ...more
} as ItemFacts)
function built (level: typeof LEVELS[number] = '1-REGULAR', more: Partial<ReturnType<typeof defaultCurrency>> = {}): FilterDoc {
  const doc = parseFilter(neverSink(level))
  applyCurrency(doc, { ...defaultCurrency(), on: true, ...more }, lookup)
  return doc
}
const step = (doc: FilterDoc, f: ItemFacts) => {
  const m = matchItem(doc, f)
  return m.final?.block.type === CURRENCY_TYPE && /: sg[a-z]+$/.test(m.final.block.comment) ? Number(m.final.block.tier?.slice(1)) : null
}

const CASES: Array<[string, ItemFacts, number]> = [
  ['fractured veiled', gear('Vermillion Ring', 'Rings', { fractured: true, explicitModNames: ['of the Veil'] }), 4],
  ['veiled jewel', gear('Cobalt Jewel', 'Jewels', { explicitModNames: ['Veiled'] }), 3],
  ['temple boots', gear('Two-Toned Boots', 'Boots', { explicitModNames: ["Matatl's"] }), 3],
  ['haunted', gear('Vermillion Ring', 'Rings', { explicitModNames: ['Haunted'] }), 4],
  ['delve', gear('Onyx Amulet', 'Amulets', { rarity: 'Magic', explicitModNames: ['Subterranean'] }), 4],
  ['double corrupted ring', gear('Vermillion Ring', 'Rings', { corrupted: true, corruptedMods: 2 }), 4],
  ['enchanted helmet', gear('Hubris Circlet', 'Helmets', { identified: false, anyEnchantment: true }), 4],
  ['abyss socket', gear('Hubris Circlet', 'Helmets', { rarity: 'Normal', socketGroups: ['A'] }), 3],
  ['white influenced 86', gear('Hubris Circlet', 'Helmets', { rarity: 'Normal', identified: false, itemLevel: 86, influences: ['Shaper'] }), 3],
  ['magic influenced 80', gear('Hubris Circlet', 'Helmets', { rarity: 'Magic', identified: false, itemLevel: 80, influences: ['Elder'] }), 1],
  ['synthesised', gear('Vermillion Ring', 'Rings', { rarity: 'Normal', identified: false, synthesised: true }), 4],
  ['enshrouded', gear('Enshrouded Quiver', 'Quivers', { rarity: 'Normal', identified: false }), 4],
  ['rare idol', gear('Minor Idol', 'Idols', { identified: false }), 3],
  ['relic', gear('Urn Relic', 'Relics', { rarity: 'Magic', identified: false }), 4]
]

describe('special gear on the Loot tab', () => {
  beforeAll(loadGameData, 60000)

  it("shows over Rare weights' Hide: white, magic and identified gear at its row's step or louder", () => {
    const table = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../public/data/affix-tiers.json'), 'utf8')) as AffixTable
    for (const need of [4, 64]) {
      const doc = parseFilter(neverSink('4-VERY-STRICT'))
      const w = { ...defaultWeights(), on: true, need }
      applyWeights(doc, w, filterBases(doc), idGroups(table, [], w.mult))
      applyCurrency(doc, { ...defaultCurrency(), on: true }, lookup)
      for (const [what, f, s] of CASES) {
        // Unidentified rares are the weights' own call; jewels, idols and
        // the like aren't theirs at all.
        if (f.rarity === 'Rare' && f.identified === false) continue
        const m = matchItem(doc, { ...f, quality: 0, memoryStrands: 0, socketGroups: f.socketGroups ?? [], corruptedMods: f.corruptedMods ?? 0 } as ItemFacts)
        expect(m.visibility, `${need}: ${what} (${m.final?.block.comment})`).toBe('Show')
        if (m.final?.block.type === WEIGHT_TYPE) continue
        expect(Number(m.final?.block.tier?.slice(1)), `${need}: ${what}`).toBeGreaterThanOrEqual(s)
      }
      expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
    }
  })

  it('is one class with a fold per kind, every section Always, every row a fixed step', () => {
    const items = currencyItems(parseFilter(neverSink('1-REGULAR')), lookup).filter(i => i.type === 'special')
    expect(items.length).toBe(SPECIAL_ROWS.length)
    expect(new Set(items.map(i => kindOf(i.cat)))).toEqual(new Set(['special']))
    expect(new Set(items.map(i => i.cat))).toEqual(new Set(SPECIAL_CATEGORIES.map(c => c.id)))
    for (const c of SPECIAL_CATEGORIES) expect(sectionMode({ catMode: {} }, c.id)).toBe('always')
    for (const it of items) expect(it.fixed, it.name).toBeGreaterThan(0)
    // Names are unique among every Loot tab item (edits are kept by name).
    const all = currencyItems(parseFilter(neverSink('1-REGULAR')), lookup).map(i => i.name)
    expect(new Set(all).size).toBe(all.length)
  })

  it('each kind meets its own row in maps, at every strictness', () => {
    for (const level of LEVELS) {
      const doc = built(level)
      for (const [what, f, s] of CASES) expect(step(doc, f), `${level}: ${what}`).toBe(s)
      expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message), level).toEqual([])
    }
  })

  it("stops NeverSink's copies where the Loot rules apply, keeps them below", () => {
    // Loot rules in maps only: NeverSink's copies apply below area level 68.
    const doc = built('1-REGULAR', { catMode: { lvgate: 0 } as never })
    const ns = doc.blocks.filter(b => b.type != null && SPECIAL_NS_TYPE.test(b.type) && !b.disabled)
    expect(ns.length).toBeGreaterThan(20)
    for (const b of ns) expect(b.conditions.some(c => c.key === 'AreaLevel' && c.op === '<' && c.values[0] === '68'), b.comment).toBe(true)
    // Below maps NeverSink still decides (the Loot rules start at 68).
    const low = gear('Two-Toned Boots', 'Boots', { areaLevel: 40, explicitModNames: ["Matatl's"] })
    expect(matchItem(doc, low).final?.block.type).toBe('exoticmods')
    // Quest-like items and influenced maps stay NeverSink's.
    expect(doc.blocks.filter(b => b.type === 'questlikeexception' || b.type === 'maps->influenced').every(b => !b.conditions.some(c => c.key === 'AreaLevel' && c.op === '<'))).toBe(true)
    // With the Loot rules everywhere (the default), NeverSink's copies go.
    const all = built()
    expect(all.blocks.filter(b => b.type != null && SPECIAL_NS_TYPE.test(b.type)).every(b => b.disabled)).toBe(true)
  })

  it('sits under the 6-links and the rare weights; Off writes nothing, so gear rules decide', () => {
    const doc = built()
    const first = doc.blocks.findIndex(b => b.type === CURRENCY_TYPE && /: sg[a-z]+$/.test(b.comment))
    expect(first).toBeGreaterThan(doc.blocks.findIndex(b => b.type === '6l'))
    // Nothing of ours hides.
    expect(doc.blocks.filter(b => b.type === CURRENCY_TYPE && /: sg[a-z]+/.test(b.comment) && b.visibility === 'Hide')).toEqual([])
    const off = built('1-REGULAR', { catMode: { sgmods: 'off' } })
    const m = matchItem(off, gear('Two-Toned Boots', 'Boots', { explicitModNames: ["Matatl's"] }))
    expect(m.final?.block.comment ?? '').not.toMatch(/sgmods/)
    // A row moved to a step by hand.
    const mine = built('1-REGULAR', { items: { 'Temple boots: Matatl\'s speed and traps': { step: 4 } } })
    expect(step(mine, gear('Two-Toned Boots', 'Boots', { explicitModNames: ["Matatl's"] }))).toBe(4)
  })

  it('leaves uniques and plain gear alone', () => {
    const doc = built()
    expect(step(doc, gear('Hubris Circlet', 'Helmets', { rarity: 'Unique', identified: false, influences: ['Shaper'], itemLevel: 86 }))).toBeNull()
    expect(step(doc, gear('Hubris Circlet', 'Helmets', { rarity: 'Magic', identified: false }))).toBeNull()
  })
})
