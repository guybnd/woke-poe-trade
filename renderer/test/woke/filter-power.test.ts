// Loot filter phase 4: own rules from the rule builder, presets, and the
// share code.
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { FIXTURES } from '../helpers/game-data'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import type { FilterDoc } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { insertBuildBlocks } from '@/web/woke/loot-filter/build-rules'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { RULE_TYPE, newCondition, ruleBlocks, ruleProblem, ruleSummary } from '@/web/woke/loot-filter/rules'
import type { OwnRule } from '@/web/woke/loot-filter/rules'
import { applyPresetChanges, cheapCurrencyBases, defaultPresets, normalizePresets, presetBlocks } from '@/web/woke/loot-filter/presets'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { decodeChanges, describeShared, encodeChanges } from '@/web/woke/loot-filter/share'
import { everyDrop } from '@/web/woke/loot-filter/drops'

const SOURCE = fs.readFileSync(path.join(FIXTURES, 'filters/neversink-sample.filter'), 'utf8')

function item (f: Partial<ItemFacts>): ItemFacts {
  return { name: f.baseType ?? 'x', influences: [], explicitModNames: [], areaLevel: 83, ...f }
}

const rareRings: OwnRule = {
  id: 1,
  name: 'Good rings',
  on: true,
  conditions: [
    { key: 'Class', op: '==', count: null, values: ['Rings'] },
    { key: 'Rarity', op: '==', count: null, values: ['Rare'] },
    { key: 'ItemLevel', op: '>=', count: null, values: ['84'] }
  ],
  visibility: 'Show',
  patch: { fontSize: 44, effect: { color: 'Purple', temp: false } }
}

function withBlocks (blocks: ReturnType<typeof ruleBlocks>): FilterDoc {
  const doc = parseFilter(SOURCE)
  insertBuildBlocks(doc, blocks)
  return doc
}

describe('own rules', () => {
  it('go on top and win for the items they catch', () => {
    const doc = withBlocks(ruleBlocks([rareRings]))
    const ring = matchItem(doc, item({ itemClass: 'Rings', baseType: 'Two-Stone Ring', rarity: 'Rare', itemLevel: 86 }))
    expect(ring.final?.block.type).toBe(RULE_TYPE)
    expect(ring.actions).toContainEqual({ key: 'PlayEffect', args: ['Purple'] })
    // Below the item level: NeverSink's own rule as before.
    const low = matchItem(doc, item({ itemClass: 'Rings', baseType: 'Two-Stone Ring', rarity: 'Rare', itemLevel: 80 }))
    expect(low.final?.block.type).toBe('rings')
    const text = serializeFilter(doc)
    expect(text).toContain('Class == "Rings"')
    expect(text).toContain('ItemLevel >= 84')
    expect(validateFilter(doc)).toEqual([])
  })

  it('the builder\'s test set shows what a rule catches', () => {
    const doc = withBlocks(ruleBlocks([{ ...rareRings, conditions: rareRings.conditions.slice(0, 2) }]))
    const hits = everyDrop(83).filter(d => matchItem(doc, d.facts).final?.block.type === RULE_TYPE)
    expect(hits.map(d => d.facts.baseType).sort()).toEqual(['Iron Ring', 'Two-Stone Ring', 'Vermillion Ring'])
    for (const d of hits) expect(d.facts.rarity).toBe('Rare')
  })

  it('a hide rule hides without sound', () => {
    const doc = withBlocks(ruleBlocks([{ ...rareRings, visibility: 'Hide' }]))
    const m = matchItem(doc, item({ itemClass: 'Rings', baseType: 'Iron Ring', rarity: 'Rare', itemLevel: 86 }))
    expect(m.visibility).toBe('Hide')
    expect(m.final?.block.actions).toEqual([{ key: 'DisableDropSound', args: ['True'] }])
  })

  it('is left out while it would break the filter or catch everything', () => {
    expect(ruleProblem({ ...rareRings, conditions: [] })).toMatch(/every item/)
    expect(ruleProblem({ ...rareRings, conditions: [newCondition('BaseType')] })).toMatch(/empty/)
    expect(ruleProblem({ ...rareRings, conditions: [{ key: 'ItemLevel', op: '>=', count: null, values: ['200'] }] })).toMatch(/1 to 100/)
    expect(ruleProblem({ ...rareRings, conditions: [{ key: 'BaseType', op: '==', count: null, values: ['Ring"\nShow'] }] })).toBeTruthy()
    expect(ruleProblem({ ...rareRings, conditions: [{ key: 'SetFontSize', op: '', count: null, values: ['1'] }] })).toBeTruthy()
    expect(ruleBlocks([{ ...rareRings, conditions: [] }, { ...rareRings, on: false }])).toEqual([])
    expect(ruleSummary(rareRings)).toBe('Item class: Rings · Rare · Item level >= 84')
  })
})

describe('presets', () => {
  const prices: Record<string, number> = { 'Portal Scroll': 0.05, 'Scroll of Wisdom': 0.03, 'Chaos Orb': 1, 'Orb of Alchemy': 0.4, 'Divine Orb': 200 }
  const lookup: PriceLookup = (_g, base) => prices[base] != null ? { chaos: prices[base], thin: false } : null

  it('hides cheap currency once you are in maps', () => {
    const doc = parseFilter(SOURCE)
    expect(cheapCurrencyBases(doc, lookup, 1)).toEqual(['Orb of Alchemy', 'Portal Scroll', 'Scroll of Wisdom'])
    const p = { ...defaultPresets(), cheapCurrency: { on: true, chaos: 1 } }
    insertBuildBlocks(doc, presetBlocks(doc, p, lookup))
    const alch = (area: number) => matchItem(doc, item({ itemClass: 'Stackable Currency', baseType: 'Orb of Alchemy', areaLevel: area })).visibility
    expect(alch(83)).toBe('Hide')
    expect(alch(45)).toBe('Show')
    expect(matchItem(doc, item({ itemClass: 'Stackable Currency', baseType: 'Chaos Orb' })).visibility).toBe('Show')
    expect(validateFilter(doc)).toEqual([])
  })

  it('chaos recipe shows unidentified ilvl 60-74 rares for the slots still wanted', () => {
    const doc = parseFilter(SOURCE)
    const p = { ...defaultPresets(), chaosRecipe: { on: true, slots: ['ring', 'boots'] } }
    insertBuildBlocks(doc, presetBlocks(doc, p, null))
    const ring = (ilvl: number, identified = false) => matchItem(doc, item({ itemClass: 'Rings', baseType: 'Iron Ring', rarity: 'Rare', itemLevel: ilvl, identified }))
    expect(ring(65).final?.block.tier).toBe('recipering')
    expect(ring(80).final?.block.tier).not.toBe('recipering')
    expect(ring(65, true).final?.block.tier).not.toBe('recipering')
    expect(matchItem(doc, item({ itemClass: 'Helmets', baseType: 'Iron Hat', rarity: 'Rare', itemLevel: 65, identified: false })).final?.block.tier).not.toBe('recipehelmet')
    expect(validateFilter(doc)).toEqual([])
  })

  it('quiet mode, bigger labels and colour-blind colours adjust NeverSink only', () => {
    const doc = parseFilter(SOURCE)
    insertBuildBlocks(doc, ruleBlocks([{ ...rareRings, patch: { fontSize: 20, effect: { color: 'Red', temp: false } } }]))
    const p = normalizePresets({ quiet: { on: true, keepTiers: 0 }, bigger: { on: true, size: 42 }, colourBlind: { on: true } })
    // keepTiers is at least 2: tiers 1 and 2 both wear the red beam.
    expect(p.quiet.keepTiers).toBe(2)
    const changed = applyPresetChanges(doc, p)
    expect(changed).toBeGreaterThan(0)
    const t1 = doc.blocks.find(b => b.tier === 't1exalted')!
    expect(t1.actions).toContainEqual({ key: 'PlayAlertSound', args: ['6', '300'] })
    expect(t1.actions).toContainEqual({ key: 'PlayEffect', args: ['Orange'] })
    expect(t1.actions).toContainEqual({ key: 'MinimapIcon', args: ['0', 'Orange', 'Star'] })
    const t3 = doc.blocks.find(b => b.tier === 't3chaos')!
    expect(t3.actions).toContainEqual({ key: 'SetFontSize', args: ['42'] })
    // Hidden rules keep their size.
    expect(doc.blocks.find(b => b.tier === 't9scrolls')!.actions).toContainEqual({ key: 'SetFontSize', args: ['18'] })
    // Your own rule is untouched.
    const own = doc.blocks.find(b => b.type === RULE_TYPE)!
    expect(own.actions).toContainEqual({ key: 'SetFontSize', args: ['20'] })
    expect(own.actions).toContainEqual({ key: 'PlayEffect', args: ['Red'] })
  })

  it('6-sockets for the vendor', () => {
    const doc = parseFilter(SOURCE)
    insertBuildBlocks(doc, presetBlocks(doc, { ...defaultPresets(), sixSockets: { on: true } }, null))
    const m = matchItem(doc, item({ itemClass: 'Body Armours', baseType: 'Plate Vest', rarity: 'Normal', socketGroups: ['RGB', 'RGB'] }))
    expect(m.final?.block.tier).toBe('sixsockets')
  })
})

describe('share code', () => {
  it('round-trips changes, rules and presets', async () => {
    const changes = {
      edits: [{ id: 5, kind: 'move' as const, type: 'currency', base: 'Chaos Orb', from: 't3chaos', to: 't2divine' }],
      rules: [rareRings],
      presets: { ...defaultPresets(), quiet: { on: true, keepTiers: 2 } },
      locks: ['currency|Chaos Orb']
    }
    const code = await encodeChanges(changes)
    expect(code.startsWith('WOKEF1.')).toBe(true)
    const back = await decodeChanges(`  ${code}\n`)
    expect(back).toEqual(changes)
    expect(describeShared(back)).toBe('1 change, 1 own rule, 1 preset, 1 locked price tier')
  })

  it('refuses codes that are not ours or would write stray lines', async () => {
    await expect(decodeChanges('hello')).rejects.toThrow(/isn't a loot filter changes code/)
    await expect(decodeChanges('WOKEF1.@@@')).rejects.toThrow()
    const bad = await encodeChanges({
      edits: [{ id: 1, kind: 'style', type: 'currency', tier: 't1', patch: { sound: { id: 'x.mp3" 300\nShow', volume: 300 } } }],
      rules: [{ ...rareRings, conditions: [{ key: 'BaseType', op: '==', count: null, values: ['A"\nHide'] }] }],
      presets: defaultPresets(),
      locks: []
    })
    const back = await decodeChanges(bad)
    expect(back.edits).toEqual([])
    expect(back.rules).toEqual([])
  })
})
