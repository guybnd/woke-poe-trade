// Newer item and stat data, without a release or a restart. Main downloads it
// and checks its hashes; here it goes through the same checks as bundled data,
// and is only used if it passes. Anything going wrong leaves the data as it was.
import { MainProcess } from '@/web/background/IPC'
import { useLiveData } from '@/assets/data'
import { hostRequest } from '../shared/host'

const CHECK_EVERY_MS = 6 * 60 * 60 * 1000
// A league's first two weeks bring a data update every day or two.
const LEAGUE_START_CHECK_MS = 30 * 60 * 1000
const LEAGUE_START_DAYS = 14
const FIRST_CHECK_AFTER_MS = 60 * 1000

export function checkDelay (leagueStartedAt: number | null, now = Date.now()): number {
  if (leagueStartedAt == null || leagueStartedAt > now) return CHECK_EVERY_MS
  return (now - leagueStartedAt) < LEAGUE_START_DAYS * 24 * 3600e3 ? LEAGUE_START_CHECK_MS : CHECK_EVERY_MS
}

// Tooltips and the tree, when a download has newer ones than the app's own.
let sharedInUse: { language: string, version: number, files: Set<string> } | null = null
const changeListeners = new Set<() => void>()

// Where to read a file of public/data from: the download, or the app's own.
export function dataFileUrl (file: string): string {
  return sharedInUse?.files.has(file)
    ? `/live-data/${sharedInUse.language}/${file}`
    : `${import.meta.env.BASE_URL}data/${file}`
}

// For loaders that keep a file once read: drop it when the data changes.
export function onSharedDataChange (fn: () => void): () => void {
  changeListeners.add(fn)
  return () => { changeListeners.delete(fn) }
}

// A newer download can change a file under the same name, so the version
// counts too.
const sharedKey = (s: typeof sharedInUse) => s && s.files.size ? `${s.language}@${s.version}:${[...s.files].join()}` : ''

function setShared (next: typeof sharedInUse) {
  const before = sharedKey(sharedInUse)
  sharedInUse = next
  if (sharedKey(next) !== before) for (const fn of changeListeners) fn()
}

let inUse: { language: string, version: number } | null = null
// A newer request, or a language change, makes one still fetching stand down.
let latestRequest = 0
let currentLanguage: (() => string) | null = null

async function bundledManifest (): Promise<{ version: number, shared?: Record<string, string> }> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/data-version.json`)
  return await res.json() as { version: number, shared?: Record<string, string> }
}

async function bundledVersion (): Promise<number> {
  return (await bundledManifest()).version
}

// Which tooltip and tree files the download has. None from older downloads.
async function sharedList (language: string): Promise<string[]> {
  try {
    const res = await fetch(`/live-data/${language}/shared.json`)
    if (!res.ok) return []
    const list = await res.json() as unknown
    return Array.isArray(list) ? list.filter((f): f is string => typeof f === 'string') : []
  } catch {
    return []
  }
}

async function apply (language: string, version: number) {
  const mine = ++latestRequest
  const get = async (name: string) => {
    const res = await fetch(`/live-data/${language}/${name}.ndjson`)
    if (!res.ok) throw new Error(`Couldn't read ${name}: ${res.status}`)
    return await res.text()
  }
  const [items, stats, shared] = await Promise.all([get('items'), get('stats'), sharedList(language)])
  if (mine !== latestRequest) return
  useLiveData(language, items, stats)
  inUse = { language, version }
  setShared({ language, version, files: new Set(shared) })
}

// Data downloaded on an earlier run. Before anything needs it, at startup and
// after a language change (which goes back to the bundled data).
export async function useDownloadedData (language: string) {
  if (!MainProcess.isElectron) return
  inUse = null
  setShared(null)
  latestRequest++
  try {
    // Short: the overlay waits for this at startup.
    const version = await hostRequest<number | null>('live-data-cached', { language, bundled: await bundledVersion() }, 3000)
    if (version != null) await apply(language, version)
  } catch (e) {
    console.warn('[live data] Staying on the bundled data', e)
  }
}

async function check (getLanguage: () => string) {
  const language = getLanguage()
  try {
    const bundled = await bundledManifest()
    const version = await hostRequest<number | null>('live-data-check', { language, bundled: bundled.version, bundledShared: bundled.shared ?? {} }, 120_000)
    if (version == null || language !== getLanguage()) return
    if (inUse?.language === language && inUse.version === version) return
    await apply(language, version)
    console.info(`[live data] Item data is now version ${version}`)
  } catch (e) {
    console.warn('[live data] Update failed', e)
  }
}

// After a language change: it may have no download yet.
export function checkLiveDataNow () {
  if (currentLanguage) check(currentLanguage).catch(() => {})
}

let timer: ReturnType<typeof setTimeout> | undefined
let lastCheckAt = 0
let startedAtOf: () => number | null = () => null
let tick: (() => void) | null = null

function leagueStart (): number | null {
  try { return startedAtOf() } catch { return null }
}

// Every 6 hours, or every 30 minutes in the picked league's first two weeks.
export function startLiveDataChecks (getLanguage: () => string, leagueStartedAt: () => number | null = () => null) {
  if (!MainProcess.isElectron) return
  currentLanguage = getLanguage
  startedAtOf = leagueStartedAt
  tick = () => {
    lastCheckAt = Date.now()
    check(getLanguage).catch(() => {})
    timer = setTimeout(tick!, checkDelay(leagueStart()))
  }
  timer = setTimeout(tick, FIRST_CHECK_AFTER_MS)
}

// After another league is picked: a new league's 30 minutes start now, not
// after the 6 hours already waiting.
export function rescheduleLiveDataChecks () {
  if (!tick || !lastCheckAt) return
  clearTimeout(timer)
  timer = setTimeout(tick, Math.max(0, lastCheckAt + checkDelay(leagueStart()) - Date.now()))
}
