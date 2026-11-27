// The Loot tab's shared frame (Guy's round 1 and 2 picks, 2026-11-27): every
// section has Off / Weighted / Always, an item's own Off or Always wins over
// its section's, and the Faint step shows piles under the line small and
// see-through until the Strictness it's set for.
import { describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { CURRENCY_TYPE, applyCurrency, defaultCurrency, faintOn, forcedHidden, normalizeCurrency } from '@/web/woke/loot-filter/currency-weights'
import type { CurrencySettings } from '@/web/woke/loot-filter/currency-weights'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { neverSink } from '../helpers/neversink'

const SEMI = neverSink('2-SEMI-STRICT')
const PRICES: Record<string, number> = { 'Divine Orb': 160, 'Chaos Orb': 1, 'Orb of Alchemy': 0.3, 'Orb of Transmutation': 0.05, 'Scroll of Wisdom': 0.02 }
const lookup: PriceLookup = (_g, base) => PRICES[base] != null ? { chaos: PRICES[base], thin: false } : null
const on = (f?: (c: CurrencySettings) => void): CurrencySettings => {
  const c = defaultCurrency()
  c.on = true
  f?.(c)
  return c
}
const pile = (name: string, stackSize: number): ItemFacts => ({
  name, baseType: name, itemClass: 'Stackable Currency', stackSize, areaLevel: 83, influences: [], explicitModNames: []
})
const run = (cfg: CurrencySettings) => {
  const doc = parseFilter(SEMI)
  applyCurrency(doc, cfg, lookup)
  return (name: string, n = 1) => matchItem(doc, pile(name, n))
}

describe('Loot frame', () => {
  it('a section set Off hides it, unless the item itself is Always', () => {
    const m = run(on(c => { c.catMode = { orbs: 'off' }; c.items = { 'Chaos Orb': { supply: 1 } } }))
    expect(m('Divine Orb').visibility).toBe('Hide')
    expect(m('Divine Orb').final?.block.type).toBe(CURRENCY_TYPE)
    expect(m('Chaos Orb').visibility).toBe('Show')
  })

  it('a section set Always shows every pile at least Small; price still sets louder steps', () => {
    const m = run(on(c => { c.catMode = { orbs: 'always' }; c.items = { 'Orb of Alchemy': { step: 0 } } }))
    expect(m('Scroll of Wisdom').final?.block.tier).toBe('s1')
    expect(m('Divine Orb').final?.block.tier).toBe('s5')
    // The item's own Off wins.
    expect(m('Orb of Alchemy').visibility).toBe('Hide')
  })

  it('Faint shows piles under the line small and see-through, but not what was hidden by hand', () => {
    const cfg = on(c => { c.faint = { on: true, until: 1.25 }; c.items = { 'Orb of Alchemy': { step: 0 } } })
    const m = run(cfg)
    const scroll = m('Scroll of Wisdom')
    expect(scroll.visibility).toBe('Show')
    expect(scroll.final?.block.tier).toBe('faint')
    expect(scroll.final?.block.actions.find(a => a.key === 'SetTextColor')?.args[3]).toBe('100')
    expect(scroll.final?.block.actions.some(a => a.key === 'PlayAlertSound')).toBe(false)
    expect(m('Orb of Alchemy').visibility).toBe('Hide')
    // Piles over the line keep their step.
    expect(m('Divine Orb').final?.block.tier).toBe('s5')
  })

  it('Faint is off by default, and off from the Strictness it is set for', () => {
    expect(defaultCurrency().faint.on).toBe(false)
    expect(run(on())('Scroll of Wisdom').visibility).toBe('Hide')
    const cfg = on(c => { c.faint = { on: true, until: 1.25 } })
    expect(faintOn(cfg, '2-SEMI-STRICT')).toBe(true)
    expect(faintOn(cfg, '3-STRICT')).toBe(false)
    expect(faintOn({ ...cfg, mult: 2 }, '2-SEMI-STRICT')).toBe(false)
    expect(run({ ...cfg, mult: 2 })('Scroll of Wisdom').visibility).toBe('Hide')
  })

  it('knows what was hidden by hand', () => {
    const c = on(x => { x.catMode = { orbs: 'off' }; x.items = { 'Chaos Orb': { supply: 1 }, 'Golden Oil': { step: 0 } } })
    expect(forcedHidden({ name: 'Divine Orb', cat: 'orbs' }, c)).toBe(true)
    expect(forcedHidden({ name: 'Chaos Orb', cat: 'orbs' }, c)).toBe(false)
    expect(forcedHidden({ name: 'Golden Oil', cat: 'oils' }, c)).toBe(true)
    expect(forcedHidden({ name: 'Clear Oil', cat: 'oils' }, c)).toBe(false)
  })

  it('writes a filter the game takes with Faint and sections set', () => {
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(c => { c.faint = { on: true, until: 99 }; c.catMode = { oils: 'off', essences: 'always' } }), lookup)
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
  })

  it('keeps section modes and Faint, and ignores anything else in them', () => {
    // The normalizer runs at startup, so it stays light; readers take only
    // 'off', 'always', true and a number.
    const c = normalizeCurrency({ catMode: { orbs: 'off', oils: 'always', ess: 'weird' }, faint: { on: true, until: 99 } } as never)
    expect(c.catMode).toMatchObject({ orbs: 'off', oils: 'always' })
    expect(c.faint).toEqual({ on: true, until: 99 })
    expect(forcedHidden({ name: 'Essence of Woe', cat: 'ess' }, c)).toBe(false)
    const bad = normalizeCurrency({ catMode: 'x', faint: { on: 'x', until: 'y' } } as never)
    expect(bad.faint).toEqual(defaultCurrency().faint)
    expect(faintOn(bad, null)).toBe(false)
    expect(forcedHidden({ name: 'Divine Orb', cat: 'orbs' }, bad)).toBe(false)
  })
})
