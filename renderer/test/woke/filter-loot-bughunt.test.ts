// Loot tab bugs found in the overnight hunt (2026-11-27), one test each.
import { describe, it, expect } from 'vitest'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { ALL_CATEGORIES, applyCurrency, categoryOf, currencyLook, defaultCurrency } from '@/web/woke/loot-filter/currency-weights'
import type { CStep, CurrencySettings } from '@/web/woke/loot-filter/currency-weights'
import type { GemLine } from '@/web/woke/loot-filter/gem-classes'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { renameBases } from '@/web/woke/loot-filter/gem-bases'
import { neverSink } from '../helpers/neversink'

const SEMI = neverSink('2-SEMI-STRICT')
const lookup: PriceLookup = (_g, base) => base === 'Divine Orb' ? { chaos: 160, thin: false } : null
const GEMS: GemLine[] = [{ name: 'Arc', variant: '20/20', chaos: 1, thin: false }, { name: 'Arc', variant: '1', chaos: 0.05, thin: false }]
const gem = (name: string, level: number, quality = 0): ItemFacts => ({
  name, baseType: name, itemClass: 'Skill Gems', gemLevel: level, quality, corrupted: false, transfigured: false, areaLevel: 83, influences: [], explicitModNames: []
} as ItemFacts)
const on = (f?: (c: CurrencySettings) => void): CurrencySettings => {
  const c = defaultCurrency()
  c.on = true
  f?.(c)
  return c
}

describe('loot tab bug hunt', () => {
  it('keeps red beams and red map icons for Tink', () => {
    const cfg = defaultCurrency()
    for (const cat of ALL_CATEGORIES) {
      for (const s of [1, 2, 3, 4] as CStep[]) {
        const l = currencyLook(s, cat.id, cfg)
        expect(l.icon?.color, `${cat.id} step ${s}`).not.toBe('Red')
        expect(l.effect?.color, `${cat.id} step ${s}`).not.toBe('Red')
      }
    }
  })

  it('a gem section set Off stays hidden at 20% quality', () => {
    for (const faint of [false, true]) {
      const doc = parseFilter(SEMI)
      applyCurrency(doc, on(c => { c.catMode = { gemskill: 'off' }; c.faint.on = faint; c.faint.until = 99 }), lookup, null, GEMS)
      expect(matchItem(doc, gem('Arc', 20, 20)).visibility, `faint ${faint}`).toBe('Hide')
      expect(matchItem(doc, gem('Arc', 5, 20)).visibility, `faint ${faint}`).toBe('Hide')
    }
    // Other gems at 20% still show.
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(c => { c.catMode = { gemskill: 'off' } }), lookup, null, GEMS)
    expect(matchItem(doc, gem('Fireball', 5, 20)).visibility).toBe('Show')
  })

  it('sorts Foulborn orbs with the orbs', () => {
    expect(categoryOf('Foulborn Orb of Augmentation', 'currency')).toBe('orbs')
    expect(categoryOf('Foulborn Exalted Orb', 'currency')).toBe('orbs')
  })
})

describe('hidden by hand keeps a gem band to itself', () => {
  const lines: GemLine[] = [
    { name: 'Ice Nova', variant: '1', chaos: 0.05, thin: false },
    { name: 'Ice Nova of Frostbolts', variant: '20', chaos: 0.1, thin: false },
    { name: 'Arc', variant: '1', chaos: 0.1, thin: false },
    { name: 'Arc', variant: '20/20', chaos: 0.1, thin: false }
  ]
  const tf = (level: number, quality: number): ItemFacts => ({ ...gem('Ice Nova', level, quality), transfigured: true } as ItemFacts)
  it('Skill gems Off leaves transfigured gems (Always) showing', () => {
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(c => { c.catMode = { gemskill: 'off' } }), lookup, null, lines)
    renameBases(doc, n => n === 'Ice Nova of Frostbolts' ? 'Ice Nova' : undefined)
    expect(matchItem(doc, tf(5, 0)).visibility).toBe('Show')
    expect(matchItem(doc, gem('Ice Nova', 5, 20)).visibility).toBe('Hide')
  })
  it('one band Off leaves the gem\'s other bands to the 20% floor', () => {
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(c => { c.items = { 'Arc 20/20': { step: 0 } } }), lookup, null, lines)
    expect(matchItem(doc, gem('Arc', 5, 20)).visibility).toBe('Show')
    expect(matchItem(doc, gem('Arc', 20, 20)).visibility).toBe('Hide')
  })
})
