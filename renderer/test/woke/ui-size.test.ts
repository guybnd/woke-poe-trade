// UI size: stored values read back safely and steps stay on the grid.
import { beforeAll, describe, expect, it, vi } from 'vitest'

describe('ui size', () => {
  let mod: typeof import('@/web/woke/ui/ui-size')

  beforeAll(async () => {
    await import('vue')
    vi.stubGlobal('localStorage', { getItem: () => null, setItem () {} })
    mod = await import('@/web/woke/ui/ui-size')
  })

  it('defaults to 100 and clamps what is stored', () => {
    expect(mod.parseUiSize(null)).toBe(100)
    expect(mod.parseUiSize('junk')).toBe(100)
    expect(mod.parseUiSize('120')).toBe(120)
    expect(mod.parseUiSize('9999')).toBe(mod.MAX_UI_SIZE)
    expect(mod.parseUiSize('1')).toBe(mod.MIN_UI_SIZE)
    expect(mod.parseUiSize('112')).toBe(110)
  })

  it('nudges one step and stops at the ends', () => {
    mod.uiSize.value = 100
    mod.nudgeUiSize(1)
    expect(mod.uiSize.value).toBe(105)
    mod.nudgeUiSize(-2)
    expect(mod.uiSize.value).toBe(95)
    mod.uiSize.value = mod.MAX_UI_SIZE
    mod.nudgeUiSize(1)
    expect(mod.uiSize.value).toBe(mod.MAX_UI_SIZE)
  })
})
