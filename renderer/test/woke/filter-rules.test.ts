// What the editor adds on top of a filter: rules you make, presets, share
// codes. Everything has to pass the save check, parse back, and do what it says
// when an item is run through the result.
import { describe, it, expect, beforeAll } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import type { FilterDoc } from '@/web/woke/loot-filter/parse'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { matchItem } from '@/web/woke/loot-filter/match'
import { applyEdits, isValidEdit, readStyle } from '@/web/woke/loot-filter/edits'
import type { FilterEdit } from '@/web/woke/loot-filter/edits'
import { CONDITION_KINDS, ITEM_TIERS, newCondition, newRule, ruleBlocks, ruleProblem, RULE_TYPE, tierLit } from '@/web/woke/loot-filter/rules'
import type { OwnRule } from '@/web/woke/loot-filter/rules'
import { PRESET_TYPE, RECIPE_SLOTS, applyPresetChanges, defaultPresets, normalizePresets, presetBlocks } from '@/web/woke/loot-filter/presets'
import type { Presets } from '@/web/woke/loot-filter/presets'
import { insertBuildBlocks } from '@/web/woke/loot-filter/build-rules'
import { decodeChanges, encodeChanges } from '@/web/woke/loot-filter/share'
import { itemFacts } from '@/web/woke/loot-filter/item-facts'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { initLootFilterWidget, normalizeLootFilterWidget } from '@/web/woke/loot-filter/widget'
import type { LootFilterWidget } from '@/web/woke/loot-filter/widget'
import { parseClipboard } from '@/parser'
import { loadGameData } from '../helpers/game-data'
import { LEVELS, neverSink } from '../helpers/neversink'
import { CLASS_ITEMS, STATE_ITEMS } from '../helpers/filter-items'

beforeAll(loadGameData)

function facts (text: string): ItemFacts {
  const res = parseClipboard(text)
  return { ...itemFacts(text, res.isOk() ? res.value : null), areaLevel: 83 }
}

const ring = (over: Partial<ItemFacts> = {}): ItemFacts => ({ name: 'x', itemClass: 'Rings', baseType: 'Gold Ring', rarity: 'Rare', itemLevel: 70, identified: false, areaLevel: 83, influences: [], explicitModNames: [], ...over })

function withRules (doc: FilterDoc, rules: OwnRule[]): FilterDoc {
  insertBuildBlocks(doc, ruleBlocks(rules))
  return doc
}

function rule (over: Partial<OwnRule>): OwnRule {
  return { ...newRule(1, 1), ...over }
}

describe('the rule builder', () => {
  it.each(CONDITION_KINDS.map(k => k.key))('%s writes a line the game reads back', (key) => {
    const c = newCondition(key)
    if (!c.values.length) c.values = ['Gold Ring']
    const r = rule({ conditions: [c] })
    expect(ruleProblem(r)).toBeNull()
    const doc = withRules(parseFilter('Show\n'), [r])
    expect(validateFilter(doc)).toEqual([])
    const back = parseFilter(serializeFilter(doc)).blocks[0]
    expect(back.type).toBe(RULE_TYPE)
    expect(back.conditions).toMatchObject([{ key, op: c.op, values: c.values }])
  })

  it('says what is wrong instead of writing a bad rule', () => {
    expect(ruleProblem(rule({ conditions: [] }))).toMatch(/Add a condition/)
    expect(ruleProblem(rule({ conditions: [{ key: 'Class', op: '==', count: null, values: [] }] }))).toMatch(/empty/)
    expect(ruleProblem(rule({ conditions: [{ key: 'ItemLevel', op: '>=', count: null, values: ['101'] }] }))).toMatch(/whole number/)
    expect(ruleProblem(rule({ conditions: [{ key: 'ItemLevel', op: '>=', count: null, values: ['1.5'] }] }))).toMatch(/whole number/)
    expect(ruleProblem(rule({ conditions: [{ key: 'BaseType', op: '==', count: null, values: ['a"b'] }] }))).toMatch(/can't read/)
    expect(ruleProblem(rule({ conditions: [{ key: 'NotAThing', op: '', count: null, values: ['1'] }] }))).toMatch(/can't read/)
  })

  it('item tier buttons write "this tier and up" and light what a rule covers', () => {
    const lit = (op: string, v: number) => ITEM_TIERS.filter(t => tierLit(op, v, t))
    expect(lit('>=', 4)).toEqual([4, 5])
    expect(lit('>=', 5)).toEqual([5])
    expect(lit('==', 3)).toEqual([3])
    expect(lit('<', 3)).toEqual([1, 2])
    const doc = withRules(parseFilter('Show\n'), [rule({ conditions: [newCondition('Rarity'), newCondition('UnidentifiedItemTier')] })])
    expect(serializeFilter(doc)).toContain('UnidentifiedItemTier >= 4')
    expect(ruleProblem(rule({ conditions: [{ key: 'UnidentifiedItemTier', op: '>=', count: null, values: ['6'] }] }))).toMatch(/1 to 5/)
  })

  it('skips a broken or switched-off rule rather than breaking the file', () => {
    const broken = rule({ conditions: [] })
    const off = rule({ id: 2, on: false, conditions: [newCondition('Rarity')] })
    expect(ruleBlocks([broken, off])).toEqual([])
  })

  it('a rule you made wins over NeverSink at every strictness', () => {
    const made = rule({ conditions: [{ key: 'BaseType', op: '==', count: null, values: ['Chaos Orb'] }], visibility: 'Hide' })
    const f = facts('Item Class: Stackable Currency\nRarity: Currency\nChaos Orb\n--------\nStack Size: 5/20\n')
    for (const level of LEVELS) {
      const m = matchItem(parseFilter(serializeFilter(withRules(parseFilter(neverSink(level)), [made]))), f)
      expect(m.final?.block.type, level).toBe(RULE_TYPE)
      expect(m.visibility).toBe('Hide')
    }
  })

  it('the first of your rules wins, and a name cannot break the file', () => {
    const a = rule({ id: 1, name: 'A\nHide', conditions: [newCondition('Rarity')], visibility: 'Show' })
    const b = rule({ id: 2, conditions: [newCondition('Rarity')], visibility: 'Hide' })
    const out = parseFilter(serializeFilter(withRules(parseFilter('Show\n'), [a, b])))
    expect(out.blocks).toHaveLength(3)
    expect(matchItem(out, ring()).visibility).toBe('Show')
  })
})

describe('presets', () => {
  const all: Presets = {
    cheapCurrency: { on: true, chaos: 5 },
    chaosRecipe: { on: true, slots: RECIPE_SLOTS.map(s => s.key) },
    quiet: { on: true, keepTiers: 2 },
    bigger: { on: true, size: 40 },
    colourBlind: { on: true },
    sixSockets: { on: true },
    dust: { on: true, fromPrices: true, line: 5000 }
  }
  const lookup = () => ({ chaos: 1, thin: false }) as never

  function composed (level: typeof LEVELS[number], p: Presets): FilterDoc {
    const doc = parseFilter(neverSink(level))
    insertBuildBlocks(doc, presetBlocks(doc, p, lookup, ['Iron Hat', "Assassin's Garb"]))
    applyPresetChanges(doc, p)
    return doc
  }

  it.each(LEVELS)('all on at %s pass the save check and parse back', (level) => {
    const doc = composed(level, all)
    expect(validateFilter(doc).map(x => x.message)).toEqual([])
    const out = parseFilter(serializeFilter(doc))
    expect(out.blocks.length).toBe(doc.blocks.length)
    expect(out.blocks.filter(b => b.type === PRESET_TYPE).length).toBeGreaterThan(8)
    expect(parseFilter(serializeFilter(out)).blocks.map(b => b.actions)).toEqual(out.blocks.map(b => b.actions))
  })

  it('chaos recipe shows unidentified rares of the right level, per slot', () => {
    const out = composed('6-UBER-PLUS-STRICT', { ...defaultPresets(), chaosRecipe: { on: true, slots: ['ring'] } })
    expect(matchItem(out, ring()).final?.block.tier).toBe('recipering')
    expect(matchItem(out, ring({ itemLevel: 75 })).final?.block.tier).not.toBe('recipering')
    expect(matchItem(out, ring({ itemLevel: 59 })).final?.block.tier).not.toBe('recipering')
    expect(matchItem(out, ring({ identified: true })).final?.block.tier).not.toBe('recipering')
    expect(matchItem(out, ring({ itemClass: 'Amulets' })).final?.block.tier).not.toBe('recipering')
  })

  it('six sockets show, whatever their rarity short of unique', () => {
    const out = composed('6-UBER-PLUS-STRICT', { ...defaultPresets(), sixSockets: { on: true } })
    const armour = ring({ itemClass: 'Body Armours', baseType: 'Astral Plate', socketGroups: ['RG', 'B', 'R', 'G', 'B'] })
    expect(matchItem(out, armour).final?.block.tier).toBe('sixsockets')
    expect(matchItem(out, { ...armour, socketGroups: ['RGBRG'] }).final?.block.tier).not.toBe('sixsockets')
    expect(matchItem(out, { ...armour, rarity: 'Unique' }).final?.block.tier).not.toBe('sixsockets')
  })

  it('cheap currency hides in maps, never in the campaign', () => {
    const out = composed('1-REGULAR', { ...defaultPresets(), cheapCurrency: { on: true, chaos: 5 } })
    const cheap = out.blocks.find(b => b.tier === 'cheapcurrency')
    expect(cheap).toBeDefined()
    const base = cheap!.conditions.find(c => c.key === 'BaseType')!.values[0]
    const f = { name: 'x', itemClass: 'Stackable Currency', baseType: base, stackSize: 1, influences: [], explicitModNames: [] } as ItemFacts
    expect(matchItem(out, { ...f, areaLevel: 83 }).final?.block.tier).toBe('cheapcurrency')
    expect(matchItem(out, { ...f, areaLevel: 40 }).final?.block.tier).not.toBe('cheapcurrency')
  })

  it('bigger labels reach every shown item, and hidden ones stay small', () => {
    const out = composed('1-REGULAR', { ...defaultPresets(), bigger: { on: true, size: 40 } })
    for (const i of [...CLASS_ITEMS, ...STATE_ITEMS]) {
      const m = matchItem(out, facts(i.text))
      if (m.final && m.visibility !== 'Hide') expect(readStyle(m.final.block.actions).fontSize, i.name).toBeGreaterThanOrEqual(40)
    }
  })

  it('quiet keeps sounds only on the top tiers', () => {
    const out = composed('1-REGULAR', { ...defaultPresets(), quiet: { on: true, keepTiers: 2 } })
    expect(readStyle(out.blocks.find(b => b.type === 'currency' && b.tier === 't1exalted')!.actions).sound).toBeDefined()
    expect(readStyle(out.blocks.find(b => b.type === 'currency' && b.tier === 't4chaos')!.actions).sound).toBeUndefined()
  })

  it('colour-blind mode leaves no red or green beam or icon', () => {
    const out = composed('1-REGULAR', { ...defaultPresets(), colourBlind: { on: true } })
    for (const b of out.blocks) {
      if (b.disabled) continue
      const s = readStyle(b.actions)
      expect(['Red', 'Green', 'Brown', 'Pink']).not.toContain(s.effect?.color)
      expect(['Red', 'Green', 'Brown', 'Pink']).not.toContain(s.icon?.color)
    }
  })

  it('off, they change nothing', () => {
    const source = neverSink('1-REGULAR')
    const doc = parseFilter(source)
    insertBuildBlocks(doc, presetBlocks(doc, defaultPresets(), lookup))
    expect(applyPresetChanges(doc, defaultPresets())).toBe(0)
    expect(serializeFilter(doc)).toBe(source)
  })

  it('a damaged saved setting falls back to the default', () => {
    const p = normalizePresets({ bigger: { on: true, size: 1000 }, quiet: { on: 'yes' as never, keepTiers: NaN }, chaosRecipe: { on: true, slots: ['ring', 'nonsense'] } })
    expect(p.bigger.size).toBe(45)
    expect(p.quiet).toEqual({ on: false, keepTiers: 2 })
    expect(p.chaosRecipe.slots).toEqual(['ring'])
    expect(normalizePresets(undefined)).toEqual(defaultPresets())
  })
})

describe('Minimal', () => {
  it('is refused in a normal filter, which the game would reject', () => {
    const doc = parseFilter('#filterType:Normal\nShow\n\tRarity Rare\n')
    doc.blocks[0].visibility = 'Minimal'
    doc.blocks[0].dirty = true
    expect(doc.ruthless).toBe(false)
    expect(validateFilter(doc)[0].message).toMatch(/Ruthless/)
  })

  it('is fine in a Ruthless filter', () => {
    const doc = parseFilter('#filterType:Ruthless\nShow\n\tRarity Rare\n')
    doc.blocks[0].visibility = 'Minimal'
    doc.blocks[0].dirty = true
    expect(doc.ruthless).toBe(true)
    expect(validateFilter(doc)).toEqual([])
  })

  it('reads Ruthless from a NeverSink-style header', () => {
    expect(parseFilter('# NeverSink\n# TYPE:     1-REGULAR\n# STYLE:    RUTHLESS\nShow\n').ruthless).toBe(true)
  })

  it('a file already using Minimal can still be saved, whatever its header says', () => {
    const doc = parseFilter(`${'# note\n'.repeat(30)}#filterType:Ruthless\nMinimal # $type->a $tier->b\n\tRarity Rare\n`)
    expect(doc.ruthless).toBe(true)
    applyPresetChanges(doc, { ...defaultPresets(), bigger: { on: true, size: 40 } })
    expect(doc.blocks[0].dirty).toBe(true)
    expect(validateFilter(doc)).toEqual([])
  })

  it('a broken line in the source reads as no value, so an edit copied from it survives a restart', () => {
    const look = readStyle(parseFilter('Show\n\tSetFontSize big\n\tSetTextColor x 2 3\n').blocks[0].actions)
    expect(look.fontSize).toBeUndefined()
    expect(look.text).toEqual([0, 2, 3, 255])
    expect(isValidEdit(JSON.parse(JSON.stringify({ id: 1, kind: 'style', type: 'c', tier: 't', patch: look })))).toBe(true)
  })

  it('a Ruthless filter is told apart from NeverSink\'s normal ones', () => {
    for (const level of LEVELS) expect(parseFilter(neverSink(level)).ruthless, level).toBe(false)
  })
})

describe('share codes', () => {
  const changes = {
    edits: [
      { id: 1, kind: 'move', type: 'currency', base: 'Chaos Orb', from: 't4chaos', to: 't1exalted' },
      { id: 2, kind: 'style', type: 'currency', tier: 't1exalted', patch: { fontSize: 40, text: [1, 2, 3, 255], border: null, sound: { id: '1', volume: 100 }, effect: { color: 'Red', temp: true }, icon: null } },
      { id: 3, kind: 'visibility', type: 'currency', tier: 't4chaos', visibility: 'Hide' },
      { id: 4, kind: 'group', type: 'gold', hidden: true },
      { id: 5, kind: 'item', type: 'currency', tier: 't1exalted', base: 'Divine Orb', visibility: 'Show', patch: {}, pin: true }
    ] as FilterEdit[],
    rules: [rule({ conditions: [newCondition('Rarity')] })],
    presets: defaultPresets(),
    locks: ['currency|Chaos Orb']
  }

  it('come back as they went in, and apply', async () => {
    const back = await decodeChanges(await encodeChanges(changes))
    expect(back).toEqual(changes)
    expect(applyEdits(parseFilter(neverSink('1-REGULAR')), back.edits).every(r => r.ok)).toBe(true)
  })

  it('survive line breaks from a chat window', async () => {
    const code = await encodeChanges(changes)
    expect(await decodeChanges(`  ${code.slice(0, 20)}\n${code.slice(20)}\n`)).toEqual(changes)
  })

  it('say what is wrong with a bad code', async () => {
    await expect(decodeChanges('hello')).rejects.toThrow(/isn't a loot filter changes code/)
    await expect(decodeChanges('WOKEF1.@@@')).rejects.toThrow(/isn't a loot filter changes code/)
    await expect(decodeChanges(`WOKEF0.${btoa('not json')}`)).rejects.toThrow(/damaged/)
    await expect(decodeChanges(`WOKEF0.${btoa('{"v":2}')}`)).rejects.toThrow(/newer version/)
  })

  async function coded (edits: unknown[]) {
    return await decodeChanges(`WOKEF0.${btoa(JSON.stringify({ v: 1, edits, rules: [], locks: [] }))}`)
  }

  it('cannot smuggle extra lines into the filter', async () => {
    const back = await coded([{ id: 1, kind: 'item', type: 'c', tier: 't', base: 'X"\nShow', visibility: 'Show', patch: {} }])
    expect(back.edits).toEqual([])
  })

  it.each([
    ['style with no patch', { id: 1, kind: 'style', type: 'c', tier: 't' }],
    ['style with a broken colour', { id: 1, kind: 'style', type: 'c', tier: 't', patch: { text: 'red' } }],
    ['style with a broken sound', { id: 1, kind: 'style', type: 'c', tier: 't', patch: { sound: 3 } }],
    ['item with no base', { id: 1, kind: 'item', type: 'c', tier: 't', visibility: 'Show', patch: {} }],
    ['move with no target', { id: 1, kind: 'move', type: 'c', base: 'X', from: 'a' }],
    ['visibility with a made-up value', { id: 1, kind: 'visibility', type: 'c', tier: 't', visibility: 'Sparkle' }],
    ['unknown kind', { id: 1, kind: 'explode', type: 'c' }]
  ])('drops %s instead of breaking the editor', async (_name, edit) => {
    const back = await coded([edit])
    expect(back.edits).toEqual([])
    expect(() => applyEdits(parseFilter('Show # $type->c $tier->t\n\tBaseType == "X"\n'), back.edits)).not.toThrow()
  })

  it('drops a rule with a broken look', async () => {
    const bad = { ...rule({ conditions: [newCondition('Rarity')] }), patch: { text: 'red' } }
    const back = await decodeChanges(`WOKEF0.${btoa(JSON.stringify({ v: 1, edits: [], rules: [bad], locks: [] }))}`)
    expect(back.rules).toEqual([])
  })

  it('a saved config with a broken edit opens anyway', () => {
    const w = { wmId: 1, wmType: 'woke-loot-filter', wmTitle: '', wmWants: 'hide', wmZorder: null, wmFlags: [] } as unknown as LootFilterWidget
    initLootFilterWidget(w)
    const good = { id: 1, kind: 'visibility', type: 'c', tier: 't', visibility: 'Hide' } as FilterEdit
    w.edits = [good, { id: 2, kind: 'style', type: 'c', tier: 't' } as FilterEdit, null as never]
    normalizeLootFilterWidget(w)
    expect(w.edits).toEqual([good])
    expect(isValidEdit(good)).toBe(true)
  })
})
