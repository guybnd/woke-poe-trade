// Loot filter editor: parsing a NeverSink-style filter, finding the rule
// an item hits, and the edits written back.
import { describe, it, expect, beforeAll } from 'vitest'
import { fixture, loadGameData, parseItem } from '../helpers/game-data'
import fs from 'fs'
import path from 'path'
import { FIXTURES } from '../helpers/game-data'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import { itemFacts } from '@/web/woke/loot-filter/item-facts'
import { addEdit, applyEdits } from '@/web/woke/loot-filter/edits'
import type { FilterEdit } from '@/web/woke/loot-filter/edits'

// Read as bytes: the filter has CRLF line ends like the game's own files.
const SOURCE = fs.readFileSync(path.join(FIXTURES, 'filters/neversink-sample.filter'), 'utf8')

function facts (itemFixture: string) {
  const text = fixture(itemFixture)
  return itemFacts(text, parseItem(text))
}

function ruleFor (doc: ReturnType<typeof parseFilter>, itemFixture: string) {
  const m = matchItem(doc, facts(itemFixture))
  return { tier: m.final ? `${m.final.block.type}/${m.final.block.tier}` : null, visibility: m.visibility, m }
}

beforeAll(loadGameData)

describe('parse', () => {
  it('reads the NeverSink header and tags', () => {
    const doc = parseFilter(SOURCE)
    expect(doc.isNeverSink).toBe(true)
    expect(doc.version).toBe('8.17.3')
    expect(doc.strictness).toBe('1-REGULAR')
    expect(doc.eol).toBe('\r\n')
    expect(doc.blocks.map(b => `${b.type}/${b.tier}`)).toContain('currency/t1exalted')
    expect(doc.blocks.find(b => b.tier === 't3chaos')?.section).toMatch(/Currency/)
  })

  it('writes an untouched filter back byte for byte', () => {
    expect(serializeFilter(parseFilter(SOURCE))).toBe(SOURCE)
  })
})

describe('match', () => {
  it('finds the rule each sample item hits', () => {
    const doc = parseFilter(SOURCE)
    expect(ruleFor(doc, 'items/currency-divine.txt').tier).toBe('currency/t1exalted')
    expect(ruleFor(doc, 'items/rare-ring.txt').tier).toBe('rings/rare')
    expect(ruleFor(doc, 'items/map-rare-t16.txt').tier).toBe('maps/t16')
    expect(ruleFor(doc, 'items/gem-enlighten.txt').tier).toBe('restex/hideall')
    expect(ruleFor(doc, 'items/gem-enlighten.txt').visibility).toBe('Hide')
  })

  it('reads transfigured gems, fractured mods and eldritch implicits', () => {
    const doc = parseFilter([
      'Show # $type->gems->special $tier->altany', '\tTransfiguredGem True', '\tClass == "Skill Gems"', '',
      'Show # $type->rare->exarch $tier->anyhigh', '\tHasSearingExarchImplicit >= 2', '\tRarity Rare', '',
      'Show # $type->rare->eater $tier->any', '\tHasEaterOfWorldsImplicit >= 1', '\tRarity Rare', '',
      'Show # $type->magicid $tier->t1phys', '\tHasExplicitMod >=1 "Merciless"', '',
      'Show # $type->any $tier->rest', ''
    ].join('\n'))
    const gem = facts('items/gem-transfigured.txt')
    expect(gem.transfigured).toBe(true)
    expect(ruleFor(doc, 'items/gem-transfigured.txt').tier).toBe('gems->special/altany')
    expect(facts('items/gem-enlighten.txt').transfigured).toBe(false)
    // Greater exarch (tier 2) and lesser eater (tier 1) implicits.
    const boots = facts('items/rare-eldritch.txt')
    expect([boots.exarchTier, boots.eaterTier, boots.hasImplicitMod]).toEqual([2, 1, true])
    expect(ruleFor(doc, 'items/rare-eldritch.txt').tier).toBe('rare->exarch/anyhigh')
    expect(matchItem(doc, { ...boots, exarchTier: 1 }).final?.block.tier).toBe('any')
    expect(facts('items/rare-ring.txt')).toMatchObject({ exarchTier: 0, eaterTier: 0 })
    // A fractured mod is an explicit mod.
    expect(facts('items/rare-fractured.txt').explicitModNames).toEqual(['Merciless', 'of the Ranger'])
    expect(ruleFor(doc, 'items/rare-fractured.txt').tier).toBe('magicid/t1phys')
  })

  it('applies style from the Continue block it passed through', () => {
    const doc = parseFilter(SOURCE)
    const ring = matchItem(doc, { ...facts('items/rare-ring.txt'), corrupted: true })
    expect(ring.layers.map(l => l.block.tier)).toEqual(['corruptedrare'])
    expect(ring.final?.block.tier).toBe('rare')
  })
})

describe('edits', () => {
  function edited (edits: FilterEdit[]) {
    const doc = parseFilter(SOURCE)
    const status = applyEdits(doc, edits)
    const text = serializeFilter(doc)
    return { status, text, doc: parseFilter(text) }
  }

  it('moving Divine Orb down a tier rewrites both BaseType lines and nothing else', () => {
    const { status, text, doc } = edited([{ id: 1, kind: 'move', type: 'currency', base: 'Divine Orb', from: 't1exalted', to: 't2divine' }])
    expect(status.every(s => s.ok)).toBe(true)
    expect(ruleFor(doc, 'items/currency-divine.txt').tier).toBe('currency/t2divine')
    const changed = text.split('\r\n').filter((l, i) => l !== SOURCE.split('\r\n')[i])
    expect(changed).toEqual(['\tBaseType == "Mirror of Kalandra"', '\tBaseType == "Divine Orb" "Exalted Orb" "Orb of Annulment"'])
    expect(text.includes('\r\n') && !/[^\r]\n/.test(text)).toBe(true)
  })

  it('hiding a tier and restyling one', () => {
    const { doc } = edited([
      { id: 1, kind: 'visibility', type: 'currency', tier: 't3chaos', visibility: 'Hide' },
      { id: 2, kind: 'style', type: 'rings', tier: 'rare', patch: { fontSize: 30, text: [10, 20, 30, 255] } }
    ])
    expect(doc.blocks.find(b => b.tier === 't3chaos')?.visibility).toBe('Hide')
    const ring = doc.blocks.find(b => b.type === 'rings')!
    expect(ring.actions.find(a => a.key === 'SetFontSize')?.args).toEqual(['30'])
    expect(ring.actions.find(a => a.key === 'SetTextColor')?.args).toEqual(['10', '20', '30', '255'])
  })

  it('an own rule for one item goes above its tier and wins', () => {
    const { doc } = edited([{ id: 1, kind: 'item', type: 'currency', tier: 't3chaos', base: 'Chaos Orb', visibility: 'Show', patch: { fontSize: 44 } }])
    const own = doc.blocks.findIndex(b => b.type === 'woke->own')
    expect(own).toBeGreaterThan(-1)
    expect(own).toBeLessThan(doc.blocks.findIndex(b => b.tier === 't3chaos'))
    const chaos = matchItem(doc, { name: 'Chaos Orb', baseType: 'Chaos Orb', itemClass: 'Stackable Currency', stackSize: 1 } as never)
    expect(chaos.final?.block.type).toBe('woke->own')
  })

  it('an edit for a tier the filter no longer has is reported, not applied', () => {
    const { status, text } = edited([{ id: 1, kind: 'visibility', type: 'currency', tier: 't0gone', visibility: 'Hide' }])
    expect(status[0]).toMatchObject({ ok: false })
    expect(text).toBe(SOURCE)
  })

  it('recorded edits fold together; moving back undoes a move', () => {
    let list: FilterEdit[] = []
    list = addEdit(list, { id: 1, kind: 'move', type: 'currency', base: 'Divine Orb', from: 't1exalted', to: 't2divine' })
    list = addEdit(list, { id: 2, kind: 'move', type: 'currency', base: 'Divine Orb', from: 't2divine', to: 't3chaos' })
    expect(list).toEqual([{ id: 1, kind: 'move', type: 'currency', base: 'Divine Orb', from: 't1exalted', to: 't3chaos' }])
    list = addEdit(list, { id: 3, kind: 'move', type: 'currency', base: 'Divine Orb', from: 't3chaos', to: 't1exalted' })
    expect(list).toEqual([])
    list = addEdit(list, { id: 4, kind: 'style', type: 'rings', tier: 'rare', patch: { fontSize: 30 } })
    list = addEdit(list, { id: 5, kind: 'style', type: 'rings', tier: 'rare', patch: { fontSize: 35, text: [1, 2, 3, 255] } })
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id: 4, patch: { fontSize: 35, text: [1, 2, 3, 255] } })
  })
})

describe('a keyword newer than the editor (3.30 launch)', () => {
  const NEW = ['Show # $type->threads $tier->t1', '\tThreadTier >= 2', '\tRarity Rare', '\tSetFontSize 40', ''].join('\n')

  it('loads and writes back unchanged', () => {
    expect(serializeFilter(parseFilter(NEW))).toBe(NEW)
  })

  it("doesn't block saving a restyle of that rule", async () => {
    const { validateFilter } = await import('@/web/woke/loot-filter/validate')
    const doc = parseFilter(NEW)
    for (const b of doc.blocks) b.dirty = true
    expect(validateFilter(doc)).toEqual([])
  })
})
