// What your character wears now, read from pathofexile.com by main
// (main/src/woke/personal/worn-items.ts). Only with the stash reader on:
// otherwise the compare uses your PoB build and says so.
import { shallowRef } from 'vue'
import { personalOn } from '../personal'
import { hostRequest } from '../shared/host'
import type { PobItem } from './widget'

export interface WornGear {
  character: string
  readAt: number
  slots: Array<{ slot: string, item: PobItem }>
}

type Reply = WornGear | { error: string }

// After this long without a good read, the gear we have is too old to call yours.
export const WORN_STALE_MS = 10 * 60_000

export interface WornState {
  gear: WornGear | null
  // The last ask failed (gear may still hold an older read).
  error: string | null
  // An ask is under way.
  pending: boolean
}

export const worn = shallowRef<WornState>({ gear: null, error: null, pending: false })

let seq = 0

// Main keeps the gear a minute and a failure a minute, so asking on every
// price check of gear costs at most one call a minute.
export function askWornGear (hint: string) {
  if (!personalOn.value) return
  const mine = ++seq
  worn.value = { ...worn.value, pending: true }
  hostRequest<Reply>('worn-items', { character: hint }, 20_000)
    .then((r) => {
      if (mine !== seq) return
      if ('error' in r) {
        worn.value = { gear: worn.value.gear, error: r.error, pending: false }
        return
      }
      // Same gear as before: keep the object, so nothing recalculates.
      const prev = worn.value.gear
      const same = prev && prev.character === r.character && JSON.stringify(prev.slots) === JSON.stringify(r.slots)
      worn.value = { gear: same ? { ...prev, readAt: r.readAt } : r, error: null, pending: false }
    })
    .catch((e: Error) => {
      if (mine !== seq) return
      worn.value = { gear: worn.value.gear, error: e.message, pending: false }
    })
}
