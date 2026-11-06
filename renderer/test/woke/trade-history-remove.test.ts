import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LOG_REPLAY_MS, alreadyClosed, replayCouldReopen } from '@/web/woke/trade/book'
import type { Offer } from '@/web/woke/trade/book'

const host = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('@/web/woke/shared/host', () => ({ hostRequest: host.request }))

const NOW = 1_800_000_000_000
const closedAgo = (id: string, ms: number) => ({
  id, dir: 'sell', who: 'Ignithor', item: 'Praxis, Paua Ring', at: NOW - ms - 1000, closedAt: NOW - ms, closed: 'dismissed', traded: false
}) as unknown as Offer

async function freshHistory (saved: Offer[] = []) {
  vi.resetModules()
  host.request.mockReset()
  host.request.mockImplementation(async (name: string) => name === 'offer-history-list' ? saved : true)
  const { useOfferHistory } = await import('@/web/woke/trade/log-store')
  const history = useOfferHistory()
  await history.load()
  return history
}
const calls = (name: string) => host.request.mock.calls.filter(c => c[0] === name).map(c => c[1])

describe('removing an offer from the history', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] })
  })

  it('deletes one a restart can no longer read back', async () => {
    const old = closedAgo('old', LOG_REPLAY_MS + 1000)
    const history = await freshHistory([old])
    await history.discard(old, NOW)
    expect(history.offers.value).toEqual([])
    expect(calls('offer-history-delete')).toEqual([{ id: 'old' }])
    expect(calls('offer-history-add')).toEqual([])
  })

  it('keeps one a restart could read back, hidden and still closing the whisper', async () => {
    const recent = closedAgo('recent', 60_000)
    const history = await freshHistory([recent])
    await history.discard(recent, NOW)
    const rec = history.get('recent')!
    expect(rec.removedAt).toBe(NOW)
    expect(calls('offer-history-add')[0]).toMatchObject({ offer: { id: 'recent', removedAt: NOW } })
    expect(alreadyClosed(history.offers.value, recent)).toBe(true)
  })

  it('a newer whisper from them still counts as a new offer', async () => {
    const recent = closedAgo('recent', 60_000)
    const history = await freshHistory([recent])
    await history.discard(recent, NOW)
    expect(alreadyClosed(history.offers.value, { ...recent, at: NOW - 1000 })).toBe(false)
  })

  it('clears a hidden record once the restart window has passed', async () => {
    const stale = { ...closedAgo('stale', LOG_REPLAY_MS + 1000), removedAt: NOW - LOG_REPLAY_MS }
    const live = { ...closedAgo('live', 60_000), removedAt: NOW - 60_000 }
    const history = await freshHistory([stale, live])
    await vi.waitFor(() => expect(calls('offer-history-delete')).toEqual([{ id: 'stale' }]))
    expect(history.get('stale')).toBeUndefined()
    expect(history.get('live')).toBeDefined()
  })

  it('undo brings it back as a plain record', async () => {
    const recent = closedAgo('recent', 60_000)
    const history = await freshHistory([recent])
    await history.discard(recent, NOW)
    await history.add(recent)
    expect(history.get('recent')?.removedAt).toBeUndefined()
  })

  it('reopening a hidden record clears the mark', async () => {
    const recent = closedAgo('recent', 60_000)
    const history = await freshHistory([recent])
    await history.discard(recent, NOW)
    await history.markReopened('recent', NOW)
    expect(history.get('recent')?.removedAt).toBeNull()
  })

  it('puts the row back if the save fails', async () => {
    const old = closedAgo('old', LOG_REPLAY_MS + 1000)
    const history = await freshHistory([old])
    host.request.mockRejectedValueOnce(new Error('locked'))
    await expect(history.discard(old, NOW)).rejects.toThrow('locked')
    expect(history.get('old')).toBeDefined()
  })

  it('a failed save puts back only its own row', async () => {
    const a = closedAgo('a', LOG_REPLAY_MS + 1000)
    const b = closedAgo('b', LOG_REPLAY_MS + 2000)
    const history = await freshHistory([a, b])
    let fail: (err: Error) => void = () => {}
    host.request.mockImplementationOnce(() => new Promise((resolve, reject) => { fail = reject }))
    const first = history.discard(a, NOW)
    await history.discard(b, NOW)
    fail(new Error('locked'))
    await expect(first).rejects.toThrow('locked')
    expect(history.offers.value.map(o => o.id)).toEqual(['a'])
  })

  it("a read already on its way doesn't bring a deleted row back", async () => {
    const old = closedAgo('old', LOG_REPLAY_MS + 1000)
    const history = await freshHistory([old])
    let finish: (list: Offer[]) => void = () => {}
    host.request.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const reading = history.load()
    await history.discard(old, NOW)
    finish([old])
    await reading
    expect(history.get('old')).toBeUndefined()
  })

  it('undo of a record already hidden brings it back visible', async () => {
    const recent = closedAgo('recent', 60_000)
    const history = await freshHistory([recent])
    await history.discard(recent, NOW)
    await history.add(history.get('recent')!)
    expect(history.get('recent')?.removedAt).toBeUndefined()
  })

  it('draws the line at the restart window', () => {
    expect(replayCouldReopen({ closedAt: NOW - LOG_REPLAY_MS }, NOW)).toBe(true)
    expect(replayCouldReopen({ closedAt: NOW - LOG_REPLAY_MS - 1 }, NOW)).toBe(false)
  })
})
