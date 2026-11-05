import { KeyToCode, RESERVED_SHORTCUTS, hotkeyToString } from '@ipc/KeyToCode'
import { reservedKeyNote } from '@/web/woke/ui/hotkey-context'
import { describe, it, expect } from 'vitest'
import { pressedKeys, sortKeys } from '@/web/woke/loot-filter/hotkey-match'

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
