// Jewels on the Loot tab (Guy's Jewels A, 2026-11-28): Abyss and Jewels folds,
// a row per rarity and item level band, above NeverSink's jewel rules.
import { describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { CURRENCY_TYPE, applyCurrency, currencyItems, defaultCurrency, kindOf } from '@/web/woke/loot-filter/currency-weights'
import { jewelPile } from '@/web/woke/loot-filter/jewel-pile'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { neverSink } from '../helpers/neversink'

const SEMI = neverSink('2-SEMI-STRICT')
const lookup: PriceLookup = (_g, base) => base === 'Divine Orb' ? { chaos: 160, thin: false } : null
const jewel = (base: string, cls: string, rarity: ItemFacts['rarity'], itemLevel: number, more: Partial<ItemFacts> = {}): ItemFacts =>
  ({ name: base, baseType: base, itemClass: cls, rarity, itemLevel, areaLevel: 83, influences: [], explicitModNames: [], ...more } as ItemFacts)

describe('jewels on the Loot tab', () => {
  it('lists the Abyss and Jewels rows as the jewels kind', () => {
    const items = currencyItems(parseFilter(SEMI), lookup).filter(i => i.type === 'jewels')
    expect(items.length).toBe(12)
    expect(new Set(items.map(i => kindOf(i.cat)))).toEqual(new Set(['jewels']))
    expect(items.every(i => i.est)).toBe(true)
  })

  it('shows each band at its own step, the cheap ones at Small', () => {
    const cfg = defaultCurrency()
    cfg.on = true
    const doc = parseFilter(SEMI)
    applyCurrency(doc, cfg, lookup)
    const hit = (f: ItemFacts) => matchItem(doc, f)
    const step = (f: ItemFacts) => Number(hit(f).final?.block.tier?.slice(1))
    const high = jewel('Murderous Eye Jewel', 'Abyss Jewels', 'Rare', 86)
    expect(hit(high).final?.block.type).toBe(CURRENCY_TYPE)
    expect(step(high)).toBeGreaterThan(step(jewel('Murderous Eye Jewel', 'Abyss Jewels', 'Rare', 83)))
    // Guy 04:41Z: nothing hides by default; you turn a row off yourself.
    expect(step(jewel('Murderous Eye Jewel', 'Abyss Jewels', 'Rare', 75))).toBe(1)
    expect(step(jewel('Cobalt Jewel', 'Jewels', 'Magic', 84))).toBe(1)
    // Corrupted 5 mods beats its item level row.
    const five = jewel('Ghastly Eye Jewel', 'Abyss Jewels', 'Rare', 86, { identified: true, corrupted: true, explicitModNames: ['a1', 'b2e', 'ci', 'do', 'eu'] })
    expect(step(five)).toBeGreaterThan(step(high))
    // Corrupted rare abyss jewels show at any item level, as NeverSink's do.
    const corrupt = jewel('Murderous Eye Jewel', 'Abyss Jewels', 'Rare', 75, { corrupted: true })
    expect(step(corrupt)).toBeGreaterThan(step(high))
    expect(hit(jewel('Hypnotic Eye Jewel', 'Abyss Jewels', 'Rare', 75, { corrupted: true, corruptedMods: 1 })).visibility).toBe('Show')
    // Corrupted implicit beats the plain magic row.
    expect(hit(jewel('Viridian Jewel', 'Jewels', 'Magic', 84, { corrupted: true, corruptedMods: 1 })).visibility).toBe('Show')
    // Cluster jewels stay NeverSink's; unique jewels stay the Uniques page's.
    expect(hit(jewel('Large Cluster Jewel', 'Jewels', 'Rare', 84)).final?.block.type).not.toBe(CURRENCY_TYPE)
    expect(hit(jewel('Prismatic Jewel', 'Jewels', 'Unique', 84)).final?.block.comment).toMatch(/uniq/)
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
  })

  // Guy 2026-11-28: a filter can't see which corruption implicit a jewel has,
  // so those rows (and rare jewels) have a fixed step, not a price, and show
  // with Small and Normal turned off.
  it('shows the rows no price can judge whatever steps are off', () => {
    const cfg = defaultCurrency()
    cfg.on = true
    cfg.off = [1, 2]
    const doc = parseFilter(SEMI)
    applyCurrency(doc, cfg, lookup)
    const hit = (f: ItemFacts) => matchItem(doc, f)
    const step = (f: ItemFacts) => Number(hit(f).final?.block.tier?.slice(1))
    expect(step(jewel('Cobalt Jewel', 'Jewels', 'Rare', 84, { corrupted: true, corruptedMods: 1 }))).toBe(3)
    expect(step(jewel('Viridian Jewel', 'Jewels', 'Magic', 84, { corrupted: true, corruptedMods: 1 }))).toBe(2)
    expect(step(jewel('Crimson Jewel', 'Jewels', 'Rare', 84))).toBe(1)
    expect(step(jewel('Crimson Jewel', 'Jewels', 'Magic', 84))).toBe(1)
    expect(step(jewel('Murderous Eye Jewel', 'Abyss Jewels', 'Rare', 83))).toBe(1)
    expect(step(jewel('Murderous Eye Jewel', 'Abyss Jewels', 'Magic', 70, { corrupted: true, corruptedMods: 1 }))).toBe(2)
    expect(step(jewel('Murderous Eye Jewel', 'Abyss Jewels', 'Rare', 75))).toBe(1)
    // A row you set Off hides.
    cfg.items = { 'Magic or white jewel': { step: 0 } }
    const off = parseFilter(SEMI)
    applyCurrency(off, cfg, lookup)
    expect(matchItem(off, jewel('Crimson Jewel', 'Jewels', 'Magic', 84)).visibility).toBe('Hide')
  })

  it('a fixed row goes by price once you say so', () => {
    const cfg = defaultCurrency()
    cfg.on = true
    cfg.line = 1
    const rare = jewel('Crimson Jewel', 'Jewels', 'Rare', 84)
    let doc = parseFilter(SEMI)
    applyCurrency(doc, cfg, lookup)
    expect(matchItem(doc, rare).visibility).toBe('Show')
    cfg.items = { 'Rare jewel': { priced: true } }
    doc = parseFilter(SEMI)
    applyCurrency(doc, cfg, lookup)
    // Its 0.5c guess is under a 1c line.
    expect(matchItem(doc, jewel('Crimson Jewel', 'Jewels', 'Rare', 84)).visibility).toBe('Hide')
  })

  it('a section set Off hides its jewels; below area level 68 NeverSink decides', () => {
    const cfg = defaultCurrency()
    cfg.on = true
    cfg.catMode = { jewabyss: 'off' }
    const doc = parseFilter(SEMI)
    applyCurrency(doc, cfg, lookup)
    expect(matchItem(doc, jewel('Murderous Eye Jewel', 'Abyss Jewels', 'Rare', 86)).visibility).toBe('Hide')
    const low = matchItem(doc, jewel('Murderous Eye Jewel', 'Abyss Jewels', 'Rare', 86, { areaLevel: 40 }))
    expect(low.final?.block.type).not.toBe(CURRENCY_TYPE)
  })

  it('drops every kind of jewel on the ground, each naming its row', () => {
    const pile = jewelPile(1)
    expect(pile.length).toBe(24)
    const names = new Set(currencyItems(parseFilter(SEMI), lookup).filter(i => i.type === 'jewels').map(i => i.name))
    for (const d of pile) if (d.priced) expect(names.has(d.priced)).toBe(true)
    expect(pile.some(d => d.facts.rarity === 'Unique')).toBe(true)
    expect(pile.some(d => /Cluster/.test(d.label))).toBe(true)
  })
})
