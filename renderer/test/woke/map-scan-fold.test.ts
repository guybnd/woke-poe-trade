// Map scan folded into Map mods (WOKEPOET-458): the one-time config fix-up.
import { describe, it, expect } from 'vitest'
import { foldMapScan } from '@/web/woke/map-mods/scan'

type W = Record<string, unknown> & { wmId: number, wmType: string }

function scanWidget (extra: Record<string, unknown> = {}): W {
  return { wmId: 7, wmType: 'woke-map-scan', wmFlags: ['invisible-on-blur'], hotkey: 'Alt + Q', rollHotkey: 'Alt + W', alertOnPass: false, ...extra }
}
function mapMods (extra: Record<string, unknown> = {}): W {
  return { wmId: 9, wmType: 'woke-map-mods', wmFlags: ['invisible-on-blur'], hotkey: 'Alt + M', ...extra }
}

describe('foldMapScan', () => {
  it('moves the keys and reroll alert onto Map mods', () => {
    const config = { woke: { off: [] as string[] }, widgets: [scanWidget(), mapMods()] }
    foldMapScan(config)
    expect(config.widgets[1]).toMatchObject({ scanHotkey: 'Alt + Q', scanRollHotkey: 'Alt + W', scanAlertOnPass: false })
  })

  it('moves no keys from a switched-off Map scan', () => {
    const config = { woke: { off: ['map-scan'] }, widgets: [scanWidget(), mapMods()] }
    foldMapScan(config)
    expect(config.widgets[1]).toMatchObject({ scanHotkey: null, scanRollHotkey: null })
  })

  it('makes a Map mods window when there was only Map scan, and turns Map mods on', () => {
    const config = { woke: { off: ['map-mods'] }, widgets: [scanWidget()] }
    foldMapScan(config)
    const made = config.widgets[1]
    expect(made).toMatchObject({ wmId: 8, wmType: 'woke-map-mods', wmFlags: ['uninitialized'], scanHotkey: 'Alt + Q' })
    expect(config.woke.off).not.toContain('map-mods')
  })

  it('gives a never-opened Map scan its default keys', () => {
    const config = { woke: { off: [] as string[] }, widgets: [scanWidget({ wmFlags: ['uninitialized'], hotkey: undefined, rollHotkey: undefined }), mapMods()] }
    foldMapScan(config)
    expect(config.widgets[1]).toMatchObject({ scanHotkey: 'Alt + S', scanRollHotkey: 'Alt + R' })
  })

  it('leaves Map mods alone without a Map scan', () => {
    const config = { woke: { off: [] as string[] }, widgets: [mapMods()] }
    foldMapScan(config)
    expect(config.widgets[0].scanHotkey).toBeUndefined()
  })

  it('keeps keys already set on Map mods', () => {
    const config = { woke: { off: [] as string[] }, widgets: [scanWidget(), mapMods({ scanHotkey: 'Alt + Z' })] }
    foldMapScan(config)
    expect(config.widgets[1].scanHotkey).toBe('Alt + Z')
  })

  it('points the rail pin at Map mods, once', () => {
    const rail = { wmId: 1, wmType: 'menu', pinned: [3, 7, 4] }
    const config = { woke: { off: [] as string[] }, widgets: [rail, scanWidget(), mapMods()] }
    foldMapScan(config)
    expect(rail.pinned).toEqual([3, 9, 4])
    const both = { wmId: 1, wmType: 'menu', pinned: [9, 7] }
    foldMapScan({ woke: { off: [] }, widgets: [both, scanWidget(), mapMods()] })
    expect(both.pinned).toEqual([9])
  })
})
