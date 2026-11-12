// Personal-only features: on only when main finds personal.flag in the app's
// data folder. Off (every player's copy), nothing here loads: no module, no
// widget, no settings, no listeners. On, the code loads as its own chunk.
import { shallowRef } from 'vue'
import { Host } from '@/web/background/IPC'
import { hostRequest } from './shared/host'

export const personalOn = shallowRef(false)

// Runs once at startup, before the overlay mounts.
export async function loadPersonal (): Promise<void> {
  if (!Host.isElectron) return
  try {
    personalOn.value = await hostRequest<boolean>('personal-flag', null, 5000) === true
  } catch {
    personalOn.value = false
  }
  if (!personalOn.value) return
  try {
    const { enableNetWorth } = await import('./net-worth/enable')
    enableNetWorth()
  } catch (e) {
    console.warn('[personal] could not load', e)
    personalOn.value = false
  }
}
