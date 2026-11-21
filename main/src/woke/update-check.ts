// woke: "Check for updates" (Settings › Install & updates, Ctrl+Space search).
// An installed build asks electron-updater and reports what it did; a portable
// or development build updates by hand, so it asks GitHub for the latest
// release and links to it. Pure mapping here; AppUpdater.checkNow wires it.
import type { UpdateInfo } from '../../../ipc/types'
import type { WokeUpdateCheck } from '../../../ipc/woke-ops'
import { compareVersions, parseVersion } from './rollback'

export const REPO = 'guybnd/woke-poe-trade'
export const LATEST_URL = `https://api.github.com/repos/${REPO}/releases/latest`
export const RELEASES_PAGE = `https://github.com/${REPO}/releases`
export const CHECK_TIMEOUT_MS = 15_000

export function releasePage (version: string): string {
  return `${RELEASES_PAGE}/tag/v${version}`
}

const NO_ANSWER = "Couldn't reach GitHub. Check the connection and try again."
const UPDATER_FAILED = 'The update check failed. Try again later.'

// What electron-updater's state says once its check is done.
export function fromUpdaterInfo (info: UpdateInfo, current: string, skipped: string | null = null): WokeUpdateCheck {
  switch (info.state) {
    case 'update-not-available':
      return skipped ? { kind: 'up-to-date', current, skipped } : { kind: 'up-to-date', current }
    case 'update-available':
      return info.noDownloadReason == null
        ? { kind: 'downloading', current, version: info.version }
        : { kind: 'available', current, version: info.version, url: releasePage(info.version) }
    case 'update-downloaded':
      return info.blocked === true
        ? { kind: 'downloaded', current, version: info.version, whenClosed: false, blocked: true }
        : { kind: 'downloaded', current, version: info.version, whenClosed: info.whenClosed === true }
    case 'error':
      return { kind: 'error', current, message: UPDATER_FAILED }
    default:
      // Still checking (a check already under way didn't finish in time).
      return { kind: 'error', current, message: 'No answer yet. Try again in a moment.' }
  }
}

export interface LatestReply { status: number, body: unknown }

// GitHub's answer for the latest release, against the running version.
export function fromLatestRelease (reply: LatestReply, current: string): WokeUpdateCheck {
  if (reply.status === 403 || reply.status === 429) {
    return { kind: 'error', current, message: 'GitHub is limiting checks right now. Try again in an hour.' }
  }
  if (reply.status === 404) return { kind: 'error', current, message: 'No release found on GitHub.' }
  if (reply.status < 200 || reply.status >= 300) {
    return { kind: 'error', current, message: `GitHub answered ${reply.status}. Try again later.` }
  }
  const body = (reply.body ?? {}) as { tag_name?: unknown, html_url?: unknown }
  const version = typeof body.tag_name === 'string' ? body.tag_name.trim().replace(/^v/, '') : ''
  if (!parseVersion(version)) return { kind: 'error', current, message: "GitHub's latest release has no version." }
  // A development copy may carry a version that doesn't parse: anything
  // published then counts as newer.
  const newer = parseVersion(current) ? compareVersions(version, current) > 0 : true
  if (!newer) return { kind: 'up-to-date', current }
  // The release page, never another address from the reply.
  const url = typeof body.html_url === 'string' && body.html_url.startsWith(`${RELEASES_PAGE}/tag/`)
    ? body.html_url
    : releasePage(version)
  return { kind: 'available', current, version, url }
}

type Fetch = (url: string, init: { headers: Record<string, string>, signal: AbortSignal }) => Promise<{ status: number, json: () => Promise<unknown> }>

export async function checkLatestRelease (current: string, fetch: Fetch): Promise<WokeUpdateCheck> {
  let res: Awaited<ReturnType<Fetch>>
  try {
    res = await fetch(LATEST_URL, {
      headers: { 'User-Agent': 'woke-poe-trade (update check)', Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS)
    })
  } catch {
    return { kind: 'error', current, message: NO_ANSWER }
  }
  let body: unknown = null
  if (res.status >= 200 && res.status < 300) {
    try {
      body = await res.json()
    } catch {
      return { kind: 'error', current, message: "GitHub's answer couldn't be read. Try again later." }
    }
  }
  return fromLatestRelease({ status: res.status, body }, current)
}
