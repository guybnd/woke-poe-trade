// The filter's look strip: text size, background and colour strength for
// every rule at once, written last so the safety net and your own rules
// follow too. Each block keeps its own actions in `unlooked`, so the rule
// editors show and save a rule's own style and the strip never compounds.
// It only rewrites SetFontSize and the three colours: what shows, beeps and
// beams stays exactly as the rest of the filter decided.
import type { FilterAction, FilterBlock, FilterDoc } from './parse'
import { DEFAULT_BG, DEFAULT_FONT } from './edits'
import type { MatchResult } from './match'
import { addedBlock } from './rules'

export interface Look {
  // Off until a slider leaves 100 (the strip keeps it in step).
  on: boolean
  // Every label's font size, as a share of its own (%).
  size: number
  // How opaque label backgrounds are, as a share of their own alpha (%).
  background: number
  // Colour strength: 100 as set, less is muted, more is vivid (%).
  colour: number
}

export const LOOK_LIMITS = {
  size: { min: 50, max: 150 },
  background: { min: 0, max: 100 },
  colour: { min: 0, max: 150 }
} as const

export function defaultLook (): Look {
  return { on: false, size: 100, background: 100, colour: 100 }
}

export function normalizeLook (l: Partial<Look> | undefined): Look {
  const d = defaultLook()
  const num = (v: unknown, k: keyof typeof LOOK_LIMITS) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.min(LOOK_LIMITS[k].max, Math.max(LOOK_LIMITS[k].min, v))) : d[k]
  return {
    on: typeof l?.on === 'boolean' ? l.on : false,
    size: num(l?.size, 'size'),
    background: num(l?.background, 'background'),
    colour: num(l?.colour, 'colour')
  }
}

export function lookChanges (l: Look): boolean {
  return l.on && (l.size !== 100 || l.background !== 100 || l.colour !== 100)
}

// The game's font sizes; the strip never takes a label below the smallest
// NeverSink uses, unless it was already smaller.
const FONT_MIN = 18
const FONT_MAX = 45

export function scaledFont (size: number, percent: number): number {
  const out = Math.round(size * percent / 100)
  return Math.max(Math.min(FONT_MIN, size), Math.min(FONT_MAX, out))
}

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)))

// RGB pulled toward (less than 100) or pushed away from (more) its own grey.
export function colourStrength (rgb: [number, number, number], percent: number): [number, number, number] {
  const k = percent / 100
  const grey = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]
  return [clamp255(grey + (rgb[0] - grey) * k), clamp255(grey + (rgb[1] - grey) * k), clamp255(grey + (rgb[2] - grey) * k)]
}

const COLOUR_KEYS = ['SetTextColor', 'SetBorderColor', 'SetBackgroundColor']

function lookAction (a: FilterAction, l: Look): FilterAction {
  if (a.key === 'SetFontSize') {
    const n = Number(a.args[0])
    if (!Number.isFinite(n) || l.size === 100) return a
    return { key: a.key, args: [String(scaledFont(n, l.size))] }
  }
  if (!COLOUR_KEYS.includes(a.key)) return a
  if (l.colour === 100 && (a.key !== 'SetBackgroundColor' || l.background === 100)) return a
  const ch = a.args.slice(0, 4).map(Number)
  // A broken line stays as it was.
  if (ch.length < 3 || ch.slice(0, 3).some(n => !Number.isFinite(n))) return a
  const rgb = l.colour === 100 ? ch.slice(0, 3) as [number, number, number] : colourStrength([ch[0], ch[1], ch[2]], l.colour)
  const alpha = Number.isFinite(ch[3]) ? ch[3] : 255
  const isBg = a.key === 'SetBackgroundColor'
  const outAlpha = isBg && l.background !== 100 ? clamp255(alpha * l.background / 100) : alpha
  const hadAlpha = a.args.length >= 4
  return { key: a.key, args: [...rgb.map(String), ...(hadAlpha || outAlpha !== alpha ? [String(outAlpha)] : [])] }
}

// The actions a rule had before the strip: what the rule editors show.
export function ownActions (b: FilterBlock): FilterAction[] {
  return b.unlooked ?? b.actions
}

// A drop's merged look from its rules' own actions (before the strip), as
// the game layers them: Continue rules first, the deciding rule last.
export function ownMatchActions (m: Pick<MatchResult, 'layers' | 'final'>): FilterAction[] {
  const byKey = new Map<string, FilterAction>()
  for (const l of [...m.layers, ...(m.final ? [m.final] : [])]) {
    // The strip's own defaults rule is the strip, not the rule's look.
    if (l.block.type === LOOK_RULE_TYPE) continue
    for (const a of ownActions(l.block)) {
      byKey.delete(a.key)
      byKey.set(a.key, a)
    }
  }
  return [...byKey.values()]
}

export const LOOK_RULE_TYPE = 'woke->look'

const sameAction = (a: FilterAction, b: FilterAction) => a.key === b.key && a.args.length === b.args.length && a.args.every((x, i) => x === b.args[i])

// Applies the strip to every live block. Returns how many changed.
// `minFont` keeps a block at a smallest size (the Bigger labels preset).
// Labels with no size or background of their own get the game's default,
// scaled, from one Continue rule at the very top: added to each block, it
// would cover what an earlier Continue rule set (Vaal gems' red background).
export function applyLook (doc: FilterDoc, l: Look, minFont: (b: FilterBlock) => number | null = () => null): number {
  if (!lookChanges(l)) return 0
  let changed = 0
  for (const b of doc.blocks) {
    if (b.disabled || b.type === LOOK_RULE_TYPE) continue
    const before = b.actions
    let actions = before.map(a => lookAction(a, l))
    const floor = l.size < 100 ? minFont(b) : null
    if (floor != null) {
      actions = actions.map(a => a.key === 'SetFontSize' && Number(a.args[0]) < floor ? { key: a.key, args: [String(floor)] } : a)
    }
    if (actions.every((a, i) => sameAction(a, before[i]))) continue
    // Only the strip touched it: the save check takes it as the source had it.
    if (!b.dirty) b.lookOnly = true
    b.unlooked = before
    b.actions = actions
    b.dirty = true
    changed++
  }
  const defaults: FilterAction[] = []
  const size = scaledFont(DEFAULT_FONT, l.size)
  if (size !== DEFAULT_FONT) defaults.push({ key: 'SetFontSize', args: [String(size)] })
  if (l.background !== 100) defaults.push({ key: 'SetBackgroundColor', args: [...DEFAULT_BG.slice(0, 3).map(String), String(clamp255(DEFAULT_BG[3] * l.background / 100))] })
  if (defaults.length) {
    const top = addedBlock(LOOK_RULE_TYPE, 'defaults', 'the look strip\'s size and background for labels that set none', [], 'Show', 'Look')
    top.actions = defaults
    top.continue = true
    doc.chunks.splice(firstBlockChunk(doc), 0, top)
    doc.blocks.unshift(top)
    doc.blocks.forEach((b, i) => { b.index = i })
    changed++
  }
  return changed
}

// Where the first block sits among the file's chunks (after its header).
function firstBlockChunk (doc: FilterDoc): number {
  const at = doc.chunks.findIndex(c => c.kind === 'block')
  return at < 0 ? doc.chunks.length : at
}
