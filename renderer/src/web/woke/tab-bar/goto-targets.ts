// Places inside a tool that What's new's "Show me" (news.ts) can open: a tab,
// by the label it shows. The tools' own tabs read their labels from here, so a
// line's target and the tab it opens can't drift apart. No imports: the
// fake-game specs read it too.
export const GOTO_TARGETS = {
  'woke-net-worth': { holdings: 'Holdings', sales: 'Sales', listed: 'Listed', runs: 'Runs' },
  'woke-map-mods': { maps: 'Maps', heist: 'Heist', charts: 'Charts', planner: 'Planner', scan: 'Scan' },
  // Only the tabs a What's new line opens.
  'woke-scarab-flip': { tattoos: 'Tattoos' },
  'woke-mechanics': { settlers: 'Settlers' },
  // No tabs (NO_TABS): its one place is the list, with the picked strategy.
  'woke-atlas-strategies': { strategies: 'Strategies' },
  'woke-pob-builds': { builds: 'Builds' },
  // Its one place is the editor (the sample card isn't a tab).
  'woke-loot-filter': { editor: 'Editor' }
} as const satisfies Record<string, Record<string, string>>

// Tools listed above that have no tabs: their one entry is the window itself,
// so a line on one also needs a spot, or Show me shows nothing new.
export const NO_TABS: readonly string[] = ['woke-atlas-strategies', 'woke-pob-builds', 'woke-loot-filter']

// A spot: one thing on a tab that Show me scrolls to and flashes, for a
// feature that isn't a whole tab. Each names the tab it's on. The tool's
// element carries data-goto-spot="<id>", and its useGoto opens whatever
// hides it (a folded section, Details).
export const GOTO_SPOTS = {
  'woke-net-worth': { 'per-hour': 'holdings', 'faustus-box': 'holdings', 'worth-selling': 'holdings', 'still-cheapest': 'listed', 'stale': 'listed', 'past-runs': 'runs' },
  'woke-atlas-strategies': { results: 'strategies', import: 'strategies' },
  'woke-pob-builds': { import: 'builds' },
  'woke-loot-filter': { 'profiles': 'editor', 'gear-ranks': 'editor', 'over-quality-look': 'editor', 'league-always': 'editor', 'loot-gold': 'editor', 'section-steps': 'editor', 'section-ruler': 'editor', 'map-looks': 'editor', 'jewels-no-price': 'editor', 'own-lists': 'editor', 'history': 'editor' }
} as const satisfies { [T in keyof typeof GOTO_TARGETS]?: Record<string, keyof typeof GOTO_TARGETS[T]> }

// What's new lines whose feature is a spot, by line id (news.ts). Kept here,
// not on the line: NEWS loads at startup, this only with the dock's card.
export const NEWS_SPOTS: Record<string, string> = {
  'loot-filter-section-ruler': 'section-ruler',
  'loot-filter-section-steps': 'section-steps',
  'loot-filter-league-always': 'league-always',
  'loot-filter-jewels-no-price': 'jewels-no-price',
  'loot-filter-map-looks': 'map-looks',
  'loot-filter-readable-history': 'history',
  'loot-filter-own-lists': 'own-lists',
  'listed-still-cheapest': 'still-cheapest',
  'net-worth-listed': 'stale',
  'net-worth-worth-selling': 'worth-selling',
  'net-worth-rename-runs': 'past-runs',
  'atlas-results-from-runs': 'results',
  'atlas-planner-links': 'import',
  'atlas-tree-planner-links': 'import',
  'pob-import-all-sites': 'import',
  'loot-filter-profiles': 'profiles',
  'loot-filter-over-quality-look': 'over-quality-look',
  'loot-filter-drag-bases': 'gear-ranks',
  'loot-filter-valuable-exotics': 'gear-ranks',
  'loot-filter-gold-page': 'loot-gold'
}

export function gotoSpots (wmType: string): Record<string, string> | null {
  return (GOTO_SPOTS as Record<string, Record<string, string>>)[wmType] ?? null
}

export type GotoTool = keyof typeof GOTO_TARGETS
export type GotoTarget<T extends GotoTool> = keyof typeof GOTO_TARGETS[T]

export function gotoTargets (wmType: string): Record<string, string> | null {
  return (GOTO_TARGETS as Record<string, Record<string, string>>)[wmType] ?? null
}
export type GotoSpot<T extends GotoTool> = T extends keyof typeof GOTO_SPOTS ? keyof typeof GOTO_SPOTS[T] : never
