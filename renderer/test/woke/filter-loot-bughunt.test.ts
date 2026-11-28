// Loot tab bugs found in the overnight hunt (2026-11-27), one test each.
import { describe, it, expect, beforeAll } from 'vitest'
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
import { loadGameData } from '../helpers/game-data'

beforeAll(loadGameData, 60000)

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
    applyCurrency(doc2, on(c => { c.items = { 'Arc 21/20': { step: 3 } }; c.offBy = { gems: [Number(step.slice(1))] } }), lookup, null, lines)
    expect(matchItem(doc2, gem('Arc', 5, 0)).visibility).toBe('Hide')
    expect(matchItem(doc2, gem('Arc', 21, 20)).visibility).toBe('Show')
  })
  it('a narrow band hidden by an Off step stays hidden under a broader band that shows', () => {
    const lines: GemLine[] = [{ name: 'Arc', variant: '20/20', chaos: 0.3, thin: false }, { name: 'Arc', variant: '21/20', chaos: 30, thin: false }]
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(), lookup, null, lines)
    const hi = matchItem(doc, gem('Arc', 21, 20)).final?.block.tier ?? ''
    const lo = matchItem(doc, gem('Arc', 20, 20)).final?.block.tier ?? ''
    expect(hi > lo && /^s[1-4]$/.test(hi)).toBe(true)
    const doc2 = parseFilter(SEMI)
    applyCurrency(doc2, on(c => { c.offBy = { gems: [Number(hi.slice(1))] } }), lookup, null, lines)
    expect(matchItem(doc2, gem('Arc', 21, 20)).visibility).toBe('Hide')
    expect(matchItem(doc2, gem('Arc', 20, 20)).visibility).toBe('Show')
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
    const { applyPresetChanges, normalizePresets, tierNumber: wokeTier } = await import('@/web/woke/loot-filter/presets')
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(), (_g, base) => ({ chaos: base === 'Divine Orb' ? 160 : base === 'Chaos Orb' ? 1 : 0.2, thin: false }))
    const ours = () => doc.blocks.filter(b => b.type === CURRENCY_TYPE && b.visibility === 'Show' && /^s\d$/.test(b.tier ?? ''))
    expect(ours().some(b => wokeTier(b)! > 2 && b.actions.some(a => a.key === 'PlayEffect'))).toBe(true)
    applyPresetChanges(doc, normalizePresets({ quiet: { on: true, keepTiers: 2 }, beams: { on: true, keepTiers: 2 } }))
    for (const b of ours()) {
      const loud = b.actions.some(a => a.key === 'PlayEffect' || a.key === 'MinimapIcon' || a.key === 'PlayAlertSound')
      if (wokeTier(b)! > 2) expect(loud, b.comment).toBe(false)
    }
    expect(wokeTier({ type: CURRENCY_TYPE, tier: 's5', comment: '' })).toBe(1)
    expect(wokeTier({ type: WEIGHT_TYPE, tier: 's4', comment: '' })).toBe(1)
    expect(wokeTier({ type: 'currency', tier: 's5', comment: '' })).toBeNaN()
  })
})

describe('one rank list for Base ranks and Equipment', () => {
  it('a Base ranks move sets the Equipment rank; exotic bases and Never keep theirs', async () => {
    const { moveWeightRanks } = await import('@/web/woke/loot-filter/weight-rank')
    const { filterBases } = await import('@/web/woke/loot-filter/weights')
    const doc = parseFilter(SEMI)
    const rows = filterBases(doc)
    const r1 = rows.find(r => r.rank === 'r1')!.name
    const r3 = rows.find(r => r.rank === 'r3')!.name
    const ex = rows.find(r => r.rank === 'x1')?.name
    type Cfg = Parameters<typeof moveWeightRanks>[1]
    const config = { presets: { weights: { ranks: { [r3]: 'rj' } } } } as unknown as Cfg
    const store = { doc: { value: doc } } as unknown as Parameters<typeof moveWeightRanks>[0]
    moveWeightRanks(store, config, [r1], 'r3')
    expect(config.presets.weights.ranks[r1]).toBe('r3')
    moveWeightRanks(store, config, [r1], 'r1')
    expect(r1 in config.presets.weights.ranks).toBe(false)
    moveWeightRanks(store, config, [r3], 'never')
    expect(config.presets.weights.ranks[r3]).toBe('rj')
    moveWeightRanks(store, config, [r3], 'none')
    expect(config.presets.weights.ranks[r3]).toBe('r0')
    if (ex) {
      moveWeightRanks(store, config, [ex], 'r2')
      expect(ex in config.presets.weights.ranks).toBe(false)
    }
  })
})

describe('Recipes and the presets the Loot tab covers', () => {
  const rare = (extra: Partial<ItemFacts>): ItemFacts => ({ name: 'x', baseType: 'Vaal Regalia', itemClass: 'Body Armours', rarity: 'Rare', itemLevel: 84, areaLevel: 83, influences: [], explicitModNames: [], identified: true, ...extra } as ItemFacts)
  it('shows 6-links, 6 sockets and 20% flasks at their steps in maps, and Off leaves them', async () => {
    const { setRecipeStep } = await import('@/web/woke/loot-filter/currency-weights')
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(c => setRecipeStep(c, 'rgb', 1)), lookup)
    const tier = (f: ItemFacts) => matchItem(doc, f).final?.block.tier
    expect(tier(rare({ socketGroups: ['RRGGBB'], baseType: 'Simple Robe' }))).toBe('s4')
    expect(tier(rare({ socketGroups: ['RG', 'GB', 'BR'] }))).toBe('s2')
    expect(tier(rare({ socketGroups: ['RGB'] }))).toBe('s1')
    expect(tier({ ...rare({}), baseType: 'Divine Life Flask', itemClass: 'Life Flasks', rarity: 'Magic', quality: 20 } as ItemFacts)).toBe('s1')
    const off = parseFilter(SEMI)
    applyCurrency(off, on(c => { setRecipeStep(c, 'six', 0); setRecipeStep(c, 'gem20', 0) }), lookup, null, GEMS)
    expect(matchItem(off, rare({ socketGroups: ['RG', 'GB', 'BR'] })).final?.block.comment ?? '').not.toContain('recipe')
    expect(matchItem(off, gem('Fireball', 5, 20)).final?.block.comment ?? '').not.toContain('20% quality')
  })
  it('puts the recipes where NeverSink\'s own recipes are, below its valuable rules', async () => {
    const { setRecipeStep } = await import('@/web/woke/loot-filter/currency-weights')
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(c => setRecipeStep(c, 'rgb', 1)), lookup)
    const at = (re: RegExp) => doc.blocks.findIndex(b => re.test(b.comment))
    const six = doc.blocks.findIndex(b => b.type === 'socketslinks')
    expect(at(/recipe: 6 sockets/)).toBeLessThan(six)
    expect(at(/recipe: 6 sockets/)).toBeGreaterThan(doc.blocks.findIndex(b => b.type === 'influenced'))
    const l6 = doc.blocks.findIndex(b => b.type === '6l' && b.tier === 'others')
    expect(at(/recipe: 6-link/)).toBe(l6 - 1)
    // A 6-link on a top base keeps NeverSink's loud look.
    expect(matchItem(doc, rare({ socketGroups: ['RRGGBB'], corrupted: false, mirrored: false })).final?.block.type).toBe('6l')
  })
  it('turns maps-only covered presets off and keeps the rest for levelling', async () => {
    const { lootPresets, levellingOnly } = await import('@/web/woke/loot-filter/loot-presets')
    const { normalizePresets, presetBlocks, PRESET_TYPE } = await import('@/web/woke/loot-filter/presets')
    const p = normalizePresets({ cheapCurrency: { on: true, chaos: 1 }, lowMaps: { on: true, tier: 10 }, sixSockets: { on: true }, hideFlasks: { on: true } })
    const lp = lootPresets(p, true)
    expect(lp.cheapCurrency.on).toBe(false)
    expect(lp.lowMaps.on).toBe(false)
    expect(lp.sixSockets.on).toBe(true)
    expect(lp.hideFlasks.on).toBe(true)
    expect(lp.hideRgb.on).toBe(true)
    expect(lootPresets(p, false)).toBe(p)
    const doc = parseFilter(SEMI)
    const blocks = presetBlocks(doc, lp, null, null, { breakdown: null, build: null })
    doc.blocks.unshift(...blocks)
    levellingOnly(doc)
    const six = doc.blocks.find(b => b.type === PRESET_TYPE && b.tier === 'sixsockets')!
    expect(six.conditions.some(x => x.key === 'AreaLevel' && x.op === '<' && x.values[0] === '68')).toBe(true)
  })
  it('carries the old preset settings over the first time', async () => {
    const { migrateLootPresets } = await import('@/web/woke/loot-filter/loot-presets')
    const { normalizePresets } = await import('@/web/woke/loot-filter/presets')
    const { recipeStep } = await import('@/web/woke/loot-filter/currency-weights')
    const p = normalizePresets({ cheapCurrency: { on: true, chaos: 2 }, lowMaps: { on: true, tier: 12 } })
    p.currency.on = true
    migrateLootPresets(p)
    expect(p.currency.line).toBe(2)
    expect(p.currency.mapFrom).toBe(12)
    expect(recipeStep(p.currency, 'rgb')).toBe(1)
    expect(recipeStep(p.currency, 'six')).toBe(0)
    p.currency.line = 0.5
    migrateLootPresets(p)
    expect(p.currency.line).toBe(0.5)
  })
  it('keeps a line and maps tier you set, and carries over before the Loot tab opens', async () => {
    const { migratedPresets } = await import('@/web/woke/loot-filter/loot-presets')
    const { normalizePresets } = await import('@/web/woke/loot-filter/presets')
    const { recipeStep } = await import('@/web/woke/loot-filter/currency-weights')
    const p = normalizePresets({ cheapCurrency: { on: true, chaos: 2 }, lowMaps: { on: true, tier: 12 }, hideRgb: { on: true } })
    p.currency.on = true
    p.currency.line = 0.7
    p.currency.mapFrom = 5
    const m = migratedPresets(p)
    expect(m.currency.line).toBe(0.7)
    expect(m.currency.mapFrom).toBe(5)
    expect(recipeStep(m.currency, 'rgb')).toBe(0)
    expect('rcmig' in p.currency.catMode).toBe(false)
    expect(migratedPresets(m)).toBe(m)
  })
})

describe('Alt+F on the Loot tab\'s own rows', () => {
  it('finds the Foulborn, special-roll and blighted rows by the rule that caught the item', async () => {
    const { itemFor, lootFocus } = await import('@/web/woke/loot-filter/loot-focus')
    const cond = (key: string, op: string, values: string[]) => ({ key, op, count: null, values })
    const items = [
      { name: 'Simple Robe', cat: 'uniqbody' },
      { name: 'Foulborn Simple Robe', bt: 'Simple Robe', cat: 'uniqfoul', conds: [cond('Foulborn', '', ['True'])] },
      { name: 'Simple Robe, 6-link', bt: 'Simple Robe', cat: 'uniqspec', conds: [cond('LinkedSockets', '>=', ['6'])] },
      { name: 'Blighted Map (Tier 14)', bt: 'Map (Tier 14)', cat: 'mapblight', conds: [cond('BlightedMap', '', ['True'])] }
    ]
    const bt = cond('BaseType', '==', ['Simple Robe'])
    expect(itemFor(items, 'Simple Robe', [bt])?.cat).toBe('uniqbody')
    expect(itemFor(items, 'Simple Robe', [bt, cond('Foulborn', '==', ['True'])])?.cat).toBe('uniqfoul')
    expect(itemFor(items, 'Simple Robe', [bt, cond('LinkedSockets', '>=', ['6'])])?.cat).toBe('uniqspec')
    expect(itemFor(items, 'Map (Tier 14)', [cond('BlightedMap', '', ['True'])])?.cat).toBe('mapblight')
    expect(itemFor(items, 'Map (Tier 14)', [])).toBe(null)
    expect(lootFocus('recipes')?.cls).toBe('recipes')
  })
})

describe('a name the game does not know never reaches the filter', () => {
  it('drops unknown BaseType names from woke rules, and comments out a rule left empty', async () => {
    const { dropUnknownBases } = await import('@/web/woke/loot-filter/compose')
    const doc = parseFilter(SEMI)
    const cond = (values: string[]) => ({ key: 'BaseType', op: '==', count: null, values })
    const mk = (values: string[]) => ({ ...doc.blocks[0], type: 'woke->currency', tier: 's1', disabled: false, conditions: [cond(values)] })
    const a = mk(['Vaal Absolution (Absolution of Inspiring)', 'Arc'])
    const b = mk(['Vaal Absolution (Absolution of Inspiring)'])
    doc.blocks.unshift(a, b)
    expect(dropUnknownBases(doc)).toBe(2)
    expect(a.conditions[0].values).toEqual(['Arc'])
    expect(b.disabled).toBe(true)
    expect(doc.blocks.find(x => x.type === 'currency' && !x.disabled)?.conditions.find(c => c.key === 'BaseType')?.values.length).toBeGreaterThan(0)
  })
})
