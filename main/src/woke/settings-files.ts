// Settings window helpers: check a path the user typed, and pick one with the
// system file dialog.
import { dialog } from 'electron'
import fs from 'fs/promises'

export interface PathStat {
  exists: boolean
  isDir: boolean
  modified: number | null
}

export async function pathStat (args: { path?: string | null }): Promise<PathStat> {
  const p = typeof args?.path === 'string' ? args.path.trim() : ''
  if (!p) return { exists: false, isDir: false, modified: null }
  try {
    const st = await fs.stat(p)
    return { exists: true, isDir: st.isDirectory(), modified: st.mtimeMs }
  } catch {
    return { exists: false, isDir: false, modified: null }
  }
}

export async function browsePath (args: { kind?: 'file' | 'dir', title?: string, defaultPath?: string, extensions?: string[] }): Promise<string | null> {
  const opts: Electron.OpenDialogOptions = {
    title: args?.title,
    defaultPath: args?.defaultPath || undefined,
    properties: [args?.kind === 'dir' ? 'openDirectory' : 'openFile']
  }
  if (args?.kind !== 'dir' && args?.extensions?.length) {
    opts.filters = [{ name: args.extensions.join(', '), extensions: args.extensions }]
  }
  const res = await dialog.showOpenDialog(opts)
  return res.canceled ? null : res.filePaths[0] ?? null
}

const TEXT_FILE_MAX = 2_000_000

// Saves a small text file where the player picks (a loot filter share code).
export async function saveTextFile (args: { name?: string, text?: string, title?: string, extensions?: string[] }): Promise<string | null> {
  const text = typeof args?.text === 'string' ? args.text : ''
  if (!text || text.length > TEXT_FILE_MAX) return null
  const exts = args?.extensions?.length ? args.extensions : ['txt']
  // eslint-disable-next-line no-control-regex
  const bad = /[<>:"/\\|?*\u0000-\u001f]+/g
  const res = await dialog.showSaveDialog({
    title: args?.title,
    defaultPath: typeof args?.name === 'string' ? args.name.replace(bad, ' ').trim() : undefined,
    filters: [{ name: exts.join(', '), extensions: exts }]
  })
  if (res.canceled || !res.filePath) return null
  await fs.writeFile(res.filePath, text, 'utf8')
  return res.filePath
}

// Reads a small text file the player picks; null if cancelled.
export async function openTextFile (args: { title?: string, extensions?: string[] }): Promise<{ path: string, text: string } | null> {
  const path = await browsePath({ kind: 'file', title: args?.title, extensions: args?.extensions })
  if (!path) return null
  const st = await fs.stat(path)
  if (st.size > TEXT_FILE_MAX) throw new Error('That file is too big')
  return { path, text: await fs.readFile(path, 'utf8') }
}
