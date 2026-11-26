// Base ranks (Gear tab): drag a base, or the picked set, onto another column.
// The moves are the pick bar's buttons, in the order they apply.
import { ref } from 'vue'
import type { Lane } from './gear'

export type GearMove = Lane | 'build' | 'unbuild'

// A card in the picked set drags the whole set; any other card drags alone.
export function dragSet (picked: string[], base: string): string[] {
  return picked.includes(base) ? [...picked] : [base]
}

// Exotic is NeverSink's own list: nothing can be put there.
export function canDrop (from: string, to: string): boolean {
  return to !== from && to !== 'exotic'
}

// Out of Build into a rank: it leaves the build and takes that rank, or the
// card would still sit in Build and the drop look like it did nothing.
export function dropMoves (from: string, to: string): GearMove[] {
  if (!canDrop(from, to)) return []
  if (to === 'build') return ['build']
  const lane = to as Lane
  return from === 'build' ? ['unbuild', lane] : [lane]
}

// What's new's Show me: opens the editor on Base types › Base ranks. Each
// reader (the editor's tab, the Gear tab's view) acts on an ask once, even
// when it's drawn again later.
export const gearRanksAsk = ref(0)
const seen = { tab: 0, view: 0 }
export function takeRanksAsk (reader: keyof typeof seen): boolean {
  if (gearRanksAsk.value <= seen[reader]) return false
  seen[reader] = gearRanksAsk.value
  return true
}
