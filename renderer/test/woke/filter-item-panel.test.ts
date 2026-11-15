// The one-item panel's plain words: verdict, price ladder, special rules.
import { describe, it, expect } from 'vitest'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import { moveTargets } from '@/web/woke/loot-filter/edits'
import { levelStates, hideFromLabel, isPlainTier, ladderLabel, levelOf, priceLadder, specialLabel, tierNeeds, verdictOf } from '@/web/woke/loot-filter/item-panel'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { neverSink } from '../helpers/neversink'

describe('filter item panel', () => {
  const soft = parseFilter(neverSink('0-SOFT'))
  const facts = { name: 'Some Unique', baseType: 'Shagreen Boots', rarity: 'Unique', itemClass: 'Boots', itemLevel: 80, areaLevel: 80, mirrored: false, fractured: false, quality: 0, corrupted: false, identified: true, socketGroups: ['RGB', 'B'], influences: [], explicitModNames: [] } as ItemFacts

  it('reads the strictness of the file', () => {
    expect(levelOf(soft)).toBe(0)
    expect(levelOf(parseFilter(neverSink('4-VERY-STRICT')))).toBe(4)
  })

  it('says a cheap unique shows now and when NeverSink hides it', () => {
    const m = matchItem(soft, facts)
    expect(m.final?.block.type).toBe('uniques')
    const v = verdictOf(m, 0)
    expect(v.shown).toBe(true)
    expect(v.source).toBe('neversink')
    expect(m.final?.block.tier).toBe('hideable')
    expect(v.hideFrom).toBe('Strict')
  })

  it('splits unique tiers into a price ladder and special rules', () => {
    const tiers = moveTargets(soft, 'uniques')
    const plain = tiers.filter(t => isPlainTier(soft, 'uniques', t))
    expect(plain).toContain('t1')
    expect(plain).not.toContain('ex6link')
    const ladder = priceLadder('uniques', plain)
    expect(ladder?.[0]).toBe('t1')
    expect(ladder?.at(-1)).toBe('hideable')
    expect(ladder?.map((_, i) => ladderLabel(i, ladder.length))).toEqual(['Top', 'High', 'Mid', 'Low'])
    expect(tierNeeds(soft, 'uniques', 'ex6link')).toBe('6-linked')
    expect(specialLabel('ex6link')).toBe('6-linked')
    expect(specialLabel('exnewthing')).toBe('Newthing')
  })

  it('drops a hide level already reached', () => {
    const b = soft.blocks.find(b => /%H3/.test(b.comment))!
    expect(hideFromLabel(b, 0)).toBe('Strict')
    expect(hideFromLabel(b, 3)).toBeNull()
  })

  it('works out each strictness level from the tags', () => {
    const strict = parseFilter(neverSink('3-STRICT'))
    const at = (doc: typeof soft, tier: string) => doc.blocks.find(b => b.type === 'uniques' && b.tier === tier)!
    const fromSoft = levelStates(at(soft, 'hideable'), 0)
    expect(fromSoft).toEqual(['shows', 'shows', 'shows', 'hidden', 'hidden', 'hidden', 'hidden'])
    expect(levelStates(at(strict, 'hideable'), 3)).toEqual(fromSoft)
    expect(levelStates(at(strict, '6s'), 3)).toEqual(levelStates(at(soft, '6s'), 0))
    expect(levelStates(at(soft, '6s'), 0).slice(3)).toEqual(['off', 'off', 'off', 'off'])
  })

  it('long ladders count tiers', () => {
    expect(ladderLabel(5, 9)).toBe('Tier 6')
  })
})
