// The loot shower preview: a pile of drops run through a filter, laid out on
// the ground the way the game stacks labels so none overlap.
import type { FilterDoc } from './parse'
import type { Drop } from './drops'
import { matchItem } from './match'
import { DEFAULT_FONT, conditionSignature, readStyle } from './edits'
import type { StylePatch } from './edits'

export interface ShownDrop {
  drop: Drop
  visibility: 'Show' | 'Hide' | 'Minimal'
  look: StylePatch
  type: string | null
  tier: string | null
  // Which block of the tier it hit, for an own rule to copy.
  anchor?: string
}

export function runDrops (doc: FilterDoc, drops: Drop[]): ShownDrop[] {
  return drops.map(drop => {
    const m = matchItem(doc, drop.facts)
    const b = m.final?.block
    return { drop, visibility: m.visibility, look: readStyle(m.actions), type: b?.type ?? null, tier: b?.tier ?? null, anchor: b ? conditionSignature(b) : undefined }
  })
}

// Label font in px for a game font size: the same formula LabelPreview draws
// with, so a box is as big as the label on screen.
export function labelPx (fontSize: number | undefined, scale: number): number {
  return (11 + ((fontSize ?? DEFAULT_FONT) - 18) * 0.28) * scale
}

export interface Rect { x: number, y: number, w: number, h: number }

// Label size: padding 7px a side and a 1px border around the text. `measure`
// gives the text's real width (a canvas in the overlay); without it, a guess.
export function labelBox (text: string, fontSize: number | undefined, scale: number, measure?: (text: string, px: number) => number): { w: number, h: number } {
  const px = labelPx(fontSize, scale)
  const textW = measure ? measure(text, px) : text.length * px * 0.68
  return { w: Math.ceil(textW + 18), h: Math.ceil(px * 1.35 + 4) }
}

// Space kept between two labels.
const GAP = 2

export function overlaps (a: Rect, b: Rect, gap = GAP): boolean {
  return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap
}

// Places each label near where it fell, nudging it up or down (then sideways)
// past labels already placed, like the game does. A pile too big for the
// ground makes the ground taller rather than stacking labels on each other.
// If scattering still can't fit them, the labels go in rows instead: never
// one label on another.
export function layoutLabels (sizes: Array<{ w: number, h: number }>, width: number, height: number, seed: number, top = 0, obstacles: Rect[] = []): { rects: Rect[], height: number } {
  for (let h = height; h <= height * 2; h += 60) {
    const res = tryLayout(sizes, width, h, seed, top, obstacles)
    if (res.fits) return { rects: res.rects, height: h }
  }
  return rowLayout(sizes, width, height, seed, top, obstacles)
}

function xorshift (seed: number): () => number {
  let a = (seed * 2654435761) >>> 0 || 1
  return () => {
    a ^= a << 13; a >>>= 0
    a ^= a >>> 17
    a ^= a << 5; a >>>= 0
    return a / 4294967296
  }
}

// The sure fallback: rows top to bottom, left to right, stepping past the
// obstacles. Each row's spare width is shared out at random between its
// labels, and a short label sits anywhere in its row's height, so it still
// looks dropped rather than listed.
function rowLayout (sizes: Array<{ w: number, h: number }>, width: number, height: number, seed: number, top: number, obstacles: Rect[]): { rects: Rect[], height: number } {
  const r = xorshift(seed + 7919)
  const out: Rect[] = new Array(sizes.length)
  const hits = (c: Rect) => obstacles.some(o => overlaps(o, c))
  let y = top
  let i = 0
  while (i < sizes.length) {
    // Fill one row.
    const row: Array<{ k: number, rect: Rect }> = []
    let x = 0
    let rowH = 0
    for (; i < sizes.length; i++) {
      const w = Math.min(sizes[i].w, width)
      const h = sizes[i].h
      let cand: Rect = { x, y, w, h }
      // Step right past any obstacle in the way.
      for (let o = obstacles.find(b => overlaps(b, cand)); o; o = obstacles.find(b => overlaps(b, cand))) cand = { ...cand, x: o.x + o.w + GAP }
      // Full, or (alone) an obstacle fills the row: the next row down.
      if (cand.x + w > width) break
      row.push({ k: i, rect: cand })
      x = cand.x + w + GAP
      rowH = Math.max(rowH, h)
    }
    if (!row.length) { y += 4; continue }
    // Spread the row's spare width at random between its labels: each moves
    // right at least as far as the one before, so they keep their gaps. If
    // that runs one into an obstacle, the row stays packed.
    const spare = width - (row[row.length - 1].rect.x + row[row.length - 1].rect.w)
    const cuts = row.map(() => r())
    const total = cuts.reduce((n, c) => n + c, 0) + r()
    let shift = 0
    const spread = row.map((c, n) => {
      shift += Math.floor(spare * cuts[n] / total)
      return { ...c.rect, x: c.rect.x + shift }
    })
    const use = spread.some(hits) ? row.map(c => c.rect) : spread
    // Then each label anywhere in the row's height.
    use.forEach((p, n) => {
      const dropped = { ...p, y: p.y + Math.floor(r() * (rowH - p.h + 1)) }
      out[row[n].k] = hits(dropped) ? p : dropped
    })
    y += rowH + GAP
  }
  return { rects: out, height: Math.max(height, y) }
}

function tryLayout (sizes: Array<{ w: number, h: number }>, width: number, height: number, seed: number, top: number, obstacles: Rect[]): { rects: Rect[], fits: boolean } {
  const r = xorshift(seed)
  const placed: Rect[] = [...obstacles]
  const out: Rect[] = []
  let fits = true
  for (const s of sizes) {
    const w = Math.min(s.w, width)
    const maxX = Math.max(0, width - w)
    const maxY = Math.max(top, height - s.h)
    // Drops cluster around the middle of the screen.
    const cx = (r() + r() + r()) / 3
    const cy = (r() + r()) / 2
    let best: Rect = { x: Math.round(cx * maxX), y: Math.round(top + cy * (maxY - top)), w, h: s.h }
    const start = best
    search:
    for (let dx = 0; dx <= 10; dx++) {
      for (let k = 0; k <= 24; k++) {
        const dy = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (s.h + 2)
        const sx = dx ? (dx % 2 ? 1 : -1) * Math.ceil(dx / 2) * (w * 0.6) : 0
        const cand = { x: Math.min(maxX, Math.max(0, start.x + sx)), y: start.y + dy, w, h: s.h }
        if (cand.y < top || cand.y > maxY) continue
        if (!placed.some(p => overlaps(p, cand))) { best = cand; break search }
      }
    }
    // Crowded: the nearest free spot anywhere, else on top of the pile.
    if (best === start && placed.some(p => overlaps(p, start))) {
      let dist = Infinity
      for (let y = top; y <= maxY; y += 4) {
        for (let x = 0; x <= maxX; x += 8) {
          const d = (x - start.x) ** 2 + ((y - start.y) * 2) ** 2
          if (d >= dist) continue
          const cand = { x, y, w, h: s.h }
          if (!placed.some(p => overlaps(p, cand))) { best = cand; dist = d }
        }
      }
    }
    if (best.y + best.h > height || placed.some(p => overlaps(p, best))) fits = false
    placed.push(best)
    out.push(best)
  }
  return { rects: out, fits }
}

export interface ShowerSummary {
  shown: number
  hidden: number
  beams: number
  sounds: number
}

export function summarize (list: ShownDrop[]): ShowerSummary {
  const shown = list.filter(d => d.visibility !== 'Hide')
  return {
    shown: shown.length,
    hidden: list.length - shown.length,
    beams: shown.filter(d => d.look.effect).length,
    sounds: shown.filter(d => d.look.sound).length
  }
}

// Sounds the shown drops play, most used first.
export function soundsOf (list: ShownDrop[]): Array<{ id: string, volume: number, count: number }> {
  const by = new Map<string, { id: string, volume: number, count: number }>()
  for (const d of list) {
    if (d.visibility === 'Hide' || !d.look.sound) continue
    const cur = by.get(d.look.sound.id) ?? { id: d.look.sound.id, volume: d.look.sound.volume, count: 0 }
    cur.count++
    by.set(d.look.sound.id, cur)
  }
  return [...by.values()].sort((a, b) => b.count - a.count)
}
