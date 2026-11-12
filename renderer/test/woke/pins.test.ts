// Pins: what's stored reads back safely, and each pin keeps one spot in towns
// and hideouts and another everywhere else.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

type PinsModule = typeof import('@/web/woke/pins/pins')
type ZoneModule = typeof import('@/web/woke/shared/zone')

describe('pins', () => {
  let m: PinsModule
  let z: ZoneModule
  const store = new Map<string, string>()

  beforeAll(async () => {
    await import('vue')
    vi.stubGlobal('window', { addEventListener () {}, innerWidth: 1000, innerHeight: 1000 })
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v) } })
    vi.doMock('@/web/woke/shared/game-log', () => ({ followGameLog () {} }))
    z = await import('@/web/woke/shared/zone')
    m = await import('@/web/woke/pins/pins')
  })
  beforeEach(() => {
    m.pins.value = []
    z.zone.kind = 'map'
  })

  it('drops malformed stored pins and clamps values', () => {
    expect(m.parsePins(null)).toEqual([])
    expect(m.parsePins('nope')).toEqual([])
    expect(m.parsePins('{}')).toEqual([])
    const read = m.parsePins(JSON.stringify([
      { id: 'a', kind: 'dock', title: 'A', opacity: 5, spots: { town: { x: 150, y: 10 }, field: { x: 'x' } }, data: { id: 'run-timer', n: 3 } },
      { id: 'a', kind: 'dock' },
      { kind: 'dock' },
      null
    ]))
    expect(read).toEqual([{ id: 'a', kind: 'dock', title: 'A', icon: 'fas fa-thumbtack', opacity: 20, spots: { town: { x: 98, y: 10 } }, data: { id: 'run-timer' } }])
  })

  it('reads hideouts and towns as one place, everything else as another', () => {
    expect(m.placeOf('hideout')).toBe('town')
    expect(m.placeOf('town')).toBe('town')
    expect(m.placeOf('map')).toBe('field')
    expect(m.placeOf(null)).toBe('field')
  })

  it('moves a pin only where you are, and falls back to the other spot', () => {
    m.addPin({ id: 'p', kind: 'dock', title: 'Timer', icon: 'x', data: {}, at: { x: 10, y: 20 } })
    const pin = () => m.pins.value[0]
    expect(m.spotOf(pin(), 'field', 0)).toEqual({ x: 10, y: 20 })
    // Never placed in town: it uses the map spot.
    expect(m.spotOf(pin(), 'town', 0)).toEqual({ x: 10, y: 20 })
    z.zone.kind = 'hideout'
    m.movePin('p', { x: 50, y: 60 })
    expect(m.spotOf(pin(), 'town', 0)).toEqual({ x: 50, y: 60 })
    expect(m.spotOf(pin(), 'field', 0)).toEqual({ x: 10, y: 20 })
  })

  it('toggles, saves and clamps opacity', () => {
    const p = { id: 'q', kind: 'pob-tree' as const, title: 'Tree', icon: 'x', data: { relPath: 'a.xml' } }
    m.togglePin(p)
    expect(m.isPinned('q')).toBe(true)
    m.setPinOpacity('q', 400)
    expect(m.pins.value[0].opacity).toBe(100)
    m.setPinOpacity('q', 3)
    expect(m.pins.value[0].opacity).toBe(20)
    m.togglePin(p)
    expect(m.isPinned('q')).toBe(false)
  })

  it('reads the pinned size safely', () => {
    expect(m.parsePinScale(null)).toBe(100)
    expect(m.parsePinScale('60')).toBe(60)
    expect(m.parsePinScale('10')).toBe(50)
    expect(m.parsePinScale('500')).toBe(100)
  })
})
