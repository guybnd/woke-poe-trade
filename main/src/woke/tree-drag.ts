// Keeps the drawing over the game's tree while you drag past its edge. The
// game stops the tree at its limits but the mouse keeps going, so following
// the mouse alone runs the drawing off. Where the limits are isn't known up
// front: each fit after a drag shows where the tree really stopped, and that
// edge is kept (per zoom and window size) so later drags stop there too.

// The tree fell this far (game px) short of the mouse: it hit an edge.
const STOPPED_PX = 12

interface Edges { minX?: number, maxX?: number, minY?: number, maxY?: number }

export class TreeDrag {
  private readonly edges = new Map<string, Edges>()
  private key = ''
  // Where the drawing is now (the last fit plus the drag since).
  private ox = 0
  private oy = 0
  // The fit the drag started from and the mouse's travel since.
  private from: { ox: number, oy: number } | null = null
  private travel = { dx: 0, dy: 0 }

  // A fresh fit: where the tree really is.
  fitted (fit: { zoom: number, ox: number, oy: number }, width: number, height: number) {
    // Fits of one zoom step differ in the 4th digit; steps are 0.05+ apart.
    const key = `${fit.zoom.toFixed(2)}@${width}x${height}`
    if (this.from && key === this.key) this.learn(fit.ox, fit.oy)
    this.key = key
    this.ox = fit.ox
    this.oy = fit.oy
    this.from = null
    this.travel = { dx: 0, dy: 0 }
  }

  // The button went down on the tree.
  start () {
    this.from = { ox: this.ox, oy: this.oy }
    this.travel = { dx: 0, dy: 0 }
  }

  // The mouse moved by dx, dy while dragging: how far the drawing moves.
  move (dx: number, dy: number): { dx: number, dy: number } {
    this.travel.dx += dx
    this.travel.dy += dy
    const e = this.edges.get(this.key) ?? {}
    const nx = clamp(this.ox + dx, e.minX, e.maxX)
    const ny = clamp(this.oy + dy, e.minY, e.maxY)
    const out = { dx: nx - this.ox, dy: ny - this.oy }
    this.ox = nx
    this.oy = ny
    return out
  }

  private learn (ox: number, oy: number) {
    const from = this.from!
    const e = this.edges.get(this.key) ?? {}
    const wantX = from.ox + this.travel.dx
    const wantY = from.oy + this.travel.dy
    // Pulled right (ox up) but it stopped short: that's the right-hand limit.
    if (this.travel.dx > 0 && wantX - ox > STOPPED_PX) e.maxX = ox
    if (this.travel.dx < 0 && ox - wantX > STOPPED_PX) e.minX = ox
    if (this.travel.dy > 0 && wantY - oy > STOPPED_PX) e.maxY = oy
    if (this.travel.dy < 0 && oy - wantY > STOPPED_PX) e.minY = oy
    // Seen past a kept edge: the edge was wrong (a different tree view).
    if (e.maxX != null && ox > e.maxX + STOPPED_PX) e.maxX = undefined
    if (e.minX != null && ox < e.minX - STOPPED_PX) e.minX = undefined
    if (e.maxY != null && oy > e.maxY + STOPPED_PX) e.maxY = undefined
    if (e.minY != null && oy < e.minY - STOPPED_PX) e.minY = undefined
    this.edges.set(this.key, e)
  }
}

function clamp (v: number, lo: number | undefined, hi: number | undefined) {
  if (lo != null && v < lo) return lo
  if (hi != null && v > hi) return hi
  return v
}
