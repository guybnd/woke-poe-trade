// The hidden unlock for experimental settings: click the Economy heading in
// Settings › Modules 5 times within about 3 seconds, like Android's developer
// options.
import { toast } from '../ui/layer'
import { experimentalUnlocked } from '../personal'
import { setExperimentalUnlocked } from '../personal-switch'
export const UNLOCK_TAPS = 5
export const UNLOCK_WINDOW_MS = 3000

// Returns a tap function that says true on the tap that completes the run.
export function tapCounter (taps = UNLOCK_TAPS, windowMs = UNLOCK_WINDOW_MS, now: () => number = Date.now) {
  let times: number[] = []
  return (): boolean => {
    const t = now()
    times = [...times.filter(x => t - x < windowMs), t]
    if (times.length < taps) return false
    times = []
    return true
  }
}

export const UNLOCKED_TOAST = 'Experimental settings unlocked'

// One click on the Economy heading, at `at` (ms). The 5th in time unlocks.
let tapAt = 0
const tap = tapCounter(UNLOCK_TAPS, UNLOCK_WINDOW_MS, () => tapAt)
export function tapEconomy (at: number, anchor: Element | null) {
  tapAt = at
  if (experimentalUnlocked.value || !tap()) return
  setExperimentalUnlocked(true)
    .then(() => { if (experimentalUnlocked.value) toast(UNLOCKED_TOAST, { anchor }) })
    .catch(() => {})
}
