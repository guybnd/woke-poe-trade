// Places inside a tool that What's new's "Show me" (news.ts) can open: a tab,
// by the label it shows. The tools' own tabs read their labels from here, so a
// line's target and the tab it opens can't drift apart. No imports: the
// fake-game specs read it too.
export const GOTO_TARGETS = {
  'woke-net-worth': { holdings: 'Holdings', sales: 'Sales', listed: 'Listed', runs: 'Runs' },
  'woke-map-mods': { maps: 'Maps', heist: 'Heist', charts: 'Charts', planner: 'Planner', scan: 'Scan' },
  // Only the tabs a What's new line opens.
  'woke-scarab-flip': { tattoos: 'Tattoos' },
  'woke-mechanics': { settlers: 'Settlers' }
} as const satisfies Record<string, Record<string, string>>

// A spot: one thing on a tab that Show me scrolls to and flashes, for a
// feature that isn't a whole tab. Each names the tab it's on. The tool's
// element carries data-goto-spot="<id>", and its useGoto opens whatever
// hides it (a folded section, Details).
export const GOTO_SPOTS = {
  'woke-net-worth': { 'per-hour': 'holdings', 'faustus-box': 'holdings', 'still-cheapest': 'listed', 'stale': 'listed' }
} as const satisfies { [T in keyof typeof GOTO_TARGETS]?: Record<string, keyof typeof GOTO_TARGETS[T]> }

// What's new lines whose feature is a spot, by line id (news.ts). Kept here,
// not on the line: NEWS loads at startup, this only with the dock's card.
export const NEWS_SPOTS: Record<string, string> = {
  'listed-still-cheapest': 'still-cheapest',
  'per-hour-time-setting': 'per-hour',
  'net-worth-listed': 'stale',
  'net-worth-faustus-box': 'faustus-box'
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
