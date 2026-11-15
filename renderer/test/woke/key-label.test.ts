import { describe, expect, it } from 'vitest'
import { hotkeyParts, hotkeyText, keyLabel } from '@/web/woke/ui/key-label'

describe('key labels', () => {
  it('prints brackets as the keys people press', () => {
    expect(hotkeyText('Alt + BracketLeft')).toBe('Alt+[')
    expect(hotkeyText('Alt + BracketRight')).toBe('Alt+]')
    expect(hotkeyParts('Ctrl + Shift + Slash')).toEqual(['Ctrl', 'Shift', '/'])
  })

  it('leaves letters, F keys and empty values alone', () => {
    expect(hotkeyText('Alt + Shift + F')).toBe('Alt+Shift+F')
    expect(keyLabel('F5')).toBe('F5')
    expect(hotkeyText(null)).toBe('')
    expect(hotkeyParts('')).toEqual([])
  })
})
