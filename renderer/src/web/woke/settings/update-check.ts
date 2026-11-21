// "Check for updates": the Install & updates page's button and the Ctrl+Space
// command share one check and its result (main/src/woke/update-check.ts).
import { shallowRef } from 'vue'
import type { WokeUpdateCheck } from '@ipc/woke-ops'
import { hostRequest } from '../shared/host'

export interface CheckLine {
  text: string
  // The release page, for a copy that updates by hand.
  link: { label: string, url: string } | null
  tone: 'ok' | 'new' | 'error'
}

export function checkLine (r: WokeUpdateCheck): CheckLine {
  switch (r.kind) {
    case 'up-to-date': return {
      text: r.skipped ? `Up to date (${r.current}). Skipping ${r.skipped}: you went back from it.` : `Up to date (${r.current}).`,
      link: null,
      tone: 'ok'
    }
    case 'available': return { text: `${r.version} available.`, link: { label: 'Download', url: r.url }, tone: 'new' }
    case 'downloading': return { text: `Downloading ${r.version}.`, link: null, tone: 'new' }
    case 'downloaded': return {
      text: r.blocked
        ? `${r.version} is downloaded and waits while going back to the previous version.`
        : r.whenClosed
          ? `${r.version} will install when Path of Exile is closed, or when you quit.`
          : `${r.version} will install when you quit.`,
      link: null,
      tone: 'new'
    }
    case 'error': return { text: r.message, link: null, tone: 'error' }
  }
}

// An installed build's check can wait on electron-updater's feed.
const CHECK_TIMEOUT_MS = 45_000

export const updateCheck = shallowRef<{ checking: boolean, result: WokeUpdateCheck | null }>({ checking: false, result: null })
let running: Promise<WokeUpdateCheck> | null = null

// One check at a time: a second click while one runs gets the same answer.
export function runUpdateCheck (): Promise<WokeUpdateCheck> {
  if (running) return running
  updateCheck.value = { checking: true, result: updateCheck.value.result }
  running = hostRequest('update-check', null, CHECK_TIMEOUT_MS)
    .catch((e: unknown): WokeUpdateCheck => ({ kind: 'error', current: updateCheck.value.result?.current ?? '', message: e instanceof Error ? e.message : String(e) }))
    .then((result) => {
      updateCheck.value = { checking: false, result }
      running = null
      return result
    })
  return running
}
