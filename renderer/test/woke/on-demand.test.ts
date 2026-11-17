// On-click trade searches: one lane, answers kept by request.
import { beforeEach, describe, expect, it } from 'vitest'
import { askOnce, inLane, keepAnswer, keptAnswer, keptCount, resetOnDemand, useOnDemandQuote, ON_DEMAND_FRESH_MS, ON_DEMAND_MAX_ANSWERS } from '@/web/woke/shared/on-demand'

beforeEach(resetOnDemand)

const later = () => {
  let done!: (v: number) => void
  const p = new Promise<number>(resolve => { done = resolve })
  return { p, done }
}

describe('inLane', () => {
  it('runs one search at a time, in order, and goes on after a failure', async () => {
    const order: string[] = []
    const a = later()
    const first = inLane(async () => { order.push('a start'); const v = await a.p; order.push('a end'); return v })
    const failed = inLane(async () => { order.push('b'); throw new Error('no') })
    const third = inLane(async () => { order.push('c'); return 3 })
    await Promise.resolve()
    expect(order).toEqual(['a start'])
    a.done(1)
    expect(await first).toBe(1)
    await expect(failed).rejects.toThrow('no')
    expect(await third).toBe(3)
    expect(order).toEqual(['a start', 'a end', 'b', 'c'])
  })
})

describe('askOnce', () => {
  it('searches a request once: kept after, shared while running', async () => {
    let calls = 0
    const work = async () => { calls++; return 7 }
    const [x, y] = await Promise.all([askOnce('q', work), askOnce('q', work)])
    expect([x, y, calls]).toEqual([7, 7, 1])
    expect(await askOnce('q', work)).toBe(7)
    expect(calls).toBe(1)
    expect(keptAnswer('q')).toBe(7)
    expect(keptAnswer('q', Date.now() + ON_DEMAND_FRESH_MS + 1)).toBeUndefined()
  })

  it('keeps nothing from a failed search', async () => {
    await expect(askOnce('bad', async () => { throw new Error('rate') })).rejects.toThrow('rate')
    expect(keptAnswer('bad')).toBeUndefined()
  })
})

describe('useOnDemandQuote', () => {
  it('a row loads, then is done; a kept answer shows without asking', async () => {
    const q = useOnDemandQuote<number>()
    const asked = q.ask('row', 'req', async () => 5)
    expect(q.rowOf('row', 'req')?.state).toBe('loading')
    await asked
    expect(q.rowOf('row', 'req')).toMatchObject({ state: 'done', value: 5 })
    q.clear()
    expect(q.rowOf('row', 'req')).toMatchObject({ state: 'done', value: 5 })
    expect(q.rowOf('row', 'other')).toBeUndefined()
  })

  it('a failed row says why and can be asked again', async () => {
    const q = useOnDemandQuote<number>()
    await q.ask('row', 'req2', async () => { throw new Error('Retry after 5 seconds') })
    expect(q.rowOf('row', 'req2')).toMatchObject({ state: 'error', error: 'Retry after 5 seconds' })
    await q.ask('row', 'req2', async () => 9)
    expect(q.rowOf('row', 'req2')).toMatchObject({ state: 'done', value: 9 })
  })
})

describe('kept answers', () => {
  it('drop when read after they expire', () => {
    keepAnswer('old', 1, 0)
    expect(keptCount()).toBe(1)
    expect(keptAnswer('old', ON_DEMAND_FRESH_MS + 1)).toBeUndefined()
    expect(keptCount()).toBe(0)
  })

  it('drop expired ones and the oldest past the cap when a new one comes', () => {
    keepAnswer('stale', 1, 0)
    keepAnswer('fresh', 2, ON_DEMAND_FRESH_MS + 1)
    expect(keptCount()).toBe(1)
    for (let i = 0; i < ON_DEMAND_MAX_ANSWERS + 5; i++) keepAnswer(`k${i}`, i, ON_DEMAND_FRESH_MS + 2)
    expect(keptCount()).toBe(ON_DEMAND_MAX_ANSWERS)
    expect(keptAnswer('k0', ON_DEMAND_FRESH_MS + 2)).toBeUndefined()
    expect(keptAnswer(`k${ON_DEMAND_MAX_ANSWERS + 4}`, ON_DEMAND_FRESH_MS + 2)).toBe(ON_DEMAND_MAX_ANSWERS + 4)
  })
})
