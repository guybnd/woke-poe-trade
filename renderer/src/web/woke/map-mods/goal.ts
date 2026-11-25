// The farming goal for map price checks (Guy's pick, veteran review 2026-11-24):
// which of a map's numbers matter for what you farm. In 3.30 Atlas Drops raises
// Maps, Threads and league resources found, not currency; Item Rarity decides
// how good a monster's currency drop is (and a map's Atlas Drops count as
// rarity too). So currency maps want Rarity, Pack size and More Currency, and
// map / Thread farming wants Atlas Drops, More Maps and More Threads.
// Checked against poedb's 3.30.0 patch notes.
// The words and the strip's rings; which numbers start on is goal-chips.ts.
// Reading and saving the goal is goal-config.ts.

import type { FarmGoal } from './goal-chips'
export type { FarmGoal } from './goal-chips'
export { goalAddsExtra, goalDisabled } from './goal-chips'
export const FARM_GOALS: FarmGoal[] = ['currency', 'atlas', 'any']
export const FARM_GOAL_LABEL: Record<FarmGoal, string> = { currency: 'Currency', atlas: 'Maps & Threads', any: 'Any' }

// The numbers that matter for a goal: ringed on the strip.
export const GOAL_KEYS: Record<FarmGoal, readonly string[]> = {
  any: [],
  currency: ['Rarity', 'Pack', 'Currency'],
  atlas: ['Drops', 'Pack', 'Maps', 'Threads']
}

// What each number raises, for its hover.
export const RAISES: Record<string, string> = {
  'Drops': 'Atlas Drops raises Maps, Threads and league resources found (Splinters, Hiveblood, Lifeforce), not currency. It also counts as Item Rarity.',
  'Quant': 'Item Quantity: more items of every kind (old maps and charts only).',
  'Rarity': 'Item Rarity makes drops better: higher rarity means better currency from monsters, and more magic, rare and unique items.',
  'Pack': 'Pack size: more monsters, so more of everything.',
  'Currency': 'T17 bonus: more currency items dropped.',
  'Threads': 'T17 bonus: more Threads dropped.',
  'Maps': 'T17 bonus: more maps dropped.',
  'Div cards': 'T17 bonus: more divination cards dropped.'
}

// The Planner's goal when you haven't picked one there.
export function plannerGoalFor (goal: FarmGoal): 'currency' | 'maps' | null {
  return goal === 'currency' ? 'currency' : goal === 'atlas' ? 'maps' : null
}
