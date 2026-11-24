import { describe, expect, it, vi } from 'vitest'
import { lineKeys, lineMenu, COUNT_AGAIN, LEAVE_OUT } from '@/web/woke/ui/line-item'
import type { MenuEntry } from '@/web/woke/ui/layer'

const labels = (m: MenuEntry[]) => m.map(e => 'label' in e ? e.label : '—')
const all = { edit: () => {}, reset: () => {}, out: () => {}, remove: () => {} }

describe('the shared profit line item menu', () => {
  it('has the same lines in the same order', () => {
    expect(labels(lineMenu({ edited: true, removable: true }, all))).toEqual(['Edit how many and the price', 'Back to as read', LEAVE_OUT, 'Remove'])
  })
  it('offers only Count it again and Remove on a left-out line', () => {
    expect(labels(lineMenu({ out: true, edited: true, removable: true }, all))).toEqual([COUNT_AGAIN, 'Remove'])
  })
  it('leaves out what a line cannot do', () => {
    expect(labels(lineMenu({ editable: false, canLeaveOut: false, removable: true }, all))).toEqual(['Remove'])
    expect(labels(lineMenu({}, { edit: all.edit }))).toEqual(['Edit how many and the price'])
  })
  it('takes each list\'s own words', () => {
    expect(labels(lineMenu({ edited: true }, all, { edit: 'Change my price…', reset: "Back to poe.ninja's price" })).slice(0, 2)).toEqual(['Change my price…', "Back to poe.ninja's price"])
  })
  it('Leave out and Count it again call out with the new state', () => {
    const out = vi.fn()
    const m = lineMenu({}, { out })
    ;(m[0] as { action: () => void }).action()
    expect(out).toHaveBeenCalledWith(true)
    ;(lineMenu({ out: true }, { out })[0] as { action: () => void }).action()
    expect(out).toHaveBeenLastCalledWith(false)
  })
})

describe('a focused line\'s keys', () => {
  const key = (k: string, onRow = true) => {
    const row = {}
    return { key: k, target: onRow ? row : {}, currentTarget: row, preventDefault: vi.fn() } as unknown as KeyboardEvent
  }
  it('Enter edits and Delete leaves out, only on the row itself', () => {
    const edit = vi.fn()
    const out = vi.fn()
    lineKeys(key('Enter'), {}, { edit, out })
    lineKeys(key('Delete'), { out: true }, { edit, out })
    lineKeys(key('Enter', false), {}, { edit, out })
    expect(edit).toHaveBeenCalledTimes(1)
    expect(out).toHaveBeenCalledWith(false)
  })
  it('does not edit a left-out line', () => {
    const edit = vi.fn()
    lineKeys(key('Enter'), { out: true }, { edit })
    expect(edit).not.toHaveBeenCalled()
  })
})
