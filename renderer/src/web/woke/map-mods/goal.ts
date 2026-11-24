// The farming goal for map price checks (Guy's pick, veteran review 2026-11-24):
// which of a map's numbers matter for what you farm. In 3.30 Atlas Drops raises
// Maps, Threads and league resources found, not currency; Item Rarity decides
// how good a monster's currency drop is (and a map's Atlas Drops count as
// rarity too). So currency maps want Rarity, Pack size and More Currency, and
// map / Thread farming wants Atlas Drops, More Maps and More Threads.
// Checked against poedb's 3.30.0 patch notes.
import { AppConfig } from '@/web/Config'
import { isModuleOn } from '../modules'

export type FarmGoal = 'any' | 'currency' | 'atlas'
export const FARM_GOALS: FarmGoal[] = ['currency', 'atlas', 'any']
export const FARM_GOAL_LABEL: Record<FarmGoal, string> = { currency: 'Currency', atlas: 'Maps & Threads', any: 'Any' }

// map-mods/widget.ts's MAP_MODS_TYPE; that file pulls in the UI.
const MAP_MODS_TYPE = 'woke-map-mods'

// The map strip's chip labels (check.ts) and whether each starts in the trade
// search. Any is how chips started before goals: Atlas Drops off (the trade
// site has no listings for it), More Maps off as APT had it. A label left out
// (Quant, on old maps and charts only) keeps how it was made.
export const GOAL_CHIPS: Record<FarmGoal, Record<string, boolean>> = {
  any: { 'Drops': false, 'Rarity': true, 'Pack': true, 'Currency': true, 'Threads': true, 'Maps': false, 'Div cards': true },
  currency: { 'Drops': false, 'Rarity': true, 'Pack': true, 'Currency': true, 'Threads': false, 'Maps': false, 'Div cards': false },
  atlas: { 'Drops': false, 'Rarity': false, 'Pack': true, 'Currency': false, 'Threads': true, 'Maps': true, 'Div cards': false }
}

// The numbers that matter for a goal: ringed on the strip. Atlas Drops is one
// for maps even though it can't be searched.
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

function widget (): { goal?: FarmGoal } | null {
  const config = AppConfig()
  if (!isModuleOn(config, 'map-mods')) return null
  return (config.widgets.find(w => w.wmType === MAP_MODS_TYPE) as { goal?: FarmGoal } | undefined) ?? null
}

export function farmGoal (): FarmGoal {
  const g = widget()?.goal
  return g === 'currency' || g === 'atlas' ? g : 'any'
}

export function setFarmGoal (goal: FarmGoal): void {
  const w = widget()
  if (w) w.goal = goal
}

// Whether a chip's filter starts off in the trade search; undefined: as made.
export function goalDisabled (label: string, goal: FarmGoal = farmGoal()): boolean | undefined {
  const on = GOAL_CHIPS[goal][label]
  return on === undefined ? undefined : !on
}

// The Planner's goal when you haven't picked one there.
export function plannerGoalFor (goal: FarmGoal): 'currency' | 'maps' | null {
  return goal === 'currency' ? 'currency' : goal === 'atlas' ? 'maps' : null
}
