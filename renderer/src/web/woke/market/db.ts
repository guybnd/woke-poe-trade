// Local price history, saved as files by the main process
// (main/src/woke/market-store.ts). It used to live in the overlay's
// IndexedDB, which is tied to the overlay's port; the old data is moved over
// once (importOldHistory).
import { uniqueItems } from './types'
import type { DailyRow, Snapshot } from './types'
import { hostRequest } from '../shared/host'

// Snapshots are only needed for intraday movers; daily rows keep the long history.
export const SNAPSHOT_RETENTION_MS = 3 * 24 * 60 * 60 * 1000

const SLOW_MS = 120_000

// Several widgets ask for the newest snapshot after every save; it's a few
// thousand items, so read it from disk once and share it.
const latestCache = new Map<string, Promise<Snapshot | null>>()

export async function saveSnapshot (snapshot: Snapshot, daily: DailyRow[]): Promise<void> {
  latestCache.delete(snapshot.league)
  await importOldHistory()
  await hostRequest('market-save', { snapshot, daily }, SLOW_MS)
  latestCache.set(snapshot.league, Promise.resolve(snapshot))
}

export async function latestSnapshots (league: string, count: number): Promise<Snapshot[]> {
  if (count === 1) {
    let cached = latestCache.get(league)
    if (!cached) {
      cached = readLatest(league, 1).then(list => list[0] ?? null)
      latestCache.set(league, cached)
      const mine = cached
      mine.catch(() => { if (latestCache.get(league) === mine) latestCache.delete(league) })
    }
    const snap = await cached
    return snap ? [snap] : []
  }
  return await readLatest(league, count)
}

async function readLatest (league: string, count: number): Promise<Snapshot[]> {
  await importOldHistory()
  const snapshots = await (hostRequest('market-latest', { league, count }, SLOW_MS) as Promise<Snapshot[]>)
  return snapshots.map(snap => ({ ...snap, items: uniqueItems(snap.items) }))
}

// The newest snapshot taken at or before `ts`.
export async function snapshotAtOrBefore (league: string, ts: number): Promise<Snapshot | null> {
  await importOldHistory()
  return await (hostRequest('market-at', { league, ts }, SLOW_MS) as Promise<Snapshot | null>)
}

export async function dailyRowsForDate (league: string, date: string): Promise<DailyRow[]> {
  await importOldHistory()
  return await (hostRequest('market-daily-date', { league, date }, SLOW_MS) as Promise<DailyRow[]>)
}

export async function dailyHistory (league: string, item: { type: string, name: string, variant: string }): Promise<DailyRow[]> {
  await importOldHistory()
  return await (hostRequest('market-daily-item', { league, type: item.type, name: item.name, variant: item.variant }, SLOW_MS) as Promise<DailyRow[]>)
}

// For other modules and for export: every daily row of a league.
export async function allDailyRows (league: string): Promise<DailyRow[]> {
  await importOldHistory()
  return await (hostRequest('market-daily-all', { league }, SLOW_MS) as Promise<DailyRow[]>)
}

// ---- one-time move from IndexedDB ----

const OLD_DB_NAME = 'woke-market'
const IMPORT_CHUNK = 5000
let importing: Promise<void> | null = null

export function importOldHistory (): Promise<void> {
  importing ??= (async () => {
    const status = await hostRequest('market-import-status', null)
    if (status.imported) return
    const db = await openOldDb()
    // Nothing here: maybe the history sits under the overlay's other port.
    // Don't mark it done, so it's picked up when the app runs on that port.
    if (!db) return
    try {
      const daily = await readAll<DailyRow>(db, 'daily')
      for (let i = 0; i < daily.length; i += IMPORT_CHUNK) {
        await hostRequest('market-import', { daily: daily.slice(i, i + IMPORT_CHUNK) }, SLOW_MS)
      }
      // One at a time: a snapshot is a few thousand items.
      const cutoff = Date.now() - SNAPSHOT_RETENTION_MS
      for (const key of await readKeys(db, 'snapshots')) {
        if (!Array.isArray(key) || Number(key[1]) < cutoff) continue
        const snap = await readOne<Snapshot>(db, 'snapshots', key)
        if (snap) await hostRequest('market-import', { snapshots: [snap] }, SLOW_MS)
      }
    } finally {
      db.close()
    }
    // The old database is left as it was, as a backup.
    await hostRequest('market-import-done', null)
  })()
  // Failed (app not answering): try again on the next call.
  importing.catch(() => { importing = null })
  return importing
}

// Opens the old database only if it exists (open() would create it).
async function openOldDb (): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return null
  if (typeof indexedDB.databases === 'function') {
    const list = await indexedDB.databases()
    if (!list.some(d => d.name === OLD_DB_NAME)) return null
  }
  return await new Promise((resolve) => {
    const req = indexedDB.open(OLD_DB_NAME)
    req.onupgradeneeded = () => { req.transaction?.abort() }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
  })
}

function readAll<T> (db: IDBDatabase, store: string): Promise<T[]> {
  if (!db.objectStoreNames.contains(store)) return Promise.resolve([])
  return new Promise((resolve, reject) => {
    const req = db.transaction(store).objectStore(store).getAll()
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

function readKeys (db: IDBDatabase, store: string): Promise<IDBValidKey[]> {
  if (!db.objectStoreNames.contains(store)) return Promise.resolve([])
  return new Promise((resolve, reject) => {
    const req = db.transaction(store).objectStore(store).getAllKeys()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function readOne<T> (db: IDBDatabase, store: string, key: IDBValidKey): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store).objectStore(store).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}
