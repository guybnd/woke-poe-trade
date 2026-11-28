import { describe, it, expect } from 'vitest'
import { defaultPresets } from '@/web/woke/loot-filter/presets'
import type { Presets } from '@/web/woke/loot-filter/presets'
import { ALL_PARTS, mergeParts, partCounts, partOfKey } from '@/web/woke/loot-filter/share-parts'
import { decodeChanges, encodeChanges } from '@/web/woke/loot-filter/share'

const CATS: Record<string, string> = { 'Divine Orb': 'orbs', 'The Doctor': 'carduniq' }
const catOf = (n: string) => CATS[n]

function mine (): Presets {
  const p = defaultPresets()
  p.currency.on = true
  p.currency.line = 0.5
  p.currency.nudge = { orbs: 1, carduniq: -1 }
  p.currency.rulers = { orbs: [1, 2, 3, 4, 5] }
  p.currency.offBy = { all: [1], cards: [2] }
  p.currency.items = { 'Divine Orb': { step: 4 }, 'The Doctor': { min: 2 }, 'Odd Thing': { price: 3 } }
  p.currency.mapFrom = 11
  p.currency.catMode = { link6: 'off' }
  p.quiet = { on: true, keepTiers: 3 }
  p.gear = { ...p.gear }
  return p
}

describe('share parts', () => {
  it('sorts keys onto their pages', () => {
    expect(partOfKey('orbs')).toBe('currency')
    expect(partOfKey('carduniq')).toBe('cards')
    expect(partOfKey('cards')).toBe('cards')
    expect(partOfKey('gold')).toBe('currency')
    expect(partOfKey('all')).toBe('loot')
    expect(partOfKey('link6')).toBe('gear')
    expect(partOfKey('somethingnew')).toBe('loot')
  })

  it('takes only the Cards page', () => {
    const got = mergeParts(defaultPresets(), mine(), ['cards'], catOf)
    expect(got.currency.nudge).toEqual({ carduniq: -1 })
    expect(got.currency.items).toEqual({ 'The Doctor': { min: 2 } })
    expect(got.currency.offBy).toEqual({ all: [], cards: [2] })
    expect(got.currency.rulers).toEqual({})
    expect(got.currency.line).toBe(defaultPresets().currency.line)
    expect(got.currency.on).toBe(false)
    expect(got.quiet.on).toBe(false)
  })

  it('All loot carries the main ruler and items it cannot place', () => {
    const got = mergeParts(defaultPresets(), mine(), ['loot'], catOf)
    expect(got.currency.on).toBe(true)
    expect(got.currency.line).toBe(0.5)
    expect(got.currency.offBy.all).toEqual([1])
    expect(got.currency.items).toEqual({ 'Odd Thing': { price: 3 } })
    expect(got.currency.mapFrom).toBe(1)
  })

  it('importing a page replaces it and keeps the rest of mine', () => {
    const theirs = defaultPresets()
    theirs.currency.items = { 'Divine Orb': { step: 1 } }
    theirs.currency.nudge = { essences: 2 }
    const got = mergeParts(mine(), theirs, ['currency'], catOf)
    expect(got.currency.items).toEqual({ 'Divine Orb': { step: 1 }, 'The Doctor': { min: 2 }, 'Odd Thing': { price: 3 } })
    expect(got.currency.nudge).toEqual({ essences: 2, carduniq: -1 })
    expect(got.currency.rulers).toEqual({})
    expect(got.currency.line).toBe(0.5)
    expect(got.quiet.on).toBe(true)
  })

  it('all parts is the whole thing', () => {
    expect(mergeParts(defaultPresets(), mine(), ALL_PARTS, catOf)).toEqual(mergeParts(mine(), mine(), [], catOf))
  })

  it('counts what each page has set', () => {
    const n = partCounts(mine(), catOf, 2)
    expect(n.cards).toBe(3)
    expect(n.maps).toBe(1)
    expect(n.presets).toBe(1)
    expect(n.changes).toBe(2)
    expect(n.jewels).toBe(0)
    expect(partCounts(defaultPresets(), catOf).loot).toBe(0)
  })

  it('a code keeps its parts and name, and an old code means all of it', async () => {
    const code = await encodeChanges({ edits: [], rules: [], presets: defaultPresets(), locks: [], parts: ['cards', 'bogus' as never], name: 'Juicer\n"x' })
    const back = await decodeChanges(code)
    expect(back.parts).toEqual(['cards'])
    expect(back.name).toBe('Juicer x')
    const old = await decodeChanges(`WOKEF0.${btoa(JSON.stringify({ v: 1, edits: [], rules: [], locks: [] }))}`)
    expect(old.parts).toBeUndefined()
  })
})
