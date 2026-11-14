// Colours for lit mechanics on the atlas tree: by the order they were picked,
// so the first pick is always red, the second blue and so on.
export const LIT_COLOURS = ['#e0605a', '#5fb2e8', '#7fd27a', '#c58dff', '#f0a040', '#5fd6c4', '#ff7fb5', '#d8d860', '#9aa8ff', '#ff9a7a']

export function litColour (lit: string[], name: string): string {
  const i = lit.indexOf(name)
  return LIT_COLOURS[(i < 0 ? 0 : i) % LIT_COLOURS.length]
}

// The atlas tree drawing over the game (AtlasOverlay.vue, Guy's pick C): each
// mechanic in the order the strategy reaches it. No red, which marks points
// to refund as on the passive tree, and no cyan, the paths between wheels.
export const NO_MECHANIC = 'rgba(70, 215, 255, 0.95)'
const PLAN_COLOURS = ['#f0a040', '#7fd27a', '#c58dff', '#e6e05a', '#9aa8ff', '#ff8fc0', '#d9b27a', '#8ff0b0', '#e0a0ff', '#b8e05a']

export function planColours (mechanics: string[]): Map<string, string> {
  const out = new Map<string, string>()
  for (const m of mechanics) if (m && !out.has(m)) out.set(m, PLAN_COLOURS[out.size % PLAN_COLOURS.length])
  return out
}
