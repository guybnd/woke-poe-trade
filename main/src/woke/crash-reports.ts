// Crash reports: written to <data>/crash-reports when something breaks, and
// offered for reporting on the next launch. Nothing leaves the PC unless the
// player presses Report, which opens a pre-filled GitHub issue they can read
// and edit before sending.
import { app, clipboard, crashReporter, shell } from 'electron'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type { Logger } from '../RemoteLogger'
import { appPrefs } from './app-prefs'
import type { WokeIssueRequest } from '../../../ipc/woke-ops'
import { buildIssue, scrubText, type BuiltIssue, type ScrubNames } from '../../../ipc/issue-report'

// The scrubbing lives with the issue builder; tests import it from here too.
export { scrubText, type ScrubNames }

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

function lastLogLines (n = 60, from: Logger | null = logger): string {
  return (from?.history ?? '').trimEnd().split('\n').slice(-n).join('\n')
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
// A UI step, as one app log line (Settings › Debug, and in Report an issue).
let traced: number[] = []
export function noteUiTrace (text: string) {
  const now = Date.now()
  traced = traced.filter(t => now - t < 60_000)
  if (traced.length >= 30) return
  traced.push(now)
  logger?.write(`[ui] ${text.slice(0, 300)}`)
}

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

export function localNames (names: string[] = []): ScrubNames {
  let user: string | undefined
  try { user = os.userInfo().username } catch {}
  return { home: os.homedir(), user, names }
}

export function crashIssue (r: CrashReport, context?: string, names: ScrubNames = localNames()): BuiltIssue {
  const when = new Date(r.at).toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
  const manual = r.kind === 'manual'
  return buildIssue({
    kind: manual ? 'bug' : 'crash',
    title: manual ? 'Problem report' : `Crash: ${r.title}`,
    prompt: manual ? 'What went wrong?' : 'What were you doing when it happened?',
    hint: 'e.g. price checking a map, alt-tabbing, starting a map',
    info: [
      `Version: ${r.version} (Electron ${r.electron}, ${r.os})`,
      `When: ${when}`,
      manual ? null : `What happened: ${r.title}`,
      context ?? null
    ].filter((l): l is string => l != null),
    error: manual ? '' : r.detail,
    overlayErrors: r.rendererErrors.join('\n\n'),
    log: r.log
  }, names)
}

export function issueUrl (r: CrashReport, context?: string, names: ScrubNames = localNames()): string {
  return crashIssue(r, context, names).url
}

export async function openReport (id: string | null, context?: string, names: string[] = []) {
  const report = id ? readReport(id) : recordCrash('manual', 'Problem report', '')
  if (!report) throw new Error('That report is gone')
  if (id) {
    report.seen = true
    write(report)
  }
  const issue = crashIssue(report, context, localNames(names))
  if (issue.clipboard) clipboard.writeText(issue.clipboard)
  await shell.openExternal(issue.url)
}

// "Report an issue": the player's own report, with app info and the log if
// they ticked them. `open` false only builds it, for the dialog's preview.
export type IssueRequest = WokeIssueRequest

export async function userIssue (args: IssueRequest | null | undefined, log: Logger | null = logger): Promise<BuiltIssue> {
  const req = (args ?? {}) as Partial<IssueRequest>
  const info = req.includeInfo
    ? [`Version: ${app.getVersion()} (Electron ${process.versions.electron}, ${osLine()})`, ...(Array.isArray(req.info) ? req.info.filter(l => typeof l === 'string') : [])]
    : undefined
  const issue = buildIssue({
    kind: req.kind === 'idea' ? 'idea' : 'bug',
    title: String(req.title ?? ''),
    text: String(req.text ?? ''),
    info,
    log: req.includeLog ? lastLogLines(200, log) : undefined
  }, localNames(Array.isArray(req.names) ? req.names.filter(n => typeof n === 'string') : []))
  if (req.open) {
    if (issue.clipboard) clipboard.writeText(issue.clipboard)
    await shell.openExternal(issue.url)
  }
  return issue
}

export async function openCrashFolder () {
  fs.mkdirSync(dir(), { recursive: true })
  await shell.openPath(dir())
}
