import { describe, it, expect } from 'vitest'
import { insideGame, TreeDrag } from '../../main/src/woke/tree-drag'

const fit = (ox: number, oy: number, zoom = 0.2) => ({ zoom, ox, oy })

describe('TreeDrag', () => {
  it('follows the mouse while no edge is known', () => {
    const d = new TreeDrag()
    d.fitted(fit(100, 100), 2560, 1440)
    d.start()
    expect(d.move(50, -20)).toEqual({ dx: 50, dy: -20 })
  })

  it('learns an edge where the tree stopped short, and stops there next time', () => {
    const d = new TreeDrag()
    d.fitted(fit(100, 100), 2560, 1440)
    d.start()
    d.move(400, 0)
    // The game's tree only got to 300: its right-hand limit.
    d.fitted(fit(300, 100), 2560, 1440)
    d.start()
    expect(d.move(-50, 0)).toEqual({ dx: -50, dy: 0 })
    expect(d.move(200, 0)).toEqual({ dx: 50, dy: 0 })
    expect(d.move(100, 30)).toEqual({ dx: 0, dy: 30 })
  })

  it('keeps nothing from a drag that moved the tree all the way', () => {
    const d = new TreeDrag()
    d.fitted(fit(100, 100), 2560, 1440)
    d.start()
    d.move(-200, 0)
    d.fitted(fit(-96, 100), 2560, 1440)
    d.start()
    expect(d.move(-500, 0)).toEqual({ dx: -500, dy: 0 })
  })

  it('keeps edges per zoom', () => {
    const d = new TreeDrag()
    d.fitted(fit(100, 100), 2560, 1440)
    d.start()
    d.move(0, 400)
    d.fitted(fit(100, 200), 2560, 1440)
    d.fitted(fit(100, 200, 0.3), 2560, 1440)
    d.start()
    expect(d.move(0, 100)).toEqual({ dx: 0, dy: 100 })
  })

  it('drops an edge once the tree is seen past it', () => {
    const d = new TreeDrag()
    d.fitted(fit(100, 100), 2560, 1440)
    d.start()
    d.move(400, 0)
    d.fitted(fit(300, 100), 2560, 1440)
    d.start()
    d.move(-100, 0)
    // Somehow the tree is at 400 now: the old edge was wrong.
    d.fitted(fit(400, 100), 2560, 1440)
    d.start()
    expect(d.move(100, 0)).toEqual({ dx: 100, dy: 0 })
  })
})

describe('insideGame', () => {
  const game = { x: 2560, y: 0, width: 2560, height: 1440 }
  it('takes a press on the game window', () => {
    expect(insideGame(game, 2560, 0)).toBe(true)
    expect(insideGame(game, 5119, 1439)).toBe(true)
  })
  it('ignores a press on another monitor or past the edge', () => {
    expect(insideGame(game, 1200, 700)).toBe(false)
    expect(insideGame(game, 5120, 700)).toBe(false)
    expect(insideGame(game, 3000, 1440)).toBe(false)
  })
  it('ignores everything when the game window is gone', () => {
    expect(insideGame({ x: 0, y: 0, width: 0, height: 0 }, 0, 0)).toBe(false)
  })
})
