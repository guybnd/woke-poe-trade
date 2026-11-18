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
// The intraday movers' spans (renderer market/widget.ts PERIOD_MS; 7 d reads day rows).
const MOVER_SPANS_MS = [6 * 3600 * 1000, 24 * 3600 * 1000]

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

// Snapshots older than the retention are only removed when that league saves
// again, so a league you stopped playing (or Standard after a look) kept
// hundreds of 1.3 MB files: 600 MB on Guy's PC. Once a run, every league is
// trimmed to the day rows (one point per item per day), keeping the league's
// newest snapshot, and a day's last snapshot when that day has no day rows.
export async function trimOldSnapshots (now = Date.now()): Promise<number> {
  let removed = 0
  let leagues: string[] = []
  try {
    leagues = (await fs.readdir(root(), { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name)
  } catch {
    return 0
  }
  for (const folder of leagues) {
    const dir = path.join(root(), folder, 'snapshots')
    await queued(folder, async () => {
      const times = (await listNames(dir, '.json')).map(Number).filter(n => Number.isFinite(n)).sort((a, b) => b - a)
      const days = new Set(await listNames(path.join(root(), folder, 'daily'), '.json'))
      // The newest stays anyway, and is its own day's point.
      const dayPoint = new Set<string>(times.length ? [utcDate(times[0])] : [])
      // So do the snapshots the 6 h and 24 h movers compare the newest with
      // (market-at: the newest at or before), for a league no longer saving.
      const movers = new Set(MOVER_SPANS_MS.map(span => times.find(t => t <= times[0] - span)).filter((t): t is number => t != null))
      for (const ts of times.slice(1)) {
        const day = utcDate(ts)
        if (ts >= now - SNAPSHOT_RETENTION_MS || movers.has(ts)) {
          // Kept anyway: it's that day's point too.
          dayPoint.add(day)
          continue
        }
        // Newest first: the first one met is the day's last.
        if (!days.has(day) && !dayPoint.has(day)) {
          dayPoint.add(day)
          continue
        }
        await fs.rm(path.join(dir, `${ts}.json`), { force: true })
        removed++
      }
    })
  }
  return removed
}

async function snapshotTimes (league: string): Promise<number[]> {
  const names = await listNames(path.join(leagueDir(league), 'snapshots'), '.json')
  return names.map(Number).filter(n => Number.isFinite(n)).sort((a, b) => b - a)
}

async function readSnapshot (league: string, ts: number): Promise<Snapshot | null> {
  return await readJson<Snapshot>(path.join(leagueDir(league), 'snapshots', `${ts}.json`))
}

const utcDate = (ts: number) => new Date(ts).toISOString().slice(0, 10)

// One row per item for the snapshot's UTC day (what market/collector.ts sent
// before the overlay stopped sending them: the same list again, ~2 MB).
export function dailyRows (snap: Snapshot): DailyRow[] {
  const date = utcDate(snap.ts)
  return snap.items.map(item => {
    const row = { league: snap.league, date, divine: snap.divine, ts: snap.ts, ...(item as object) } as unknown as DailyRow & { d1?: unknown, d7?: unknown }
    delete row.d1
    delete row.d7
    return row
  })
}

// The prices of the newest snapshot of each league. Every overlay start replays
// the prices it has, so half of the saves repeat the last one: those still get
// their snapshot file (movers and "saved at" go by snapshot times), but skip
// re-merging and rewriting the day's ~2 MB of rows, which wouldn't change.
const lastSaved = new Map<string, { key: string, date: string }>()
const pricesKey = (snap: Snapshot) => JSON.stringify([snap.divine, snap.items])

async function sameAsLast (snap: Snapshot, key: string): Promise<boolean> {
  let last = lastSaved.get(snap.league)
  if (!last) {
    const ts = (await snapshotTimes(snap.league))[0]
    const prev = ts != null ? await readSnapshot(snap.league, ts) : null
    if (!prev) return false
    last = { key: pricesKey(prev), date: utcDate(prev.ts) }
  }
  // A new day still gets its own daily rows.
  return last.key === key && last.date === utcDate(snap.ts)
}

export const marketHandlers: Partial<WokeHandlers> = {
  'market-save': async ({ snapshot, daily }) => {
    const snap = snapshot as Snapshot
    return await queued(snap.league, async () => {
      const key = pricesKey(snap)
      // Day rows first: a snapshot on disk then always has its day rows, so a
      // repeat of it can safely skip them.
      if (!await sameAsLast(snap, key)) await saveDaily(snap.league, Array.isArray(daily) ? daily as DailyRow[] : dailyRows(snap))
      await saveSnapshotFile(snap)
      lastSaved.set(snap.league, { key, date: utcDate(snap.ts) })
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
