// A notable's one click: off → Want → Must → off. A Megalomaniac has 3
// notables, so with 3 musts already a Want goes back to off (`full`: say why).
export type NotableState = 'off' | 'want' | 'must'
export const MAX_MUST = 3

export function nextNotableState (state: NotableState, mustCount: number): { next: NotableState, full: boolean } {
  if (state === 'off') return { next: 'want', full: false }
  if (state === 'must') return { next: 'off', full: false }
  return mustCount >= MAX_MUST ? { next: 'off', full: true } : { next: 'must', full: false }
}
