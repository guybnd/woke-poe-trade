// Imported past-league histories, as files in the app's user data folder
// (woke-docs/invest-leagues). They used to live in the overlay's IndexedDB,
// which looked empty whenever the overlay's port changed; the first load
// brings them over and leaves the old database as a backup.
import { hostRequest } from '../shared/host'
import type { LeagueHistory } from './dumps'

const COLLECTION = 'invest-leagues'
const OLD_DB_NAME = 'woke-invest'

export async function saveLeague (history: LeagueHistory): Promise<void> {
  await hostRequest('doc-put', { collection: COLLECTION, key: history.league, value: history })
}

export async function deleteLeague (league: string): Promise<void> {
  await hostRequest('doc-delete', { collection: COLLECTION, key: league })
}

let imported: Promise<void> | null = null

export async function loadLeagues (): Promise<LeagueHistory[]> {
  if (!imported) {
    imported = importOldDb()
    imported.catch(() => { imported = null })
  }
  await imported
  const all = await (hostRequest('doc-list', { collection: COLLECTION }) as Promise<LeagueHistory[]>)
  return all.filter(h => h && typeof h.league === 'string').sort((a, b) => a.start.localeCompare(b.start))
}

async function importOldDb (): Promise<void> {
  if (await hostRequest('doc-get', { collection: 'migrations', key: COLLECTION })) return
  const old = await readOldDb()
  for (const h of old) await saveLeague(h)
  await hostRequest('doc-put', { collection: 'migrations', key: COLLECTION, value: { at: Date.now(), count: old.length } })
}

// Everything in the old database, without creating it when it isn't there.
async function readOldDb (): Promise<LeagueHistory[]> {
  if (typeof indexedDB === 'undefined') return []
  if (typeof indexedDB.databases === 'function') {
    const list = await indexedDB.databases()
    if (!list.some(d => d.name === OLD_DB_NAME)) return []
  }
  const db = await new Promise<IDBDatabase | null>((resolve) => {
    const req = indexedDB.open(OLD_DB_NAME)
    req.onupgradeneeded = () => { req.transaction?.abort() }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
  })
  if (!db || !db.objectStoreNames.contains('leagues')) { db?.close(); return [] }
  try {
    return await new Promise<LeagueHistory[]>((resolve, reject) => {
      const req = db.transaction('leagues').objectStore('leagues').getAll()
      req.onsuccess = () => resolve(req.result as LeagueHistory[])
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

// Past leagues shipped with the app (built by scripts/build-invest-bundle.ts,
// marked imported = 0). Loaded on demand so they stay out of startup.
let bundled: Promise<LeagueHistory[]> | null = null
export function loadBundledLeagues (): Promise<LeagueHistory[]> {
  if (!bundled) {
    bundled = import('./bundled/leagues.json')
      .then(m => (m.default as unknown as LeagueHistory[]).map(h => ({ ...h, imported: 0 })))
      .catch(() => [])
  }
  return bundled
}

// Your imports plus built-in leagues you haven't imported yourself.
export async function allLeagues (): Promise<LeagueHistory[]> {
  const [mine, builtIn] = await Promise.all([loadLeagues().catch(() => []), loadBundledLeagues()])
  const have = new Set(mine.map(h => h.league))
  return [...mine, ...builtIn.filter(h => !have.has(h.league))]
    .sort((a, b) => a.start.localeCompare(b.start))
}
