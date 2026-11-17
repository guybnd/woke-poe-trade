// One set of window keys (ui/window-keys): what a key does where.
import { describe, expect, it } from 'vitest'
import { windowKeyAction, windowKeyHelp } from '@/web/woke/ui/window-keys'
import type { WindowKeyActions } from '@/web/woke/ui/window-keys'

const ALL: WindowKeyActions = { undo () {}, redo () {}, save () {}, close () {}, back () {} }
const div = { tagName: 'DIV', isContentEditable: false } as unknown as EventTarget
const input = { tagName: 'INPUT', isContentEditable: false } as unknown as EventTarget
const key = (k: string, mods: { ctrl?: boolean, shift?: boolean, meta?: boolean, alt?: boolean, target?: EventTarget, prevented?: boolean } = {}) => ({
  key: k, ctrlKey: !!mods.ctrl, metaKey: !!mods.meta, shiftKey: !!mods.shift, altKey: !!mods.alt, defaultPrevented: !!mods.prevented, target: mods.target ?? div
})
const inside = { inside: true, shown: true, toast: false }

describe('windowKeyAction', () => {
  it('reads undo, redo (both ways), save and close', () => {
    expect(windowKeyAction(key('z', { ctrl: true }), ALL, inside)).toBe('undo')
    expect(windowKeyAction(key('Z', { meta: true }), ALL, inside)).toBe('undo')
    expect(windowKeyAction(key('y', { ctrl: true }), ALL, inside)).toBe('redo')
    expect(windowKeyAction(key('Z', { ctrl: true, shift: true }), ALL, inside)).toBe('redo')
    expect(windowKeyAction(key('s', { ctrl: true }), ALL, inside)).toBe('save')
    expect(windowKeyAction(key('Escape'), ALL, inside)).toBe('close')
  })

  it('only for a window that has the action, is up, and was not beaten to it', () => {
    expect(windowKeyAction(key('z', { ctrl: true }), {}, inside)).toBeNull()
    expect(windowKeyAction(key('z', { ctrl: true }), ALL, { ...inside, shown: false })).toBeNull()
    expect(windowKeyAction(key('z', { ctrl: true, prevented: true }), ALL, inside)).toBeNull()
    expect(windowKeyAction(key('z', { ctrl: true, alt: true }), ALL, inside)).toBeNull()
  })

  it('undo and redo skip fields and leave Ctrl + Z to an Undo note; save works in a field', () => {
    expect(windowKeyAction(key('z', { ctrl: true, target: input }), ALL, inside)).toBeNull()
    expect(windowKeyAction(key('z', { ctrl: true }), ALL, { ...inside, toast: true })).toBeNull()
    expect(windowKeyAction(key('y', { ctrl: true }), ALL, { ...inside, toast: true })).toBe('redo')
    expect(windowKeyAction(key('s', { ctrl: true, target: input }), ALL, inside)).toBe('save')
  })

  it('from outside: only where the window says so', () => {
    const out = { ...inside, inside: false }
    expect(windowKeyAction(key('z', { ctrl: true }), ALL, out)).toBeNull()
    expect(windowKeyAction(key('z', { ctrl: true }), ALL, out, { undoAnywhere: true })).toBe('undo')
    expect(windowKeyAction(key('s', { ctrl: true }), ALL, out, { undoAnywhere: true })).toBeNull()
    expect(windowKeyAction(key('Escape'), ALL, out)).toBeNull()
    expect(windowKeyAction(key('Escape'), ALL, out, { closeAnywhere: true })).toBe('close')
  })
})

describe('windowKeyHelp', () => {
  it('lists the keys a window has, for its "?"', () => {
    expect(windowKeyHelp({ undo () {}, back () {} })).toEqual([
      { keys: 'Ctrl + Z', label: 'Undo' },
      { keys: 'Mouse back', label: 'Back' }
    ])
  })
})
