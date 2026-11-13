// Farming sessions (with every map run) as files in the app's user data
// folder, for Session analytics. Kept out of config.json so a league of maps
// doesn't slow down every settings save.
//
// Layout: <userData>/woke-sessions/<league>/<session id>.json
// Stacked Deck sessions: <userData>/woke-deck-sessions/<league>/<id>.json
import { promises as fs } from 'fs'
import path from 'path'
import { shell } from 'electron'
import { dataDir, leagueName, listDir, safeName, writeAtomic, writeQueue } from './data-files'
import type { WokeHandlers } from '../../../ipc/woke-ops'

// Same as the renderer's SessionRecord (woke/analytics/types.ts); kept loose here.
interface SessionRecord { id: string, league: string, [k: string]: unknown }

// A folder of JSON records, one file per record, in league folders.
function recordStore (dirName: string) {
  const root = () => dataDir(dirName)
  const fileOf = (s: { id: unknown, league: unknown }): string => {
    if (typeof s.id !== 'string' || !s.id) throw new Error('Session has no id.')
    return path.join(root(), leagueName(s.league), `${safeName(s.id)}.json`)
  }

  // Every record, read once and kept in memory: a league is a few hundred
  // small files at most.
  let cache: Promise<Map<string, SessionRecord>> | null = null
  function loadAll (): Promise<Map<string, SessionRecord>> {
    if (!cache) {
      cache = (async () => {
        const out = new Map<string, SessionRecord>()
        for (const league of await listDir(root())) {
          const dir = path.join(root(), league)
          for (const name of await listDir(dir)) {
            if (!name.endsWith('.json')) continue
            try {
              const s = JSON.parse(await fs.readFile(path.join(dir, name), 'utf8')) as SessionRecord
              if (s && typeof s.id === 'string') out.set(s.id, s)
            } catch {}
          }
        }
        return out
      })()
      cache.catch(() => { cache = null })
    }
    return cache
  }

  // Writes go one at a time so two saves never interleave.
  const queued = writeQueue()

  async function save (s: SessionRecord) {
    return await queued(async () => {
      const all = await loadAll()
      const old = all.get(s.id)
      await writeAtomic(fileOf(s), JSON.stringify(s))
      // The league can change when a session is edited; drop the old file,
      // once the new one is written (a failed write keeps the session).
      if (old && fileOf(old) !== fileOf(s)) await fs.rm(fileOf(old), { force: true })
      all.set(s.id, s)
      return true
    })
  }

  async function saveMany (list: SessionRecord[]) {
    return await queued(async () => {
      const all = await loadAll()
      for (const s of list) {
        if (all.has(s.id)) continue
        await writeAtomic(fileOf(s), JSON.stringify(s))
        all.set(s.id, s)
      }
      return true
    })
  }

  async function remove (id: string) {
    return await queued(async () => {
      const all = await loadAll()
      const old = all.get(id)
      if (old) {
        await fs.rm(fileOf(old), { force: true })
        all.delete(old.id)
      }
      return true
    })
  }

  return { root, loadAll, save, saveMany, remove }
}

const sessions = recordStore('woke-sessions')
// Stacked Deck sessions (woke/stacked-decks), beside the farming sessions.
const deckSessions = recordStore('woke-deck-sessions')

function csvCell (v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Excel reads a CSV without a byte order mark as the PC's ANSI code page,
// which garbles names like "Doppelgänger Guise" or "Maelström of Chaos".
const UTF8_BOM = '\uFEFF'

export const sessionHandlers: Partial<WokeHandlers> = {
  'sessions-list': async () => {
    return [...(await sessions.loadAll()).values()]
  },
  'sessions-save': async ({ session }) => await sessions.save(session as SessionRecord),
  'sessions-save-many': async ({ sessions: list }) => await sessions.saveMany((list as SessionRecord[]) ?? []),
  'sessions-delete': async ({ id }) => await sessions.remove(id as string),
  'deck-sessions-list': async () => {
    return [...(await deckSessions.loadAll()).values()]
  },
  'deck-sessions-save': async ({ session }) => await deckSessions.save(session as SessionRecord),
  'deck-sessions-delete': async ({ id }) => await deckSessions.remove(id as string),
  // One CSV row per map (or per session for sessions without map detail),
  // written next to the session files and shown in the file browser.
  'sessions-export': async ({ rows }) => {
    const list = (rows as Array<Record<string, unknown>>) ?? []
    const cols = list.length ? Object.keys(list[0]) : []
    const text = UTF8_BOM + [cols.join(','), ...list.map(r => cols.map(c => csvCell(r[c])).join(','))].join('\r\n')
    // Today's date where the player is, not in UTC.
    const d = new Date()
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const file = path.join(sessions.root(), `maps-${day}.csv`)
    await writeAtomic(file, text)
    shell.showItemInFolder(file)
    return file
  }
}
