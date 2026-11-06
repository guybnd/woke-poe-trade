// The Wealthy Exile window: its hotkey, the page it opens, and where it shows up.
import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SITE_URL, WEALTHY_EXILE_TYPE, hotkeyTarget, parseHotkeyTarget, siteUrl, wealthyExileShortcuts
} from '@/web/woke/wealthy-exile/widget'
import type { WealthyExileWidget } from '@/web/woke/wealthy-exile/widget'
import { MODULES } from '@/web/woke/modules'

function widget (hotkey: string | null): WealthyExileWidget {
  return { wmId: 9, wmType: WEALTHY_EXILE_TYPE, wmTitle: '', wmWants: 'hide', wmZorder: 1, wmFlags: [], anchor: { pos: 'tl', x: 0, y: 0 }, url: '', hotkey, dockIcon: false }
}

describe('Wealthy Exile window', () => {
  it('opens wealthyexile.com unless another https page is set', () => {
    expect(siteUrl('')).toBe(DEFAULT_SITE_URL)
    expect(siteUrl(undefined)).toBe(DEFAULT_SITE_URL)
    expect(siteUrl(' https://wealthyexile.com/dashboard ')).toBe('https://wealthyexile.com/dashboard')
    expect(siteUrl('http://wealthyexile.com/')).toBe(DEFAULT_SITE_URL)
    expect(siteUrl('javascript:alert(1)')).toBe(DEFAULT_SITE_URL)
  })

  it('round-trips its hotkey target and ignores other widgets', () => {
    expect(parseHotkeyTarget(hotkeyTarget(9))).toBe(9)
    expect(parseHotkeyTarget('woke-challenges:9')).toBeNull()
    expect(parseHotkeyTarget('woke-wealthy-exile:9:x')).toBeNull()
  })

  it('registers its hotkey only when set, and takes overlay focus', () => {
    expect(wealthyExileShortcuts(widget(null))).toEqual([])
    const [action] = wealthyExileShortcuts(widget('Alt + W'))
    expect(action.shortcut).toBe('Alt + W')
    expect(action.action).toEqual({ type: 'trigger-event', target: 'woke-wealthy-exile:9', focusOverlay: true })
  })

  it('is an economy module', () => {
    const m = MODULES.find(x => x.id === 'wealthy-exile')!
    expect(m.widgetTypes).toEqual([WEALTHY_EXILE_TYPE])
    expect(m.group).toBe('economy')
  })
})
