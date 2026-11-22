// Guessing an unidentified unique from its art (main/src/woke/unid-art-match.ts).
import { describe, expect, it } from 'vitest'
import { makeTemplate, rankByArt, CELL, type Candidate, type Rgba } from '../../../main/src/woke/unid-art-match'

const SIZE = 47

// A 47 px icon: a coloured shape on a see-through ground.
function icon (paint: (x: number, y: number) => [number, number, number] | null): Rgba {
  const data = new Uint8Array(SIZE * SIZE * 4)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const c = paint(x, y)
      if (!c) continue
      const o = (y * SIZE + x) * 4
      data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255
    }
  }
  return { width: SIZE, height: SIZE, data }
}

const c = SIZE / 2
const ICONS: Record<string, Rgba> = {
  ring: icon((x, y) => { const d = Math.hypot(x - c, y - c); return d > 12 && d < 20 ? [200, 40, 30] : null }),
  disc: icon((x, y) => Math.hypot(x - c, y - c) < 16 ? [190, 60 + x * 2, 40] : null),
  cross: icon((x, y) => (Math.abs(x - c) < 5 || Math.abs(y - c) < 5) && Math.hypot(x - c, y - c) < 21 ? [210, 50, 50] : null),
  diamond: icon((x, y) => Math.abs(x - c) + Math.abs(y - c) < 19 ? [170 - y, 30, 60 + y * 2] : null)
}

function candidates (names: string[], twins: Record<string, string> = {}): Candidate[] {
  return names.map(name => {
    const art = twins[name] ?? name
    return { name, art, template: makeTemplate(ICONS[art]) }
  })
}

// The square around the mouse: dark slots, a tinted hovered slot holding the art,
// the mouse somewhere inside it, a little noise and a brightness change.
function square (art: string | null, windowHeight: number, opts: { quad?: boolean, at?: [number, number], gain?: number } = {}) {
  const cell = windowHeight * CELL * (opts.quad ? 0.5 : 1)
  const side = Math.round(windowHeight * CELL * 3.4)
  const data = new Uint8Array(side * side * 4)
  const [fx, fy] = opts.at ?? [0.3, 0.7]
  const ox = Math.round(side / 2 - cell * fx)
  const oy = Math.round(side / 2 - cell * fy)
  const gain = opts.gain ?? 1
  let seed = 7
  const noise = () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647 - 0.5) * 14 }
  const img = art ? ICONS[art] : null
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      let col = [22, 24, 32]
      const gx = (((x - ox) % cell) + cell) % cell
      const gy = (((y - oy) % cell) + cell) % cell
      if (gx < 1 || gy < 1) col = [52, 48, 40]
      const inCell = x >= ox && x < ox + cell && y >= oy && y < oy + cell
      if (inCell) {
        col = [40, 46, 72]
        if (img) {
          const u = Math.floor((x - ox) / cell * SIZE)
          const v = Math.floor((y - oy) / cell * SIZE)
          const io = (v * SIZE + u) * 4
          const al = img.data[io + 3] / 255
          col = col.map((k, i) => k * (1 - al) + img.data[io + i] * al)
        }
      }
      const o = (y * side + x) * 4
      const [r, g, b] = col.map(k => Math.max(0, Math.min(255, k * gain + noise())))
      data[o] = b; data[o + 1] = g; data[o + 2] = r; data[o + 3] = 255
    }
  }
  return { square: { width: side, height: side, data }, cellPx: windowHeight * CELL }
}

describe('unid art match', () => {
  const names = Object.keys(ICONS)

  it.each([
    ['ring', 1080, {}],
    ['disc', 1440, { at: [0.9, 0.1] as [number, number], gain: 0.85 }],
    ['cross', 1080, { quad: true }],
    ['diamond', 2160, { gain: 1.15 }]
  ])('picks %s at %ip', (art, height, opts) => {
    const { square: sq, cellPx } = square(art, height, opts)
    const res = rankByArt(sq, cellPx, candidates(names))
    expect(res.ranked[0].name).toBe(art)
    expect(res.sure).toBe(true)
  })

  it('is not sure on an empty slot (a ground label or a chat link)', () => {
    const { square: sq, cellPx } = square(null, 1080)
    expect(rankByArt(sq, cellPx, candidates(names)).sure).toBe(false)
  })

  it('names both twins that share art, and is still sure of the art', () => {
    const { square: sq, cellPx } = square('ring', 1080)
    const res = rankByArt(sq, cellPx, candidates(['ring', 'Replica ring', 'disc'], { 'Replica ring': 'ring' }))
    expect(res.ranked.slice(0, 2).map(r => r.name).sort()).toEqual(['Replica ring', 'ring'])
    expect(res.sure).toBe(true)
  })

  it('skips an icon that is all see-through', () => {
    expect(makeTemplate({ width: 4, height: 4, data: new Uint8Array(64) })).toBeNull()
  })
})
