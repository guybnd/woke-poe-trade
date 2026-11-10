// Saved trade searches: folders in the rail, views and sorting.
import { describe, expect, it } from 'vitest'
import { deleteFolder, ensureFolder, folderNames, inView, moveFolder, pinnedFirst, renameFolder, sortEntries, UNCATEGORIZED } from '@/web/woke/trade-searches/widget'
import type { TradeSearchEntry, TradeSearchesWidget } from '@/web/woke/trade-searches/widget'

const DAY = 86_400_000
const NOW = 100 * DAY

function entry (id: number, name: string, category: string, extra: Partial<TradeSearchEntry> = {}): TradeSearchEntry {
  return { id, name, url: `https://www.pathofexile.com/trade/search/Standard/${id}`, category, tags: [], notes: '', hotkeyOverlay: null, hotkeyExternal: null, ...extra }
}

function widget (entries: TradeSearchEntry[], extra: Partial<TradeSearchesWidget> = {}): TradeSearchesWidget {
  return { entries, ...extra } as unknown as TradeSearchesWidget
}

describe('folders', () => {
  it('lists the user order first, then other categories by name, with Uncategorized for blanks', () => {
    const w = widget([entry(1, 'a', 'Gems'), entry(2, 'b', ''), entry(3, 'c', 'Boots')], { folders: [{ name: 'Maps' }, { name: 'Gems' }] })
    expect(folderNames(w)).toEqual(['Maps', 'Gems', 'Boots', UNCATEGORIZED])
  })

  it('renames a folder, its searches, the picked view and the save box folder', () => {
    const w = widget([entry(1, 'a', 'Boots'), entry(2, 'b', 'Gems')], { folders: [{ name: 'Boots', icon: 'item:Divine Orb' }], view: 'folder:Boots', lastFolder: 'Boots' })
    renameFolder(w, 'Boots', 'Boots to flip')
    expect(w.entries[0].category).toBe('Boots to flip')
    expect(w.entries[1].category).toBe('Gems')
    expect(w.folders).toEqual([{ name: 'Boots to flip', icon: 'item:Divine Orb' }])
    expect(w.view).toBe('folder:Boots to flip')
    expect(w.lastFolder).toBe('Boots to flip')
  })

  it('merges into a folder of the same name', () => {
    const w = widget([entry(1, 'a', 'A'), entry(2, 'b', 'B')], { folders: [{ name: 'A', icon: 'item:Chaos Orb' }, { name: 'B' }] })
    renameFolder(w, 'A', 'B')
    expect(w.entries.map(e => e.category)).toEqual(['B', 'B'])
    expect(w.folders).toEqual([{ name: 'B', icon: 'item:Chaos Orb' }])
  })

  it('deletes a folder into Uncategorized', () => {
    const w = widget([entry(1, 'a', 'A')], { folders: [{ name: 'A' }], view: 'folder:A' })
    deleteFolder(w, 'A')
    expect(w.entries[0].category).toBe('')
    expect(w.folders).toEqual([])
    expect(w.view).toBe('all')
  })

  it('keeps an empty folder once listed, and moves folders', () => {
    const w = widget([entry(1, 'a', 'Gems')])
    ensureFolder(w, 'Maps')
    expect(folderNames(w)).toEqual(['Gems', 'Maps'])
    moveFolder(w, 'Maps', -1)
    expect(folderNames(w)).toEqual(['Maps', 'Gems'])
    moveFolder(w, 'Maps', -1)
    expect(folderNames(w)).toEqual(['Maps', 'Gems'])
  })
})

describe('Uncategorized', () => {
  it('is never stored, so it leaves the rail once empty', () => {
    const w = widget([entry(1, 'a', ''), entry(2, 'b', 'Gems')])
    ensureFolder(w, 'Gems').icon = 'item:Chaos Orb'
    expect(w.folders!.map(f => f.name)).toEqual(['Gems'])
    w.entries[0].category = 'Gems'
    expect(folderNames(w)).toEqual(['Gems'])
  })
})

describe('views and sort', () => {
  const list = [
    entry(1, 'Old', 'Gems', { lastOpened: NOW - 10 * DAY, openCount: 9 }),
    entry(2, 'Recent', 'Boots', { lastOpened: NOW - DAY, openCount: 2, pinned: true }),
    entry(3, 'Never', '', { url: 'https://www.pathofexile.com/trade/search/Standard/x/live' })
  ]

  it('filters by view', () => {
    const ids = (view: string) => list.filter(e => inView(e, view, NOW)).map(e => e.id)
    expect(ids('all')).toEqual([1, 2, 3])
    expect(ids('pinned')).toEqual([2])
    expect(ids('recent')).toEqual([2])
    expect(ids('live')).toEqual([3])
    expect(ids('folder:Gems')).toEqual([1])
    expect(ids(`folder:${UNCATEGORIZED}`)).toEqual([3])
  })

  it('sorts, pinned first', () => {
    expect(sortEntries(list, 'opened').map(e => e.id)).toEqual([2, 1, 3])
    expect(sortEntries(list, 'count').map(e => e.id)).toEqual([1, 2, 3])
    expect(sortEntries(list, 'name').map(e => e.name)).toEqual(['Never', 'Old', 'Recent'])
    expect(sortEntries(list, 'added').map(e => e.id)).toEqual([3, 2, 1])
    expect(pinnedFirst(sortEntries(list, 'name')).map(e => e.id)).toEqual([2, 3, 1])
  })
})
