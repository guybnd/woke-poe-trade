// The Net worth window's resizable sections: the two halves, the columns
// under them, the chart's and the middle row's heights, and which sections
// are folded to their title line. Pure: no Vue.

export type ColId = 'changes' | 'side'
export type FoldId = 'chart' | 'perHour' | 'changes' | 'sold' | 'where' | 'moves'

export interface PanelLayout {
  // The left half's share of the top row (the chart's side). A new key:
  // an old "top" from an earlier, removed version of this drag is ignored.
  half?: number
  // The columns' widths, relative to each other.
  cols?: Partial<Record<ColId, number>>
  // The chart's height, px.
  chartH?: number
  // The middle row's height, px (unset: as tall as what's in it). Its lists
  // scroll inside.
  midH?: number
  // Sections folded to their title line.
  folded?: FoldId[]
}

export const TOP_DEFAULT = 0.5
export const CHART_H_DEFAULT = 60
export const COL_DEFAULT: Record<ColId, number> = { changes: 1.3, side: 1 }

const ok = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0

export const clampTop = (t: number) => Math.min(0.8, Math.max(0.3, t))
export const clampChartH = (h: number) => Math.min(320, Math.max(48, Math.round(h)))
export const clampMidH = (h: number) => Math.min(900, Math.max(60, Math.round(h)))

export function topOf (l: PanelLayout | undefined): number {
  return ok(l?.half) ? clampTop(l.half) : TOP_DEFAULT
}

export function chartHOf (l: PanelLayout | undefined): number {
  return ok(l?.chartH) ? clampChartH(l.chartH) : CHART_H_DEFAULT
}

// A height dragged and saved: true. Left unset, the chart beside Per hour
// fills its half.
export const hasChartH = (l: PanelLayout | undefined) => ok(l?.chartH)

export function midHOf (l: PanelLayout | undefined): number | null {
  return ok(l?.midH) ? clampMidH(l.midH) : null
}

// The halves' edge moved by dx px, in a row widthPx wide.
export function dragTop (top: number, dx: number, widthPx: number): number {
  return widthPx > 0 ? clampTop(top + dx / widthPx) : clampTop(top)
}

const FOLDS: readonly FoldId[] = ['chart', 'perHour', 'changes', 'sold', 'where', 'moves']
export function foldedOf (l: PanelLayout | undefined): Record<FoldId, boolean> {
  const list = Array.isArray(l?.folded) ? l.folded : []
  return Object.fromEntries(FOLDS.map(id => [id, list.includes(id)])) as Record<FoldId, boolean>
}
export function toggleFold (list: readonly FoldId[] | undefined, id: FoldId): FoldId[] {
  const all = Array.isArray(list) ? list : []
  const rest = all.filter(x => x !== id && FOLDS.includes(x))
  return all.includes(id) ? rest : [...rest, id]
}

export function colWeights (l: PanelLayout | undefined, ids: readonly ColId[]): number[] {
  return ids.map(id => { const w = l?.cols?.[id]; return ok(w) ? w : COL_DEFAULT[id] })
}

// Moves the edge after column i by dx px, in a row widthPx wide. Neither
// column gets narrower than 15% of the row.
export function dragCols (weights: readonly number[], i: number, dx: number, widthPx: number): number[] {
  if (i < 0 || i + 1 >= weights.length || widthPx <= 0) return [...weights]
  const total = weights.reduce((s, w) => s + w, 0)
  const min = total * 0.15
  const d = dx / widthPx * total
  const pair = weights[i] + weights[i + 1]
  let a = weights[i] + d
  let b = weights[i + 1] - d
  // Too narrow together to keep the minimum each: leave them as they are.
  if (pair < 2 * min) return [...weights]
  if (a < min) { b -= min - a; a = min }
  if (b < min) { a -= min - b; b = min }
  const out = [...weights]
  out[i] = a
  out[i + 1] = b
  return out
}

// Where each column edge sits, as a share of the row (for the handles).
export function edges (weights: readonly number[]): number[] {
  const total = weights.reduce((s, w) => s + w, 0)
  const out: number[] = []
  let at = 0
  for (let i = 0; i < weights.length - 1; i++) { at += weights[i]; out.push(at / total) }
  return out
}
