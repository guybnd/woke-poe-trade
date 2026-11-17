// Price history files (main/src/woke/market-store.ts): a save that changes
// nothing is skipped, and the day's rows are made from the snapshot.
import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { dailyRows, marketHandlers } from '../../main/src/woke/market-store'

const DAY = 24 * 3600 * 1000
const T0 = Date.UTC(2026, 10, 17, 10)
const item = (name: string, chaos: number) => ({ type: 'currency', name, variant: '', chaos, d1: 1, d7: 2 })
const snap = (league: string, ts: number, chaos = 5) => ({ league, ts, divine: 200, items: [item('Chaos Orb', 1), item('Exalted Orb', chaos)] })
const save = (s: unknown) => marketHandlers['market-save']!({ snapshot: s } as never)
const snapshots = (league: string) => fs.readdirSync(path.join(process.env.WOKE_FAKE_USER_DATA!, 'woke-market', league, 'snapshots'))

describe('price history saves', () => {
  beforeEach(() => {
    process.env.WOKE_FAKE_USER_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-market-'))
  })

  it('makes the day rows from the snapshot, without the 1/7 day changes', async () => {
    expect(dailyRows(snap('A', T0))[1]).toEqual({ league: 'A', date: '2026-11-17', divine: 200, ts: T0, type: 'currency', name: 'Exalted Orb', variant: '', chaos: 5 })
    await save(snap('A', T0))
    const rows = await marketHandlers['market-daily-date']!({ league: 'A', date: '2026-11-17' } as never) as unknown[]
    expect(rows).toHaveLength(2)
  })

  const dayFile = (league: string, date = '2026-11-17') => path.join(process.env.WOKE_FAKE_USER_DATA!, 'woke-market', league, 'daily', `${date}.json`)

  it('keeps every snapshot, but leaves the day rows alone when prices repeat', async () => {
    await save(snap('B', T0))
    const written = fs.statSync(dayFile('B')).mtimeMs
    fs.utimesSync(dayFile('B'), 1, 1)
    await save(snap('B', T0 + 60_000))
    expect(snapshots('B')).toHaveLength(2)
    expect(fs.statSync(dayFile('B')).mtimeMs).toBe(1000)
    await save(snap('B', T0 + 120_000, 6))
    expect(snapshots('B')).toHaveLength(3)
    expect(fs.statSync(dayFile('B')).mtimeMs).toBeGreaterThanOrEqual(written)
  })

  it('compares with the newest snapshot on disk when it has none in memory', async () => {
    // As written by an earlier run, whose day rows are already there.
    await marketHandlers['market-save']!({ snapshot: snap('C', T0), daily: dailyRows(snap('C', T0)) } as never)
    fs.utimesSync(dayFile('C'), 1, 1)
    await save(snap('C', T0 + 60_000))
    expect(fs.statSync(dayFile('C')).mtimeMs).toBe(1000)
  })

  it('still saves unchanged prices on a new day, so the day gets its rows', async () => {
    await save(snap('D', T0))
    await save(snap('D', T0 + DAY))
    expect(snapshots('D')).toHaveLength(2)
    const rows = await marketHandlers['market-daily-date']!({ league: 'D', date: '2026-11-18' } as never) as unknown[]
    expect(rows).toHaveLength(2)
  })
})
