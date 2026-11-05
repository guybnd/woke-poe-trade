// NeverSink's filter straight from GitHub: every strictness level of one
// style, cached per version in the app's own folder (never the game's filter
// folder, so the game's filter list doesn't fill up with copies).
import { promises as fs } from 'fs'
import path from 'path'
import { app, net } from 'electron'
import ini from 'ini'

const RAW = 'https://raw.githubusercontent.com/NeverSinkDev/NeverSink-Filter/master/'

export const LEVELS = ['0-SOFT', '1-REGULAR', '2-SEMI-STRICT', '3-STRICT', '4-VERY-STRICT', '5-UBER-STRICT', '6-UBER-PLUS-STRICT']

// Styles as NeverSink names their folders; '' is the default look.
export const STYLES = ['', 'ABYSS', 'ALLOY', 'AZURITE', 'COBALT', 'CRIMSON', 'ELDER', 'GAIA', 'LUNARIS', 'NECROS', 'PURPLE', 'TABULA RASA', 'VAAL', 'VELVET', 'WOW']

const HEADERS = { 'User-Agent': 'woke-poe-trade (loot filter editor)' }
const MAX_BYTES = 8 * 1024 * 1024

function cacheRoot (): string {
  return path.join(app.getPath('userData'), 'woke', 'neversink')
}

function checkStyle (style: unknown): string {
  const s = typeof style === 'string' ? style.toUpperCase() : ''
  if (!STYLES.includes(s)) throw new Error(`Unknown NeverSink style: ${String(style)}`)
  return s
}

function checkLevel (level: unknown): number {
  const n = Number(level)
  if (!Number.isInteger(n) || n < 0 || n >= LEVELS.length) throw new Error(`Unknown strictness: ${String(level)}`)
  return n
}

function checkVersion (v: unknown): string {
  if (typeof v !== 'string' || !/^[0-9][0-9a-z.]{0,20}$/i.test(v)) throw new Error('Bad version')
  return v
}

function remoteName (level: number, style: string): string {
  const file = style
    ? `(STYLE) ${style}/NeverSink's filter - ${LEVELS[level]} (${style.toLowerCase()}) .filter`
    : `NeverSink's filter - ${LEVELS[level]}.filter`
  return RAW + file.split('/').map(encodeURIComponent).join('/')
}

function localFile (version: string, style: string, level: number): string {
  return path.join(cacheRoot(), version, style || 'DEFAULT', `${LEVELS[level]}.filter`)
}

async function get (url: string, range?: string): Promise<string> {
  const res = await net.fetch(url, { headers: range ? { ...HEADERS, Range: range } : HEADERS })
  if (!res.ok) throw new Error(`GitHub answered ${res.status} for ${decodeURIComponent(url.slice(RAW.length))}`)
  const text = await res.text()
  if (text.length > MAX_BYTES) throw new Error('Download too large')
  return text
}

export function versionOf (text: string): string | null {
  return /^#\s*VERSION:\s*(\S+)/m.exec(text.slice(0, 4096))?.[1] ?? null
}

// The newest version on GitHub and the top of its changelog.
export async function latestNeverSink (): Promise<{ version: string, changes: string }> {
  const head = await get(remoteName(1, ''), 'bytes=0-4095')
  const version = versionOf(head)
  if (!version) throw new Error('No version line in NeverSink\'s filter')
  let changes = ''
  try {
    const log = await get(RAW + 'CHANGELOG.md', 'bytes=0-6143')
    // The first version section only.
    const parts = log.split(/^-{10,}\s*$/m)
    const at = parts.findIndex(p => p.includes(`VERSION ${version}`))
    changes = (at >= 0 ? parts.slice(at, at + 2).join('\n') : '').replace(/^#\s*/gm, '').replace(/\*\*/g, '').trim().slice(0, 1500)
  } catch {}
  return { version, changes }
}

// Downloads all strictness levels of a style into the cache. Returns the
// version actually downloaded (master can move on between check and download).
export async function downloadNeverSink (args: { style?: string }): Promise<{ version: string }> {
  const style = checkStyle(args?.style ?? '')
  const texts = await Promise.all(LEVELS.map((_, i) => get(remoteName(i, style))))
  const version = versionOf(texts[1])
  if (!version) throw new Error('Downloaded filter has no version line')
  if (texts.some(t => versionOf(t) !== version)) throw new Error('GitHub changed while downloading, try again')
  const dir = path.dirname(localFile(version, style, 0))
  await fs.mkdir(dir, { recursive: true })
  await Promise.all(texts.map(async (t, i) => {
    const file = localFile(version, style, i)
    await fs.writeFile(file + '.tmp', t, 'utf8')
    await fs.rename(file + '.tmp', file)
  }))
  return { version }
}

export async function readNeverSink (args: { version: string, style?: string, level: number }): Promise<{ text: string }> {
  const file = localFile(checkVersion(args?.version), checkStyle(args?.style ?? ''), checkLevel(args?.level))
  return { text: await fs.readFile(file, 'utf8') }
}

export function compareVersions (a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' })
}

// Cached versions (newest first) with the styles each has.
export async function cachedNeverSink (): Promise<Array<{ version: string, styles: string[] }>> {
  let versions: string[]
  try {
    versions = (await fs.readdir(cacheRoot(), { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name)
  } catch {
    return []
  }
  const out: Array<{ version: string, styles: string[] }> = []
  for (const version of versions) {
    try {
      const styles = (await fs.readdir(path.join(cacheRoot(), version))).map(s => s === 'DEFAULT' ? '' : s)
      out.push({ version, styles })
    } catch {}
  }
  // woke: numeric compare, so a hotfix letter sorts inside its version
  // (8.20.1e before 8.20.2). Padding made "1e" sort above "2", and pruning
  // then deleted the newest version.
  return out.sort((a, b) => compareVersions(b.version, a.version))
}

// Keeps the newest `keep` versions so the cache doesn't grow forever.
export async function pruneNeverSink (args: { keep?: number }): Promise<void> {
  const keep = Math.max(2, Number(args?.keep) || 3)
  const list = await cachedNeverSink()
  for (const old of list.slice(keep)) {
    await fs.rm(path.join(cacheRoot(), old.version), { recursive: true, force: true })
  }
}

// item_filter_loaded_successfully holds the name of the filter that loaded,
// not true or false (older games wrote true/false).
export function filterLoaded (raw: unknown, name: string | null): boolean | null {
  if (raw == null) return null
  const value = String(raw)
  if (value === 'true') return true
  // The game may write the name with or without ".filter", in another case.
  const stem = (s: string) => s.replace(/\.filter$/i, '').toLowerCase()
  return name != null && value !== '' && stem(value) === stem(name)
}

// What the game itself has selected, from production_Config.ini: the filter
// name and whether it loaded (false when the game rejected the file).
export async function gameFilterSetting (configPath: string | null): Promise<{ name: string | null, loaded: boolean | null }> {
  if (!configPath) return { name: null, loaded: null }
  try {
    const parsed = ini.parse((await fs.readFile(configPath, 'utf8')).trimStart())
    const ui = parsed.UI ?? {}
    const name = typeof ui.item_filter === 'string' && ui.item_filter ? ui.item_filter : null
    const raw = ui.item_filter_loaded_successfully
    return { name, loaded: filterLoaded(raw, name) }
  } catch {
    return { name: null, loaded: null }
  }
}
