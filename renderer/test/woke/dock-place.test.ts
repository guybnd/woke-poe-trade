// The icon row stays whole on screen, like a pin.
import { describe, expect, it } from 'vitest'
import { dockSpot } from '@/web/woke/dock/place'

describe('dockSpot', () => {
  it('pulls a row saved near the right or bottom edge back in by its size', () => {
    expect(dockSpot(97, 96, { w: 300, h: 40 })).toEqual({
      left: 'min(97%, calc(100% - 300px))',
      top: 'min(96%, calc(100% - 40px))'
    })
  })
})
