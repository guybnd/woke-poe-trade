import { describe, expect, it } from 'vitest'
import type { Widget } from '@/web/overlay/widgets'
import { treeKeyOf } from '@/web/woke/pob-builds/widget'

const pob = (treeHotkey?: string | null, wmId = 1) => ({ wmId, wmType: 'woke-pob-builds', treeHotkey }) as unknown as Widget
const atlas = { wmId: 2, wmType: 'woke-atlas-strategies' } as unknown as Widget

describe('tree key (Alt + T)', () => {
  it('stays for the atlas drawing with PoB builds off', () => {
    expect(treeKeyOf([pob(), atlas], false, true)).toBe('Alt + T')
  })

  it('keeps the key set on the PoB widget with PoB off', () => {
    expect(treeKeyOf([pob('Alt + G'), atlas], false, true)).toBe('Alt + G')
  })

  it('is not registered without a PoB widget, as Settings could not list it', () => {
    expect(treeKeyOf([atlas], true, true)).toBeNull()
  })

  it('takes the first PoB widget\'s key', () => {
    expect(treeKeyOf([pob('Alt + G'), pob('Alt + H', 3)], true, false)).toBe('Alt + G')
  })

  it('is gone with both modules off, or set to none', () => {
    expect(treeKeyOf([pob(), atlas], false, false)).toBeNull()
    expect(treeKeyOf([pob(null)], true, true)).toBeNull()
  })
})
