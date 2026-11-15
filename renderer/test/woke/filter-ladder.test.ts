// The ladder view's layout of a rule group, on NeverSink's real filter.
import { describe, it, expect } from 'vitest'
import { buildLadder, findAxis, markName, markWhen, rangeOf, rangeText, showFrom, showFromChanges } from '@/web/woke/loot-filter/ladder'
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

describe('marks, from review', () => {
  const ladderOf = (text: string) => buildLadder(buildTree(parseFilter(text)).flatMap(s => s.groups).find(g => g.type === 'x')!.tiers)
  const rule = (tier: string, lines: string[]) => [`Show # $type->x $tier->${tier}`, ...lines.map(l => `\t${l}`), ''].join('\n')
  const tiers = rule('t16', ['MapTier 16', 'SetFontSize 45']) + rule('t15', ['MapTier 15', 'SetFontSize 40'])

  it('a != on the order is a sometimes, not an always', () => {
    const l = ladderOf(rule('m', ['MapTier != 16', 'SetBorderColor 255 0 0 255', 'Continue']) + tiers)
    expect(l.rows[0].markLook.border).toBeUndefined()
    expect(l.rows[0].maybeMarks).toHaveLength(1)
    expect(markWhen(l.axis, l.marks[0])).toBe('MapTier != 16')
  })

  it('a gap in == values is a sometimes too', () => {
    const l = ladderOf(rule('m', ['MapTier == 1 16', 'SetBorderColor 255 0 0 255', 'Continue']) + rule('t5', ['MapTier 5']) + rule('t4', ['MapTier 4', 'SetFontSize 30']))
    expect(l.rows[0].markLook.border).toBeUndefined()
  })

  it('the later matching mark paints last, whatever group it is in', () => {
    const red = ['MapTier >= 1', 'SetBorderColor 255 0 0 255', 'Continue']
    const l = ladderOf(rule('a', red) + rule('b', ['MapTier >= 1', 'SetBorderColor 0 0 255 255', 'Continue']) + rule('c', [...red.slice(0, 1), 'Rarity Rare', ...red.slice(1)]) + rule('d', red) + tiers)
    expect(l.rows[0].markLook.border).toEqual([255, 0, 0, 255])
  })
})

describe('show from', () => {
  const ladder = buildLadder(groupOf(LEVELS[LEVELS.length - 1], 'maps').tiers)
  const sf = showFrom(ladder)

  it('lists every tier on its own, folded or not, best first', () => {
    expect(sf.tiers.map(x => x.label).slice(0, 4)).toEqual(['T16+', 'T15', 'T14', 'T13'])
    expect(sf.at).toBe(0)
  })

  it('hides everything below the pick and shows everything above it', () => {
    expect(showFromChanges(sf, 0)).toEqual([])
    const down = showFromChanges(sf, 2)
    expect(down).toEqual([{ tier: 'maps_a_t15', visibility: 'Show' }, { tier: 'maps_a_t14', visibility: 'Show' }])
    expect(showFromChanges(sf, -1)).toEqual([{ tier: 'maps_a_t16', visibility: 'Hide' }])
  })

  it('reads a gap as mixed', () => {
    const t15 = sf.tiers[1].tier
    const mixed = showFrom({ ...ladder, rows: ladder.rows.map(r => ({ ...r, tiers: r.tiers.map(t => t === t15 ? { ...t, visibility: 'Show' as const, blocks: t.blocks.map(b => ({ ...b, visibility: 'Show' as const })) } : t) })) })
    expect(mixed.at).toBe(1)
    const gap = showFrom({ ...ladder, rows: ladder.rows.map(r => ({ ...r, tiers: r.tiers.map(t => t === sf.tiers[2].tier ? { ...t, visibility: 'Show' as const, blocks: t.blocks.map(b => ({ ...b, visibility: 'Show' as const })) } : t) })) })
    expect(gap.at).toBeNull()
  })
})

describe('the top tier stands alone', () => {
  it.each(LEVELS)('%s maps: the best tier is its own row', (level) => {
    const l = buildLadder(groupOf(level, 'maps').tiers)
    expect(l.rows[0].tiers).toHaveLength(1)
  })
})
