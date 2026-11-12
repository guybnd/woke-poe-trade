import { describe, it, expect } from 'vitest'
import { ESSENCE_SCAN_TYPE, seedEssenceScanWidget } from '@/web/woke/essence-scan/widget'

describe('seedEssenceScanWidget', () => {
  it('is ready and hidden, with its on/off key', () => {
    const w = seedEssenceScanWidget(4)
    expect(w.wmId).toBe(4)
    expect(w.wmType).toBe(ESSENCE_SCAN_TYPE)
    expect(w.wmWants).toBe('hide')
    expect(w.wmFlags).not.toContain('uninitialized')
    expect(w.hotkey).toBe('Alt + E')
  })

  it('leaves the key unset when something else already uses it', () => {
    expect(seedEssenceScanWidget(1, ['Alt + E']).hotkey).toBeNull()
    expect(seedEssenceScanWidget(1, ['Alt + D']).hotkey).toBe('Alt + E')
  })
})
