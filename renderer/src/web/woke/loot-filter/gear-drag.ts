// Base ranks: What's new's Show me asks the editor to open it. The drag and
// drop itself is gear-drop.ts.
import { ref } from 'vue'

// What's new's Show me: opens the editor on its Base ranks tab. The reader
// (the editor's tab) acts on an ask once, even when it's drawn again later.
// An ask nobody took within a few seconds (no filter loaded) is dropped, so
// opening the tab by hand later doesn't jump.
export const gearRanksAsk = ref(0)
let askedAt = 0
export function askGearRanks () {
  askedAt = Date.now()
  gearRanksAsk.value++
}
const seen = { tab: 0 }
export function takeRanksAsk (reader: keyof typeof seen): boolean {
  if (gearRanksAsk.value <= seen[reader]) return false
  if (Date.now() - askedAt > 15_000) { seen[reader] = gearRanksAsk.value; return false }
  seen[reader] = gearRanksAsk.value
  return true
}
