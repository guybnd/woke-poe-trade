// The stash reader (net worth from your own stash tabs). Off for every player
// unless they turn it on in Settings › Modules, a row hidden until they click
// the Economy heading 5 times; personal.flag in the data folder keeps it on.
// Main owns the switch (woke-app.json). Off, nothing here loads: no module,
// widget, settings or listeners. On, the code loads as its own chunk.
import { shallowRef } from 'vue'
import { Host } from '@/web/background/IPC'
import { hostRequest } from './shared/host'

// What main answers (main/src/woke/personal/index.ts).
export interface PersonalState {
  on: boolean
  // personal.flag: always on, the switch can't turn it off.
  forced: boolean
  // The experimental rows are shown.
  unlocked: boolean
}

export const personalOn = shallowRef(false)
export const personalForced = shallowRef(false)
export const experimentalUnlocked = shallowRef(false)

let chunk: typeof import('./net-worth/enable') | null = null

// Once config has loaded (main.ts): one Net worth window at most.
export function tidyPersonal (config: Parameters<typeof import('./net-worth/enable').dedupeWidgets>[0]) {
  if (personalOn.value && chunk?.dedupeWidgets(config)) chunk.saveNow()
}

export function takePersonal (s: Partial<PersonalState> | null | undefined) {
  personalOn.value = s?.on === true
  personalForced.value = s?.forced === true
  experimentalUnlocked.value = s?.unlocked === true
}

// Runs once at startup, before the overlay mounts. The switch itself is in
// personal-switch.ts, loaded once experimental settings are shown.
export async function loadPersonal (): Promise<void> {
  if (!Host.isElectron) return
  let s: PersonalState | null = null
  try {
    s = await hostRequest<PersonalState>('personal-flag', null, 5000)
  } catch {}
  takePersonal(s)
  if (!personalOn.value) return
  try {
    chunk = await import('./net-worth/enable')
    chunk.enableNetWorth(false)
  } catch (e) {
    console.warn('[personal] could not load', e)
    personalOn.value = false
    // Nothing to show it with: don't leave main reading.
    if (!personalForced.value) hostRequest('personal-set', { on: false }).catch(() => {})
  }
}
