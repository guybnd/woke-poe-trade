import { promises as fs, constants as fsConstants } from 'fs'
import type { Dirent } from 'fs'
import path from 'path'
import zlib from 'zlib'
import { spawn } from 'child_process'
import { app, shell } from 'electron'
import { parseBuild, summarize } from './pob-parse'
import type { PobDetails, PobSummary } from './pob-parse'

const MAX_BUILDS = 1000
const MAX_DEPTH = 4

export interface PobBuildEntry extends PobSummary {
  // Path relative to the builds folder, with forward slashes.
  relPath: string
  name: string
  folder: string
  mtime: number
}

export function defaultBuildsDir (): string {
  // Both PoB Community and the original PoB use this folder by default.
  return path.join(app.getPath('documents'), 'Path of Building', 'Builds')
}

function resolveDir (dir: unknown): string {
  return (typeof dir === 'string' && dir.trim()) ? dir.trim() : defaultBuildsDir()
}

// Only files inside the builds folder with a .xml extension may be touched.
function resolveBuild (dir: unknown, relPath: unknown): string {
  if (typeof relPath !== 'string' || !relPath) throw new Error('Missing build path')
  const root = path.resolve(resolveDir(dir))
  const full = path.resolve(root, relPath)
  if (!full.startsWith(root + path.sep) || path.extname(full).toLowerCase() !== '.xml') {
    throw new Error('Build path is outside the builds folder')
  }
  return full
}

// Parsed summaries by full path, reused while the file's mtime is unchanged,
// so a refresh only reads builds that changed.
const summaryCache = new Map<string, { mtime: number, summary: PobSummary }>()

async function walk (root: string, rel: string, depth: number, out: PobBuildEntry[]): Promise<void> {
  if (depth > MAX_DEPTH || out.length >= MAX_BUILDS) return
  let entries: Dirent[]
  try {
    entries = await fs.readdir(path.join(root, rel), { withFileTypes: true })
  } catch (err) {
    // An unreadable subfolder shouldn't hide every other build.
    if (depth === 0) throw err
    return
  }
  for (const entry of entries) {
    if (out.length >= MAX_BUILDS) return
    const childRel = rel ? `${rel}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      await walk(root, childRel, depth + 1, out)
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.xml')) {
      const full = path.join(root, childRel)
      try {
        const stat = await fs.stat(full)
        let cached = summaryCache.get(full)
        if (!cached || cached.mtime !== stat.mtimeMs) {
          cached = { mtime: stat.mtimeMs, summary: summarize(parseBuild(await fs.readFile(full, 'utf8'))) }
          summaryCache.set(full, cached)
        }
        out.push({
          relPath: childRel,
          name: entry.name.replace(/\.xml$/i, ''),
          folder: rel,
          mtime: stat.mtimeMs,
          ...cached.summary
        })
      } catch {}
    }
  }
}

export async function listBuilds (args: { dir?: string }): Promise<{ dir: string, builds: PobBuildEntry[] }> {
  const dir = resolveDir(args?.dir)
  const builds: PobBuildEntry[] = []
  await walk(path.resolve(dir), '', 0, builds)
  return { dir, builds }
}

export async function readBuild (args: { dir?: string, relPath: string }): Promise<PobDetails> {
  const full = resolveBuild(args?.dir, args?.relPath)
  return parseBuild(await fs.readFile(full, 'utf8'))
}

export async function showBuild (args: { dir?: string, relPath: string }): Promise<void> {
  shell.showItemInFolder(resolveBuild(args?.dir, args?.relPath))
}

// Starts Path of Building with the build file as its argument.
export async function openBuild (args: { dir?: string, relPath: string, pobExe?: string }): Promise<void> {
  const full = resolveBuild(args?.dir, args?.relPath)
  // With --listen other machines can call this: never start a program for them.
  const isListening = process.argv.some(arg => arg.startsWith('--listen'))
  const exe = typeof args?.pobExe === 'string' && !isListening ? args.pobExe.trim() : ''
  if (!exe) {
    const err = await shell.openPath(full)
    if (err) throw new Error(err)
    return
  }
  await fs.access(exe)
  const child = spawn(exe, [full], { detached: true, stdio: 'ignore', cwd: path.dirname(exe) })
  child.on('error', () => {})
  child.unref()
}

// Import a shared build: a pobb.in or pastebin link, or a raw PoB code.
// The code is base64url(zlib(xml)); it's decoded here and written into the
// builds folder so PoB sees it too.
const LINK_RULES: Array<{ re: RegExp, raw: (id: string) => string }> = [
  { re: /^https?:\/\/(?:www\.)?pobb\.in\/(?:u\/[^/]+\/)?([\w-]+)\/?$/i, raw: id => `https://pobb.in/${id}/raw` },
  { re: /^https?:\/\/(?:www\.)?pastebin\.com\/(?:raw\/)?(\w+)\/?$/i, raw: id => `https://pastebin.com/raw/${id}` }
]

export function decodePobCode (code: string): string {
  const clean = code.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  const notABuild = 'That code is not a Path of Building build'
  let xml: string
  // zlib's own message ("incorrect header check") means nothing to a player.
  try { xml = zlib.inflateSync(Buffer.from(clean, 'base64')).toString('utf8') } catch { throw new Error(notABuild) }
  if (!/<PathOfBuilding/.test(xml)) throw new Error(notABuild)
  return xml
}

async function fetchCode (input: string): Promise<string> {
  const text = input.trim()
  for (const rule of LINK_RULES) {
    const m = rule.re.exec(text)
    if (!m) continue
    const res = await fetch(rule.raw(m[1]), { headers: { 'User-Agent': 'woke-poe-trade' } })
    if (!res.ok) throw new Error(`Couldn't download the build (${res.status})`)
    return await res.text()
  }
  if (/^https?:\/\//i.test(text)) throw new Error('Only pobb.in and pastebin links are supported; paste the code instead')
  return text
}

function safeFileName (name: string): string {
  return cleanName(name) || 'Imported build'
}

// What Windows takes as a file or folder name: no trailing dots or spaces
// (other programs can't open those) and none of its device names ("CON").
function cleanName (name: string): string {
  const s = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80).replace(/[. ]+$/, '')
  return /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i.test(s) ? `${s}_` : s
}

// Windows paths ignore case: "lev" and "Lev" are one folder.
function samePath (a: string, b: string): boolean {
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b
}

export async function importBuild (args: { dir?: string, input: string, name?: string }): Promise<{ relPath: string }> {
  if (typeof args?.input !== 'string' || !args.input.trim()) throw new Error('Paste a pobb.in link, a pastebin link or a PoB code')
  const xml = decodePobCode(await fetchCode(args.input))
  const root = path.resolve(resolveDir(args?.dir))
  const sum = summarize(parseBuild(xml))
  const base = safeFileName(args.name || [sum.mainSkill, sum.ascendClassName || sum.className].filter(Boolean).join(' ') || 'Imported build')
  const folder = path.join(root, 'Imported')
  await fs.mkdir(folder, { recursive: true })
  let file = `${base}.xml`
  for (let i = 2; ; i++) {
    try { await fs.access(path.join(folder, file)) } catch { break }
    file = `${base} (${i}).xml`
  }
  await fs.writeFile(path.join(folder, file), xml, 'utf8')
  return { relPath: `Imported/${file}` }
}

// ---- managing build files from the list ----

function relOf (root: string, full: string): string {
  return path.relative(root, full).split(path.sep).join('/')
}

// A free name in `folder`: "Name.xml", else "Name (2).xml" and on.
async function freeName (folder: string, base: string): Promise<string> {
  let file = `${base}.xml`
  for (let i = 2; ; i++) {
    try { await fs.access(path.join(folder, file)) } catch { return file }
    file = `${base} (${i}).xml`
  }
}

// A folder under the builds folder, from what was typed ("3.30/Leveling").
function resolveFolder (root: string, folder: unknown): string {
  const parts = (typeof folder === 'string' ? folder : '').split(/[\\/]+/).map(cleanName).filter(Boolean)
  if (parts.some(p => p === '.' || p === '..')) throw new Error('Not a folder name')
  if (parts.length > MAX_DEPTH) throw new Error('That folder is too deep for the build list')
  const full = path.resolve(root, ...parts)
  if (full !== root && !full.startsWith(root + path.sep)) throw new Error('Folder is outside the builds folder')
  return full
}

export async function renameBuild (args: { dir?: string, relPath: string, name: string }): Promise<{ relPath: string }> {
  const from = resolveBuild(args?.dir, args?.relPath)
  const root = path.resolve(resolveDir(args?.dir))
  const base = typeof args?.name === 'string' ? cleanName(args.name.replace(/\.xml$/i, '')) : ''
  if (!base) throw new Error('Type a name')
  const folder = path.dirname(from)
  if (`${base}.xml` === path.basename(from)) return { relPath: relOf(root, from) }
  // Only a change of case: Windows sees the same file, so rename in place.
  const sameFile = `${base}.xml`.toLowerCase() === path.basename(from).toLowerCase()
  const to = path.join(folder, sameFile ? `${base}.xml` : await freeName(folder, base))
  await fs.rename(from, to)
  return { relPath: relOf(root, to) }
}

export async function moveBuild (args: { dir?: string, relPath: string, folder: string }): Promise<{ relPath: string }> {
  const from = resolveBuild(args?.dir, args?.relPath)
  const root = path.resolve(resolveDir(args?.dir))
  const folder = resolveFolder(root, args?.folder)
  if (samePath(folder, path.dirname(from))) return { relPath: relOf(root, from) }
  await fs.mkdir(folder, { recursive: true })
  const to = path.join(folder, await freeName(folder, path.basename(from, path.extname(from))))
  await fs.rename(from, to)
  return { relPath: relOf(root, to) }
}

export async function duplicateBuild (args: { dir?: string, relPath: string }): Promise<{ relPath: string }> {
  const from = resolveBuild(args?.dir, args?.relPath)
  const root = path.resolve(resolveDir(args?.dir))
  const folder = path.dirname(from)
  const to = path.join(folder, await freeName(folder, `${path.basename(from, path.extname(from))} (copy)`))
  await fs.copyFile(from, to, fsConstants.COPYFILE_EXCL)
  return { relPath: relOf(root, to) }
}

// To the Recycle Bin. Returns the file's text so Undo can put it back.
export async function deleteBuild (args: { dir?: string, relPath: string }): Promise<{ xml: string }> {
  const full = resolveBuild(args?.dir, args?.relPath)
  const xml = await fs.readFile(full, 'utf8')
  await shell.trashItem(full)
  summaryCache.delete(full)
  return { xml }
}

// Undo of a delete: writes the build back, never over a file that's there.
export async function restoreBuild (args: { dir?: string, relPath: string, xml: string }): Promise<void> {
  const full = resolveBuild(args?.dir, args?.relPath)
  if (typeof args?.xml !== 'string' || !/<PathOfBuilding/.test(args.xml)) throw new Error('That is not a Path of Building build')
  await fs.mkdir(path.dirname(full), { recursive: true })
  await fs.writeFile(full, args.xml, { encoding: 'utf8', flag: 'wx' })
}
