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

describe('key peek', () => {
  it('peeks a tool\'s key a few times, until the key is used', async () => {
    const { keyPeek, keyUsed, peekFor, peekKey } = await import('@/web/woke/shared/key-peek')
    const mapMods = { wmId: 5, wmType: 'woke-map-mods', hotkey: 'Alt + M' }
    expect(peekFor({ wmType: 'woke-map-mods', hotkey: null })).toBeNull()
    expect(peekFor({ wmType: 'woke-market-tracker', hotkey: 'Alt + K' })).toBeNull()
    peekKey(mapMods)
    expect(keyPeek.value).toMatchObject({ wmId: 5, keys: 'Alt + M' })
    keyPeek.value = null
    // The map check opening, overlay up or not, means Alt + M was used.
    keyUsed('woke-map-check', false)
    peekKey(mapMods)
    expect(keyPeek.value).toBeNull()
  })
  it('stops after three peeks', async () => {
    const { keyPeek, peekKey } = await import('@/web/woke/shared/key-peek')
    const w = { wmId: 6, wmType: 'woke-challenges', hotkey: 'Alt + C' }
    for (let i = 0; i < 3; i++) { keyPeek.value = null; peekKey(w); expect(keyPeek.value).not.toBeNull() }
    keyPeek.value = null
    peekKey(w)
    expect(keyPeek.value).toBeNull()
  })
})
