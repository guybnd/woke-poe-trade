// Places inside a tool that What's new's "Show me" (news.ts) can open: a tab,
// by the label it shows. The tools' own tabs read their labels from here, so a
// line's target and the tab it opens can't drift apart. No imports: the
// fake-game specs read it too.
export const GOTO_TARGETS = {
  'woke-net-worth': { holdings: 'Holdings', sales: 'Sales', listed: 'Listed', runs: 'Runs' },
  'woke-map-mods': { maps: 'Maps', heist: 'Heist', charts: 'Charts', planner: 'Planner', scan: 'Scan' }
} as const satisfies Record<string, Record<string, string>>

export type GotoTool = keyof typeof GOTO_TARGETS
export type GotoTarget<T extends GotoTool> = keyof typeof GOTO_TARGETS[T]

export function gotoTargets (wmType: string): Record<string, string> | null {
  return (GOTO_TARGETS as Record<string, Record<string, string>>)[wmType] ?? null
}
