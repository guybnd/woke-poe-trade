// Saved lists' shared parts: row keys, removing with Undo, renaming in place.
import { describe, expect, it, vi } from 'vitest'
import { removeEntry, rowKeys } from '@/web/woke/shared/saved-list'

const key = (k: string, mods: { ctrl?: boolean, meta?: boolean, shift?: boolean, alt?: boolean } = {}) =>
  ({ key: k, ctrlKey: !!mods.ctrl, metaKey: !!mods.meta, shiftKey: !!mods.shift, altKey: !!mods.alt, preventDefault: vi.fn() }) as unknown as KeyboardEvent

describe('rowKeys', () => {
  it('Delete removes, Ctrl + C copies, F2 renames', () => {
    const a = { remove: vi.fn(), copy: vi.fn(), rename: vi.fn() }
    const on = rowKeys(a)
    on(key('Delete')); on(key('c', { ctrl: true })); on(key('C', { meta: true })); on(key('F2'))
    expect([a.remove.mock.calls.length, a.copy.mock.calls.length, a.rename.mock.calls.length]).toEqual([1, 2, 1])
  })
  it('passes on keys it has no action for, or with other modifiers', () => {
    const remove = vi.fn()
    const e = key('F2')
    rowKeys({ remove })(e)
    expect(e.preventDefault).not.toHaveBeenCalled()
    rowKeys({ copy: remove })(key('c', { ctrl: true, shift: true }))
    rowKeys({ remove })(key('Delete', { alt: true }))
    expect(remove).not.toHaveBeenCalled()
  })
})

describe('removeEntry', () => {
  const list = [{ id: 1, n: 'a' }, { id: 2, n: 'b' }, { id: 3, n: 'c' }]
  it('takes one out, and Undo puts just it back where it was', () => {
    const out = removeEntry(list, 2)!
    expect(out.list.map(e => e.id)).toEqual([1, 3])
    // An edit made since stays.
    const edited = [{ id: 1, n: 'A' }, { id: 3, n: 'c' }]
    expect(out.restore(edited, () => 9)).toEqual([{ id: 1, n: 'A' }, { id: 2, n: 'b' }, { id: 3, n: 'c' }])
  })
  it('comes back under a new id when one added since took its id, and at the end if the list shrank', () => {
    const out = removeEntry(list, 3)!
    expect(out.restore([{ id: 3, n: 'new' }], () => 9)).toEqual([{ id: 3, n: 'new' }, { id: 9, n: 'c' }])
  })
  it('is null for an entry not in the list', () => {
    expect(removeEntry(list, 7)).toBeNull()
  })
})
