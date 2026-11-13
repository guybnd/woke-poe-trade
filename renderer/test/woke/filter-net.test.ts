// The safety net against NeverSink's real filters: whatever it promises to show
// has to show when the rules are walked the way the game walks them.
import { describe, it, expect } from 'vitest'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import { ECONOMY_GROUPS, planRetier, priceBreakdown, priceLookup, safetyLookup } from '@/web/woke/loot-filter/economy'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { auditBases, lastLookup, netFromAudit, safetyBases, safetyBlocks, stackNet, valuableFromAudit, withLast, SAFETY_RULE_TYPE } from '@/web/woke/loot-filter/safety'
import { insertBuildBlocks } from '@/web/woke/loot-filter/build-rules'
import { applyEdits } from '@/web/woke/loot-filter/edits'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import type { PriceItem } from '@/web/woke/market/types'
import { LEVELS, neverSink } from '../helpers/neversink'

const everything: PriceLookup = () => ({ chaos: 100, thin: false })
const UNIQUES = ECONOMY_GROUPS.find(g => g.type === 'uniques')!

function uniqueDrop (base: string): ItemFacts {
  return { name: base, baseType: base, rarity: 'Unique', areaLevel: 83, stackSize: 1, itemLevel: 83, quality: 0, identified: false, corrupted: false, replica: false, foulborn: false, mirrored: false, fractured: false, synthesised: false, socketGroups: [], influences: [], explicitModNames: [] }
}

describe('walking the real filters', () => {
  it.each(LEVELS)('%s: with the net on, no valuable plain drop stays hidden', (level) => {
    const doc = parseFilter(neverSink(level))
    const verdicts = auditBases(doc, everything, 20)
    insertBuildBlocks(doc, safetyBlocks(safetyBases(doc, everything, 20)))
    const left = verdicts.filter(v => v.group.unique && matchItem(doc, uniqueDrop(v.base)).visibility === 'Hide')
    expect(left.map(v => v.base)).toEqual([])
  })

  it('Soft hides no uniques, so the net has none to catch', () => {
    expect(safetyBases(parseFilter(neverSink('0-SOFT')), everything, 20).unique).toEqual([])
  })

  it('a Replica or Foulborn rule for a base says nothing about the plain unique', () => {
    const doc = parseFilter(neverSink('4-VERY-STRICT'))
    expect(matchItem(doc, uniqueDrop('Death Bow')).visibility).toBe('Hide')
    expect(auditBases(doc, everything, 20).find(v => v.group.unique && v.base === 'Death Bow')?.state).toBe('hidden')
    insertBuildBlocks(doc, safetyBlocks(safetyBases(doc, everything, 20)))
    expect(matchItem(doc, uniqueDrop('Death Bow')).final?.block.type).toBe(SAFETY_RULE_TYPE)
  })

  it('stays quick on the strictest filter with everything priced', () => {
    const doc = parseFilter(neverSink('6-UBER-PLUS-STRICT'))
    const start = performance.now()
    auditBases(doc, everything, 20)
    expect(performance.now() - start).toBeLessThan(1500)
  })
})

const FILTER = [
  'Show # $type->divination $tier->t1',
  '\tClass == "Divination Cards"',
  '\tBaseType == "The Doctor" "Top Card"',
  '\tSetFontSize 45',
  '',
  'Hide # $type->divination $tier->t5',
  '\tClass == "Divination Cards"',
  '\tBaseType == "Hidden Gem" "Low Card"',
  ''
].join('\n')

describe('who gets the net', () => {
  it('counts a thin market: a junk price costs a click, a miss costs the item', () => {
    const thin: PriceLookup = (_, base) => base === 'Hidden Gem' ? { chaos: 500, thin: true } : null
    expect(safetyBases(parseFilter(FILTER), thin, 20).plain).toEqual(['Hidden Gem'])
  })

  it('leaves what you hid yourself alone', () => {
    const doc = parseFilter(FILTER)
    applyEdits(doc, [{ id: 1, kind: 'item', type: 'divination', tier: 't1', base: 'The Doctor', visibility: 'Hide', patch: {}, pin: true }])
    const v = auditBases(doc, everything, 20).find(x => x.base === 'The Doctor')
    expect(v?.state).toBe('hidden')
    expect(v?.mine).toBe(true)
    expect(safetyBases(doc, everything, 20).plain).not.toContain('The Doctor')
  })

  it('leaves out what you said is not for you', () => {
    const list = safetyBases(parseFilter(FILTER), everything, 20, v => v.base === 'Low Card')
    expect(list.plain).toEqual(['Hidden Gem'])
  })

  it('a rule of yours with no Rarity, for a rare of a base, leaves its unique to the net', () => {
    const doc = parseFilter([
      'Hide # $type->woke->rule $tier->mine',
      '\tClass == "Belts"',
      '\tBaseType == "Leather Belt"',
      '',
      'Show # $type->uniques $tier->t1',
      '\tRarity Unique',
      '\tBaseType == "Leather Belt"',
      ''
    ].join('\n'))
    const v = auditBases(doc, everything, 20).find(x => x.group.unique && x.base === 'Leather Belt')
    expect(v?.state).toBe('hidden')
    expect(v?.mine).toBe(false)
  })

  it('with no prices, judges what was valuable by the filter as it stands now', () => {
    const remembered = valuableFromAudit(auditBases(parseFilter(FILTER), everything, 20))
    expect(remembered.plain).toEqual(['Hidden Gem', 'Low Card', 'The Doctor', 'Top Card'])
    const doc = parseFilter(FILTER)
    // A name this filter lost can't come back: only listed bases are looked at.
    const look = lastLookup({ plain: [...remembered.plain, 'Removed Card'], unique: [] }, 20)
    expect(netFromAudit(auditBases(doc, look, 20)).plain).toEqual(['Hidden Gem', 'Low Card'])
    // A base you hid yourself since stays hidden.
    applyEdits(doc, [{ id: 1, kind: 'item', type: 'divination', tier: 't5', base: 'Low Card', visibility: 'Hide', patch: {}, pin: true }])
    expect(netFromAudit(auditBases(doc, look, 20)).plain).toEqual(['Hidden Gem'])
    expect(lastLookup(undefined, 20)(ECONOMY_GROUPS[0], 'Hidden Gem')).toBeNull()
  })

  it('catches a stack worth the line, from the size that gets there', () => {
    const doc = parseFilter(FILTER)
    const look: PriceLookup = (_, base) => base === 'Low Card' ? { chaos: 5, thin: false } : null
    expect(stackNet(doc, look, 20)).toEqual({ 5: ['Low Card'] })
    insertBuildBlocks(doc, safetyBlocks({ plain: [], unique: [], stacks: { 5: ['Low Card'] } }))
    const card = (stackSize: number) => matchItem(doc, { name: 'Low Card', baseType: 'Low Card', itemClass: 'Divination Cards', stackSize, influences: [] } as unknown as ItemFacts)
    expect(card(1).visibility).toBe('Hide')
    expect(card(5).final?.block.type).toBe(SAFETY_RULE_TYPE)
  })

  it('a stack the filter already shows, or too cheap to matter, gets no rule', () => {
    const doc = parseFilter([
      'Show # $type->divination $tier->stack',
      '\tClass == "Divination Cards"',
      '\tStackSize >= 3',
      '\tBaseType == "Low Card"',
      '',
      FILTER
    ].join('\n'))
    const look: PriceLookup = (_, base) => base === 'Low Card' ? { chaos: 5, thin: false } : base === 'Hidden Gem' ? { chaos: 0.01, thin: false } : null
    expect(stackNet(doc, look, 20)).toEqual({})
  })

  it('a category missing from the feed keeps what was valuable there', () => {
    const doc = parseFilter(FILTER)
    const empty: PriceLookup = () => null
    const last = { plain: ['Hidden Gem'], unique: [] }
    expect(safetyBases(doc, withLast(empty, last, 20, () => false), 20).plain).toEqual(['Hidden Gem'])
    // The category is there and doesn't list it: that's news, it isn't priced.
    expect(safetyBases(doc, withLast(empty, last, 20, t => t === 'DivinationCard'), 20).plain).toEqual([])
  })

  it('looks at items with an exact price but no price tiers', () => {
    const doc = parseFilter([
      'Hide # $type->currency $tier->t9',
      '\tBaseType == "Chaotic Astrolabe"',
      '',
      'Hide # $type->corpses $tier->t2',
      '\tBaseType == "Perfect Fiery Disciple"',
      '',
      // NeverSink 8.21 moved Allflames out of the fragments into a list of their own.
      'Hide # $type->mapenchantments $tier->t4',
      '\tBaseType == "Allflame Ember of Toads"',
      ''
    ].join('\n'))
    const items: PriceItem[] = [
      { type: 'Astrolabe', name: 'Chaotic Astrolabe', variant: '', chaos: 150, gaps: 0 },
      { type: 'Corpse', name: 'Perfect Fiery Disciple', variant: '', chaos: 2000, gaps: 0 },
      { type: 'AllflameEmber', name: 'Allflame Ember of Toads', variant: '', chaos: 300, gaps: 0 }
    ]
    expect(safetyBases(doc, safetyLookup(items, () => []), 20).plain).toEqual(['Allflame Ember of Toads', 'Chaotic Astrolabe', 'Perfect Fiery Disciple'])
  })
})

describe('uniques with variants', () => {
  const line = (variant: string, chaos: number, gaps = 0): PriceItem => ({ type: 'UniqueJewel', name: 'Voices', variant, chaos, gaps })
  const voices = [line('1 passives, Large Cluster Jewel', 500000, 5), line('3 passives, Large Cluster Jewel', 4000), line('5 passives, Large Cluster Jewel', 9), line('7 passives, Large Cluster Jewel', 1)]
  const on = () => ['Voices']

  it('never prices a drop by its cheapest variant', () => {
    expect(priceLookup(voices, on)(UNIQUES, 'Large Cluster Jewel')?.chaos).toBe(4000)
  })

  it('moves tiers by the best real market, and guards by the best of all', () => {
    expect(safetyLookup(voices, on)(UNIQUES, 'Large Cluster Jewel')?.chaos).toBe(500000)
    expect(priceBreakdown(voices, on)(UNIQUES, 'Large Cluster Jewel')[0].chaos).toBe(500000)
  })

  it('reads a unique on several bases by the base in question', () => {
    const items: PriceItem[] = [
      { type: 'UniqueAccessory', name: 'Emblem', variant: 'Topaz Ring', chaos: 50, gaps: 0 },
      { type: 'UniqueAccessory', name: 'Emblem', variant: 'Two-Stone Ring', chaos: 900, gaps: 0 }
    ]
    expect(priceLookup(items, () => ['Emblem'])(UNIQUES, 'Topaz Ring')?.chaos).toBe(50)
  })

  it('ignores link and relic lines, and takes a plain line over any variant', () => {
    const items: PriceItem[] = [
      { type: 'UniqueArmour', name: 'Robe', variant: '6L', chaos: 900, gaps: 0 },
      { type: 'UniqueArmour', name: 'Robe', variant: 'Relic', chaos: 800, gaps: 0 },
      { type: 'UniqueArmour', name: 'Robe', variant: 'Corrupted', chaos: 700, gaps: 0 },
      { type: 'UniqueArmour', name: 'Robe', variant: '', chaos: 5, gaps: 0 }
    ]
    expect(priceLookup(items, () => ['Robe'])(UNIQUES, 'Silk Robe')?.chaos).toBe(5)
  })

  it('no longer plans to hide a chase unique on its cheapest line', () => {
    const doc = parseFilter(neverSink('4-VERY-STRICT'))
    const moves = planRetier(doc, priceLookup(voices, on), { groups: [UNIQUES] }).moves
    expect(moves.find(m => m.base === 'Large Cluster Jewel')?.to).not.toBe('hideable')
  })
})
