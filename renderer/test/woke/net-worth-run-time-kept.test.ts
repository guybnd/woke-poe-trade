import { describe, it, expect, vi } from 'vitest'
vi.mock('@/web/woke/shared/host', () => ({
  // A Client.txt that no longer has the run's days (deleted, started over).
  hostRequest: async () => ({ path: 'C:/PoE/logs/Client.txt', lines: [] })
}))
const { runTimeIn, timeOrKept } = await import('@/web/woke/net-worth/run-time')
const { runPerHour } = await import('@/web/woke/net-worth/runs')

const H = 3_600_000

describe('a past run whose Client.txt days are gone', () => {
  const kept = { map: 1 * H, play: 0, hub: 0.5 * H, off: 0.5 * H }

  it('reads as no time, so the time Stop kept stands', async () => {
    const read = await runTimeIn(10 * H, 12 * H)
    expect(read?.ms.off).toBe(2 * H)
    const t = timeOrKept(read, kept)
    expect(t?.ms).toEqual(kept)
    expect(runPerHour(1000, 2 * H, t?.ms, 'play')).toBe(runPerHour(1000, 2 * H, kept, 'play'))
  })

  it('a read with play in it wins, and a live run (nothing kept) keeps its away time', () => {
    const read = { ms: { map: H, play: 0, hub: 0, off: H }, fights: 1 }
    expect(timeOrKept(read, kept)).toBe(read)
    const away = { ms: { map: 0, play: 0, hub: 0, off: 2 * H }, fights: 0 }
    expect(timeOrKept(away, undefined)).toBe(away)
    expect(timeOrKept(null, kept)?.ms).toEqual(kept)
  })
})

describe('a past run whose Client.txt lost some of its days', () => {
  it('keeps the time Stop saved when it has more play than the read', () => {
    const kept = { map: 3 * H, play: 0, hub: H, off: 0 }
    const partial = { ms: { map: H, play: 0, hub: 0, off: 3 * H }, fights: 0 }
    expect(timeOrKept(partial, kept, true)?.ms).toEqual(kept)
    // The live run's glance doesn't win over a read with play in it.
    expect(timeOrKept(partial, kept)).toBe(partial)
  })
})
