// Every drag ends the same way: let go, cancelled, focus lost, or a move with no button held.
import { beforeEach, describe, expect, it } from 'vitest'
import { followPointer } from '@/web/woke/ui/pointer-drag'

type Fn = (e: unknown) => void
let handlers: Map<string, Set<Fn>>
beforeEach(() => {
  handlers = new Map()
  ;(globalThis as Record<string, unknown>).window = {
    addEventListener: (t: string, f: Fn) => { if (!handlers.has(t)) handlers.set(t, new Set()); handlers.get(t)!.add(f) },
    removeEventListener: (t: string, f: Fn) => { handlers.get(t)?.delete(f) }
  }
})
const fire = (t: string, e: unknown = {}) => { for (const f of [...(handlers.get(t) ?? [])]) f(e) }
const live = () => [...handlers.values()].reduce((n, s) => n + s.size, 0)

describe('followPointer', () => {
  it.each(['pointerup', 'pointercancel', 'blur'])('ends once on %s and removes its listeners', (t) => {
    const moves: number[] = []
    let ends = 0
    followPointer(e => moves.push((e as { clientX: number }).clientX), () => ends++)
    fire('pointermove', { buttons: 1, clientX: 5 })
    fire(t)
    fire('pointerup')
    fire('pointermove', { buttons: 1, clientX: 9 })
    expect(moves).toEqual([5])
    expect(ends).toBe(1)
    expect(live()).toBe(0)
  })

  it('ends on a move with no button held, without moving', () => {
    const moves: number[] = []
    let ends = 0
    followPointer(e => moves.push((e as { clientX: number }).clientX), () => ends++)
    fire('pointermove', { buttons: 0, clientX: 7 })
    expect(moves).toEqual([])
    expect(ends).toBe(1)
  })

  it('the returned stop ends it once', () => {
    let ends = 0
    const stop = followPointer(() => {}, () => ends++)
    stop(); stop(); fire('pointerup')
    expect(ends).toBe(1)
  })
})
