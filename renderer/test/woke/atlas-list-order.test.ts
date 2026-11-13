import { describe, expect, it } from 'vitest'
import { emptyStrategy, folderTree } from '@/web/woke/atlas/strategies'
import type { AtlasStrategy } from '@/web/woke/atlas/strategies'
import { folderDrop, folderOrderOf, moveStrategies, nudgeFolder, placeFolder, sortFolderByName } from '@/web/woke/atlas/list-order'

function strat (id: number, name: string, folder = ''): AtlasStrategy {
  return { ...emptyStrategy([]), id, name, folder }
}

const list = () => [
  strat(1, 'Start Shell'),
  strat(2, 'New strategy'),
  strat(3, 'Starter', '3.30'),
  strat(4, 'Breach', 'Juicing'),
  strat(5, 'Ritual', 'Juicing')
]
const names = (l: AtlasStrategy[]) => l.map(s => s.name)

describe('moving strategies', () => {
  it('drops before or after a row, taking its folder', () => {
    const res = moveStrategies(list(), [1], { kind: 'strategy', id: 5, where: 'before' })!
    expect(res.folder).toBe('Juicing')
    expect(names(res.list)).toEqual(['New strategy', 'Starter', 'Breach', 'Start Shell', 'Ritual'])
    const after = moveStrategies(list(), [1], { kind: 'strategy', id: 5, where: 'after' })!
    expect(names(after.list).at(-1)).toBe('Start Shell')
  })

  it('drops into a folder last, at its start, or before it into the parent', () => {
    expect(names(moveStrategies(list(), [1], { kind: 'folder', path: '3.30', where: 'into' })!.list))
      .toEqual(['New strategy', 'Starter', 'Start Shell', 'Breach', 'Ritual'])
    expect(names(moveStrategies(list(), [1], { kind: 'folder', path: 'Juicing', where: 'start' })!.list))
      .toEqual(['New strategy', 'Starter', 'Start Shell', 'Breach', 'Ritual'])
    const out = moveStrategies(list(), [4], { kind: 'folder', path: 'Juicing', where: 'before' })!
    expect(out.folder).toBe('')
    expect(names(out.list)).toEqual(['Start Shell', 'New strategy', 'Breach', 'Starter', 'Ritual'])
  })

  it('an empty folder takes them at the end', () => {
    const res = moveStrategies(list(), [2], { kind: 'folder', path: 'Empty', where: 'into' })!
    expect(res.folder).toBe('Empty')
    expect(names(res.list).at(-1)).toBe('New strategy')
  })

  it('moves several, keeping their order', () => {
    const res = moveStrategies(list(), [5, 1], { kind: 'top' })!
    expect(res.folder).toBe('')
    expect(names(res.list)).toEqual(['New strategy', 'Start Shell', 'Ritual', 'Starter', 'Breach'])
  })

  it('dropped on one of its own rows: no jump', () => {
    const res = moveStrategies(list(), [1, 2], { kind: 'strategy', id: 2, where: 'after' })!
    expect(names(res.list)).toEqual(names(list()))
  })
})

describe('folder order', () => {
  const s = [strat(1, 'a', 'B'), strat(2, 'b', 'A/X'), strat(3, 'c', 'C')]

  it('follows folderOrder, unlisted ones after by name', () => {
    const root = folderTree(s, [], ['C'])
    expect(root.children.map(c => c.path)).toEqual(['C', 'A', 'B'])
    expect(folderOrderOf(s, [], ['C'])).toEqual(['C', 'A', 'A/X', 'B'])
  })

  it('places a folder before another, or last among siblings', () => {
    const order = ['A', 'A/X', 'B', 'C']
    expect(placeFolder(order, 'C', 'A')).toEqual(['C', 'A', 'A/X', 'B'])
    expect(placeFolder(order, 'A', null)).toEqual(['B', 'C', 'A', 'A/X'])
    expect(placeFolder(['A', 'A/X', 'A/Y', 'B'], 'A/X', null)).toEqual(['A', 'A/Y', 'A/X', 'B'])
    expect(placeFolder(['A', 'B'], 'A/New', null)).toEqual(['A', 'A/New', 'B'])
  })

  it('nudges among siblings only', () => {
    const order = ['A', 'A/X', 'B', 'C']
    expect(nudgeFolder(order, 'B', -1)).toEqual(['B', 'A', 'A/X', 'C'])
    expect(nudgeFolder(order, 'A', 1)).toEqual(['B', 'A', 'A/X', 'C'])
    expect(nudgeFolder(order, 'C', 1)).toBeNull()
    expect(nudgeFolder(order, 'A/X', -1)).toBeNull()
  })

  it('works out where a dragged folder goes', () => {
    const existing = ['A', 'A/X', 'B', 'C']
    expect(folderDrop('C', { kind: 'folder', path: 'A', where: 'before' }, s, existing)).toEqual({ to: 'C', before: 'A' })
    expect(folderDrop('C', { kind: 'folder', path: 'A', where: 'into' }, s, existing)).toEqual({ to: 'A/C', before: null })
    expect(folderDrop('A/X', { kind: 'top' }, s, existing)).toEqual({ to: 'X', before: null })
    expect(folderDrop('A', { kind: 'folder', path: 'A/X', where: 'into' }, s, existing)).toMatch(/inside itself/)
    expect(folderDrop('A/X', { kind: 'top' }, s, [...existing, 'X'])).toMatch(/already/)
    expect(folderDrop('C', { kind: 'strategy', id: 2, where: 'after' }, s, existing)).toEqual({ to: 'A/X/C', before: null })
  })
})

describe('A to Z', () => {
  it('sorts one folder and the folders right inside it', () => {
    const l = [strat(1, 'z', 'F'), strat(2, 'top'), strat(3, 'b', 'F'), strat(4, 'a', 'F')]
    const res = sortFolderByName(l, ['F', 'F/Zed', 'F/Ant', 'G'], 'F')
    expect(names(res.list)).toEqual(['a', 'top', 'b', 'z'])
    expect(res.order).toEqual(['F', 'F/Ant', 'F/Zed', 'G'])
  })
})
