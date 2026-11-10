// Regression: opening Settings > Map mods & map scan froze the app. The editor
// normalized the widget on every render and normalizing always wrote a new
// weights object, so the render re-triggered itself forever.
import { describe, it, expect, vi } from 'vitest'
import { effect, reactive } from 'vue'
import { DEFAULT_JUICE_WEIGHTS } from '@/web/woke/map-mods/rules'
import { normalizeMapModsWidget } from '@/web/woke/map-mods/widget'
import type { MapModsWidget } from '@/web/woke/map-mods/widget'

const config = vi.hoisted(() => ({ widgets: [] as unknown[] }))
vi.mock('@/web/Config', () => ({ AppConfig: () => config, pushHostConfig: () => {} }))

describe('normalizeMapModsWidget', () => {
  it('writes nothing to an already normal widget', () => {
    const w = reactive({ wmType: 'woke-map-mods' } as MapModsWidget)
    normalizeMapModsWidget(w)
    const weights = w.weights
    let runs = 0
    effect(() => { runs++; JSON.stringify(w) })
    normalizeMapModsWidget(w)
    expect(runs).toBe(1)
    expect(w.weights).toBe(weights)
  })

  it('fills weights missing from older configs and keeps set ones', () => {
    const w = { wmType: 'woke-map-mods', weights: { quantity: 0.5 } } as unknown as MapModsWidget
    normalizeMapModsWidget(w)
    expect(w.weights).toEqual({ ...DEFAULT_JUICE_WEIGHTS, quantity: 0.5 })
  })
})
