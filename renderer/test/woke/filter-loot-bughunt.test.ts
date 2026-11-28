// Loot tab bugs found in the overnight hunt (2026-11-27), one test each.
import { describe, it, expect } from 'vitest'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { ALL_CATEGORIES, CURRENCY_TYPE, applyCurrency, categoryOf, currencyLook, defaultCurrency } from '@/web/woke/loot-filter/currency-weights'
import type { CStep, CurrencySettings } from '@/web/woke/loot-filter/currency-weights'
import type { GemLine } from '@/web/woke/loot-filter/gem-classes'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { renameBases } from '@/web/woke/loot-filter/gem-bases'
import { gemItemFor, lootFocus } from '@/web/woke/loot-filter/loot-focus'
import { composeFilter } from '@/web/woke/loot-filter/compose'
import { DEFAULT_BUILD_RULES } from '@/web/woke/loot-filter/build-rules'
import { defaultPresets } from '@/web/woke/loot-filter/presets'
import { WEIGHT_TYPE } from '@/web/woke/loot-filter/weights'
import { cardCategoryOf } from '@/web/woke/loot-filter/card-classes'
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
    // Unlisted gems of that section hide at 20% too; other sections still show.
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(c => { c.catMode = { gemskill: 'off' } }), lookup, null, GEMS)
    expect(matchItem(doc, gem('Fireball', 5, 20)).visibility).toBe('Hide')
    const sup = (name: string): ItemFacts => ({ ...gem(name, 5, 20), itemClass: 'Support Gems' } as ItemFacts)
    expect(matchItem(doc, sup('Spell Echo Support')).visibility).toBe('Show')
  })

  it('Supports Off hides unlisted 20% supports but not Awakened or exceptional ones', () => {
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(c => { c.catMode = { gemsup: 'off', gemawk: 'auto', gemexc: 'auto' } }), lookup, null, GEMS)
    const sup = (name: string, quality = 20): ItemFacts => ({ ...gem(name, 5, quality), itemClass: 'Support Gems' } as ItemFacts)
    expect(matchItem(doc, sup('Spell Echo Support')).visibility).toBe('Hide')
    expect(matchItem(doc, sup('Awakened Spell Echo Support')).visibility).toBe('Show')
    expect(matchItem(doc, sup('Enlighten Support')).visibility).toBe('Show')
    expect(matchItem(doc, gem('Fireball', 5, 20)).visibility).toBe('Show')
  })

  it('sorts Foulborn orbs with the orbs', () => {
    expect(categoryOf('Foulborn Orb of Augmentation', 'currency')).toBe('orbs')
    expect(categoryOf('Foulborn Exalted Orb', 'currency')).toBe('orbs')
    expect(categoryOf('Ritual Splinter', 'currency')).toBe('splinters')
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

describe('a step turned off, with gems', () => {
  const sup = (name: string, level: number, quality: number): ItemFacts => ({ ...gem(name, level, quality), itemClass: 'Support Gems' } as ItemFacts)
  it('Exceptional Off hides Awakened Enlighten, though Awakened is Always', () => {
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(c => { c.catMode = { gemexc: 'off' } }), lookup, null, GEMS)
    expect(matchItem(doc, sup('Awakened Enlighten Support', 1, 0)).visibility).toBe('Hide')
    expect(matchItem(doc, sup('Enlighten Support', 3, 20)).visibility).toBe('Hide')
    expect(matchItem(doc, sup('Awakened Multistrike Support', 1, 0)).visibility).toBe('Show')
  })
  it('a band hidden by an Off step leaves a band with its own step showing', () => {
    const lines: GemLine[] = [{ name: 'Arc', variant: '1', chaos: 30, thin: false }, { name: 'Arc', variant: '21/20', chaos: 30, thin: false }]
    const doc = parseFilter(SEMI)
    const cfg = on(c => { c.items = { 'Arc 21/20': { step: 3 } } })
    applyCurrency(doc, cfg, lookup, null, lines)
    const shown = matchItem(doc, gem('Arc', 21, 20)).visibility
    expect(shown).toBe('Show')
    const step = (matchItem(doc, gem('Arc', 5, 0)).final?.block.tier ?? '')
    expect(step).toMatch(/^s[1-4]$/)
    const doc2 = parseFilter(SEMI)
    applyCurrency(doc2, on(c => { c.items = { 'Arc 21/20': { step: 3 } }; c.off = [Number(step.slice(1))] }), lookup, null, lines)
    expect(matchItem(doc2, gem('Arc', 5, 0)).visibility).toBe('Hide')
    expect(matchItem(doc2, gem('Arc', 21, 20)).visibility).toBe('Show')
  })
})

describe('Alt+F jumps to the right place', () => {
  it('opens the item\'s own class on the Loot tab', () => {
    expect(lootFocus('cat:carduniq:The Doctor')).toEqual({ cls: 'cards', item: 'The Doctor' })
    expect(lootFocus('cat:gemskill:Arc 20/20')).toEqual({ cls: 'gems', item: 'Arc 20/20' })
    expect(lootFocus('cat:orbs:Divine Orb')?.cls).toBe('currency')
    expect(lootFocus('mapfloor')?.cls).toBe('maps')
    expect(lootFocus('lgheist')?.cls).toBe('league')
    expect(lootFocus('u-5link')?.cls).toBe('uniques')
    expect(lootFocus('')).toBeNull()
  })
  it('finds a gem\'s band by level, quality and corruption', () => {
    const items = [
      { name: 'Arc 1', bt: 'Arc', chaos: 0.1 },
      { name: 'Arc 20/20', bt: 'Arc', chaos: 2 },
      { name: 'Arc 21/20c', bt: 'Arc', chaos: 40 }
    ]
    expect(gemItemFor(items, 'Arc', { level: 20, quality: 20, corrupted: false })?.name).toBe('Arc 20/20')
    expect(gemItemFor(items, 'Arc', { level: 21, quality: 20, corrupted: true })?.name).toBe('Arc 21/20c')
    expect(gemItemFor(items, 'Arc', { level: 21, quality: 20, corrupted: false })?.name).toBe('Arc 20/20')
    expect(gemItemFor(items, 'Arc', { level: 5, quality: 0, corrupted: false })?.name).toBe('Arc 1')
  })
  it('takes the band whose rule caught the gem, as your edits ordered them', () => {
    const lv = (n: number) => ({ key: 'GemLevel', op: '>=', count: null, values: [String(n)] } as never)
    const q = (n: number) => ({ key: 'Quality', op: '>=', count: null, values: [String(n)] } as never)
    const items = [
      { name: 'Arc 1', bt: 'Arc', chaos: 0.1, conds: [lv(1)] },
      { name: 'Arc 20/20', bt: 'Arc', chaos: 2, conds: [lv(20), q(20)] }
    ]
    // "Arc 1" set to Big by hand: its rule comes first and catches a 20/20.
    expect(gemItemFor(items, 'Arc', { level: 20, quality: 20, corrupted: false }, [lv(1)])?.name).toBe('Arc 1')
    // A floor rule (no level) falls back to the most valuable band.
    expect(gemItemFor(items, 'Arc', { level: 20, quality: 20, corrupted: false }, [q(20)])?.name).toBe('Arc 20/20')
  })
})

describe('colour-blind reaches the Loot and Equipment rules', () => {
  it('swaps red and green beams and icons in currency and weights rules', () => {
    const p = defaultPresets()
    p.currency.on = true
    p.weights.on = true
    p.colourBlind.on = true
    const out = composeFilter(SEMI, { presets: p, rules: [], edits: [], buildRules: { ...DEFAULT_BUILD_RULES }, build: null, moves: [], safetyNet: { on: false, minChaos: 20 }, prices: { lookup, safety: null, breakdown: null }, dustList: null, heldBack: () => false, stackHeld: () => false })
    const ours = out.doc.blocks.filter(b => b.type === CURRENCY_TYPE || b.type === WEIGHT_TYPE)
    expect(ours.length).toBeGreaterThan(0)
    for (const b of ours) {
      for (const a of b.actions) {
        if (a.key === 'PlayEffect') expect(['Red', 'Green', 'Pink', 'Brown']).not.toContain(a.args[0])
        if (a.key === 'MinimapIcon') expect(['Red', 'Green', 'Pink', 'Brown']).not.toContain(a.args[1])
      }
    }
  })
})

describe('card folds', () => {
  it('reads a reward whose size wrapper closes on a later line', () => {
    expect(cardCategoryOf('<size:31>{<gemitem>{Support Gem}\r\n<default>{Quality:} <augmented>{+23%}\r\n<corrupted>{Corrupted}}'.split('\n'))).toBe('cardgem')
    expect(cardCategoryOf('<size:27>{<uniqueitem>{The Eternity Shroud}\r\n<corrupted>{Two-Implicit}'.split('\n'))).toBe('carduniq')
    expect(cardCategoryOf('<size:28>{<rareitem>{Elder Guardian Occupied Map}\r\n<default>{Modifiers:}'.split('\n'))).toBe('cardmap')
    expect(cardCategoryOf('<size:26>{<rareitem>{Map}}\r\n<size:26>{<default>{Map Tier:}'.split('\n'))).toBe('cardmap')
    expect(cardCategoryOf(['<size:26>{<currencyitem>{10x Divine Orb}}'])).toBe('cardcur')
  })
})

describe('the Loot tab prices a unique base by its best unique', () => {
  it('whatever the cheapest unique setting on the Prices tab says', () => {
    const cheap: PriceLookup = (g, base) => base === 'Heavy Belt' ? { chaos: 1, thin: false } : lookup(g, base)
    const best: PriceLookup = (g, base) => base === 'Heavy Belt' ? { chaos: 5000, thin: false } : lookup(g, base)
    const p = defaultPresets()
    p.currency.on = true
    const ours = (prices: { lookup: PriceLookup, loot?: PriceLookup }) => {
      const out = composeFilter(SEMI, { presets: p, rules: [], edits: [], buildRules: { ...DEFAULT_BUILD_RULES }, build: null, moves: [], safetyNet: { on: false, minChaos: 20 }, prices: { ...prices, safety: null, breakdown: null }, dustList: null, heldBack: () => false, stackHeld: () => false })
      return JSON.stringify(out.doc.blocks.filter(b => b.type === CURRENCY_TYPE))
    }
    expect(ours({ lookup: cheap })).not.toBe(ours({ lookup: best }))
    expect(ours({ lookup: cheap, loot: best })).toBe(ours({ lookup: best }))
  })
})

describe('quiet mode and fewer beams reach the Loot and Equipment tabs', () => {
  it('drops sounds and beams below the kept tiers, Tink and Big keep theirs', async () => {
    const { applyPresetChanges, normalizePresets, wokeTier } = await import('@/web/woke/loot-filter/presets')
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(), (_g, base) => ({ chaos: base === 'Divine Orb' ? 160 : base === 'Chaos Orb' ? 1 : 0.2, thin: false }))
    const ours = () => doc.blocks.filter(b => b.type === CURRENCY_TYPE && b.visibility === 'Show' && /^s\d$/.test(b.tier ?? ''))
    expect(ours().some(b => wokeTier(b)! > 2 && b.actions.some(a => a.key === 'PlayEffect'))).toBe(true)
    applyPresetChanges(doc, normalizePresets({ quiet: { on: true, keepTiers: 2 }, beams: { on: true, keepTiers: 2 } }))
    for (const b of ours()) {
      const loud = b.actions.some(a => a.key === 'PlayEffect' || a.key === 'MinimapIcon' || a.key === 'PlayAlertSound')
      if (wokeTier(b)! > 2) expect(loud, b.comment).toBe(false)
    }
    expect(wokeTier({ type: CURRENCY_TYPE, tier: 's5' })).toBe(1)
    expect(wokeTier({ type: WEIGHT_TYPE, tier: 's4' })).toBe(1)
    expect(wokeTier({ type: 'currency', tier: 's5' })).toBe(null)
  })
})
