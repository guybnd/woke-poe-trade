// The OCR map scan rates a mod by a rating saved under another wording of its
// stat that says the same thing, as the map card does.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { loadGameData } from '../helpers/game-data'
import { defaultProfile } from '@/web/woke/map-mods/rules'
import type { MapModProfile } from '@/web/woke/map-mods/rules'

const config = vi.hoisted(() => ({ widgets: [] as unknown[], woke: { off: [] as string[] } }))
vi.mock('@/web/Config', () => ({ AppConfig: () => config, pushHostConfig: () => {} }))
vi.mock('@/web/woke/shared/host', () => ({ hostRequest: async () => null }))

vi.stubGlobal('window', { innerWidth: 1920, innerHeight: 1080 })
beforeAll(loadGameData)

function useProfile (ratings: MapModProfile['ratings']) {
  const p = { ...defaultProfile(), ratings }
  config.widgets = [{ wmId: 1, wmType: 'woke-map-mods', wmFlags: [], wmWants: 'hide', wmZorder: null, activeProfile: p.id, profiles: [p] }]
}

describe('map scan ratings', () => {
  it('flags Mirror of Delirium rated under the plural wording', async () => {
    const { onReading, current } = await import('@/web/woke/map-mods/scan-session')
    useProfile({ 'Areas contain a Mirror of Delirium': 'deadly' })
    onReading({ lines: ['Map Tier: 16', 'Atlas Drops: +80%', 'Area contains a Mirror of Delirium'], at: { x: 0.5, y: 0.5 } }, false)
    expect(current.value?.verdict).toBe('skip')
  })
  it("doesn't carry an increased rating over to reduced", async () => {
    const { onReading, current } = await import('@/web/woke/map-mods/scan-session')
    useProfile({ 'Monsters have #% increased Area of Effect': 'deadly' })
    onReading({ lines: ['Map Tier: 16', 'Atlas Drops: +80%', 'Monsters have 30% reduced Area of Effect'], at: { x: 0.2, y: 0.2 } }, false)
    expect(current.value?.verdict).not.toBe('skip')
  })
})
