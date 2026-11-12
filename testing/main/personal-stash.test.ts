// The personal stash reader (main/src/woke/personal): off without
// personal.flag, the rate limiter, the reply parser and a whole read against
// fixtures. No live calls.
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { initPersonal, personalFlagOn, PERSONAL_FLAG } from '../../main/src/woke/personal'
import { RateLimiter, parseRateHeaders, parseRetryAfter } from '../../main/src/woke/personal/rate-limit'
import { entersHideout, parseStashReply, StashApiError } from '../../main/src/woke/personal/stash-parse'
import { StashReader, readCache, AUTO_TABS } from '../../main/src/woke/personal/stash-reader'
import type { HttpReply, ReaderStatus } from '../../main/src/woke/personal/stash-reader'

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'stash', name), 'utf8')

function fakeContext () {
  const ops: string[] = []
  const gameLog = { onLines: null as ((lines: string[]) => void) | null }
  return {
    ops,
    gameLog,
    ctx: {
      register: (op: string) => { ops.push(op) },
      broadcast: () => {},
      logger: { write: () => {} } as never,
      gameLog: gameLog as never
    }
  }
}

beforeEach(() => {
  process.env.WOKE_FAKE_USER_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-personal-'))
})

describe('personal.flag gate', () => {
  it('registers nothing and leaves the game log alone without the flag', () => {
    const { ops, gameLog, ctx } = fakeContext()
    expect(personalFlagOn()).toBe(false)
    expect(initPersonal(ctx)).toBe(false)
    expect(ops).toEqual([])
    expect(gameLog.onLines).toBeNull()
  })

  it('a folder named personal.flag is not the flag', () => {
    fs.mkdirSync(path.join(process.env.WOKE_FAKE_USER_DATA!, PERSONAL_FLAG))
    expect(personalFlagOn()).toBe(false)
  })

  it('turns on with the flag', () => {
    fs.writeFileSync(path.join(process.env.WOKE_FAKE_USER_DATA!, PERSONAL_FLAG), '')
    const { ops, gameLog, ctx } = fakeContext()
    expect(initPersonal(ctx)).toBe(true)
    expect(ops).toContain('stash-read')
    expect(ops).toContain('stash-sign-in')
    expect(gameLog.onLines).toBeTypeOf('function')
  })
})

describe('rate limit headers', () => {
  const headers = {
    'X-Rate-Limit-Rules': 'Account,Ip',
    'X-Rate-Limit-Account': '45:60:60,240:240:900',
    'X-Rate-Limit-Account-State': '3:60:0,10:240:0',
    'x-rate-limit-ip': '60:60:120',
    'x-rate-limit-ip-state': '1:60:0'
  }

  it('reads rules, windows and state', () => {
    const rules = parseRateHeaders(headers)
    expect(rules.map(r => r.name)).toEqual(['Account', 'Ip'])
    expect(rules[0].windows).toEqual([{ max: 45, period: 60, penalty: 60 }, { max: 240, period: 240, penalty: 900 }])
    expect(rules[0].state[1]).toEqual({ hits: 10, period: 240, active: 0 })
  })

  it('reads Retry-After as seconds or a date', () => {
    expect(parseRetryAfter('30', 1000)).toBe(31_000)
    expect(parseRetryAfter('nonsense', 0)).toBeNull()
    expect(parseRetryAfter(undefined, 0)).toBeNull()
  })
})

describe('RateLimiter', () => {
  it('spaces calls by the short window, using only part of it', () => {
    const rl = new RateLimiter({ minGapMs: 1000, share: 0.5, assumed: [{ max: 10, period: 10, penalty: 10 }] })
    expect(rl.delay(0)).toBe(0)
    rl.record(0)
    // 10 per 10 s at half share: one call every 2 s.
    expect(rl.delay(500)).toBe(1500)
    expect(rl.delay(2000)).toBe(0)
  })

  it('waits for the window to free once its share is used', () => {
    const rl = new RateLimiter({ minGapMs: 0, share: 1, assumed: [{ max: 3, period: 600, penalty: 60 }] })
    rl.record(0); rl.record(1000); rl.record(2000)
    // Long window: no pacing, but full until the first call drops out.
    expect(rl.delay(3000)).toBe(597_000)
  })

  it('counts hits the server reports that we did not make', () => {
    const rl = new RateLimiter({ minGapMs: 0, share: 1, assumed: [] })
    rl.update(200, { 'x-rate-limit-rules': 'Account', 'x-rate-limit-account': '5:300:60', 'x-rate-limit-account-state': '5:300:0' }, 10_000)
    expect(rl.delay(10_000)).toBe(300_000)
  })

  it('honours a penalty in the state and Retry-After on 429', () => {
    const rl = new RateLimiter()
    rl.update(200, { 'x-rate-limit-rules': 'Account', 'x-rate-limit-account': '45:60:60', 'x-rate-limit-account-state': '46:60:42' }, 0)
    expect(rl.delay(0)).toBe(42_000)
    const rl2 = new RateLimiter()
    rl2.update(429, { 'retry-after': '120' }, 0)
    expect(rl2.delay(1000)).toBe(119_000)
  })
})

describe('stash reply parser', () => {
  it('reads tabs and currency', () => {
    const r = parseStashReply(fixture('tab-list.json'))
    expect(r.tabs!.map(t => [t.index, t.name, t.colour])).toEqual([[0, 'Currency', '#7c5436'], [1, 'Dump', '#000000'], [2, 'Old (Remove-only)', '#ffffff']])
    expect(r.items).toEqual([
      { name: '', typeLine: 'Divine Orb', baseType: 'Divine Orb', frame: 5, stack: 12, icon: 'https://web.poecdn.com/divine.png' },
      { name: '', typeLine: 'Chaos Orb', baseType: 'Chaos Orb', frame: 5, stack: 340, icon: 'https://web.poecdn.com/chaos.png' }
    ])
  })

  it('reads gear, gems, maps and cards, and skips broken items', () => {
    const r = parseStashReply(fixture('tab-dump.json'))
    expect(r.tabs).toBeNull()
    expect(r.items).toHaveLength(5)
    const [hh, gem, body, map, card] = r.items
    expect(hh.name).toBe('Headhunter')
    expect(hh.mods).toHaveLength(3)
    expect(gem).toMatchObject({ gemLevel: 5, quality: 20, corrupted: true, frame: 4 })
    expect(body).toMatchObject({ links: 3, frame: 2 })
    expect(body.mods).toEqual(['+90 to maximum Life', '+20% to Fire Resistance'])
    expect(map.mapTier).toBe(16)
    expect(card).toMatchObject({ typeLine: 'The Apothecary', stack: 3, frame: 6 })
  })

  it('turns an error reply into an error', () => {
    expect(() => parseStashReply('{"error":{"code":6,"message":"Forbidden"}}')).toThrow(StashApiError)
    expect(() => parseStashReply('<html>')).toThrow(StashApiError)
  })

  it('spots entering a hideout', () => {
    expect(entersHideout(['2026/11/12 10:00:00 1 2 [DEBUG Client 1] Generating level 1 area "HideoutCelestial" with seed 1'])).toBe(true)
    expect(entersHideout(['2026/11/12 10:00:00 1 2 [DEBUG Client 1] Generating level 83 area "MapWorldsStrand" with seed 1'])).toBe(false)
  })
})

describe('StashReader', () => {
  const RATE = { 'x-rate-limit-rules': 'Account', 'x-rate-limit-account': '45:60:60', 'x-rate-limit-account-state': '1:60:0' }

  function makeReader (answer: (url: URL) => HttpReply) {
    let clock = 1_000_000
    const calls: URL[] = []
    const statuses: ReaderStatus[] = []
    const reader = new StashReader({
      fetch: async (url) => { const u = new URL(url); calls.push(u); return answer(u) },
      now: () => clock,
      sleep: async (ms) => { clock += ms },
      onStatus: (s) => { statuses.push(s) }
    })
    return { reader, calls, statuses, advance: (ms: number) => { clock += ms } }
  }

  const normal = (u: URL): HttpReply => {
    if (u.pathname.endsWith('get-account-name')) return { status: 200, headers: {}, body: '{"accountName":"Guy#1234"}' }
    const tab = Number(u.searchParams.get('tabIndex'))
    return { status: 200, headers: RATE, body: tab === 0 ? fixture('tab-list.json') : fixture('tab-dump.json') }
  }

  it('reads every tab and caches them', async () => {
    const { reader, calls } = makeReader(normal)
    await reader.setLeague('Mercenaries')
    const s = await reader.read('manual')
    expect(s.error).toBeNull()
    const stash = calls.filter(u => u.pathname.endsWith('get-stash-items'))
    expect(stash.map(u => u.searchParams.get('tabIndex'))).toEqual(['0', '1', '2'])
    expect(stash[0].searchParams.get('accountName')).toBe('Guy#1234')
    expect(stash[0].searchParams.get('tabs')).toBe('1')
    const cache = await readCache('Mercenaries')
    expect(cache!.tabs.map(t => t.items.length)).toEqual([2, 5, 5])
  })

  it('stops when signed out', async () => {
    const { reader, calls } = makeReader((u) => u.pathname.endsWith('get-account-name')
      ? { status: 200, headers: {}, body: '{"accountName":"Guy#1234"}' }
      : { status: 403, headers: RATE, body: '' })
    await reader.setLeague('Mercenaries')
    const s = await reader.read('manual')
    expect(s.error?.kind).toBe('signed-out')
    expect(s.account).toBeNull()
    expect(calls.filter(u => u.pathname.endsWith('get-stash-items'))).toHaveLength(1)
  })

  it('stops on 429 and keeps what it read', async () => {
    const { reader } = makeReader((u) => {
      if (u.searchParams.get('tabIndex') === '2') return { status: 429, headers: { ...RATE, 'retry-after': '300' }, body: '' }
      return normal(u)
    })
    await reader.setLeague('Mercenaries')
    const s = await reader.read('manual')
    expect(s.error?.kind).toBe('rate-limited')
    expect(s.error?.retryAt).toBeGreaterThan(0)
    expect(s.waiting).toBe(1)
    const cache = await readCache('Mercenaries')
    expect(cache!.tabs.map(t => t.readAt != null)).toEqual([true, true, false])
  })

  it('quiet reads skip remove-only tabs already read, and wait 10 minutes', async () => {
    const { reader, calls, advance } = makeReader(normal)
    await reader.setLeague('Mercenaries')
    await reader.read('manual')
    calls.length = 0
    expect(reader.readIfDue()).toBeNull()
    advance(11 * 60 * 1000)
    await reader.readIfDue()
    const stash = calls.filter(u => u.pathname.endsWith('get-stash-items'))
    expect(stash.map(u => u.searchParams.get('tabIndex'))).toEqual(['0', '1'])
    expect(AUTO_TABS).toBeGreaterThan(2)
  })
})

describe('StashReader quiet reads after a failure', () => {
  it('does not retry at every hideout', async () => {
    let clock = 5_000_000
    let calls = 0
    const reader = new StashReader({
      fetch: async () => { calls++; return { status: 500, headers: {}, body: '' } },
      now: () => clock,
      sleep: async (ms) => { clock += ms },
      onStatus: () => {}
    })
    reader.account = 'Guy#1234'
    await reader.setLeague('Mercenaries')
    await reader.readIfDue()
    expect(calls).toBe(1)
    clock += 60_000
    expect(reader.readIfDue()).toBeNull()
    clock += 10 * 60_000
    await reader.readIfDue()
    expect(calls).toBe(2)
  })
})

describe('review fixes', () => {
  const ok = { status: 200, headers: {}, body: '{"accountName":"Guy#1234"}' }

  it('a busy or Cloudflare answer is not a sign-out', async () => {
    const { fetchAccountName } = await import('../../main/src/woke/personal/stash-reader')
    expect(await fetchAccountName(async () => ({ status: 503, headers: {}, body: '' }))).toBeUndefined()
    expect(await fetchAccountName(async () => ({ status: 403, headers: {}, body: '<html>cf</html>' }))).toBeUndefined()
    expect(await fetchAccountName(async () => ({ status: 401, headers: {}, body: '' }))).toBeNull()
    expect(await fetchAccountName(async () => ok)).toBe('Guy#1234')
  })

  it('a league switch mid-read keeps the old run out of the new league', async () => {
    let clock = 9_000_000
    let switchNow: (() => Promise<void>) | null = null
    const reader: StashReader = new StashReader({
      fetch: async (url) => {
        const u = new URL(url)
        if (u.pathname.endsWith('get-account-name')) return ok
        if (u.searchParams.get('tabIndex') === '1' && switchNow) { const f = switchNow; switchNow = null; await f() }
        return { status: 200, headers: {}, body: u.searchParams.get('tabIndex') === '0' ? fixture('tab-list.json') : fixture('tab-dump.json') }
      },
      now: () => clock,
      sleep: async (ms) => { clock += ms },
      onStatus: () => {}
    })
    await reader.setLeague('Mercenaries')
    switchNow = async () => { await reader.setLeague('Standard') }
    const s = await reader.read('manual')
    expect(s.league).toBe('Standard')
    expect(s.lastReadAt).toBeNull()
    expect(s.running).toBe(false)
  })

  it('a sign-out during a read stays', async () => {
    let clock = 9_000_000
    const reader: StashReader = new StashReader({
      fetch: async (url) => {
        const u = new URL(url)
        if (u.searchParams.get('tabIndex') === '1') reader.signedOut()
        return { status: 200, headers: {}, body: u.searchParams.get('tabIndex') === '0' ? fixture('tab-list.json') : fixture('tab-dump.json') }
      },
      now: () => clock,
      sleep: async (ms) => { clock += ms },
      onStatus: () => {}
    })
    reader.account = 'Guy#1234'
    await reader.setLeague('Mercenaries')
    const s = await reader.read('manual')
    expect(s.error?.kind).toBe('signed-out')
  })
})
