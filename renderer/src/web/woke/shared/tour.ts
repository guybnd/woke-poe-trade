// A one-off tour's steps (TourCard.vue): small cards by what they explain, one
// after another; a step whose target isn't on screen is skipped. The price
// check's tour (price-insight/tour-steps.ts) and the loot filter's
// (loot-filter/filter-tour.ts) use it. No Vue here, so tests read it in node.

// Plain text, a key chip, or words shown in the colour they name.
export type TourTone = 'accent' | 'dim' | 'up' | 'down'
export type TourBit = string | { kbd: string } | { tone: TourTone, text: string }

export interface TourStep {
  id: string
  title: string
  // What the step is about: the first selector found on screen.
  target: string | readonly string[]
  // What the card points at, when not the target, and on which side of it.
  anchor?: string
  above?: true
  text: readonly TourBit[]
}

export function targetsOf (s: TourStep): readonly string[] {
  return typeof s.target === 'string' ? [s.target] : s.target
}

// The next step at or after `from` whose target is on screen, or -1.
export function nextTourStep (steps: readonly TourStep[], from: number, onScreen: (step: TourStep) => boolean): number {
  for (let i = from; i < steps.length; i++) {
    if (onScreen(steps[i])) return i
  }
  return -1
}

// Where the card is in the steps this run has: those shown so far (`passed`,
// by id), this one, and those on screen still to come (a page with no ruler
// of its own has one fewer).
export function tourPlace (steps: readonly TourStep[], index: number, onScreen: (step: TourStep) => boolean, passed: ReadonlySet<string>): { at: number, of: number } {
  const there = steps.map((s, i) => i < index ? passed.has(s.id) : i === index || onScreen(s))
  return { at: there.slice(0, index + 1).filter(Boolean).length, of: there.filter(Boolean).length }
}
