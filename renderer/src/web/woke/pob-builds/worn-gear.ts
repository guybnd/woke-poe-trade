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

// The last gear read, and the character a read failed for (so the compare
// falls back to PoB instead of waiting).
export const wornGear = shallowRef<WornGear | null>(null)
export const wornFailed = shallowRef<string | null>(null)

let asking: string | null = null

// Main keeps it for a minute, so asking on every price check is cheap.
export function askWornGear (character: string) {
  if (!personalOn.value || !character || asking === character) return
  asking = character
  hostRequest<Reply>('worn-items', { character }, 20_000)
    .then((r) => {
      if ('error' in r) {
        if (wornGear.value?.character !== character) wornFailed.value = character
        return
      }
      wornFailed.value = null
      // Same gear as before: keep the object, so nothing recalculates.
      const prev = wornGear.value
      if (prev && prev.character === r.character && JSON.stringify(prev.slots) === JSON.stringify(r.slots)) return
      wornGear.value = r
    })
    .catch(() => { if (wornGear.value?.character !== character) wornFailed.value = character })
    .finally(() => { if (asking === character) asking = null })
}
