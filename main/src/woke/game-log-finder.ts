// Finds every Client.txt on this PC for the setup window: the running game,
// GGG's registry entry, Steam libraries, and the usual folders on each drive.
import { execFile } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { POSSIBLE_PATH, runningGameLog } from '../host-files/GameLogWatcher'

export interface FoundLog {
  path: string
  source: 'running' | 'standalone' | 'steam' | 'folder'
  // Last write, ms since epoch: the newest one is the copy in use.
  modified: number
  size: number
}

function regQuery (key: string, value: string): Promise<string | null> {
  return new Promise((resolve) => {
    execFile('reg', ['query', key, '/v', value], { windowsHide: true, timeout: 5000 }, (err, stdout) => {
      if (err) return resolve(null)
      const m = new RegExp(`${value}\\s+REG_\\w+\\s+(.+)`, 'i').exec(stdout)
      resolve(m ? m[1].trim() : null)
    })
  })
}

async function steamLibraries (): Promise<string[]> {
  const steam = await regQuery('HKCU\\Software\\Valve\\Steam', 'SteamPath')
  const roots = [steam, 'C:\\Program Files (x86)\\Steam'].filter((p): p is string => !!p)
  const libs = new Set<string>()
  for (const root of roots) {
    libs.add(path.normalize(root))
    try {
      const vdf = await fs.readFile(path.join(root, 'steamapps', 'libraryfolders.vdf'), 'utf8')
      for (const m of vdf.matchAll(/"path"\s+"([^"]+)"/g)) libs.add(path.normalize(m[1].replace(/\\\\/g, '\\')))
    } catch {}
  }
  return [...libs]
}

const DRIVE_FOLDERS = [
  'Program Files (x86)\\Grinding Gear Games\\Path of Exile',
  'Program Files\\Grinding Gear Games\\Path of Exile',
  'Grinding Gear Games\\Path of Exile',
  'Games\\Path of Exile',
  'Games\\Grinding Gear Games\\Path of Exile',
  'Path of Exile',
  'SteamLibrary\\steamapps\\common\\Path of Exile',
  'Steam\\steamapps\\common\\Path of Exile',
  'Games\\SteamLibrary\\steamapps\\common\\Path of Exile',
  'Program Files (x86)\\Steam\\steamapps\\common\\Path of Exile'
]

async function candidates (quick: boolean): Promise<Array<{ path: string, source: FoundLog['source'] }>> {
  const out: Array<{ path: string, source: FoundLog['source'] }> = []
  if (!quick) {
    const running = await runningGameLog()
    if (running) out.push({ path: running, source: 'running' })
  }
  if (process.platform !== 'win32') {
    for (const p of POSSIBLE_PATH) out.push({ path: p, source: 'folder' })
    return out
  }
  const ggg = await regQuery('HKCU\\Software\\GrindingGearGames\\Path of Exile', 'InstallLocation')
  if (ggg) out.push({ path: path.join(ggg, 'logs', 'Client.txt'), source: 'standalone' })
  for (const lib of await steamLibraries()) {
    out.push({ path: path.join(lib, 'steamapps', 'common', 'Path of Exile', 'logs', 'Client.txt'), source: 'steam' })
  }
  if (quick) {
    for (const p of POSSIBLE_PATH) out.push({ path: p, source: 'folder' })
    return out
  }
  const drives = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
  for (const d of drives) {
    for (const f of DRIVE_FOLDERS) {
      out.push({ path: `${d}:\\${f}\\logs\\Client.txt`, source: /steam/i.test(f) ? 'steam' : 'folder' })
    }
  }
  return out
}

async function statOrNull (p: string) {
  try {
    const s = await Promise.race([
      fs.stat(p),
      new Promise<never>((_r, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ])
    return s.isFile() ? s : null
  } catch {
    return null
  }
}

// quick: for every app start with the game closed, so only where the PC says
// the game is. No process check, and no sweep of every drive: a dead network
// drive would tie up file reads for the whole app.
export async function findGameLogs (opts: { quick?: boolean } = {}): Promise<FoundLog[]> {
  const seen = new Map<string, FoundLog>()
  const list = await candidates(opts.quick === true)
  const stats = await Promise.all(list.map(c => statOrNull(c.path)))
  list.forEach((c, i) => {
    const s = stats[i]
    if (!s) return
    const key = path.normalize(c.path).toLowerCase()
    const prev = seen.get(key)
    // Keep the most telling label: running > standalone/steam > folder.
    if (prev && prev.source !== 'folder') return
    seen.set(key, { path: path.normalize(c.path), source: prev?.source === 'running' ? 'running' : c.source, modified: s.mtimeMs, size: s.size })
  })
  return [...seen.values()].sort((a, b) => Number(b.source === 'running') - Number(a.source === 'running') || b.modified - a.modified)
}
