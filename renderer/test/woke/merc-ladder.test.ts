import { beforeEach, describe, expect, it } from 'vitest'
import { FilterTag, type FilterGroup, type StatFilter, type FilterOrGroup } from '@/web/price-check/filters/interfaces'
import { skillLadders, rankSupports, saveWorth, loadWorth, worthKey, adds, measureStats, narrowness } from '@/web/woke/merc/ladder'

function support (ref: string, tier: number, maxTier = false, extra: Partial<StatFilter> = {}): StatFilter {
  return { tradeId: [`mercenary.support_${ref}`], statRef: ref, text: ref, tag: FilterTag.MercenarySupport, mercenary: { tier, maxTier }, sources: [], disabled: true, ...extra }
}

function warrant (): FilterOrGroup[] {
  const group: FilterGroup = {
    group: 'mercenary',
    expanded: false,
    meta: { tradeId: ['mercenary.skill_1'], statRef: 'Shield Crush', text: 'Shield Crush', tag: FilterTag.MercenaryPrimary, sources: [], disabled: true },
    stats: [
      { tradeId: ['item.mercenary_6link'], statRef: '6-Link', text: '6-Link', tag: FilterTag.Property, sources: [], disabled: true },
      support('Faster Attacks', 2),
      support('Greater Fortify', 3, true),
      support('Pulverise', 2),
      support('Leech', 1, false, { not: true })
    ]
  }
  return [group]
}

beforeEach(() => localStorage.clear())

describe('mercenary support ladder', () => {
  it('lists the supports a warrant has, not the "not linked" rows or the 6-link row', () => {
    const [l] = skillLadders(warrant())
    expect(l.skillRef).toBe('Shield Crush')
    expect(l.supports.map(s => s.statRef)).toEqual(['Faster Attacks', 'Greater Fortify', 'Pulverise'])
  })

  it('ranks measured worth first, then top tier', () => {
    const [l] = skillLadders(warrant())
    expect(rankSupports(l.supports, () => undefined).map(s => s.statRef))
      .toEqual(['Greater Fortify', 'Faster Attacks', 'Pulverise'])
    saveWorth([[worthKey('L', 'Shield Crush', 'Pulverise'), { with: 40, base: 10, count: 9, at: Date.now() }]])
    expect(rankSupports(l.supports, r => loadWorth('L', 'Shield Crush', r.statRef)).map(s => s.statRef))
      .toEqual(['Pulverise', 'Greater Fortify', 'Faster Attacks'])
  })

  it('remembers per league, forgets old answers, and never reports a negative worth', () => {
    const now = Date.now()
    saveWorth([[worthKey('L', 'S', 'A'), { with: 5, base: 10, count: 3, at: now }]])
    expect(adds(loadWorth('L', 'S', 'A', now))).toBe(0)
    expect(loadWorth('Other', 'S', 'A', now)).toBeUndefined()
    expect(loadWorth('L', 'S', 'A', now + 4 * 24 * 3600 * 1000)).toBeUndefined()
    expect(adds({ with: null, base: 10, count: 0, at: now })).toBeNull()
  })

  it('measures one skill with only one support ticked, leaving the original untouched', () => {
    const stats = warrant()
    ;(stats[0] as FilterGroup).stats[1].disabled = false
    const s = measureStats(stats, 'Shield Crush', 'Pulverise') as FilterGroup[]
    const g = s[0]
    expect(g.meta.disabled).toBe(false)
    expect(g.stats.filter(x => !x.disabled).map(x => x.statRef)).toEqual(['Pulverise'])
    expect((stats[0] as FilterGroup).stats[1].disabled).toBe(false)
    expect(g.stats.find(x => x.statRef === 'Pulverise')!.option).toEqual({ value: 1 })
    const bare = measureStats(stats, 'Shield Crush', null) as FilterGroup[]
    expect(bare[0].stats.filter(x => !x.disabled && !x.not).length).toBe(0)
  })

  it('measures the same search whatever else the player ticked', () => {
    const stats = warrant()
    const g = stats[0] as FilterGroup
    g.stats[4].disabled = false // a "not linked" row
    g.stats[0].disabled = false // 6-link
    const other: FilterGroup = { ...JSON.parse(JSON.stringify(g)), meta: { ...g.meta, statRef: 'Dash', disabled: false } }
    other.stats[1].disabled = false
    const notGroup: FilterGroup = { group: 'not', expanded: false, meta: { ...g.meta, statRef: 'not', disabled: false }, stats: [{ ...g.meta, statRef: 'Prismplate', disabled: false }] }
    const s = measureStats([g, other, notGroup], 'Shield Crush', 'Pulverise') as FilterGroup[]
    expect(s[0].stats.filter(x => !x.disabled).map(x => x.statRef)).toEqual(['Pulverise'])
    expect(s[1].meta.disabled).toBe(true)
    expect(s[1].stats.every(x => x.disabled)).toBe(true)
    expect(s[2].meta.disabled).toBe(true)
    expect(s[2].stats.every(x => x.disabled)).toBe(true)
  })

  it('calls a thin market narrow', () => {
    expect(narrowness(0)).toBe('empty')
    expect(narrowness(2)).toBe('narrow')
    expect(narrowness(12)).toBe('ok')
  })
})
