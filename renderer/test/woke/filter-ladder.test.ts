// The ladder view's layout of a rule group, on NeverSink's real filter.
import { describe, it, expect } from 'vitest'
import { buildLadder, findAxis, markName, markWhen, rangeOf, rangeText } from '@/web/woke/loot-filter/ladder'
import { buildTree } from '@/web/woke/loot-filter/groups'
import type { GroupNode } from '@/web/woke/loot-filter/groups'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import { LEVELS, neverSink } from '../helpers/neversink'

const groupOf = (level: typeof LEVELS[number], type: string): GroupNode =>
  buildTree(parseFilter(neverSink(level))).flatMap(s => s.groups).find(g => g.type === type)!

describe('maps at Uber Plus Strict', () => {
  const level = LEVELS[LEVELS.length - 1]
  const ladder = buildLadder(groupOf(level, 'maps').tiers)

  it('orders by map tier and folds tiers that look the same', () => {
    expect(ladder.axis).toBe('MapTier')
    expect(ladder.rows.map(r => rangeText(ladder.axis, r.range))).toEqual(['T16+', 'T14–15', 'T11–13', 'T1–10'])
  })

  it('pulls the border-only rules out as marks, one per look', () => {
    expect(ladder.marks.map(m => markName(m.look))).toEqual(['Black border', 'Grey border', 'Red border', 'Gold border'])
    expect(markWhen(ladder.axis, ladder.marks[0])).toBe('T11+')
    expect(markWhen(ladder.axis, ladder.marks[1])).toBe('T1–10')
    expect(markWhen(ladder.axis, ladder.marks[2])).toBe('T14+, depends on AreaLevel')
    expect(markWhen(ladder.axis, ladder.marks[3])).toBe('HasImplicitMod or CorruptedMods >= 1')
  })

  it('paints the always-on marks onto the rows and lists the rest as maybes', () => {
    const t16 = ladder.rows[0]
    expect(t16.markLook.border).toEqual([0, 0, 0, 255])
    expect(t16.maybeMarks.map(m => markName(m.look))).toEqual(['Red border', 'Gold border'])
    expect(ladder.rows[3].markLook.border).toEqual([200, 200, 200, 255])
  })

  it('puts the hidden line under the only shown tier', () => {
    expect(ladder.rows[0].shown).toBe(true)
    expect(ladder.cut).toBe(1)
  })

  it('keeps rules off the tier order as specials', () => {
    expect(ladder.specials.map(t => t.tier)).toEqual(['restex'])
  })
})

describe.each(LEVELS)('%s', (level) => {
  const tree = buildTree(parseFilter(neverSink(level)))
  it('loses no tier in any group', () => {
    for (const g of tree.flatMap(s => s.groups)) {
      const l = buildLadder(g.tiers)
      const seen = [...l.rows.flatMap(r => r.tiers), ...l.marks.flatMap(m => m.tiers), ...l.specials].map(t => t.tier).sort()
      expect(seen, g.type).toEqual(g.tiers.map(t => t.tier).sort())
    }
  })
})

describe('ranges', () => {
  const block = (lines: string[]) => parseFilter(['Show', ...lines.map(l => `\t${l}`)].join('\n')).blocks[0]
  it('reads spans', () => {
    expect(rangeOf(block(['MapTier >= 11', 'MapTier <= 13']), 'MapTier')).toEqual({ lo: 11, hi: 13 })
    expect(rangeOf(block(['MapTier 15']), 'MapTier')).toEqual({ lo: 15, hi: 15 })
    expect(rangeOf(block(['AreaLevel < 83']), 'AreaLevel')).toEqual({ lo: -Infinity, hi: 82 })
    expect(rangeOf(block(['Class == "Maps"']), 'MapTier')).toBeNull()
  })
  it('finds no order where nothing numeric changes', () => {
    const tiers = [{ tier: 'a', blocks: [block(['BaseType == "A"'])], bases: [], visibility: 'Show' as const, disabled: false }]
    expect(findAxis(tiers)).toBeNull()
  })
  it('words spans', () => {
    expect(rangeText('Quality', { lo: 20, hi: Infinity })).toBe('quality 20+')
    expect(rangeText('MapTier', { lo: 1, hi: 5 })).toBe('T1–5')
  })
})
