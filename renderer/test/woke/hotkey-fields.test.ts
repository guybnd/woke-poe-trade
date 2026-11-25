// The Hotkeys page and the clash warnings list every key the app registers.
import { describe, expect, it, vi } from 'vitest'
import { fieldKey, hotkeyFields, hotkeyUses } from '@/web/woke/settings/hotkey-fields'
import { placedHere } from '@/web/woke/settings/merge-live'
import { normalizeKey } from '@/web/woke/ui/hotkey-context'
import type { Config } from '@/web/Config'
import { addModule, removeModule } from '@/web/woke/modules'
import type { ModuleDef } from '@/web/woke/modules'

const liveWidgets: Array<{ wmId: number }> = []

// Config pulls in every window; the code under test only needs a stand-in.
vi.mock('@/web/Config', () => ({ AppConfig: () => ({ widgets: liveWidgets }), saveConfig: () => {}, pushHostConfig: () => {} }))

function config (widgets: Array<Record<string, unknown>>): Config {
  return {
    overlayKey: 'Shift + Space',
    commands: [],
    woke: { setupDone: true, off: [] },
    widgets: widgets.map((w, i) => ({ wmId: i + 1, wmTitle: '', wmWants: 'hide', wmZorder: null, wmFlags: [], ...w }))
  } as unknown as Config
}

describe('hotkey fields', () => {
  it('lists the tree drawing key, at its default when unset', () => {
    const fields = hotkeyFields(config([{ wmType: 'woke-pob-builds' }]))
    const tree = fields.find(f => f.id.endsWith('-treeHotkey'))
    expect(tree && fieldKey(tree)).toBe('Alt + T')
  })

  it('a cleared tree key stays cleared', () => {
    const c = config([{ wmType: 'woke-pob-builds' }])
    const tree = hotkeyFields(c).find(f => f.id.endsWith('-treeHotkey'))!
    tree.set(null)
    expect(hotkeyFields(c).find(f => f.id.endsWith('-treeHotkey'))!.get()).toBeNull()
  })

  it('warns when another action takes the tree key', () => {
    const c = config([{ wmType: 'woke-pob-builds' }, { wmType: 'woke-drop-counter', hotkey: 'Alt + T' }])
    expect(hotkeyUses(hotkeyFields(c)).get(normalizeKey('Alt + T'))).toHaveLength(2)
  })

  it('leaves the Net worth key out while the stash reader is off', () => {
    const fields = hotkeyFields(config([{ wmType: 'woke-net-worth', hotkey: 'Alt + N' }]))
    expect(fields.find(f => f.label.startsWith('Net worth'))).toBeUndefined()
  })

  it('lists the tree key once with several PoB builds windows (no false clash)', () => {
    const c = config([{ wmType: 'woke-pob-builds' }, { wmType: 'woke-pob-builds' }])
    expect(hotkeyFields(c).filter(f => f.id.endsWith('-treeHotkey'))).toHaveLength(1)
    expect(hotkeyUses(hotkeyFields(c)).get(normalizeKey('Alt + T'))).toHaveLength(1)
  })

  it('lists the bookmarks, map chip and Net worth listing / run keys', () => {
    const c = config([
      { wmType: 'item-check', bookmarksKey: 'Alt + B' },
      { wmType: 'woke-session-story', chipKey: 'Alt + C' },
      { wmType: 'woke-net-worth', listedHotkey: 'Alt + L' }
    ])
    // Net worth counts only while the stash reader is on.
    addModule({ id: 'net-worth', name: 'Net worth', widgetTypes: ['woke-net-worth'], optIn: true } as unknown as ModuleDef)
    try {
      const keys = hotkeyFields(c).map(fieldKey)
      expect(keys).toContain('Alt + B')
      expect(keys).toContain('Alt + C')
      expect(keys).toContain('Alt + L')
      // The run key's default, which netWorthShortcuts registers when unset.
      expect(keys).toContain('Alt + H')
    } finally {
      removeModule('net-worth')
    }
  })

  it('leaves the map chip key out while the chip is off', () => {
    const c = config([{ wmType: 'woke-session-story', chipKey: 'Alt + C', chipPlace: 'off' }])
    expect(hotkeyFields(c).find(f => f.id.endsWith('-chipKey'))?.off).toBe(true)
  })

  it('places Map mods from its key past the live widget ids too', () => {
    const c = config([{ wmType: 'price-check' }])
    c.woke!.off = []
    liveWidgets.push({ wmId: 1 }, { wmId: 7 })
    try {
      hotkeyFields(c).find(f => f.id === 'map-check-default')!.set('Alt + J')
      expect(c.widgets.find(w => w.wmType === 'woke-map-mods')?.wmId).toBe(8)
      // Remembered as placed here, so Undo can take it out again.
      expect(placedHere.get(8)).toBe('woke-map-mods')
    } finally {
      liveWidgets.length = 0
    }
  })
})
