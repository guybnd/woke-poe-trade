// Which map numbers a farming goal (goal.ts) starts on. The map strip
// (MapModStrip.vue) sets them on each new item's filters.
export type FarmGoal = 'any' | 'currency' | 'atlas'

// The map strip's chip labels (check.ts) a goal decides; Quant (old maps and
// charts only) keeps how it was made. Atlas Drops searches normally (Guy, 2026-11-24).
const DECIDES = ['Drops', 'Rarity', 'Pack', 'Currency', 'Threads', 'Maps', 'Div cards']
// The ones each goal starts on. Any is how chips started before goals (More
// Maps off, as APT had it).
const ON: Record<FarmGoal, string> = {
  any: 'Drops,Rarity,Pack,Currency,Threads,Div cards',
  currency: 'Rarity,Pack,Currency',
  atlas: 'Drops,Pack,Threads,Maps'
}

// Whether a chip's filter starts off in the trade search; undefined: as made.
export function goalDisabled (label: string, goal: FarmGoal = 'any'): boolean | undefined {
  return DECIDES.includes(label) ? !ON[goal].split(',').includes(label) : undefined
}
