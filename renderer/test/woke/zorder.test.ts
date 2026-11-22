// Panels' z-order grew by one on every click to the front; past 1000 a panel
// covered the item tooltip on its own rows (Net worth, 1004 in Guy's config).
import { describe, it, expect } from 'vitest'
import { compactZorder, keepZorderUnderCap, ZORDER_BASE as B, ZORDER_CAP } from '@/web/overlay/zorder'

type Z = { wmZorder: number | 'exclusive' | null }

describe('panel z-order', () => {
  it('renumbers in the same order, keeping ties and leaving exclusive and unset alone', () => {
    const ws: Z[] = [{ wmZorder: 1004 }, { wmZorder: 'exclusive' }, { wmZorder: 1 }, { wmZorder: null }, { wmZorder: 900 }, { wmZorder: 900 }, { wmZorder: 1000 }]
    compactZorder(ws)
    expect(ws.map(w => w.wmZorder)).toEqual([B + 4, 'exclusive', B + 1, null, B + 2, B + 2, B + 3])
  })

  it('only renumbers once a panel is past the cap', () => {
    const low: Z[] = [{ wmZorder: 5 }, { wmZorder: ZORDER_CAP }]
    keepZorderUnderCap(low)
    expect(low.map(w => w.wmZorder)).toEqual([5, ZORDER_CAP])
    const high: Z[] = [{ wmZorder: 5 }, { wmZorder: ZORDER_CAP + 1 }]
    keepZorderUnderCap(high)
    expect(high.map(w => w.wmZorder)).toEqual([B + 1, B + 2])
  })

  it('stays under the dock (900) and the tooltip (1000) however many clicks', () => {
    const ws: Z[] = [{ wmZorder: 1 }, { wmZorder: 2 }, { wmZorder: 3 }]
    for (let i = 0; i < 5000; i++) {
      const top = Math.max(...ws.map(w => w.wmZorder as number))
      ws[i % 3].wmZorder = top + 1
      keepZorderUnderCap(ws)
    }
    expect(Math.max(...ws.map(w => w.wmZorder as number))).toBeLessThanOrEqual(ZORDER_CAP)
    // And over the full-screen markings (z 40) once renumbered.
    expect(Math.min(...ws.map(w => w.wmZorder as number))).toBeGreaterThan(40)
  })
})
