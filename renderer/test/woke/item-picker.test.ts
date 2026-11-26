// The keys of the shared item picker (WItemPicker.vue).
import { describe, expect, it } from 'vitest'
import { pickerKey } from '@/web/woke/ui/item-picker'

describe('pickerKey', () => {
  it('moves the highlight with the arrows, wrapping round', () => {
    expect(pickerKey('ArrowDown', 0, 3)).toEqual({ kind: 'move', hl: 1 })
    expect(pickerKey('ArrowDown', 2, 3)).toEqual({ kind: 'move', hl: 0 })
    expect(pickerKey('ArrowUp', 0, 3)).toEqual({ kind: 'move', hl: 2 })
  })

  it('picks the highlighted row on Enter, kept inside a shorter list', () => {
    expect(pickerKey('Enter', 1, 3)).toEqual({ kind: 'pick', hl: 1 })
    expect(pickerKey('Enter', 5, 2)).toEqual({ kind: 'pick', hl: 1 })
  })

  it('closes on Esc while the list is open, and lets an empty box pass it on', () => {
    expect(pickerKey('Escape', 0, 2)).toEqual({ kind: 'close' })
    expect(pickerKey('Escape', 0, 0)).toBeNull()
  })

  it('empties a box with nothing matching on Esc, as the plain field does', () => {
    expect(pickerKey('Escape', 0, 0, true)).toEqual({ kind: 'close' })
  })

  it('leaves every other key, and an empty list, to the field', () => {
    expect(pickerKey('a', 0, 3)).toBeNull()
    expect(pickerKey('Enter', 0, 0)).toBeNull()
    expect(pickerKey('ArrowDown', 0, 0)).toBeNull()
  })
})
