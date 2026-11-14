import { describe, it, expect } from 'vitest'
import { wheelStep } from '@/web/woke/dock/wheel'

describe('wheel steps', () => {
  it('one mouse notch is one step, down forward', () => {
    expect(wheelStep({ deltaY: 100, deltaMode: 0 }, 10_000)).toBe(1)
    expect(wheelStep({ deltaY: -100, deltaMode: 0 }, 11_000)).toBe(-1)
    expect(wheelStep({ deltaY: 3, deltaMode: 1 }, 12_000)).toBe(1)
  })

  it('adds up small touchpad deltas before stepping', () => {
    expect(wheelStep({ deltaY: 10, deltaMode: 0 }, 20_000)).toBe(0)
    expect(wheelStep({ deltaY: 10, deltaMode: 0 }, 20_010)).toBe(0)
    expect(wheelStep({ deltaY: 40, deltaMode: 0 }, 20_200)).toBe(1)
  })

  it('a fast spin steps at most once per gap', () => {
    expect(wheelStep({ deltaY: 100, deltaMode: 0 }, 30_000)).toBe(1)
    expect(wheelStep({ deltaY: 100, deltaMode: 0 }, 30_030)).toBe(0)
    expect(wheelStep({ deltaY: 100, deltaMode: 0 }, 30_200)).toBe(1)
  })
})
