import { describe, it, expect } from 'vitest'
import { popupAnchor, movePopupsToNewSpot } from '@/web/woke/ui/window-anchor'

const widget = (wmType: string, pos: string, x: number, y: number) => ({ wmType, anchor: { pos, x, y } })

describe('popup spot', () => {
  it('gives every panel its own anchor object', () => {
    const a = popupAnchor()
    a.x = 77
    expect(popupAnchor().x).not.toBe(77)
  })

  it('moves panels still on their old default', () => {
    const widgets = [
      widget('woke-pob-builds', 'tl', 25, 20),
      widget('woke-boss-runs', 'cc', 50, 50),
      widget('woke-session-analytics', 'tc', 50, 12),
      widget('woke-regex-library', 'tl', 30, 30),
      widget('woke-regex-library', 'tl', 35, 30)
    ]
    movePopupsToNewSpot(widgets)
    for (const w of widgets) expect(w.anchor).toEqual(popupAnchor())
    expect(widgets[0].anchor).not.toBe(widgets[1].anchor)
  })

  it('keeps panels the user moved', () => {
    const moved = widget('woke-pob-builds', 'tl', 25.5, 20)
    const otherHandle = widget('woke-pob-builds', 'tr', 25, 20)
    movePopupsToNewSpot([moved, otherHandle])
    expect(moved.anchor).toEqual({ pos: 'tl', x: 25.5, y: 20 })
    expect(otherHandle.anchor).toEqual({ pos: 'tr', x: 25, y: 20 })
  })

  it('leaves HUD widgets alone, and a spot that was another panel\'s default', () => {
    const campaign = widget('woke-campaign', 'tc', 50, 1)
    const trade = widget('woke-trade', 'tr', 98, 15)
    const swapped = widget('woke-lab', 'tl', 25, 20) // PoB's old spot, not the lab's
    movePopupsToNewSpot([campaign, trade, swapped])
    expect(campaign.anchor).toEqual({ pos: 'tc', x: 50, y: 1 })
    expect(trade.anchor).toEqual({ pos: 'tr', x: 98, y: 15 })
    expect(swapped.anchor).toEqual({ pos: 'tl', x: 25, y: 20 })
  })

  it('leaves minimized panels and widgets with no anchor alone', () => {
    const minimized = { ...widget('woke-pob-builds', 'tl', 25, 20), wokeMinimized: {} }
    const none = { wmType: 'woke-pob-builds' }
    movePopupsToNewSpot([minimized, none])
    expect(minimized.anchor).toEqual({ pos: 'tl', x: 25, y: 20 })
    expect(none).toEqual({ wmType: 'woke-pob-builds' })
  })
})
