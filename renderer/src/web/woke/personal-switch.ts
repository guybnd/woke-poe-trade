// Turning the stash reader on and off at runtime, and showing or hiding the
// experimental rows. Loaded only from those rows (Settings > Modules).
import { hostRequest } from './shared/host'
import { personalOn, takePersonal } from './personal'
import type { PersonalState } from './personal'

// Brings the overlay in line with what main says, then main's hotkeys with the overlay.
async function apply (s: PersonalState | null) {
  const was = personalOn.value
  takePersonal(s)
  if (personalOn.value === was) return
  const chunk = await import('./net-worth/enable').catch((e: unknown) => {
    // Nothing to show it with: don't leave main reading.
    console.warn('[personal] could not load', e)
    personalOn.value = false
    hostRequest('personal-set', { on: false }).catch(() => {})
    throw e
  })
  if (personalOn.value) chunk.enableNetWorth(true)
  else chunk.disableNetWorth()
  chunk.syncHost()
}

// The switch in Settings > Modules. Takes effect right away.
export async function setStashReaderOn (on: boolean): Promise<void> {
  await apply(await hostRequest<PersonalState>('personal-set', { on }, 15_000))
}

// Show or hide the experimental rows. Hiding turns the reader off too.
export async function setExperimentalUnlocked (unlocked: boolean): Promise<void> {
  await apply(await hostRequest<PersonalState>('experimental-set', { unlocked }, 15_000))
}
