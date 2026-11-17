import { KeyToCode, RESERVED_SHORTCUTS, hotkeyToString } from '@ipc/KeyToCode'
import { reservedKeyNote } from '@/web/woke/ui/hotkey-context'
import { describe, it, expect } from 'vitest'
import { pressedKeys, sortKeys, hotkeyMainKey, isHotkeyTail, isModifierCode } from '@/web/woke/loot-filter/hotkey-match'

const press = (code: string, mods: { altKey?: boolean, ctrlKey?: boolean, shiftKey?: boolean } = {}) =>
  pressedKeys({ code, altKey: false, ctrlKey: false, shiftKey: false, ...mods })

describe('hotkey match', () => {
  it('matches the same keys', () => {
    expect(press('KeyF', { altKey: true })).toBe(sortKeys('Alt + F'))
  })

  it('ignores modifier order', () => {
    expect(press('KeyF', { altKey: true, shiftKey: true })).toBe(sortKeys('Shift + Alt + F'))
  })

  it('does not match with an extra modifier', () => {
    expect(press('KeyF', { altKey: true, shiftKey: true })).not.toBe(sortKeys('Alt + F'))
  })

  it('reads digits', () => {
    expect(press('Digit1', { ctrlKey: true })).toBe(sortKeys('Ctrl + 1'))
  })
})

const ev = (code: string, mods: { altKey?: boolean, ctrlKey?: boolean, shiftKey?: boolean } = {}) =>
  ({ code, altKey: false, ctrlKey: false, shiftKey: false, ...mods })

describe('hotkey pressed again with its modifier still held', () => {
  it('finds the key a hotkey ends on', () => {
    expect(hotkeyMainKey('Ctrl + Space')).toBe('Space')
    expect(hotkeyMainKey('Shift + Alt + F')).toBe('F')
    expect(hotkeyMainKey('F2')).toBeNull()
  })
  it('bare Space is the tail of Ctrl + Space', () => {
    expect(isHotkeyTail(ev('Space'), 'Ctrl + Space')).toBe(true)
  })
  it('another key or an extra modifier is not', () => {
    expect(isHotkeyTail(ev('KeyA'), 'Ctrl + Space')).toBe(false)
    expect(isHotkeyTail(ev('Space', { shiftKey: true }), 'Ctrl + Space')).toBe(false)
  })
  it('a letter or digit hotkey has no tail, so typing it stays typing', () => {
    expect(isHotkeyTail(ev('KeyP'), 'Alt + P')).toBe(false)
    expect(isHotkeyTail(ev('Digit1'), 'Ctrl + 1')).toBe(false)
  })
  it('a hotkey without a modifier has no tail', () => {
    expect(isHotkeyTail(ev('F2'), 'F2')).toBe(false)
  })
  it('knows modifier keys', () => {
    expect(isModifierCode('ControlLeft')).toBe(true)
    expect(isModifierCode('ShiftRight')).toBe(true)
    expect(isModifierCode('Space')).toBe(false)
  })
})

describe('keys the game reserves', () => {
  it.each(RESERVED_SHORTCUTS)('%s is spelled the way the hotkey cell records it', (key) => {
    const parts = key.split(' + ')
    const last = parts[parts.length - 1]
    expect(KeyToCode).toHaveProperty(last)
    expect(hotkeyToString([last], parts.includes('Ctrl'))).toBe(key)
  })
  it('warns on the whole key, hold key included', () => {
    expect(reservedKeyNote('Ctrl + F')).toContain("won't work")
    expect(reservedKeyNote('F')).toBeNull()
    expect(reservedKeyNote('Ctrl + Home')).toBeNull()
  })
})
