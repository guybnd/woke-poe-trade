// The Hotkeys page and the clash warnings list every key the app registers.
import { describe, expect, it, vi } from 'vitest'

// Config pulls in every window; the code under test only needs a stand-in.
vi.mock('@/web/Config', () => ({ AppConfig: () => ({ widgets: [] }), saveConfig: () => {}, pushHostConfig: () => {} }))
import { fieldKey, hotkeyFields, hotkeyUses } from '@/web/woke/settings/hotkey-fields'
import { normalizeKey } from '@/web/woke/ui/hotkey-context'
import type { Config } from '@/web/Config'

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

  it('lists the Net worth key, and leaves it out while the stash reader is off', () => {
    const fields = hotkeyFields(config([{ wmType: 'woke-net-worth', hotkey: 'Alt + N' }]))
    const nw = fields.find(f => f.label.startsWith('Net worth'))
    expect(nw && fieldKey(nw)).toBe('Alt + N')
    // Not registered while its module is off, so not a clash either.
    expect(nw?.off).toBe(true)
  })
})
