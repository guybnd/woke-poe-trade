// woke: going back to the previous release, from Settings › About or the tray
// (WOKEPOET-53, Guy's picks A + B). The installer comes from the release on
// GitHub and must match the SHA-512 in that release's latest.yml. It installs
// under the same rules as an update (AppUpdater.tryInstall): Path of Exile
// closed by two checks for 3 minutes, no app window in use, installer readable.
// The version gone back from is then skipped by automatic updates; newer ones
// install as usual.
import { app, net } from 'electron'
import { spawn } from 'child_process'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { once } from 'events'
import type { WokeRollbackState } from '../../../ipc/woke-ops'
import { installerProblem } from './update-install'

const REPO = 'guybnd/woke-poe-trade'
const RELEASES_URL = `https://api.github.com/repos/${REPO}/releases?per_page=30`
const HEADERS = { 'User-Agent': 'woke-poe-trade (rollback)' }
const INSTALLER_NAME = /^Woke-PoE-Trade-Setup-\d+\.\d+\.\d+\.exe$/
// The release list is read with each update check, and when About opens if older.
const RELEASES_MAX_AGE_MS = 60 * 60_000

// ---------- Versions ----------

export function parseVersion (v: string): [number, number, number] | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(v.trim())
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}

// Negative when a is older. Both must parse (parseVersion).
export function compareVersions (a: string, b: string): number {
  const x = parseVersion(a)
  const y = parseVersion(b)
  if (!x || !y) return NaN
  for (let i = 0; i < 3; i++) {
    if (x[i] !== y[i]) return x[i] - y[i]
  }
  return 0
}

export interface ReleaseEntry { tag_name?: unknown, draft?: unknown, prerelease?: unknown }

// The newest published release older than the running one.
export function previousVersion (current: string, releases: ReleaseEntry[]): string | null {
  if (!parseVersion(current)) return null
  let best: string | null = null
  for (const r of releases) {
    if (r.draft !== false || r.prerelease !== false || typeof r.tag_name !== 'string') continue
    const v = r.tag_name.replace(/^v/, '')
    if (!parseVersion(v) || !(compareVersions(v, current) < 0)) continue
    if (best == null || compareVersions(v, best) > 0) best = v
  }
  return best
}

// ---------- latest.yml ----------

export interface LatestYml { version: string, file: string, sha512: string, size: number | null }

const unquote = (s: string) => s.trim().replace(/^(['"])(.*)\1$/, '$2')

// The top-level version, path and sha512 of electron-builder's latest.yml, and
// the size listed for that path under files.
export function parseLatestYml (text: string): LatestYml | null {
  const top = (key: string) => {
    const m = new RegExp(`^${key}:[ \\t]*(.+)$`, 'm').exec(text)
    return m ? unquote(m[1]) : null
  }
  const version = top('version')
  const file = top('path')
  const sha512 = top('sha512')
  if (!version || !file || !sha512) return null
  let size: number | null = null
  const lines = text.split(/\r?\n/)
  const at = lines.findIndex(l => /^\s*-\s*url:/.test(l) && unquote(l.replace(/^\s*-\s*url:/, '')) === file)
  if (at >= 0) {
    for (let i = at + 1; i < lines.length && /^\s+\S/.test(lines[i]) && !/^\s*-/.test(lines[i]); i++) {
      const m = /^\s+size:\s*(\d+)\s*$/.exec(lines[i])
      if (m) size = Number(m[1])
    }
  }
  return { version, file, sha512, size }
}

// Why this latest.yml can't be used to go back to `version`, or null.
export function ymlProblem (yml: LatestYml | null, version: string): string | null {
  if (!yml) return 'the release has no readable latest.yml'
  if (yml.version !== version) return `latest.yml is for ${yml.version}, not ${version}`
  if (!INSTALLER_NAME.test(yml.file)) return `unexpected installer name ${yml.file}`
  if (!/^[A-Za-z0-9+/]{86}==$/.test(yml.sha512)) return 'latest.yml has no SHA-512'
  return null
}

export function installerUrl (version: string, file: string): string {
  return `https://github.com/${REPO}/releases/download/v${version}/${file}`
}

export async function fileSha512 (file: string): Promise<string> {
  const hash = crypto.createHash('sha512')
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk as Buffer)
  return hash.digest('base64')
}

// ---------- Skipping the version gone back from ----------

// Automatic updates leave this version, and anything older, alone.
export function isSkipped (version: string, skip: string | null): boolean {
  if (!skip) return false
  const c = compareVersions(version, skip)
  return !Number.isNaN(c) && c <= 0
}

// Once the app runs the skipped version or newer (reinstalled by hand, or a
// newer update), the skip has done its job.
export function skipStillNeeded (current: string, skip: string | null): boolean {
  if (!skip) return false
  return compareVersions(current, skip) < 0
}

// ---------- The tray's entry (pick B) ----------

// "Go back to X", "Stop going back to X", or nothing: never for the portable
// exe or a dev build, nor while installing or with no earlier release.
export function trayEntry (s: WokeRollbackState): { label: string, action: 'start' | 'cancel' } | null {
  if (!s.offered) return null
  if (s.phase === 'downloading' || s.phase === 'ready') return { label: `Stop going back to ${s.target ?? ''}`, action: 'cancel' }
  if (s.phase === 'installing' || !s.previous) return null
  return { label: `Go back to ${s.previous}`, action: 'start' }
}

// ---------- The "Updated to X" notification (update notice E) ----------

// Written just before an automatic install. Shown once, on the first start
// that runs that version; a failed install leaves another version running and
// the note is dropped silently.
export function noteToShow (note: unknown, current: string): string | null {
  const v = (note as { version?: unknown } | null)?.version
  return typeof v === 'string' && v === current ? v : null
}

const dataFile = (name: string) => path.join(app.getPath('userData'), 'apt-data', name)

function readJson (name: string): unknown {
  try { return JSON.parse(fs.readFileSync(dataFile(name), 'utf8')) } catch { return null }
}
function writeJson (name: string, value: unknown) {
  try {
    fs.mkdirSync(path.dirname(dataFile(name)), { recursive: true })
    fs.writeFileSync(dataFile(name), JSON.stringify(value, null, 2))
  } catch {}
}
function removeFile (file: string) {
  try { fs.rmSync(file, { force: true }) } catch {}
}

const NOTE_FILE = 'woke-update-note.json'
export function writeUpdateNote (version: string) { writeJson(NOTE_FILE, { version }) }
export function clearUpdateNote () { removeFile(dataFile(NOTE_FILE)) }
export function takeUpdateNote (current: string): string | null {
  const shown = noteToShow(readJson(NOTE_FILE), current)
  clearUpdateNote()
  return shown
}

// ---------- The rollback itself ----------

const SKIP_FILE = 'woke-rollback.json'
const downloadDir = () => path.join(app.getPath('userData'), 'rollback')

type Phase = WokeRollbackState['phase']

export class Rollback {
  private releases: ReleaseEntry[] | null = null
  private fetchedAt = 0
  private fetching: Promise<void> | null = null
  private phase: Phase = 'idle'
  private target: string | null = null
  private progress: number | null = null
  private error: string | null = null
  private file: string | null = null
  private abort: AbortController | null = null
  private skip: string | null = null
  private lastSent = 0

  constructor (
    private log: (line: string) => void,
    private changed: () => void,
    // An installed build: not the portable exe, not a dev build.
    readonly offered: boolean
  ) {
    const saved = (readJson(SKIP_FILE) as { skip?: unknown } | null)?.skip
    this.skip = typeof saved === 'string' && parseVersion(saved) ? saved : null
    if (this.skip && !skipStillNeeded(app.getVersion(), this.skip)) {
      this.log(`info [Rollback] Running ${app.getVersion()}: no longer skipping ${this.skip}.`)
      this.setSkip(null)
    }
    // A download from a run that never installed it.
    try { fs.rmSync(downloadDir(), { recursive: true, force: true }) } catch {}
  }

  get skipped () { return this.skip }
  get readyFile () { return this.phase === 'ready' ? this.file : null }
  get previous () { return this.releases ? previousVersion(app.getVersion(), this.releases) : null }

  get state (): WokeRollbackState {
    return {
      offered: this.offered,
      current: app.getVersion(),
      previous: this.previous,
      phase: this.phase,
      target: this.target,
      progress: this.progress,
      error: this.error,
      skip: this.skip
    }
  }

  // Reads the release list when it's missing or old (or `force`).
  async refresh (force = false): Promise<void> {
    if (!this.offered) return
    if (!force && this.releases && Date.now() - this.fetchedAt < RELEASES_MAX_AGE_MS) return
    if (this.fetching) return await this.fetching
    this.fetching = (async () => {
      try {
        const res = await net.fetch(RELEASES_URL, { headers: { ...HEADERS, Accept: 'application/vnd.github+json' } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const list = await res.json() as unknown
        if (!Array.isArray(list)) throw new Error('not a release list')
        const before = this.previous
        this.releases = list as ReleaseEntry[]
        this.fetchedAt = Date.now()
        if (this.previous !== before) this.changed()
      } catch (e) {
        this.log(`warn [Rollback] Couldn't read the release list: ${String(e)}`)
      } finally {
        this.fetching = null
      }
    })()
    return await this.fetching
  }

  // Downloads and checks the previous release's installer; then it waits to
  // install like an update. Resolves when the download ends either way.
  async start (): Promise<void> {
    if (!this.offered || this.phase === 'downloading' || this.phase === 'ready' || this.phase === 'installing') return
    await this.refresh()
    const version = this.previous
    if (!version) {
      this.fail(null, 'no earlier release found')
      return
    }
    this.phase = 'downloading'
    this.target = version
    this.progress = null
    this.error = null
    this.abort = new AbortController()
    const signal = this.abort.signal
    this.changed()
    this.log(`info [Rollback] Going back to ${version}: downloading.`)
    let part: string | null = null
    try {
      const ymlRes = await net.fetch(installerUrl(version, 'latest.yml'), { headers: HEADERS, signal })
      if (!ymlRes.ok) throw new Error(`latest.yml: HTTP ${ymlRes.status}`)
      const yml = parseLatestYml(await ymlRes.text())
      const problem = ymlProblem(yml, version)
      if (problem || !yml) throw new Error(problem ?? 'no latest.yml')

      fs.mkdirSync(downloadDir(), { recursive: true })
      const final = path.join(downloadDir(), yml.file)
      part = final + '.part'
      const res = await net.fetch(installerUrl(version, yml.file), { headers: HEADERS, signal })
      if (!res.ok || !res.body) throw new Error(`installer: HTTP ${res.status}`)
      const total = Number(res.headers.get('content-length')) || yml.size || 0
      const hash = crypto.createHash('sha512')
      const out = fs.createWriteStream(part)
      let got = 0
      try {
        const reader = res.body.getReader()
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          hash.update(value)
          got += value.length
          if (!out.write(value)) await once(out, 'drain')
          if (total) this.setProgress(got / total)
        }
      } finally {
        out.end()
        await once(out, 'close')
      }
      if (yml.size != null && got !== yml.size) throw new Error(`installer is ${got} bytes, latest.yml says ${yml.size}`)
      if (hash.digest('base64') !== yml.sha512) throw new Error('installer doesn\'t match the SHA-512 in latest.yml')
      fs.renameSync(part, final)
      part = null
      if (this.abort?.signal !== signal) return
      this.file = final
      this.phase = 'ready'
      this.progress = 1
      this.abort = null
      this.setSkip(app.getVersion())
      this.log(`info [Rollback] ${version} downloaded and checked: ${final}. Skipping ${app.getVersion()} from now on.`)
      this.changed()
    } catch (e) {
      if (part) removeFile(part)
      if (signal.aborted) return
      this.fail(version, e instanceof Error ? e.message : String(e))
    }
  }

  // Stops going back: the download, or the installer waiting for the game to close.
  cancel () {
    if (this.phase !== 'downloading' && this.phase !== 'ready' && this.phase !== 'failed') return
    const wasReady = this.phase === 'ready'
    this.abort?.abort()
    this.abort = null
    if (this.file) removeFile(this.file)
    this.file = null
    if (wasReady && this.skip === app.getVersion()) this.setSkip(null)
    this.log(`info [Rollback] Not going back to ${this.target ?? 'the previous version'}.`)
    this.phase = 'idle'
    this.target = null
    this.progress = null
    this.error = null
    this.changed()
  }

  undoSkip () {
    if (!this.skip) return
    this.log(`info [Rollback] No longer skipping ${this.skip}.`)
    this.setSkip(null)
    this.changed()
  }

  // Starts the checked installer. True once it runs; the caller then quits.
  // `runAfter` starts the app again when it's done (not on quit).
  async install (runAfter: boolean): Promise<boolean> {
    const file = this.readyFile
    const problem = installerProblem(file)
    if (problem || !file) {
      this.fail(this.target, problem ?? 'no installer')
      return false
    }
    this.phase = 'installing'
    this.changed()
    this.log(`info [Rollback] Installing ${this.target ?? ''}: ${file}`)
    return await new Promise<boolean>((resolve) => {
      const args = ['--updated', '/S']
      if (runAfter) args.push('--force-run')
      try {
        const child = spawn(file, args, { detached: true, stdio: 'ignore' })
        child.once('spawn', () => { child.unref(); resolve(true) })
        child.once('error', (e) => {
          this.fail(this.target, `the installer didn't start: ${e.message} (${file})`)
          resolve(false)
        })
      } catch (e) {
        this.fail(this.target, `the installer didn't start: ${String(e)} (${file})`)
        resolve(false)
      }
    })
  }

  private fail (version: string | null, message: string) {
    this.log(`error [Rollback] Couldn't go back${version ? ` to ${version}` : ''}: ${message}`)
    // The version gone back from isn't skipped when going back didn't happen.
    if (this.skip === app.getVersion()) this.setSkip(null)
    this.phase = 'failed'
    this.target = version
    this.error = message
    this.progress = null
    this.abort = null
    this.changed()
  }

  private setProgress (p: number) {
    this.progress = Math.max(0, Math.min(1, p))
    if (Date.now() - this.lastSent < 500) return
    this.lastSent = Date.now()
    this.changed()
  }

  private setSkip (skip: string | null) {
    this.skip = skip
    if (skip) writeJson(SKIP_FILE, { skip })
    else removeFile(dataFile(SKIP_FILE))
  }
}
