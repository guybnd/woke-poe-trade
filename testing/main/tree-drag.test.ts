import { describe, it, expect } from 'vitest'
import { TreeDrag } from '../../main/src/woke/tree-drag'

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
