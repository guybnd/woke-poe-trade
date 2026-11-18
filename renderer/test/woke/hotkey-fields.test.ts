// The Hotkeys page and the clash warnings list every key the app registers.
import { describe, expect, it, vi } from 'vitest'
import { fieldKey, hotkeyFields, hotkeyUses } from '@/web/woke/settings/hotkey-fields'
import { normalizeKey } from '@/web/woke/ui/hotkey-context'
import type { Config } from '@/web/Config'

// Config pulls in every window; the code under test only needs a stand-in.
vi.mock('@/web/Config', () => ({ AppConfig: () => ({ widgets: [] }), saveConfig: () => {}, pushHostConfig: () => {} }))

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
})
