// Base ranks (Gear tab): drag a base, or the picked set, onto another column.
// The moves are the pick bar's buttons, in the order they apply.
import { ref } from 'vue'
import type { Lane } from './gear'

export type GearMove = Lane | 'build' | 'unbuild' | 'exotic' | 'exotichi'

// A card in the picked set drags the whole set; any other card drags alone.
export function dragSet (picked: string[], base: string): string[] {
  return picked.includes(base) ? [...picked] : [base]
}

// Exotic is NeverSink's own list: nothing else can be put there. Its two
// lanes (valuable and the rest) swap bases between them.
const EXOTIC = ['exotic', 'exotichi']
export function canDrop (from: string, to: string): boolean {
  return to !== from && (!EXOTIC.includes(to) || EXOTIC.includes(from))
}

// Out of Build into a rank: it leaves the build and takes that rank, or the
// card would still sit in Build and the drop look like it did nothing. Never
// needs no unbuild: the build lane drops a Never base itself, and back out of
// Never it should be a build base again.
export function dropMoves (from: string, to: string): GearMove[] {
  if (!canDrop(from, to)) return []
  if (to === 'build') return ['build']
  if (EXOTIC.includes(to)) return [to as GearMove]
  const lane = to as Lane
  return from === 'build' && lane !== 'never' ? ['unbuild', lane] : [lane]
}

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
