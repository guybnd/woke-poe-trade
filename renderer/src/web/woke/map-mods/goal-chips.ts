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

// The T17 'More X' numbers. A goal that wants one the map hasn't got adds it
// as a tile (the + menu's, min 1), so Currency searches maps with More
// Currency (Guy, 2026-11-25: "i picked currency template why isnt it adding
// currency box"). A goal that doesn't want one takes it off again. More Div
// cards no goal adds, so one you added by hand stays.
const MORE = ['Currency', 'Threads', 'Maps']
export function goalAddsExtra (label: string, goal: FarmGoal = 'any'): boolean | undefined {
  if (!MORE.includes(label)) return undefined
  return goal !== 'any' && ON[goal].split(',').includes(label)
}
