// main/src/shortcuts/pick-actions.ts: a clash on one key costs one action, not both.
import { describe, it, expect } from 'vitest'
import { pickActions } from '../../main/src/shortcuts/pick-actions'

const a = (shortcut: string, type: string, id = type) => ({ shortcut, action: { type }, id })

describe('pickActions', () => {
  it('keeps everything without a clash', () => {
    const list = [a('F1', 'copy-item'), a('F2', 'stash-search')]
    expect(pickActions(list, () => {})).toEqual(list)
  })

  it('the first action on a key stays, and the clash is reported', () => {
    const dropped: string[] = []
    const picked = pickActions([a('F1', 'copy-item', 'first'), a('F1', 'stash-search', 'second')], k => dropped.push(k))
    expect(picked.map(p => p.id)).toEqual(['first'])
    expect(dropped).toEqual(['F1'])
  })

  it('opening the overlay always wins its key', () => {
    const picked = pickActions([a('F1', 'copy-item'), a('F1', 'toggle-overlay')], () => {})
    expect(picked.map(p => p.action.type)).toEqual(['toggle-overlay'])
  })

  it('a test-only entry never takes a real action\'s key', () => {
    const picked = pickActions([a('F1', 'test-only'), a('F1', 'copy-item')], () => {})
    expect(picked.map(p => p.action.type)).toEqual(['copy-item'])
  })

  it('sees one key however its modifiers are ordered', () => {
    const dropped: string[] = []
    const picked = pickActions([a('Alt + Shift + F', 'copy-item', 'first'), a('Shift + Alt + F', 'stash-search', 'second')], k => dropped.push(k))
    expect(picked.map(p => p.id)).toEqual(['first'])
    expect(dropped).toEqual(['Shift + Alt + F'])
  })
})
