import { describe, expect, it, beforeEach } from 'vitest'
import { effectScope, nextTick, reactive } from 'vue'

import { bindHintsConfig, DEFAULT_SHOWS, hintEligible, hintPlaceOk, isHintDone, retireHint, setOverlayOpen, useHint } from '@/web/woke/shared/hints'
import { zone } from '@/web/woke/shared/zone'

const config = reactive<{ woke?: { setupDone: boolean, off: string[], hints?: Record<string, unknown> } }>({ woke: { setupDone: true, off: [] } })
bindHintsConfig(() => config.woke)

function inScope<T> (fn: () => T): { value: T, stop: () => void } {
  const scope = effectScope()
  const value = scope.run(fn)!
  return { value, stop: () => scope.stop() }
}

beforeEach(() => {
  config.woke = { setupDone: true, off: [] }
  setOverlayOpen(false)
  zone.kind = null
})

describe('hintEligible', () => {
  it('shows until used, closed, switched off or shown enough', () => {
    expect(hintEligible(undefined, 'a', 3, false)).toBe(true)
    expect(hintEligible({ done: ['a'] }, 'a', 3, false)).toBe(false)
    expect(hintEligible({ off: true }, 'a', 3, false)).toBe(false)
    expect(hintEligible({ shows: { a: 3 } }, 'a', 3, false)).toBe(false)
    // The open it was counted in keeps it up to the end.
    expect(hintEligible({ shows: { a: 3 } }, 'a', 3, true)).toBe(true)
  })
})

describe('where tips show', () => {
  it('never in a map unless the overlay is open', () => {
    zone.kind = 'map'
    expect(hintPlaceOk()).toBe(false)
    setOverlayOpen(true)
    expect(hintPlaceOk()).toBe(true)
    setOverlayOpen(false)
    zone.kind = 'hideout'
    expect(hintPlaceOk()).toBe(true)
  })
})

describe('useHint', () => {
  it('counts one showing per overlay open and stops after the limit', async () => {
    const h = inScope(() => useHint('t1'))
    expect(h.value.show.value).toBe(true)
    await nextTick()
    expect(config.woke!.hints).toEqual({ shows: { t1: 1 } })
    for (let i = 0; i < DEFAULT_SHOWS; i++) {
      setOverlayOpen(true)
      setOverlayOpen(false)
      await nextTick()
    }
    expect(h.value.show.value).toBe(false)
    h.stop()
  })

  it('goes for good once retired', async () => {
    const h = inScope(() => useHint('t2'))
    expect(h.value.show.value).toBe(true)
    retireHint('t2')
    await nextTick()
    expect(h.value.show.value).toBe(false)
    expect(isHintDone('t2')).toBe(true)
    // Settings' "Show tips again" clears what was used and shown.
    config.woke!.hints = {}
    await nextTick()
    expect(h.value.show.value).toBe(true)
    h.stop()
  })

  it('shows one window tip at a time; tooltip lines do not wait', async () => {
    const a = inScope(() => useHint('w1'))
    const b = inScope(() => useHint('w2'))
    const line = inScope(() => useHint('line', { slot: false }))
    await nextTick()
    expect(a.value.show.value).toBe(true)
    expect(b.value.show.value).toBe(false)
    expect(line.value.show.value).toBe(true)
    a.value.retire()
    await nextTick()
    expect(b.value.show.value).toBe(true)
    a.stop(); b.stop(); line.stop()
  })

  it('waits for its `when`', async () => {
    let on = false
    const flag = reactive({ on })
    const h = inScope(() => useHint('w3', { when: () => flag.on }))
    expect(h.value.show.value).toBe(false)
    flag.on = on = true
    await nextTick()
    expect(h.value.show.value).toBe(on)
    h.stop()
  })
})
