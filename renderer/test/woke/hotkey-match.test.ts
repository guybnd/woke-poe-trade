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
