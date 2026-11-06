// Pure helpers for how see-through the overlay is (no DOM, so tests can load them).

export const MIN_PANEL_OPACITY = 30
export const MAX_PANEL_OPACITY = 100

export function parsePanelOpacity (v: string | null): number {
  const n = Number(v)
  if (!v || !Number.isFinite(n)) return MAX_PANEL_OPACITY
  return Math.min(MAX_PANEL_OPACITY, Math.max(MIN_PANEL_OPACITY, Math.round(n)))
}

// "Darken the game while the overlay is open": APT stores the backdrop as a CSS
// colour (config.overlayBackground). Settings shows it as a strength slider:
// the colour's alpha in percent, 0 = off. Writes black at that alpha; older
// colours (APT's grey default, or a hand-typed one) read back by their alpha.

export const NO_BACKDROP = 'rgba(255, 255, 255, 0)'
export const MAX_BACKDROP = 60

export function backdropPercent (colour: string): number {
  const s = colour.trim().toLowerCase()
  if (!s || s === 'transparent') return 0
  const m = /^rgba?\(([^)]*)\)$/.exec(s)
  if (!m) return 100
  const parts = m[1].split(/[\s,/]+/).filter(Boolean)
  if (parts.length < 4) return 100
  const a = parts[3].endsWith('%') ? Number(parts[3].slice(0, -1)) / 100 : Number(parts[3])
  if (!Number.isFinite(a)) return 100
  return Math.round(Math.min(1, Math.max(0, a)) * 100)
}

export function backdropColour (pct: number): string {
  const p = Math.min(MAX_BACKDROP, Math.max(0, Math.round(pct)))
  return p === 0 ? NO_BACKDROP : `rgba(0, 0, 0, ${p / 100})`
}
