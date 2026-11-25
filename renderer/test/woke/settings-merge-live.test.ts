// The settings window's copy of the config merged back into the live one.
import { describe, expect, it } from 'vitest'
import { mergeConfigs } from '@/web/woke/settings/merge-live'
import type { Config } from '@/web/Config'

const widget = (wmId: number, wmType: string, extra: Record<string, unknown> = {}) =>
  ({ wmId, wmType, wmTitle: '', wmWants: 'hide', wmZorder: null, wmFlags: [], ...extra })
const config = (widgets: Array<ReturnType<typeof widget>>) =>
  ({ overlayKey: 'Shift + Space', widgets }) as unknown as Config

describe('mergeConfigs', () => {
  it('keeps a widget this window placed (setting Alt+M before Map mods exists)', () => {
    const since = config([widget(1, 'price-check')])
    const live = config([widget(1, 'price-check')])
    const next = config([widget(1, 'price-check'), widget(2, 'woke-map-mods', { hotkey: 'Alt + J' })])
    const out = mergeConfigs(next, since, live)
    expect(out.widgets.map(w => w.wmType)).toEqual(['price-check', 'woke-map-mods'])
    expect((out.widgets[1] as unknown as { hotkey: string }).hotkey).toBe('Alt + J')
  })

  it('a widget removed while the window was open stays removed', () => {
    const since = config([widget(1, 'price-check'), widget(2, 'woke-lab')])
    const live = config([widget(1, 'price-check')])
    const next = config([widget(1, 'price-check'), widget(2, 'woke-lab')])
    expect(mergeConfigs(next, since, live).widgets.map(w => w.wmId)).toEqual([1])
  })

  it('takes live values this window did not change, and its own changes', () => {
    const since = config([widget(1, 'woke-lab', { runs: 1, hotkey: null })])
    const live = config([widget(1, 'woke-lab', { runs: 5, hotkey: null })])
    const next = config([widget(1, 'woke-lab', { runs: 1, hotkey: 'Alt + L' })])
    expect(mergeConfigs(next, since, live).widgets[0]).toMatchObject({ runs: 5, hotkey: 'Alt + L' })
  })

  it('never replaces a live widget that has the same id as one this window placed', () => {
    const since = config([widget(1, 'price-check')])
    const live = config([widget(1, 'price-check'), widget(2, 'woke-lab', { runs: 5 })])
    const next = config([widget(1, 'price-check'), widget(2, 'woke-map-mods')])
    const out = mergeConfigs(next, since, live).widgets
    expect(out[1]).toMatchObject({ wmType: 'woke-lab', runs: 5 })
    // and the one this window placed still joins, under a new id
    expect(out.map(w => [w.wmId, w.wmType])).toEqual([[1, 'price-check'], [2, 'woke-lab'], [3, 'woke-map-mods']])
  })
})
