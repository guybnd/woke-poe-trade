// Lays a rule group out for the editor's ladder view: tiers best first, tiers
// that look alike folded into one band, border-only rules (`Continue`) pulled
// out as marks, and rules off the group's order as specials. Works for any
// group: the order is read from the one number condition that changes
// between its tiers (MapTier for maps, Quality for gems...), not from names.
import { readStyle } from './edits'
import type { Colour, StylePatch } from './edits'
import type { FilterBlock, FilterCondition } from './parse'
import type { TierNode } from './groups'

export interface Range { lo: number, hi: number }

export interface LadderRow {
  // One tier, or several next to each other that look the same.
  tiers: TierNode[]
  range: Range | null
  // Look added by marks that always apply to these tiers, for keys the tier
  // doesn't set itself.
  markLook: StylePatch
  // Marks that only apply sometimes (area level, mods): what they'd add.
  maybeMarks: MarkGroup[]
  shown: boolean
}

export interface MarkGroup {
  key: string
  tiers: TierNode[]
  look: StylePatch
  // Every tier of it is commented out in the filter.
  off: boolean
  range: Range | null
  // Conditions other than the order and the group's shared ones.
  extras: string[]
}

export interface Ladder {
  axis: string | null
  rows: LadderRow[]
  marks: MarkGroup[]
  specials: TierNode[]
  // Index into rows: everything from here down is hidden, while something
  // above it shows. null when there's no such clean line.
  cut: number | null
}

// StackSize has its own column and scale in the editor.
const NOT_AN_AXIS = new Set(['StackSize'])

function live (t: TierNode): FilterBlock {
  return t.blocks.find(b => !b.disabled) ?? t.blocks[0]
}

function isNumeric (c: FilterCondition): boolean {
  return c.values.length > 0 && c.values.every(v => /^-?\d+$/.test(v))
}

// The span a block's conditions on `key` allow, or null if it has none.
export function rangeOf (b: Pick<FilterBlock, 'conditions'>, key: string): Range | null {
  let lo = -Infinity
  let hi = Infinity
  let seen = false
  for (const c of b.conditions) {
    if (c.key !== key || !isNumeric(c)) continue
    const nums = c.values.map(Number)
    const v = nums[0]
    switch (c.op) {
      case '>=': lo = Math.max(lo, v); break
      case '>': lo = Math.max(lo, v + 1); break
      case '<=': hi = Math.min(hi, v); break
      case '<': hi = Math.min(hi, v - 1); break
      case '': case '=': case '==':
        lo = Math.max(lo, Math.min(...nums))
        hi = Math.min(hi, Math.max(...nums))
        break
      // != and ! aren't a span: skipped here, kept as a condition of its own.
      default: continue
    }
    seen = true
  }
  return seen ? { lo, hi } : null
}

// The number condition that orders the group: on most tiers, with at least
// two different spans.
export function findAxis (tiers: TierNode[]): string | null {
  const counts = new Map<string, Set<string>>()
  for (const t of tiers) {
    const b = live(t)
    for (const c of b.conditions) {
      if (NOT_AN_AXIS.has(c.key) || !isNumeric(c)) continue
      const r = rangeOf(b, c.key)
      if (!r) continue
      let s = counts.get(c.key)
      if (!s) counts.set(c.key, s = new Set())
      s.add(`${t.tier}|${r.lo}|${r.hi}`)
    }
  }
  let best: string | null = null
  let bestTiers = 1
  for (const [key, set] of counts) {
    const spans = new Set([...set].map(x => x.slice(x.indexOf('|'))))
    const n = new Set([...set].map(x => x.slice(0, x.indexOf('|')))).size
    if (spans.size >= 2 && n > bestTiers) { best = key; bestTiers = n }
  }
  // Half the tiers at least, or it's a detail of a few rules, not the order.
  return best && bestTiers * 2 >= tiers.length ? best : null
}

function lookKey (t: TierNode): string {
  const b = live(t)
  return JSON.stringify([readStyle(b.actions), b.visibility, t.disabled])
}

function shownTier (t: TierNode): boolean {
  return !t.disabled && live(t).visibility !== 'Hide'
}

function union (a: Range | null, b: Range | null): Range | null {
  if (!a) return b
  if (!b) return a
  return { lo: Math.min(a.lo, b.lo), hi: Math.max(a.hi, b.hi) }
}

function covers (outer: Range | null, inner: Range | null): boolean {
  if (!outer) return true
  if (!inner) return false
  return outer.lo <= inner.lo && outer.hi >= inner.hi
}

function overlaps (a: Range | null, b: Range | null): boolean {
  if (!a || !b) return true
  return a.lo <= b.hi && b.lo <= a.hi
}

export function conditionText (c: FilterCondition): string {
  const vals = c.values.length > 3 ? [...c.values.slice(0, 3), '…'] : c.values
  return [c.key, c.count != null ? `${c.op}${c.count}` : c.op, vals.join(' ')].filter(Boolean).join(' ')
}

// Conditions every tier of the group shares (Class == "Maps"), which tell
// the rows nothing.
export function sharedConditions (tiers: TierNode[]): Set<string> {
  if (tiers.length < 2) return new Set()
  let shared = new Set(live(tiers[0]).conditions.map(conditionText))
  for (const t of tiers.slice(1)) {
    const sigs = new Set(live(t).conditions.map(conditionText))
    shared = new Set([...shared].filter(x => sigs.has(x)))
  }
  return shared
}

// What makes this tier different: its conditions minus the shared ones and
// the order's own (which the row's label already shows).
export function distinctConditions (t: TierNode, shared: Set<string>, axis: string | null): string[] {
  return live(t).conditions.filter(c => !(c.key === axis && isSpan(c)) && !shared.has(conditionText(c))).map(c => conditionText(c).replace(/ True$/, ''))
}

// An order condition a span says exactly: not `!= 16`, not `== 1 16`.
function isSpan (c: FilterCondition): boolean {
  if (!isNumeric(c) || c.op === '!=' || c.op === '!') return false
  if (c.values.length < 2) return true
  const nums = [...new Set(c.values.map(Number))].sort((a, b) => a - b)
  return nums[nums.length - 1] - nums[0] === nums.length - 1
}

export function buildLadder (tiers: TierNode[]): Ladder {
  const marksSrc = tiers.filter(t => live(t).continue)
  const rest = tiers.filter(t => !live(t).continue)
  const axis = findAxis(rest)
  const shared = sharedConditions(tiers)

  // Marks: border-only rules, one group per look.
  const marks: MarkGroup[] = []
  for (const t of marksSrc) {
    const look = readStyle(live(t).actions)
    const key = JSON.stringify(look)
    let m = marks.find(x => x.key === key)
    if (!m) marks.push(m = { key, tiers: [], look, off: true, range: null, extras: [] })
    m.tiers.push(t)
    if (!t.disabled) {
      m.off = false
      m.range = union(m.range, axis ? rangeOf(live(t), axis) ?? { lo: -Infinity, hi: Infinity } : null)
    }
  }
  for (const m of marks) {
    const extras = new Set<string>()
    for (const t of m.tiers) {
      if (!m.off && t.disabled) continue
      for (const x of distinctConditions(t, shared, axis)) extras.add(x)
    }
    m.extras = [...extras]
  }

  const specials = axis ? rest.filter(t => !rangeOf(live(t), axis)) : []
  const onLadder = axis ? rest.filter(t => rangeOf(live(t), axis)) : rest

  const rows: LadderRow[] = []
  for (const t of onLadder) {
    const range = axis ? rangeOf(live(t), axis) : null
    const prev = rows[rows.length - 1]
    // The top tier keeps its own row (T16 apart from T14-15): it's the one
    // people tune on its own, and folding it hid that it could be.
    if (axis && prev && rows.length > 1 && lookKey(prev.tiers[0]) === lookKey(t) && !live(t).added) {
      prev.tiers.push(t)
      prev.range = union(prev.range, range)
      continue
    }
    rows.push({ tiers: [t], range, markLook: {}, maybeMarks: [], shown: shownTier(t) })
  }

  for (const row of rows) {
    const own = readStyle(live(row.tiers[0]).actions)
    const index = live(row.tiers[0]).index
    const look: StylePatch = {}
    // Later matching Continue rules paint over earlier ones, so apply in file order.
    const paints: Array<{ index: number, look: StylePatch }> = []
    for (const m of marks) {
      // A mark only reaches rules below it in the file.
      const members = m.tiers.filter(t => !t.disabled && live(t).index < index)
      const plain = members.filter(t => distinctConditions(t, shared, axis).length === 0)
      // Each tier of a band can be covered by a different member (T1-5, T6-10).
      const always = plain.length > 0 && row.tiers.every(rt => plain.some(t => covers(axis ? rangeOf(live(t), axis) : null, axis ? rangeOf(live(rt), axis) : null)))
      if (always) paints.push({ index: Math.max(...plain.map(t => live(t).index)), look: m.look })
      else if (members.some(t => overlaps(axis ? rangeOf(live(t), axis) : null, row.range))) row.maybeMarks.push(m)
    }
    for (const p of paints.sort((a, b) => a.index - b.index)) Object.assign(look, p.look)
    row.markLook = Object.fromEntries(Object.entries(look).filter(([k]) => !(k in own))) as StylePatch
  }

  let cut: number | null = null
  const firstHiddenRun = rows.findIndex((_, i) => rows.slice(i).every(r => !r.shown))
  if (firstHiddenRun > 0 && rows.slice(0, firstHiddenRun).some(r => r.shown)) cut = firstHiddenRun

  return { axis, rows, marks, specials, cut }
}

// "T14+", "T11–13", "Quality 20+": how a row's span reads.
export function rangeText (axis: string | null, r: Range | null): string {
  if (!axis || !r || (r.lo === -Infinity && r.hi === Infinity)) return ''
  const fmt = (n: number) => axis === 'MapTier' || axis === 'WaystoneTier' ? `T${n}` : String(n)
  const head = axis === 'MapTier' || axis === 'WaystoneTier' ? '' : `${axisName(axis)} `
  if (r.lo === r.hi) return head + fmt(r.lo)
  if (r.hi === Infinity) return `${head}${fmt(r.lo)}+`
  if (r.lo === -Infinity) return `${head}up to ${fmt(r.hi)}`
  return `${head}${fmt(r.lo)}–${axis === 'MapTier' || axis === 'WaystoneTier' ? r.hi : fmt(r.hi)}`
}

export function axisName (axis: string): string {
  switch (axis) {
    case 'MapTier': return 'map tier'
    case 'WaystoneTier': return 'waystone tier'
    case 'GemLevel': return 'gem level'
    case 'ItemLevel': return 'item level'
    case 'AreaLevel': return 'area level'
    case 'LinkedSockets': return 'links'
    default: return axis.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  }
}

const NAMED: Array<[string, Colour]> = [
  ['black', [0, 0, 0, 255]], ['white', [255, 255, 255, 255]], ['grey', [160, 160, 160, 255]],
  ['red', [220, 40, 20, 255]], ['orange', [250, 140, 20, 255]], ['gold', [255, 190, 0, 255]],
  ['yellow', [250, 240, 60, 255]], ['green', [40, 200, 60, 255]], ['blue', [40, 110, 240, 255]],
  ['purple', [140, 40, 210, 255]], ['pink', [255, 60, 200, 255]], ['brown', [120, 70, 30, 255]]
]

export function colourName (c: Colour): string {
  let best = NAMED[0][0]
  let d = Infinity
  for (const [name, n] of NAMED) {
    const e = (c[0] - n[0]) ** 2 + (c[1] - n[1]) ** 2 + (c[2] - n[2]) ** 2
    if (e < d) { d = e; best = name }
  }
  return best
}

// "Red border", "Gold border and text": what a mark paints, in words.
export function markName (look: StylePatch): string {
  const parts: string[] = []
  if (look.border) parts.push(`${colourName(look.border)} border`)
  if (look.text) parts.push(`${colourName(look.text)} text`)
  if (look.background) parts.push(`${colourName(look.background)} background`)
  if (look.fontSize) parts.push(`size ${look.fontSize}`)
  if (look.sound) parts.push('sound')
  if (look.effect) parts.push(`${look.effect.color.toLowerCase()} beam`)
  if (look.icon) parts.push('map icon')
  if (!parts.length) return 'Changes nothing'
  const s = parts.length > 2 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts.join(' and ')
  return s[0].toUpperCase() + s.slice(1)
}

// When a mark applies, in words: "T11+", "T14+, when AreaLevel < 83".
export function markWhen (axis: string | null, m: MarkGroup): string {
  const range = rangeText(axis, m.range)
  const extras = m.extras.length > 2 ? `depends on ${[...new Set(m.extras.map(x => x.split(' ')[0]))].join(', ')}` : m.extras.join(' or ')
  if (m.off) return 'off in your filter'
  return [range, extras ? (range && !extras.startsWith('depends') ? `when ${extras}` : extras) : ''].filter(Boolean).join(', ') || 'every item here'
}

export interface ShowFrom {
  // Every tier on the ladder, best first, with its own span.
  tiers: Array<{ tier: TierNode, label: string }>
  // Index of the lowest shown tier when the shown ones are exactly the top
  // of the ladder; -1 when nothing shows; null when it's mixed.
  at: number | null
}

// "Show from T16": the ladder as one cut-off, for the picker above it.
// Commented-out tiers aren't on it: a visibility edit can't bring them back.
export function showFrom (ladder: Ladder): ShowFrom {
  const tiers = ladder.rows.flatMap(r => r.tiers).filter(t => !t.disabled)
    .map(tier => ({ tier, label: rangeText(ladder.axis, ladder.axis ? rangeOf(live(tier), ladder.axis) : null) || tier.tier }))
  const shown = tiers.map(x => shownTier(x.tier))
  const last = shown.lastIndexOf(true)
  const prefix = shown.every((s, i) => s === (i <= last))
  return { tiers, at: prefix ? last : null }
}

// The visibility each tier needs so tiers 0..at show and the rest hide;
// only the ones that change.
export function showFromChanges (sf: ShowFrom, at: number): Array<{ tier: string, visibility: 'Show' | 'Hide' }> {
  return sf.tiers.flatMap((x, i) => {
    const want = i <= at
    return want === shownTier(x.tier) ? [] : [{ tier: x.tier.tier, visibility: want ? 'Show' as const : 'Hide' as const }]
  })
}
