// The tab picker's state: where it starts, templates and sets, your own
// ticks, and the search and type filter.
import { describe, it, expect } from 'vitest'
import { choiceOf, shownTabs, startingPick, ticksFor, typeLabel } from '@/web/woke/net-worth/tab-picker'
import type { TabList } from '@/web/woke/net-worth/tab-picker'
import { tabSetOf } from '@/web/woke/net-worth/valuation'

const tab = (i: number, name: string, type: string) => ({ id: `t${i}`, index: i, name, type, colour: null })
const LIST: TabList = {
  league: 'Standard',
  tabs: [tab(1, 'Currency', 'CurrencyStash'), tab(2, '$ sell', 'PremiumStash'), tab(3, 'Dump', 'QuadStash'), tab(4, 'Cards', 'DivinationCardStash')],
  fits: { reasonable: ['t1', 't2', 't4'], currency: ['t1'], league: ['t1', 't2', 't3', 't4'] },
  choice: null,
  sets: [{ name: 'Dumps', ids: ['t3', 'gone'] }]
}

describe('tab picker', () => {
  it('starts on Reasonable when nothing was chosen yet', () => {
    const s = startingPick(LIST)
    expect(s.picked).toEqual({ kind: 'template', template: 'reasonable' })
    expect([...s.ticked]).toEqual(['t1', 't2', 't4'])
  })

  it('starts on what was chosen: a template, a set, or ticks', () => {
    expect(startingPick({ ...LIST, choice: { template: 'currency', ids: [] } }).picked).toEqual({ kind: 'template', template: 'currency' })
    const set = startingPick({ ...LIST, choice: { template: 'custom', ids: ['t3', 'gone'], set: 'Dumps' } })
    expect(set.picked).toEqual({ kind: 'set', name: 'Dumps' })
    expect([...set.ticked]).toEqual(['t3'])
    expect(startingPick({ ...LIST, choice: { template: 'custom', ids: ['t2'] } }).picked).toEqual({ kind: 'custom' })
  })

  it('a template is saved as the template, so new tabs that fit join', () => {
    const picked = { kind: 'template' as const, template: 'reasonable' as const }
    expect(choiceOf(picked, ticksFor(LIST, picked, new Set()), LIST.tabs)).toEqual({ template: 'reasonable', ids: [] })
  })

  it('ticks and sets are saved as exactly those tabs, in tab order', () => {
    expect(choiceOf({ kind: 'custom' }, new Set(['t4', 't1']), LIST.tabs)).toEqual({ template: 'custom', ids: ['t1', 't4'] })
    const set = { kind: 'set' as const, name: 'Dumps' }
    expect(choiceOf(set, ticksFor(LIST, set, new Set()), LIST.tabs)).toEqual({ template: 'custom', ids: ['t3'], set: 'Dumps' })
  })

  it('finds tabs by name and type', () => {
    const ticked = new Set(['t3'])
    expect(shownTabs(LIST.tabs, 'du', 'all', ticked).map(t => t.name)).toEqual(['Dump'])
    expect(shownTabs(LIST.tabs, '', 'special', ticked).map(t => t.name)).toEqual(['Currency', 'Cards'])
    expect(shownTabs(LIST.tabs, '', 'plain', ticked).map(t => t.name)).toEqual(['$ sell', 'Dump'])
    expect(shownTabs(LIST.tabs, '', 'ticked', ticked).map(t => t.name)).toEqual(['Dump'])
  })

  it('names tab types plainly', () => {
    expect(typeLabel('DivinationCardStash')).toBe('Divination Card')
    expect(typeLabel('QuadStash')).toBe('Quad')
  })

  it('a different set of tabs is not the same baseline, whatever the order', () => {
    expect(tabSetOf([{ id: 'b' }, { id: 'a' }])).toBe(tabSetOf([{ id: 'a' }, { id: 'b' }]))
    expect(tabSetOf([{ id: 'a' }])).not.toBe(tabSetOf([{ id: 'a' }, { id: 'b' }]))
  })
})
