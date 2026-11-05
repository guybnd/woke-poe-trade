// The search boxes: ranking, grouping, duplicates, the corrupted filter and
// the trade links.
import { describe, it, expect } from 'vitest'
import { baseUniqueName, changeSince, matchRank, passesCorrupted, searchNamed, searchPrices, tradeUrl } from '@/web/woke/search/search'
import { computeMovers } from '@/web/woke/market/analysis'
import { SEARCH_DEFAULT_KEY, initSearchWidget, moveSearchKey } from '@/web/woke/search/widget'
import { isCorrupted } from '@/web/woke/market/types'
import type { PriceItem } from '@/web/woke/market/types'

const item = (name: string, chaos: number, variant = '', type = 'Currency'): PriceItem => ({ type, name, variant, chaos })

describe('matchRank', () => {
  it('puts a name start before a word start before the middle of a word', () => {
    expect(matchRank('Mageblood', 'mage')).toBe(0)
    expect(matchRank('Foulborn Mageblood', 'mage')).toBe(1)
    expect(matchRank('Minion Damage Support', 'mage')).toBe(2)
    expect(matchRank('Chaos Orb', 'mage')).toBe(-1)
  })
  it('ignores case, apostrophes and extra spaces', () => {
    expect(matchRank("Kaom's Heart", 'KAOMS  heart')).toBe(0)
    expect(matchRank("Kaom's Heart", "kaom's")).toBe(0)
  })
  it('needs every word, in any order', () => {
    expect(matchRank('Awakened Enlighten Support', 'enlighten awakened')).toBe(1)
    expect(matchRank('Awakened Enlighten Support', 'enlighten chaos')).toBe(-1)
  })
  it('treats brackets as word breaks', () => {
    expect(matchRank('Vaal Summon Skeletons (Summon Skeletons of Mages)', 'mages')).toBe(1)
  })
  it('matches nothing on an empty query', () => {
    expect(matchRank('Mageblood', '   ')).toBe(-1)
  })
})

describe('searchPrices', () => {
  const unique = 'UniqueAccessory'
  const items = [
    item('Minion Damage Support', 500000, '21/23c', 'SkillGem'),
    item('Mageblood', 9370, '2 Flasks, Heavy Belt', unique),
    item('Mageblood', 1002060, '5 Flasks, Heavy Belt', unique),
    item('Foulborn Mageblood', 1079634, '5 Flasks, Heavy Belt', unique)
  ]

  it('needs two characters', () => {
    expect(searchPrices(items, 'm')).toEqual([])
    expect(searchPrices(items, ' m ')).toEqual([])
  })
  it('ranks better matches first, even when another is dearer', () => {
    expect(searchPrices(items, 'mage').map(g => g.name)).toEqual(['Mageblood', 'Foulborn Mageblood', 'Minion Damage Support'])
  })
  it('groups variants, dearest first, and knows the range', () => {
    const [g] = searchPrices(items, 'mageblood')
    expect(g.variants.map(v => v.chaos)).toEqual([1002060, 9370])
    expect(g.high).toBe(1002060)
    expect(g.low).toBe(9370)
  })
  it('drops the second copy poe.ninja sends for Currency and Fragment', () => {
    const [g] = searchPrices([item('Divine Orb', 407), item('Divine Orb', 407)], 'divine')
    expect(g.variants).toHaveLength(1)
  })
  it('keeps same-named items of different categories apart', () => {
    const groups = searchPrices([item('Same', 1, '', 'Scarab'), item('Same', 2, '', 'Omen')], 'same')
    expect(groups).toHaveLength(2)
  })
  it('stops at the limit', () => {
    const many = Array.from({ length: 40 }, (_, i) => item(`Orb ${i}`, i))
    expect(searchPrices(many, 'orb')).toHaveLength(30)
    expect(searchPrices(many, 'orb', { limit: 3 })).toHaveLength(3)
  })
  it('filters corrupted gems', () => {
    const gems = [item('Empower Support', 900, '4c', 'SkillGem'), item('Empower Support', 700, '4', 'SkillGem')]
    expect(searchPrices(gems, 'empower', { corrupted: 'only' })[0].variants.map(v => v.variant)).toEqual(['4c'])
    expect(searchPrices(gems, 'empower', { corrupted: 'hide' })[0].variants.map(v => v.variant)).toEqual(['4'])
    expect(searchPrices(gems, 'empower')[0].variants).toHaveLength(2)
  })
  it('sets the range from the variants the filter keeps', () => {
    const gems = [item('Empower Support', 900, '4c', 'SkillGem'), item('Empower Support', 700, '4', 'SkillGem')]
    expect(searchPrices(gems, 'empower', { corrupted: 'hide' })[0].high).toBe(700)
  })
})

describe('corrupted', () => {
  it('only counts gem variants ending in c', () => {
    expect(isCorrupted({ type: 'SkillGem', variant: '21/20c' })).toBe(true)
    expect(isCorrupted({ type: 'SkillGem', variant: '5c' })).toBe(true)
    expect(isCorrupted({ type: 'SkillGem', variant: '1/20' })).toBe(false)
    expect(isCorrupted({ type: 'UniqueArmour', variant: 'Silk Robe, Magic' })).toBe(false)
  })
  it('passes everything on any', () => {
    expect(passesCorrupted({ type: 'SkillGem', variant: '20c' }, 'any')).toBe(true)
  })
  it('hides non-gems on only, and keeps them on hide', () => {
    const orb = { type: 'Currency', variant: '' }
    expect(passesCorrupted(orb, 'only')).toBe(false)
    expect(passesCorrupted(orb, 'hide')).toBe(true)
  })
  it('applies to Movers', () => {
    const now = [item('Empower Support', 900, '4c', 'SkillGem'), item('Empower Support', 700, '4', 'SkillGem')]
    const then = now.map(i => ({ ...i, chaos: i.chaos / 2 }))
    const names = (corrupted: 'any' | 'only' | 'hide') =>
      computeMovers(now, then, { minChaos: 0, limit: 10, corrupted }).map(m => m.variant).sort()
    expect(names('any')).toEqual(['4', '4c'])
    expect(names('only')).toEqual(['4c'])
    expect(names('hide')).toEqual(['4'])
  })
})

describe('searchNamed', () => {
  const list = ['Loot filter editor', 'Market', 'Filter bookmarks']
  it('ranks and limits', () => {
    expect(searchNamed(list, 'filter', s => s)).toEqual(['Filter bookmarks', 'Loot filter editor'])
    expect(searchNamed(list, 'filter', s => s, 1)).toEqual(['Filter bookmarks'])
  })
  it('needs two characters', () => {
    expect(searchNamed(list, 'f', s => s)).toEqual([])
  })
})

describe('search hotkey', () => {
  const old = (hotkey: string | null) => ({ ...initSearchWidget(1), hotkey, keyMoved: undefined })

  it('defaults to Ctrl + Space, unless that key is in use', () => {
    expect(initSearchWidget(1).hotkey).toBe('Ctrl + Space')
    expect(SEARCH_DEFAULT_KEY).toBe('Ctrl + Space')
    expect(initSearchWidget(1, ['Ctrl + Space']).hotkey).toBeNull()
  })
  it('moves the old default once', () => {
    const w = old('Alt + P')
    moveSearchKey(w, [])
    expect(w.hotkey).toBe('Ctrl + Space')
    w.hotkey = 'Alt + P' // chosen again later
    moveSearchKey(w, [])
    expect(w.hotkey).toBe('Alt + P')
  })
  it('leaves a key you chose, and a new key that is taken', () => {
    const chosen = old('Ctrl + K')
    moveSearchKey(chosen, [])
    expect(chosen.hotkey).toBe('Ctrl + K')
    const clash = old('Alt + P')
    moveSearchKey(clash, ['Ctrl + Space'])
    expect(clash.hotkey).toBe('Alt + P')
  })
  it('never moves a key on a new window', () => {
    const w = initSearchWidget(1)
    w.hotkey = 'Alt + P'
    moveSearchKey(w, [])
    expect(w.hotkey).toBe('Alt + P')
  })
})

describe('helpers', () => {
  it('changeSince is null with no older price', () => {
    expect(changeSince(150, 100)).toBeCloseTo(0.5)
    expect(changeSince(150, null)).toBeNull()
    expect(changeSince(150, undefined)).toBeNull()
    expect(changeSince(150, 0)).toBeNull()
  })
  it('baseUniqueName drops Foulborn', () => {
    expect(baseUniqueName('Foulborn Mageblood')).toBe('Mageblood')
    expect(baseUniqueName('Mageblood')).toBe('Mageblood')
  })
  it('tradeUrl encodes the league and the query', () => {
    const url = tradeUrl('Hardcore Allflame', { name: "Kaom's Heart", type: 'Glorious Plate' })
    expect(url).toContain('https://www.pathofexile.com/trade/search/Hardcore%20Allflame?q=')
    expect(tradeUrl('L', { type: 'x' }, 'ru.pathofexile.com')).toContain('https://ru.pathofexile.com/')
    const q = JSON.parse(decodeURIComponent(url.split('?q=')[1]))
    expect(q.query).toEqual({ status: { option: 'online' }, name: "Kaom's Heart", type: 'Glorious Plate' })
  })
})
