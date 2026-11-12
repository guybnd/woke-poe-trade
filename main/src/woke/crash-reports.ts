// Crash reports: written to <data>/crash-reports when something breaks, and
// offered for reporting on the next launch. Nothing leaves the PC unless the
// player presses Report, which opens a pre-filled GitHub issue they can read
// and edit before sending.
import { app, crashReporter, shell } from 'electron'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type { Logger } from '../RemoteLogger'
import { appPrefs } from './app-prefs'

export const ISSUES_URL = 'https://github.com/guybnd/woke-poe-trade/issues/new'
const KEEP = 20

export type CrashKind = 'main-error' | 'overlay-gone' | 'process-gone' | 'native-crash' | 'manual'

export interface CrashReport {
  id: string
  at: number
  kind: CrashKind
  title: string
  detail: string
  version: string
  electron: string
  os: string
  log: string
  rendererErrors: string[]
  session: number
  seen: boolean
}

const dir = () => path.join(app.getPath('userData'), 'crash-reports')
const sessionFile = () => path.join(dir(), 'session.json')
const SESSION = Date.now()

let logger: Logger | null = null
const rendererErrors: Array<{ at: number, text: string }> = []

function osLine () {
  const name = process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux'
  return `${name} ${os.release()} ${process.arch}`
}

function lastLogLines (n = 60): string {
  return (logger?.history ?? '').trimEnd().split('\n').slice(-n).join('\n')
}

function write (r: CrashReport) {
  try {
    fs.mkdirSync(dir(), { recursive: true })
    fs.writeFileSync(path.join(dir(), `${r.id}.json`), JSON.stringify(r, null, 2))
    prune()
  } catch {}
}

function prune () {
  const files = listFiles()
  for (const f of files.slice(KEEP)) {
    try { fs.unlinkSync(path.join(dir(), f)) } catch {}
  }
}

// Newest first.
function listFiles (): string[] {
  try {
    return fs.readdirSync(dir()).filter(f => f.endsWith('.json') && f !== 'session.json').sort().reverse()
  } catch {
    return []
  }
}

function readReport (id: string): CrashReport | null {
  if (!/^[\w-]+$/.test(id)) return null
  try {
    return JSON.parse(fs.readFileSync(path.join(dir(), `${id}.json`), 'utf8')) as CrashReport
  } catch {
    return null
  }
}

export function recordCrash (kind: CrashKind, title: string, detail: string): CrashReport {
  const at = Date.now()
  const report: CrashReport = {
    id: `${new Date(at).toISOString().replace(/[:.]/g, '-')}-${kind}`,
    at,
    kind,
    title,
    detail,
    version: app.getVersion(),
    electron: process.versions.electron,
    os: osLine(),
    log: lastLogLines(),
    rendererErrors: rendererErrors.filter(e => at - e.at < 10 * 60_000).map(e => e.text),
    session: SESSION,
    seen: kind === 'manual'
  }
  if (kind !== 'manual') {
    write(report)
    logger?.write(`error [crash] ${title}`)
  }
  return report
}

function errorText (err: unknown): string {
  if (err instanceof Error) return err.stack ?? `${err.name}: ${err.message}`
  return String(err)
}

// As early as possible: before the app is ready.
export function startCrashReporting () {
  // Native crashes leave a minidump in <data>/Crashpad; it is never uploaded.
  crashReporter.start({ uploadToServer: false })

  process.on('uncaughtException', (err) => {
    recordCrash('main-error', `Error in the app: ${err instanceof Error ? err.message : String(err)}`, errorText(err))
  })

  // A failed promise nobody handled: worth a log line, not a crash report.
  process.on('unhandledRejection', (err) => {
    const text = `error [main] Unhandled: ${errorText(err)}`
    if (logger) logger.write(text)
    else console.error(text)
  })

  const reloads: number[] = []
  app.on('render-process-gone', (_e, wc, details) => {
    if (details.reason === 'clean-exit') return
    recordCrash('overlay-gone', `The overlay stopped (${details.reason})`, `reason: ${details.reason}, exit code: ${details.exitCode}`)
    // Bring the page back instead of leaving a dead overlay until restart,
    // but not in a loop: at most 3 times in 5 minutes.
    const now = Date.now()
    while (reloads.length && now - reloads[0] > 5 * 60_000) reloads.shift()
    if (reloads.length < 3) {
      reloads.push(now)
      setTimeout(() => { if (!wc.isDestroyed()) wc.reload() }, 1000)
    }
  })

  app.on('child-process-gone', (_e, details) => {
    if (details.reason === 'clean-exit' || details.reason === 'killed') return
    const name = details.name ?? details.serviceName ?? details.type
    recordCrash('process-gone', `${name} process stopped (${details.reason})`, `type: ${details.type}, name: ${name}, reason: ${details.reason}, exit code: ${details.exitCode}`)
  })

  checkLastSession()
  try {
    fs.mkdirSync(dir(), { recursive: true })
    fs.writeFileSync(sessionFile(), JSON.stringify({ startedAt: SESSION, clean: false }))
  } catch {}
  app.on('will-quit', () => {
    try { fs.writeFileSync(sessionFile(), JSON.stringify({ startedAt: SESSION, clean: true })) } catch {}
  })
}

// The last run ended without quitting properly. If a minidump was written
// and nothing else explains it, the app itself crashed. Without a dump
// (Windows shutdown, Task Manager) there is nothing to report.
function checkLastSession () {
  let last: { startedAt: number, clean: boolean }
  try {
    last = JSON.parse(fs.readFileSync(sessionFile(), 'utf8'))
  } catch {
    return
  }
  if (last.clean) return
  const explained = listFiles().some(f => (readReport(f.slice(0, -5))?.at ?? 0) >= last.startedAt)
  if (explained) return
  const dumps = findDumps(app.getPath('crashDumps')).filter(d => d.mtime >= last.startedAt)
  if (!dumps.length) return
  const report = recordCrash('native-crash', 'The app closed unexpectedly', `minidump: ${dumps.map(d => path.basename(d.file)).join(', ')}`)
  report.session = last.startedAt
  report.log = ''
  write(report)
}

function findDumps (root: string, depth = 0): Array<{ file: string, mtime: number }> {
  if (depth > 3) return []
  const out: Array<{ file: string, mtime: number }> = []
  let entries: fs.Dirent[]
  try { entries = fs.readdirSync(root, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    const p = path.join(root, e.name)
    if (e.isDirectory()) out.push(...findDumps(p, depth + 1))
    else if (e.name.endsWith('.dmp')) {
      try { out.push({ file: p, mtime: fs.statSync(p).mtimeMs }) } catch {}
    }
  }
  return out
}

export function attachCrashLogger (l: Logger) {
  logger = l
}

// The first one is usually the cause and the rest its fallout (one bad render
// can leave a window failing every update after), so the first few stay put
// and go to the log; later ones roll. After 10 quiet minutes a new burst
// starts fresh, since reports only look back that far.
const KEEP_FIRST = 5
let loggedErrors = 0
export function noteRendererError (text: string) {
  const now = Date.now()
  const last = rendererErrors[rendererErrors.length - 1]
  if (last && now - last.at > 10 * 60_000) {
    rendererErrors.length = 0
    loggedErrors = 0
  }
  rendererErrors.push({ at: now, text: text.slice(0, 2000) })
  if (rendererErrors.length > 15) rendererErrors.splice(KEEP_FIRST, 1)
  if (loggedErrors < KEEP_FIRST) {
    loggedErrors++
    logger?.write(`error [overlay] ${text.slice(0, 2000)}`)
  }
}

export interface PendingCrash {
  id: string
  at: number
  title: string
  count: number
}

// A crash from an earlier run that the player hasn't reported or dismissed.
export function pendingCrash (): PendingCrash | null {
  if (!appPrefs().crashPrompt) return null
  const unseen = listFiles()
    .map(f => readReport(f.slice(0, -5)))
    .filter((r): r is CrashReport => r != null && !r.seen && r.session !== SESSION)
  if (!unseen.length) return null
  return { id: unseen[0].id, at: unseen[0].at, title: unseen[0].title, count: unseen.length }
}

export function dismissCrashes () {
  for (const f of listFiles()) {
    const r = readReport(f.slice(0, -5))
    if (r && !r.seen && r.session !== SESSION) {
      r.seen = true
      write(r)
    }
  }
}

// A public issue must not carry the player's name: their Windows user folder
// shows up in paths, and the user name on its own in some errors.
export interface ScrubNames { home?: string, user?: string }

function escapeRe (s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

export function scrubText (text: string, names: ScrubNames = localNames()): string {
  let out = text
  const home = names.home?.replace(/[\\/]+$/, '')
  if (home && home.length > 3) {
    // Either slash, any case (Windows paths).
    const parts = home.split(/[\\/]+/).map(escapeRe)
    out = out.replace(new RegExp(parts.join('[\\\\/]+'), 'gi'), '~')
  }
  // Any other user folder, e.g. from a path the game reported.
  out = out.replace(/([A-Za-z]:[\\/]+Users[\\/]+)[^\\/\s"'<>]+/gi, '$1<user>')
  out = out.replace(/(\/(?:home|Users)\/)[^/\s"'<>]+/g, '$1<user>')
  // A pathofexile.com login cookie must never end up in a report.
  out = out.replace(/(POESESSID[=:"'\s]+)[0-9a-f]{16,}/gi, '$1<hidden>')
  const user = names.user
  if (user && user.length >= 3) out = out.replace(new RegExp(`\\b${escapeRe(user)}\\b`, 'gi'), '<user>')
  return out
}

function localNames (): ScrubNames {
  let user: string | undefined
  try { user = os.userInfo().username } catch {}
  return { home: os.homedir(), user }
}

export function issueUrl (r: CrashReport, context?: string, names: ScrubNames = localNames()): string {
  const scrub = (text: string) => scrubText(text, names)
  const when = new Date(r.at).toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
  const head = [
    r.kind === 'manual' ? '**What went wrong?**' : '**What were you doing when it happened?**',
    '<!-- e.g. price checking a map, alt-tabbing, starting a map -->',
    '',
    '',
    '**Details** (added by the app)',
    `- Version: ${r.version} (Electron ${r.electron}, ${r.os})`,
    `- When: ${when}`,
    r.kind === 'manual' ? null : `- What happened: ${scrub(r.title)}`,
    context ? `- ${scrub(context)}` : null
  ].filter(l => l != null).join('\n')

  const block = (label: string, text: string) => text.trim()
    ? `\n\n<details><summary>${label}</summary>\n\n\`\`\`\n${text.trim()}\n\`\`\`\n</details>`
    : ''

  const title = r.kind === 'manual' ? 'Problem report' : `Crash: ${scrub(r.title)}`
  let logLines = scrub(r.log).split('\n')
  // GitHub refuses very long URLs; drop the oldest log lines until it fits.
  for (;;) {
    const body = head +
      block('Error', r.kind === 'manual' ? '' : scrub(r.detail).slice(0, 2500)) +
      block('Overlay errors', scrub(r.rendererErrors.join('\n\n')).slice(0, 1500)) +
      block('Log', logLines.join('\n'))
    const url = `${ISSUES_URL}?${new URLSearchParams({ title, body, labels: r.kind === 'manual' ? 'bug' : 'crash' }).toString()}`
    // Never cut inside a %XX escape: GitHub rejects a malformed URL.
    if (url.length < 7000 || !logLines.length) return url.slice(0, 7900).replace(/%[0-9A-Fa-f]?$/, '')
    logLines = logLines.slice(Math.ceil(logLines.length / 4))
  }
}

export async function openReport (id: string | null, context?: string) {
  const report = id ? readReport(id) : recordCrash('manual', 'Problem report', '')
  if (!report) throw new Error('That report is gone')
  if (id) {
    report.seen = true
    write(report)
  }
  await shell.openExternal(issueUrl(report, context))
}

export async function openCrashFolder () {
  fs.mkdirSync(dir(), { recursive: true })
  await shell.openPath(dir())
}
