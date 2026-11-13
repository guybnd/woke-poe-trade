// Shared file helpers for the toolkit's data in the app's user data folder
// (market history, sessions, the sales log, and small keyed documents), so
// every store writes the same safe way.
import { promises as fs } from 'fs'
import path from 'path'
import { app } from 'electron'
import type { WokeHandlers } from '../../../ipc/woke-ops'

export const dataDir = (name: string) => path.join(app.getPath('userData'), name)

// League names (and ids) as file names: short words with spaces.
export function safeName (s: string): string {
  return s.replace(/[^\w .-]/g, '_').slice(0, 80) || '_'
}

export function leagueName (league: unknown): string {
  return safeName(typeof league === 'string' && league ? league : 'Unknown league')
}

// Write to a temp file and rename, so a crash never leaves half a file.
export async function writeAtomic (file: string, data: string) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  await fs.writeFile(tmp, data, 'utf8')
  await fs.rename(tmp, file)
}

// JSON from a file, null when missing or unreadable.
export async function readJson<T> (file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T
  } catch {
    return null
  }
}

// Only a missing file means "nothing yet": a file that can't be read right
// now (locked by antivirus or a sync tool) throws, so a read-change-write
// never replaces data with nothing. A file that isn't valid JSON is moved
// aside, kept for the player, and starts over.
export async function readJsonStrict<T> (file: string, empty: T): Promise<T> {
  let text: string
  try {
    text = await fs.readFile(file, 'utf8')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return empty
    throw e
  }
  try {
    return JSON.parse(text) as T
  } catch {
    await fs.rename(file, `${file}.broken-${Date.now()}`)
    return empty
  }
}

export async function listDir (dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir)
  } catch {
    return []
  }
}

// Runs writes one at a time, so two saves never interleave.
export function writeQueue () {
  let queue: Promise<unknown> = Promise.resolve()
  return function queued<T> (fn: () => Promise<T>): Promise<T> {
    const next = queue.catch(() => {}).then(fn)
    queue = next
    return next
  }
}

// Keyed JSON documents for modules with small data (imported league
// histories, the price check log): <userData>/woke-docs/<collection>/<key>.json.
// They used to live in the overlay's IndexedDB / localStorage, which belong to
// the overlay's port and looked empty when the port changed.
const docsRoot = () => dataDir('woke-docs')
const docFile = (collection: unknown, key: unknown) => {
  if (typeof collection !== 'string' || !collection || typeof key !== 'string' || !key) throw new Error('No collection or key given.')
  return path.join(docsRoot(), safeName(collection), `${safeName(key)}.json`)
}
const queued = writeQueue()

export const docHandlers: Partial<WokeHandlers> = {
  'doc-get': async ({ collection, key }) => await readJson(docFile(collection, key)),
  'doc-list': async ({ collection }) => {
    if (typeof collection !== 'string' || !collection) throw new Error('No collection given.')
    const dir = path.join(docsRoot(), safeName(collection))
    const out: unknown[] = []
    for (const name of await listDir(dir)) {
      if (!name.endsWith('.json')) continue
      const doc = await readJson(path.join(dir, name))
      if (doc != null) out.push(doc)
    }
    return out
  },
  'doc-put': async ({ collection, key, value }) => {
    const file = docFile(collection, key)
    return await queued(async () => { await writeAtomic(file, JSON.stringify(value)); return true })
  },
  'doc-delete': async ({ collection, key }) => {
    const file = docFile(collection, key)
    return await queued(async () => { await fs.rm(file, { force: true }); return true })
  }
}
