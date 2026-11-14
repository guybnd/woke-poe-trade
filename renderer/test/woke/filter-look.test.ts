// The look strip: text size, background and colour strength for every rule,
// written last over the whole filter (look.ts, compose.ts).
import { describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import type { FilterDoc } from '@/web/woke/loot-filter/parse'
import { LOOK_RULE_TYPE, applyLook, colourStrength, normalizeLook, ownActions, scaledFont } from '@/web/woke/loot-filter/look'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { defaultPresets } from '@/web/woke/loot-filter/presets'
import { SAFETY_RULE_TYPE } from '@/web/woke/loot-filter/safety'
import { FILTERS, compose, dropLook, presets } from '../helpers/filter-guard'

const regular = FILTERS.find(f => f.name === '1-REGULAR')!.text
const look = (patch: Partial<{ size: number, background: number, colour: number }>) => ({ on: true, size: 100, background: 100, colour: 100, ...patch })
const block = (doc: FilterDoc, tier: string) => doc.blocks.find(b => b.tier === tier)!
const arg = (doc: FilterDoc, tier: string, key: string) => block(doc, tier).actions.find(a => a.key === key)?.args

const TEXT = [
  'Show # $type->currency $tier->t1',
  '\tBaseType == "Divine Orb"',
  '\tSetFontSize 45',
  '\tSetTextColor 255 0 0 255',
  '\tSetBackgroundColor 255 255 255 255',
  '\tSetBorderColor 255 0 0',
  '\tPlayAlertSound 1 300',
  '\tPlayEffect Red',
  '',
  'Show # $type->gems $tier->vaalbg',
  '\tClass == "Skill Gems"',
  '\tSetBackgroundColor 55 0 0 255',
  '\tContinue',
  '',
  'Show # $type->currency $tier->t5',
  '\tBaseType == "Orb of Alteration"',
  '\tSetFontSize 32',
  '\tSetTextColor 190 178 135',
  '',
  'Show # $type->gems $tier->plain',
  '\tClass == "Skill Gems"',
  '\tSetTextColor 27 162 155',
  '',
  'Hide # $type->hidelayer $tier->rest',
  '\tSetFontSize 18',
  '',
  '#Show # $type->dust $tier->off',
  '#\tSetFontSize 40',
  ''
].join('\n')

describe('the look pass', () => {
  it('does nothing while off or at 100%', () => {
    const doc = parseFilter(TEXT)
    expect(applyLook(doc, { ...look({ size: 80 }), on: false })).toBe(0)
    expect(applyLook(doc, look({}))).toBe(0)
    expect(serializeFilter(doc)).toBe(TEXT)
  })

  it('scales text size within the game\'s 18 to 45, never below a size already under 18', () => {
    expect(scaledFont(32, 150)).toBe(45)
    expect(scaledFont(32, 50)).toBe(18)
    expect(scaledFont(40, 75)).toBe(30)
    expect(scaledFont(12, 50)).toBe(12)
    const doc = parseFilter(TEXT)
    applyLook(doc, look({ size: 80 }))
    expect(arg(doc, 't1', 'SetFontSize')).toEqual(['36'])
    expect(arg(doc, 't5', 'SetFontSize')).toEqual(['26'])
    expect(arg(doc, 'rest', 'SetFontSize')).toEqual(['18'])
  })

  it('labels with no size or background of their own get the scaled default from one Continue rule on top, so earlier Continue rules still count', () => {
    const doc = parseFilter(TEXT)
    applyLook(doc, look({ size: 50, background: 50 }))
    const top = doc.blocks[0]
    expect(top.type).toBe(LOOK_RULE_TYPE)
    expect(top.continue).toBe(true)
    expect(top.conditions).toEqual([])
    expect(arg(doc, 'defaults', 'SetFontSize')).toEqual(['18'])
    expect(arg(doc, 'defaults', 'SetBackgroundColor')).toEqual(['0', '0', '0', '120'])
    // Nothing is added to the rules themselves: a plain gem keeps the Vaal
    // rule's red background, made see-through.
    expect(arg(doc, 'plain', 'SetBackgroundColor')).toBeUndefined()
    expect(arg(doc, 'vaalbg', 'SetBackgroundColor')).toEqual(['55', '0', '0', '128'])
    const out = serializeFilter(doc)
    expect(out.indexOf('woke->look')).toBeLessThan(out.indexOf('Divine Orb'))
    expect(validateFilter(parseFilter(out)).map(p => p.message)).toEqual([])
  })

  it('makes backgrounds see-through, and leaves text opaque', () => {
    const doc = parseFilter(TEXT)
    applyLook(doc, look({ background: 50 }))
    expect(arg(doc, 't1', 'SetBackgroundColor')).toEqual(['255', '255', '255', '128'])
    expect(arg(doc, 't1', 'SetTextColor')).toEqual(['255', '0', '0', '255'])
  })

  it('mutes and boosts colour by the same share for every rule, keeping alpha', () => {
    expect(colourStrength([255, 0, 0], 0)).toEqual([76, 76, 76])
    expect(colourStrength([120, 120, 120], 150)).toEqual([120, 120, 120])
    const doc = parseFilter(TEXT)
    applyLook(doc, look({ colour: 0 }))
    expect(arg(doc, 't1', 'SetTextColor')).toEqual(['76', '76', '76', '255'])
    // A line without alpha keeps none.
    expect(arg(doc, 't1', 'SetBorderColor')).toEqual(['76', '76', '76'])
  })

  it('leaves visibility, sounds, beams and switched-off rules alone, and keeps each rule\'s own actions', () => {
    const doc = parseFilter(TEXT)
    const own = block(doc, 't1').actions
    const off = block(doc, 'off').actions
    applyLook(doc, look({ size: 60, background: 0, colour: 0 }))
    expect(block(doc, 'rest').visibility).toBe('Hide')
    expect(arg(doc, 't1', 'PlayAlertSound')).toEqual(['1', '300'])
    expect(arg(doc, 't1', 'PlayEffect')).toEqual(['Red'])
    expect(block(doc, 'off').actions).toBe(off)
    expect(block(doc, 'off').dirty).toBe(false)
    expect(ownActions(block(doc, 't1'))).toBe(own)
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
  })

  it('marks only the blocks it changes, and the save check leaves those alone', () => {
    const doc = parseFilter(TEXT)
    applyLook(doc, look({ size: 120 }))
    // 45 can't grow: untouched.
    expect(block(doc, 't1').dirty).toBe(false)
    expect(block(doc, 't5').dirty).toBe(true)
    expect(block(doc, 't5').lookOnly).toBe(true)
  })

  it('keeps a floor where one is given (Bigger labels)', () => {
    const doc = parseFilter(TEXT)
    applyLook(doc, look({ size: 50 }), b => b.visibility !== 'Hide' ? 30 : null)
    expect(arg(doc, 't1', 'SetFontSize')).toEqual(['30'])
    expect(arg(doc, 'rest', 'SetFontSize')).toEqual(['18'])
  })

  it('reads stored settings safely', () => {
    expect(normalizeLook(undefined)).toEqual({ on: false, size: 100, background: 100, colour: 100 })
    expect(normalizeLook({ on: true, size: 999, background: -5, colour: Number.NaN })).toEqual({ on: true, size: 150, background: 0, colour: 100 })
    expect(defaultPresets().look.on).toBe(false)
  })
})

describe('through the save path', () => {
  it('reaches NeverSink, presets and the safety net, and the file reads back the same', () => {
    const s = { name: 'look', presets: presets({ look: look({ size: 80, background: 60, colour: 70 }), bigger: { on: true, size: 30 } }), netOn: true }
    const doc = compose(regular, s).doc
    const out = serializeFilter(doc)
    expect(serializeFilter(parseFilter(out))).toBe(out)
    expect(validateFilter(parseFilter(out)).map(p => p.message)).toEqual([])
    for (const b of doc.blocks.filter(x => x.type === SAFETY_RULE_TYPE)) expect(b.unlooked, b.tier ?? '').toBeDefined()
    // Bigger labels still holds for NeverSink's shown rules.
    const divine = dropLook(doc, { itemClass: 'Stackable Currency', baseType: 'Divine Orb', stackSize: 1 })
    expect(divine.shown && divine.sound && divine.beam).toBe(true)
    expect(divine.font).toBeGreaterThanOrEqual(30)
  })

  it('a rule keeps its own style for the editors, so the strip never compounds', () => {
    const doc = compose(regular, { name: 'a', presets: presets({ look: look({ size: 50 }) }) }).doc
    const t1 = doc.blocks.find(b => b.type === 'currency' && b.tier === 't1exalted' && !b.disabled)!
    expect(ownActions(t1).find(a => a.key === 'SetFontSize')?.args).toEqual(['45'])
    expect(t1.actions.find(a => a.key === 'SetFontSize')?.args).toEqual(['23'])
  })
})
