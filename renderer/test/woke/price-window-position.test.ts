// Moving and resizing the price check window.
import { describe, expect, it } from 'vitest'
import {
  floatingArea, floatingLayout, MIN_HEIGHT, MIN_WIDTH, movedPosition, resizedPosition
} from '@/web/price-check/window-position'

const screen = { w: 2000, h: 1000 }
const WIDTH = 460

describe('floatingLayout', () => {
  it('keeps the related items panel to the right in the left half of the screen', () => {
    const l = floatingLayout({ x: 10, y: 20 }, screen, WIDTH)
    expect(l).toMatchObject({ side: 'stash', gap: 200, top: 200, left: 200, width: WIDTH, height: undefined })
  })

  it('puts the related items panel to the left in the right half, measuring from the right edge', () => {
    const l = floatingLayout({ x: 60, y: 0, w: 500 }, screen, WIDTH)
    expect(l).toMatchObject({ side: 'inventory', gap: 300, left: 1200, width: 500 })
  })

  it('pulls a saved position back on screen after a resolution change', () => {
    const l = floatingLayout({ x: 95, y: 99, w: 500, h: 400 }, screen, WIDTH)
    expect(l.left).toBe(1500)
    expect(l.top).toBe(600)
  })

  it('never makes the window bigger than the screen', () => {
    const l = floatingLayout({ x: 0, y: 0, w: 5000, h: 5000 }, screen, WIDTH)
    expect(l).toMatchObject({ left: 0, top: 0, width: 2000, height: 1000 })
  })
})

describe('floatingArea', () => {
  it('uses the saved height', () => {
    const l = floatingLayout({ x: 10, y: 20, w: 500, h: 300 }, screen, WIDTH)
    expect(floatingArea(l, screen)).toEqual({ x: 200, y: 200, width: 500, height: 300 })
  })

  it('reaches down to the screen edge with no saved height', () => {
    const l = floatingLayout({ x: 10, y: 20 }, screen, WIDTH)
    expect(floatingArea(l, screen)).toEqual({ x: 200, y: 200, width: WIDTH, height: 800 })
  })
})

describe('movedPosition', () => {
  it('turns the first drag of a docked window into a position', () => {
    expect(movedPosition(undefined, { left: 600, top: 0, width: 460 }, 400, 250, screen)).toEqual({ x: 50, y: 25 })
  })

  it('stops where the window is drawn, so the saved spot matches the screen', () => {
    const p = movedPosition({ x: 0, y: 0, w: 500, h: 600 }, { left: 0, top: 0, width: 500 }, 5000, 5000, screen)
    const l = floatingLayout(p, screen, 500)
    expect(l.left).toBe(p.x / 100 * screen.w)
    expect(l.top).toBe(p.y / 100 * screen.h)
  })

  it('keeps a saved size', () => {
    expect(movedPosition({ x: 1, y: 1, w: 500, h: 300 }, { left: 20, top: 10, width: 500 }, 0, 0, screen))
      .toEqual({ x: 1, y: 1, w: 500, h: 300 })
  })
})

describe('resizedPosition', () => {
  const start = { left: 200, top: 100, width: 460, height: 600 }

  it('saves only the axis being resized and keeps the top left', () => {
    expect(resizedPosition(undefined, start, 40, null, screen)).toEqual({ x: 10, y: 10, w: 500 })
    expect(resizedPosition(undefined, start, null, -100, screen)).toEqual({ x: 10, y: 10, h: 500 })
  })

  it('keeps the other axis already saved', () => {
    expect(resizedPosition({ x: 10, y: 10, h: 450 }, start, 40, null, screen)).toEqual({ x: 10, y: 10, w: 500, h: 450 })
  })

  it('stops at the minimum size', () => {
    const p = resizedPosition(undefined, start, -5000, -5000, screen)
    expect(p.w).toBe(MIN_WIDTH)
    expect(p.h).toBe(MIN_HEIGHT)
  })

  it('stops at the screen edge', () => {
    const p = resizedPosition(undefined, start, 9000, 9000, screen)
    expect(p.w).toBe(1800)
    expect(p.h).toBe(900)
  })
})
