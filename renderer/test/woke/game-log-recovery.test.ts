// The app can start before the game: Client.txt not found at first mustn't
// stick once it's there.
import { afterEach, describe, it, expect, vi } from 'vitest'
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

type Listener = (e: any) => void

function mockHost (tails: Array<{ path: string | null, lines: string[] }>) {
  const listeners = new Map<string, Listener>()
  const requests = { count: 0 }
  vi.doMock('@/web/background/IPC', () => ({
    Host: {
      onEvent: (name: string, cb: Listener) => {
        listeners.set(name, cb)
        return { abort () {} }
      }
    }
  }))
  vi.doMock('@/web/woke/shared/host', () => ({
    hostRequest: async () => {
      requests.count++
      return tails.length > 1 ? tails.shift() : tails[0]
    }
  }))
  return { requests, emit: (name: string, payload: unknown) => listeners.get(name)!(payload) }
}

const AT_12 = '2026/11/04 12:05:00 1 2 [INFO Client 1] : You have entered Lioneye\'s Watch.'
const NEXT = '2026/11/04 12:06:00 1 2 [INFO Client 1] : You have entered The Coast.'
const LOG = { path: 'F:\Client.txt', lines: [AT_12] }
const MISSING = { path: null, lines: [] }
const OPENED = 'MAIN->CLIENT::game-log-opened'

describe('Client.txt found late', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
    vi.doUnmock('@/web/background/IPC')
    vi.doUnmock('@/web/woke/shared/host')
  })

  it('tells onTail again and replays what it missed', async () => {
    vi.useFakeTimers()
    vi.resetModules()
    const host = mockHost([MISSING, MISSING, MISSING, MISSING, LOG])
    const { followGameLog } = await import('@/web/woke/shared/game-log')
    const tails: Array<string | null> = []
    const got: Array<[string, boolean]> = []
    followGameLog({
      since: () => 0,
      onTail: tail => tails.push(tail.path),
      onLines: (lines, live) => { for (const l of lines) got.push([l.ev?.kind ?? 'other', live]) }
    })
    await vi.advanceTimersByTimeAsync(11_000)
    expect(tails).toEqual([null])
    const asked = host.requests.count
    await vi.advanceTimersByTimeAsync(60_000)
    expect(host.requests.count).toBe(asked) // No polling while it's missing.

    host.emit(OPENED, { path: LOG.path })
    await vi.advanceTimersByTimeAsync(0)
    expect(tails).toEqual([null, LOG.path])
    expect(got).toEqual([['zone', false]])

    // Found stays found: a later open doesn't read the tail again.
    host.emit(OPENED, { path: LOG.path })
    await vi.advanceTimersByTimeAsync(0)
    expect(tails).toHaveLength(2)
  })

  it('holds live lines back until the late replay is done, in order', async () => {
    vi.useFakeTimers()
    vi.resetModules()
    const host = mockHost([MISSING, MISSING, MISSING, MISSING, LOG])
    const { followGameLog } = await import('@/web/woke/shared/game-log')
    const got: boolean[] = []
    followGameLog({ since: () => 0, onLines: (lines, live) => { got.push(live) } })
    await vi.advanceTimersByTimeAsync(11_000)
    host.emit(OPENED, { path: LOG.path })
    host.emit('MAIN->CLIENT::game-log', { lines: [AT_12] })
    expect(got).toEqual([])
    await vi.advanceTimersByTimeAsync(0)
    expect(got).toEqual([false, true])
  })

  it('catches an open that lands after the last try saw nothing', async () => {
    vi.useFakeTimers()
    vi.resetModules()
    const host = mockHost([MISSING, MISSING, MISSING, MISSING, LOG])
    const { followGameLog } = await import('@/web/woke/shared/game-log')
    const tails: Array<string | null> = []
    followGameLog({ since: () => null, onTail: tail => tails.push(tail.path), onLines: () => {} })
    await vi.advanceTimersByTimeAsync(9_000)
    host.emit(OPENED, { path: LOG.path })
    await vi.advanceTimersByTimeAsync(2_000)
    expect(tails).toEqual([null, LOG.path])
  })

  it('every follower recovers, from one read', async () => {
    vi.useFakeTimers()
    vi.resetModules()
    const host = mockHost([MISSING, MISSING, MISSING, MISSING, LOG])
    const { followGameLog } = await import('@/web/woke/shared/game-log')
    const a: Array<string | null> = []
    const b: Array<string | null> = []
    followGameLog({ since: () => null, onTail: t => a.push(t.path), onLines: () => {} })
    followGameLog({ since: () => null, onTail: t => b.push(t.path), onLines: () => {} })
    await vi.advanceTimersByTimeAsync(11_000)
    const asked = host.requests.count
    host.emit(OPENED, { path: LOG.path })
    await vi.advanceTimersByTimeAsync(0)
    expect(a).toEqual([null, LOG.path])
    expect(b).toEqual([null, LOG.path])
    expect(host.requests.count).toBe(asked + 1)
  })
})

describe('moving to another log', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.resetModules()
    vi.doUnmock('@/web/background/IPC')
    vi.doUnmock('@/web/woke/shared/host')
  })

  it('reads the new log\'s tail once, and shares it', async () => {
    vi.useFakeTimers()
    vi.resetModules()
    const REAL = { path: 'F:\\real\\Client.txt', lines: [AT_12] }
    const host = mockHost([LOG, REAL])
    const { followGameLog } = await import('@/web/woke/shared/game-log')
    const a: Array<string | null> = []
    const b: Array<string | null> = []
    const got: boolean[] = []
    followGameLog({ since: () => 0, onTail: t => a.push(t.path), onLines: (_l, live) => got.push(live) })
    followGameLog({ since: () => null, onTail: t => b.push(t.path), onLines: () => {} })
    await vi.advanceTimersByTimeAsync(0)
    expect(a).toEqual([LOG.path])
    expect(host.requests.count).toBe(1)

    host.emit(OPENED, { path: REAL.path })
    await vi.advanceTimersByTimeAsync(0)
    expect(a).toEqual([LOG.path, REAL.path])
    expect(b).toEqual([LOG.path, REAL.path])
    expect(host.requests.count).toBe(2)
    expect(got).toEqual([false, false])

    // The same log reopened (rotated or cleared): nothing to read again.
    host.emit(OPENED, { path: REAL.path })
    await vi.advanceTimersByTimeAsync(0)
    expect(host.requests.count).toBe(2)
  })
})

describe('GameLogWatcher', () => {
  it('waits for a set path that does not exist yet, then follows it', async () => {
    const { GameLogWatcher } = await import('../../../main/src/host-files/GameLogWatcher')
    const { readGameLogTail } = await import('../../../main/src/woke/game-log-tail')
    const dir = mkdtempSync(join(tmpdir(), 'woke-log-'))
    const file = join(dir, 'Client.txt')
    const events: Array<{ name: string, payload: any }> = []
    const server = { sendEventTo: (_to: string, e: { name: string, payload: unknown }) => events.push(e) }
    const watcher = new GameLogWatcher(server as never, { write () {} } as never)
    try {
      await watcher.restart(file)
      expect(events).toEqual([])
      expect(await readGameLogTail(watcher, undefined)).toEqual({ path: null, lines: [] })

      // What's already in it isn't live: that comes from the tail, once.
      writeFileSync(file, `${AT_12}\n`)
      await vi.waitFor(() => { expect(events.length).toBe(1) }, { timeout: 5000 })
      expect(events[0]).toEqual({ name: 'MAIN->CLIENT::game-log-opened', payload: { path: file } })
      expect(await readGameLogTail(watcher, undefined)).toEqual({ path: file, lines: [AT_12] })

      appendFileSync(file, `${NEXT}\n`)
      await vi.waitFor(() => { expect(events.length).toBe(2) }, { timeout: 5000 })
      expect(events[1]).toEqual({ name: 'MAIN->CLIENT::game-log', payload: { lines: [NEXT] } })
    } finally {
      await watcher.stop()
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
