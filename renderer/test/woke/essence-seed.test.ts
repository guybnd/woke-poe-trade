import { describe, it, expect } from 'vitest'
import { ESSENCE_SCAN_TYPE, addEssenceScanWidget, seedEssenceScanWidget } from '@/web/woke/essence-scan/widget'

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

describe('addEssenceScanWidget', () => {
  it('adds one with the next id, skipping keys other widgets use', () => {
    const config = { widgets: [{ wmId: 3, wmType: 'woke-map-scan', hotkey: 'Alt + E' }] }
    expect(addEssenceScanWidget(config, 'Ctrl + D')).toBe(true)
    const w = config.widgets[1] as unknown as { wmId: number, wmType: string, hotkey: string | null }
    expect(w.wmId).toBe(4)
    expect(w.wmType).toBe(ESSENCE_SCAN_TYPE)
    expect(w.hotkey).toBeNull()
  })

  it('leaves an existing one alone', () => {
    const config = { widgets: [{ wmId: 1, wmType: ESSENCE_SCAN_TYPE }] }
    expect(addEssenceScanWidget(config, null)).toBe(false)
    expect(config.widgets).toHaveLength(1)
  })
})
