// Market price history as files in the app's user data folder. It used to
// live in the overlay's IndexedDB, which belongs to the overlay's address:
// when port 8585 was taken and the app picked another one, the history
// looked empty. Files don't depend on the port.
//
// Layout: <userData>/woke-market/<league>/snapshots/<ts>.json
//                                          daily/<YYYY-MM-DD>.json (array)
import { promises as fs } from 'fs'
import path from 'path'
import { dataDir, readJson, safeName, writeAtomic } from './data-files'
import type { WokeHandlers } from '../../../ipc/woke-ops'

// Same as the renderer's types (market/types.ts); kept loose here.
interface Snapshot { league: string, ts: number, items: unknown[], divine: number | null }
interface DailyRow { league: string, date: string, type: string, name: string, variant: string, [k: string]: unknown }

const SNAPSHOT_RETENTION_MS = 3 * 24 * 60 * 60 * 1000

const root = () => dataDir('woke-market')
const IMPORTED_MARK = () => path.join(root(), 'imported-from-indexeddb')

function leagueDir (league: unknown): string {
  if (typeof league !== 'string' || !league) throw new Error('No league given.')
  // League names are short words with spaces; keep the folder name safe.
  return path.join(root(), safeName(league))
}


async function listNames (dir: string, ext: string): Promise<string[]> {
  try {
    return (await fs.readdir(dir)).filter(f => f.endsWith(ext)).map(f => f.slice(0, -ext.length))
  } catch {
    return []
  }
}

const rowKey = (r: DailyRow) => `${r.type}\u0000${r.name}\u0000${r.variant}`

// Daily rows of a league, by date, kept in memory once read: the history
// views read every day of the league for one item at a time.
const dailyCache = new Map<string, Promise<Map<string, DailyRow[]>>>()

function loadDaily (league: string): Promise<Map<string, DailyRow[]>> {
  let p = dailyCache.get(league)
  if (!p) {
    p = (async () => {
      const dir = path.join(leagueDir(league), 'daily')
      const out = new Map<string, DailyRow[]>()
      for (const date of await listNames(dir, '.json')) {
        const rows = await readJson<DailyRow[]>(path.join(dir, `${date}.json`))
        if (Array.isArray(rows)) out.set(date, rows)
      }
      return out
    })()
    dailyCache.set(league, p)
    p.catch(() => { dailyCache.delete(league) })
  }
  return p
}

// Writes are queued per league so two saves never interleave.
const queues = new Map<string, Promise<unknown>>()
function queued<T> (league: string, fn: () => Promise<T>): Promise<T> {
  const prev = queues.get(league) ?? Promise.resolve()
  const next = prev.catch(() => {}).then(fn)
  queues.set(league, next)
  return next
}

async function saveDaily (league: string, rows: DailyRow[]) {
  const byDate = new Map<string, DailyRow[]>()
  for (const r of rows) {
    const list = byDate.get(r.date)
    if (list) list.push(r)
    else byDate.set(r.date, [r])
  }
  const days = await loadDaily(league)
  for (const [date, fresh] of byDate) {
    // The latest snapshot of the day wins, item by item.
    const merged = new Map((days.get(date) ?? []).map(r => [rowKey(r), r]))
    for (const r of fresh) merged.set(rowKey(r), r)
    const list = [...merged.values()]
    days.set(date, list)
    await writeAtomic(path.join(leagueDir(league), 'daily', `${date}.json`), JSON.stringify(list))
  }
}

async function saveSnapshotFile (snapshot: Snapshot) {
  const dir = path.join(leagueDir(snapshot.league), 'snapshots')
  await writeAtomic(path.join(dir, `${snapshot.ts}.json`), JSON.stringify(snapshot))
  // Snapshots are only needed for intraday movers; daily rows keep the long history.
  for (const name of await listNames(dir, '.json')) {
    if (Number(name) < snapshot.ts - SNAPSHOT_RETENTION_MS) await fs.rm(path.join(dir, `${name}.json`), { force: true })
  }
}

async function snapshotTimes (league: string): Promise<number[]> {
  const names = await listNames(path.join(leagueDir(league), 'snapshots'), '.json')
  return names.map(Number).filter(n => Number.isFinite(n)).sort((a, b) => b - a)
}

async function readSnapshot (league: string, ts: number): Promise<Snapshot | null> {
  return await readJson<Snapshot>(path.join(leagueDir(league), 'snapshots', `${ts}.json`))
}

export const marketHandlers: Partial<WokeHandlers> = {
  'market-save': async ({ snapshot, daily }) => {
    const snap = snapshot as Snapshot
    return await queued(snap.league, async () => {
      await saveSnapshotFile(snap)
      await saveDaily(snap.league, daily as DailyRow[])
      return true
    })
  },
  'market-latest': async ({ league, count }) => {
    const times = (await snapshotTimes(league as string)).slice(0, Math.max(1, Number(count) || 1))
    const out: Snapshot[] = []
    for (const ts of times) {
      const s = await readSnapshot(league as string, ts)
      if (s) out.push(s)
    }
    return out
  },
  'market-at': async ({ league, ts }) => {
    const t = (await snapshotTimes(league as string)).find(x => x <= Number(ts))
    return t != null ? await readSnapshot(league as string, t) : null
  },
  'market-daily-date': async ({ league, date }) => {
    return (await loadDaily(league as string)).get(date as string) ?? []
  },
  'market-daily-item': async ({ league, type, name, variant }) => {
    const out: DailyRow[] = []
    for (const rows of (await loadDaily(league as string)).values()) {
      const r = rows.find(r => r.type === type && r.name === name && r.variant === variant)
      if (r) out.push(r)
    }
    return out.sort((a, b) => a.date.localeCompare(b.date))
  },
  'market-daily-all': async ({ league }) => {
    return [...(await loadDaily(league as string)).values()].flat()
  },
  // One-time move of the old IndexedDB history into files.
  'market-import-status': async () => {
    try {
      await fs.access(IMPORTED_MARK())
      return { imported: true }
    } catch {
      return { imported: false }
    }
  },
  'market-import': async ({ snapshots, daily }) => {
    const byLeague = new Map<string, DailyRow[]>()
    for (const r of (daily as DailyRow[]) ?? []) {
      const list = byLeague.get(r.league)
      if (list) list.push(r)
      else byLeague.set(r.league, [r])
    }
    for (const [league, rows] of byLeague) {
      // Rows already in files (saved after the move) are newer: keep them.
      await queued(league, async () => {
        const days = await loadDaily(league)
        const fresh = rows.filter(r => !(days.get(r.date) ?? []).some(x => rowKey(x) === rowKey(r)))
        if (fresh.length) await saveDaily(league, fresh)
      })
    }
    for (const s of (snapshots as Snapshot[]) ?? []) {
      const dir = path.join(leagueDir(s.league), 'snapshots')
      try {
        await fs.access(path.join(dir, `${s.ts}.json`))
      } catch {
        await writeAtomic(path.join(dir, `${s.ts}.json`), JSON.stringify(s))
      }
    }
    return true
  },
  'market-import-done': async () => {
    await writeAtomic(IMPORTED_MARK(), new Date().toISOString())
    return true
  }
}
