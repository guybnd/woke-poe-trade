// The league list is read once at launch. A failed read keeps last launch's
// list and tries again; a league that opened since then is offered, once.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { leagueRetryDelay, newLeagueOffer, rememberLeagues } from '@/web/woke/shared/league-pick'

const API = (ids: string[]) => ids.map(id => ({ id, rules: [] as Array<{ id: string }> }))

let config: Record<string, any>
let proxy: ReturnType<typeof vi.fn>

vi.mock('@/web/Config', () => ({
  AppConfig: () => config,
  poeWebApi: () => 'www.pathofexile.com'
}))
vi.mock('@/web/background/IPC', () => ({ Host: { proxy: (...args: unknown[]) => proxy(...args) } }))

async function freshLeagues () {
  vi.resetModules()
  const { useLeagues } = await import('@/web/background/Leagues')
  return useLeagues()
}

const ok = (ids: string[]) => ({ ok: true, headers: new Map(), json: async () => API(ids) })

beforeEach(() => {
  config = { leagueId: 'Allflame', realm: 'pc-ggg' }
  proxy = vi.fn()
  vi.useFakeTimers()
})
afterEach(() => { vi.useRealTimers() })

describe('newLeagueOffer', () => {
  it('offers nothing on a first run', () => {
    expect(newLeagueOffer(['Standard', 'Allflame'], undefined, 'Allflame')).toBeNull()
  })
  it('offers a softcore league that is new since last launch', () => {
    expect(newLeagueOffer(['Standard', 'Veilborn', 'Hardcore Veilborn', 'Allflame'], ['Standard', 'Allflame'], 'Allflame')).toBe('Veilborn')
  })
  it('offers the hardcore one to a hardcore player', () => {
    expect(newLeagueOffer(['Standard', 'Veilborn', 'Hardcore Veilborn'], ['Standard', 'Hardcore Allflame'], 'Hardcore Allflame')).toBe('Hardcore Veilborn')
  })
  it('does not offer the league already picked', () => {
    expect(newLeagueOffer(['Standard', 'Veilborn'], ['Standard'], 'Veilborn')).toBeNull()
  })
  it('remembers leagues without growing forever', () => {
    expect(rememberLeagues(['a'], ['b', 'a'])).toEqual(['a', 'b'])
    expect(rememberLeagues([], Array.from({ length: 60 }, (_, i) => `L${i}`))).toHaveLength(40)
  })
  it('waits 1, 2, then 5 minutes', () => {
    expect([1, 2, 3, 9].map(leagueRetryDelay)).toEqual([60_000, 120_000, 300_000, 300_000])
  })
})

describe('reading the list at launch', () => {
  it('keeps last launch\'s league when GGG fails, and tries again', async () => {
    config.woke = { setupDone: true, off: [], leagues: { list: ['Standard', 'Allflame'], known: ['Standard', 'Allflame'] } }
    proxy.mockRejectedValue(new Error('down'))
    const leagues = await freshLeagues()
    await leagues.load()
    expect(leagues.error.value).toBe('down')
    expect(leagues.selectedId.value).toBe('Allflame')
    expect(proxy).toHaveBeenCalledTimes(1)

    proxy.mockResolvedValue(ok(['Standard', 'Allflame']))
    await vi.advanceTimersByTimeAsync(60_000)
    expect(proxy).toHaveBeenCalledTimes(2)
    expect(leagues.error.value).toBeNull()
    // Answered: no more reads.
    await vi.advanceTimersByTimeAsync(60 * 60_000)
    expect(proxy).toHaveBeenCalledTimes(2)
  })

  it('offers a new league once, and remembers the answer', async () => {
    config.woke = { setupDone: true, off: [], leagues: { list: ['Standard', 'Allflame'], known: ['Standard', 'Allflame'] } }
    proxy.mockResolvedValue(ok(['Standard', 'Veilborn', 'Hardcore Veilborn', 'Allflame']))
    const leagues = await freshLeagues()
    await leagues.load()
    expect(leagues.offer.value).toBe('Veilborn')
    expect(leagues.selectedId.value).toBe('Allflame')
    leagues.settleOffer(true)
    expect(config.leagueId).toBe('Veilborn')
    expect(leagues.offer.value).toBeNull()
    expect(config.woke.leagues.known).toContain('Veilborn')

    const again = await freshLeagues()
    await again.load()
    expect(again.offer.value).toBeNull()
  })

  it('keeps the offer for next launch when it was not answered', async () => {
    config.woke = { setupDone: true, off: [], leagues: { list: ['Standard', 'Allflame'], known: ['Standard', 'Allflame'] } }
    proxy.mockResolvedValue(ok(['Standard', 'Veilborn', 'Allflame']))
    await (await freshLeagues()).load()
    const again = await freshLeagues()
    await again.load()
    expect(again.offer.value).toBe('Veilborn')
  })

  it('remembers the list on a first run without offering', async () => {
    proxy.mockResolvedValue(ok(['Standard', 'Allflame']))
    const leagues = await freshLeagues()
    await leagues.load()
    expect(leagues.offer.value).toBeNull()
    expect(config.woke.leagues).toEqual({ list: ['Standard', 'Allflame'], known: ['Standard', 'Allflame'] })
  })
})
