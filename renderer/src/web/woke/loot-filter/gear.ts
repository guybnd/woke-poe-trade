// The Gear page: one table instead of NeverSink's tiered gear and
// over-quality matrices. Rows are your build's bases, NeverSink's three base
// ranks and every other base; columns are magic and rare; each cell is the
// lowest 3.30 drop tier (UnidentifiedItemTier) that shows. Bases can move
// between ranks once, for every tier at once, or to Never.
//
// While the page is off nothing changes. Switched on, NeverSink's rank and
// any-base rules in gear->tiered (and its over-quality rules, when that table
// is on) are commented out and rules built from the table take their place,
// with NeverSink's own looks (your restyles included) for each rank and tier.
import type { FilterAction, FilterBlock, FilterCondition, FilterDoc } from './parse'
import { applyStyle, isPatch } from './edits'
import type { StylePatch } from './edits'

export const GEAR_TYPE = 'woke->gear'

export type GearRow = 'build' | 'r1' | 'r2' | 'r3' | 'any'
export type Rank = 'r1' | 'r2' | 'r3'
export type Lane = Rank | 'none' | 'never'
export type GearRarity = 'magic' | 'rare'

export const GEAR_ROWS: GearRow[] = ['build', 'r1', 'r2', 'r3', 'any']
export const RANKS: Rank[] = ['r1', 'r2', 'r3']
export const DROP_TIERS = [5, 4, 3, 2]
// 0 is off: never shows for its drop tier (the build row: same as its rank).
export const SHOW_FROM = [0, 2, 3, 4, 5]
export const QUALITY_STEPS = [0, 21, 24, 28, 30]

export interface GearSettings {
  // The table replaces NeverSink's tiered gear rules.
  on: boolean
  show: Record<GearRow, Record<GearRarity, number>>
  quality: { on: boolean, min: Record<GearRow, number> }
  // Base -> lane, over NeverSink's ranks. 'none' is no rank (any base).
  moves: Record<string, Lane>
  // Build lane: the PoB build's rare bases (auto), plus your own, minus removed.
  build: { auto: boolean, extra: string[], removed: string[] }
  // Labels the table shows: the game's rarity colour for the text (NeverSink
  // paints magic and rare alike), and your own look per rarity on top.
  look: { rarityText: boolean, magic: StylePatch, rare: StylePatch }
}

export function defaultGear (): GearSettings {
  return {
    on: false,
    // Rare 3/4/5/4 is NeverSink 8.21 Very strict; readTiered gives the real
    // numbers for the file in use (gearDefaults).
    show: {
      build: { magic: 0, rare: 2 },
      r1: { magic: 3, rare: 3 },
      r2: { magic: 4, rare: 4 },
      r3: { magic: 5, rare: 5 },
      any: { magic: 4, rare: 4 }
    },
    quality: { on: false, min: { build: 21, r1: 24, r2: 24, r3: 28, any: 30 } },
    moves: {},
    build: { auto: true, extra: [], removed: [] },
    look: { rarityText: true, magic: {}, rare: {} }
  }
}

const LANES: Lane[] = ['r1', 'r2', 'r3', 'none', 'never']

export function normalizeGear (g: Partial<GearSettings> | undefined): GearSettings {
  const d = defaultGear()
  const pick = (v: unknown, steps: number[], dflt: number) => typeof v === 'number' && steps.includes(v) ? v : dflt
  const show = {} as GearSettings['show']
  const min = {} as GearSettings['quality']['min']
  for (const row of GEAR_ROWS) {
    show[row] = {
      magic: pick(g?.show?.[row]?.magic, SHOW_FROM, d.show[row].magic),
      rare: pick(g?.show?.[row]?.rare, SHOW_FROM, d.show[row].rare)
    }
    min[row] = pick(g?.quality?.min?.[row], QUALITY_STEPS, d.quality.min[row])
  }
  const moves: Record<string, Lane> = {}
  if (g?.moves && typeof g.moves === 'object') {
    for (const [base, lane] of Object.entries(g.moves)) if (LANES.includes(lane)) moves[base] = lane
  }
  const strings = (v: unknown) => Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && x.length > 0))] : []
  return {
    on: typeof g?.on === 'boolean' ? g.on : false,
    show,
    quality: { on: typeof g?.quality?.on === 'boolean' ? g.quality.on : false, min },
    moves,
    build: {
      auto: typeof g?.build?.auto === 'boolean' ? g.build.auto : true,
      extra: strings(g?.build?.extra),
      removed: strings(g?.build?.removed)
    },
    look: {
      rarityText: typeof g?.look?.rarityText === 'boolean' ? g.look.rarityText : true,
      magic: isPatch(g?.look?.magic) ? { ...g!.look!.magic } : {},
      rare: isPatch(g?.look?.rare) ? { ...g!.look!.rare } : {}
    }
  }
}

// ---- Reading NeverSink's rules -------------------------------------------

const RANK_TIER = /^t([2-5])r([1-3])$/
const ANY_TIER = /^any([2-9])$/
const QUALITY_TIER = /^(armors|weapon)/
const ANY_QUALITY_TIER = /^anyoverquality/

interface CellSource {
  block: FilterBlock
  live: boolean
}

export interface TieredSource {
  // NeverSink's base lists per rank (first block that lists them).
  ranks: Record<Rank, string[]>
  // Rank row and drop tier -> NeverSink's block for it.
  cells: Map<string, CellSource>
  // Any-base blocks in file order, with the lowest drop tier each catches.
  any: Array<{ min: number, block: FilterBlock, live: boolean }>
  // Blocks the table replaces, in file order.
  replaced: FilterBlock[]
  // The block the table's rules go in front of (null: the end of the file).
  at: FilterBlock | null
  // NeverSink's over-quality rules, and the lowest quality its any-base rules show.
  quality: { replaced: FilterBlock[], anyClasses: string[] | null, anyMin: number }
}

const key = (row: string, tier: number) => `${row}:${tier}`

// NeverSink's any-base tiers: anyN catches drop tier N-1 and up (any2 and
// any3 both from 2). Read from the name, since a preset (hide low item tiers)
// may have moved the line itself.
function anyTierMin (tier: string): number | null {
  const m = ANY_TIER.exec(tier)
  return m ? Math.max(2, Number(m[1]) - 1) : null
}

export function readTiered (doc: FilterDoc): TieredSource | null {
  const ranks: Record<Rank, string[]> = { r1: [], r2: [], r3: [] }
  const cells = new Map<string, CellSource>()
  const any: TieredSource['any'] = []
  const replaced: FilterBlock[] = []
  for (const b of doc.blocks) {
    if (b.type !== 'gear->tiered' || !b.tier) continue
    const m = RANK_TIER.exec(b.tier)
    if (m) {
      const rank = `r${m[2]}` as Rank
      for (const v of b.conditions.find(c => c.key === 'BaseType' && c.op === '==')?.values ?? []) {
        if (!ranks[rank].includes(v)) ranks[rank].push(v)
      }
      cells.set(key(rank, Number(m[1])), { block: b, live: !b.disabled })
      replaced.push(b)
      continue
    }
    if (ANY_TIER.test(b.tier)) {
      const min = anyTierMin(b.tier)
      if (min == null) continue
      any.push({ min, block: b, live: !b.disabled })
      replaced.push(b)
    }
  }
  if (!replaced.length) return null
  const qualityReplaced: FilterBlock[] = []
  let anyClasses: string[] | null = null
  let anyMin = 0
  for (const b of doc.blocks) {
    if (b.type !== 'crafting->qualityperfection' || !b.tier) continue
    if (QUALITY_TIER.test(b.tier) || ANY_QUALITY_TIER.test(b.tier)) {
      qualityReplaced.push(b)
      if (ANY_QUALITY_TIER.test(b.tier)) {
        if (!anyClasses) anyClasses = b.conditions.find(c => c.key === 'Class')?.values ?? null
        const q = Number(b.conditions.find(c => c.key === 'Quality')?.values[0])
        if (!b.disabled && b.visibility === 'Show' && Number.isFinite(q)) anyMin = anyMin ? Math.min(anyMin, q) : q
      }
    }
  }
  // Where the table goes: after NeverSink's fractured and veiled stranded
  // rules when they sit among the rank rules, so special gear still comes first.
  const first = replaced[0]
  const special = doc.blocks.filter(b => b.type === 'gear->tiered' && /^stranded/.test(b.tier ?? '') && b.index > first.index)
  const at = special.length ? doc.blocks[special[special.length - 1].index + 1] ?? null : first
  return { ranks, cells, any, replaced, at, quality: { replaced: qualityReplaced, anyClasses, anyMin } }
}

// What NeverSink shows today, as table values (both rarities alike: its rules
// take Normal, Magic and Rare together).
export function sourceShowFrom (src: TieredSource): Record<Exclude<GearRow, 'build'>, number> {
  const out = { r1: 0, r2: 0, r3: 0, any: 0 }
  for (const rank of RANKS) {
    for (const t of [...DROP_TIERS].reverse()) {
      const c = src.cells.get(key(rank, t))
      if (c?.live && c.block.visibility === 'Show') { out[rank] = t; break }
    }
  }
  const shown = src.any.filter(a => a.live && a.block.visibility === 'Show').map(a => a.min)
  out.any = shown.length ? Math.min(...shown) : 0
  return out
}

// Defaults for a fresh table: NeverSink's numbers for this file.
export function gearDefaults (doc: FilterDoc): GearSettings {
  const d = defaultGear()
  const src = readTiered(doc)
  if (!src) return d
  const from = sourceShowFrom(src)
  for (const row of ['r1', 'r2', 'r3', 'any'] as const) d.show[row] = { magic: from[row], rare: from[row] }
  const q = src.quality.anyMin
  if (q) d.quality.min.any = [...QUALITY_STEPS].reverse().find(s => s && s <= q) ?? QUALITY_STEPS[1]
  return d
}

// NeverSink's Exotic bases (talismans, experimented and other special bases):
// their own rules show them before the table, by base and sometimes item
// level or drop tier. Base -> the exotic tiers that list it (live Show rules).
export function exoticBases (doc: FilterDoc): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const b of doc.blocks) {
    if (b.type !== 'exoticbases' || b.disabled || b.visibility !== 'Show' || !b.tier) continue
    for (const v of b.conditions.find(c => c.key === 'BaseType' && c.op === '==')?.values ?? []) {
      const list = out.get(v) ?? []
      if (!list.includes(b.tier)) list.push(b.tier)
      out.set(v, list)
    }
  }
  return out
}

// ---- Lanes ------------------------------------------------------------------

export function laneOf (src: TieredSource | null, g: GearSettings, base: string): Lane {
  const moved = g.moves[base]
  if (moved) return moved
  if (src) for (const r of RANKS) if (src.ranks[r].includes(base)) return r
  return 'none'
}

export function rankLists (src: TieredSource, g: GearSettings): Record<Rank, string[]> & { never: string[] } {
  const out = { r1: [] as string[], r2: [] as string[], r3: [] as string[], never: [] as string[] }
  const seen = new Set<string>()
  const put = (base: string) => {
    if (seen.has(base)) return
    seen.add(base)
    const lane = laneOf(src, g, base)
    if (lane === 'none') return
    out[lane].push(base)
  }
  for (const r of RANKS) src.ranks[r].forEach(put)
  Object.keys(g.moves).sort().forEach(put)
  return out
}

export function buildBases (g: GearSettings, auto: string[]): string[] {
  const list = g.build.auto ? [...auto, ...g.build.extra] : [...g.build.extra]
  const removed = new Set(g.build.removed)
  return [...new Set(list)].filter(b => !removed.has(b) && g.moves[b] !== 'never').sort()
}

// ---- Writing the table --------------------------------------------------------

const RARITY_NAME: Record<GearRarity, string> = { magic: 'Magic', rare: 'Rare' }

function copyConditions (b: FilterBlock): FilterCondition[] {
  return b.conditions
    .filter(c => !['BaseType', 'UnidentifiedItemTier', 'Rarity'].includes(c.key))
    .map(c => ({ ...c, values: [...c.values] }))
}

function copyActions (b: FilterBlock, hide: boolean): FilterAction[] {
  const acts = b.actions.map(a => ({ ...a, args: [...a.args] }))
  if (!hide) return acts.filter(a => a.key !== 'DisableDropSound')
  // Hidden like NeverSink hides its own: look kept, no sounds.
  const quiet = acts.filter(a => !['PlayAlertSound', 'PlayAlertSoundPositional', 'CustomAlertSound', 'CustomAlertSoundOptional', 'PlayEffect', 'MinimapIcon', 'EnableDropSound'].includes(a.key))
  if (!quiet.some(a => a.key === 'DisableDropSound')) quiet.push({ key: 'DisableDropSound', args: ['True'] })
  return quiet
}

const exoticsMark = (b: FilterBlock) => /!exotics_\w+/.exec(b.comment)?.[0] ?? ''

function gearBlock (from: FilterBlock, tier: string, note: string, visibility: 'Show' | 'Hide', conditions: FilterCondition[], section: string): FilterBlock {
  const mark = exoticsMark(from)
  return {
    kind: 'block',
    index: -1,
    line: from.line,
    visibility,
    disabled: false,
    comment: `$type->${GEAR_TYPE} $tier->${tier}${mark ? ` ${mark}` : ''} woke: ${note}`,
    type: GEAR_TYPE,
    tier,
    conditions,
    actions: copyActions(from, visibility === 'Hide'),
    continue: false,
    section,
    subsection: from.subsection,
    raw: [],
    dirty: true,
    added: true,
    inherited: true
  }
}

const cond = (k: string, op: string, values: Array<string | number>): FilterCondition => ({ key: k, op, count: null, values: values.map(String) })

// White gear follows the rare column: NeverSink's rules took all three.
function rarityCondition (rs: GearRarity[]): FilterCondition {
  const values = rs.map(r => RARITY_NAME[r])
  if (rs.includes('rare')) values.unshift('Normal')
  return { key: 'Rarity', op: '', count: null, values }
}

// Splits two rarities into Show / Hide / leave (to later rules) groups.
// Shown rarities with looks of their own stay apart.
let splitShown = false
function byDecision (decide: (r: GearRarity) => 'Show' | 'Hide' | null): Array<{ vis: 'Show' | 'Hide', rarities: GearRarity[] }> {
  const out: Array<{ vis: 'Show' | 'Hide', rarities: GearRarity[] }> = []
  for (const r of ['magic', 'rare'] as GearRarity[]) {
    const vis = decide(r)
    if (!vis) continue
    const same = out.find(o => o.vis === vis && !(vis === 'Show' && splitShown))
    if (same) same.rarities.push(r)
    else out.push({ vis, rarities: [r] })
  }
  return out
}

// The table's look on a shown block: rarity text colour, then your patch.
function lookUp (b: FilterBlock, g: GearSettings): void {
  const rarity = b.conditions.find(c => c.key === 'Rarity')?.values ?? []
  if (g.look.rarityText) b.actions = b.actions.filter(a => a.key !== 'SetTextColor')
  const only: GearRarity | null = rarity.includes('Magic') && !rarity.includes('Rare') ? 'magic' : rarity.includes('Rare') && !rarity.includes('Magic') ? 'rare' : null
  // Both rarities in one block only when their looks are the same.
  const patch = only ? g.look[only] : g.look.rare
  if (Object.keys(patch).length) applyStyle(b, patch)
}

function insertAt (doc: FilterDoc, before: FilterBlock | null, blocks: FilterBlock[]): void {
  if (!blocks.length) return
  const at = before ? doc.chunks.indexOf(before) : -1
  doc.chunks.splice(at < 0 ? doc.chunks.length : at, 0, ...blocks)
  doc.blocks = doc.chunks.filter((c): c is FilterBlock => c.kind === 'block')
  doc.blocks.forEach((b, i) => { b.index = i })
}

function retire (b: FilterBlock): void {
  if (b.disabled) return
  b.disabled = true
  b.dirty = true
}

export interface GearResult {
  blocks: number
  replaced: number
}

// Puts the table into the filter. `auto` is the build's rare bases.
export function applyGear (doc: FilterDoc, g: GearSettings, auto: string[]): GearResult {
  const res: GearResult = { blocks: 0, replaced: 0 }
  if (!g.on) return res
  splitShown = JSON.stringify(g.look.magic) !== JSON.stringify(g.look.rare)
  const src = readTiered(doc)
  if (!src) return res
  const lists = rankLists(src, g)
  const never = new Set(lists.never)
  const build = buildBases(g, auto)
  const anchor = src.replaced[0]
  const section = anchor.section
  // Every rank block holds the same conditions apart from bases and tier.
  const template = copyConditions(anchor)
  const out: FilterBlock[] = []

  if (lists.never.length) {
    const from = src.cells.get(key('r3', 2))?.block ?? anchor
    out.push(gearBlock(from, 'never', 'bases you never want at any drop tier', 'Hide', [
      ...template, cond('UnidentifiedItemTier', '>=', [2]), rarityCondition(['magic', 'rare']), cond('BaseType', '==', lists.never)
    ], section))
  }

  for (const t of DROP_TIERS) {
    // Your build's bases: lifted above their rank where the build row says so.
    if (build.length) {
      const from = src.cells.get(key('r1', t))?.block ?? anchor
      for (const { vis, rarities } of byDecision(r => {
        const v = g.show.build[r]
        return v && t >= v ? 'Show' : null
      })) {
        out.push(gearBlock(from, `build-t${t}`, `your build's bases, drop tier ${t}`, vis, [
          ...template, cond('UnidentifiedItemTier', '>=', [t]), rarityCondition(rarities), cond('BaseType', '==', build)
        ], section))
      }
    }
    for (const rank of RANKS) {
      const bases = lists[rank]
      const cell = src.cells.get(key(rank, t))
      if (!bases.length || !cell) continue
      for (const { vis, rarities } of byDecision(r => {
        const v = g.show[rank][r]
        if (v && t >= v) return 'Show'
        // Below the line: hidden, except where NeverSink leaves it to later rules.
        return cell.live ? 'Hide' : null
      })) {
        out.push(gearBlock(cell.block, `${rank}-t${t}`, `rank ${rank.slice(1)} bases, drop tier ${t}`, vis, [
          ...template, cond('UnidentifiedItemTier', '>=', [t]), rarityCondition(rarities), cond('BaseType', '==', bases)
        ], section))
      }
    }
    // Any other base: NeverSink's class-wide rule that catches this tier.
    const anyRule = src.any.find(a => t >= a.min)
    if (anyRule) {
      const anyTemplate = copyConditions(anyRule.block)
      for (const { vis, rarities } of byDecision(r => {
        const v = g.show.any[r]
        if (v && t >= v) return 'Show'
        return anyRule.live ? 'Hide' : null
      })) {
        out.push(gearBlock(anyRule.block, `any-t${t}`, `any other base, drop tier ${t}`, vis, [
          ...anyTemplate, cond('UnidentifiedItemTier', '>=', [t]), rarityCondition(rarities)
        ], section))
      }
    }
  }

  // Bases moved to Never come out of NeverSink's other gear rules' lists only
  // through this table: the Never rule sits first.
  for (const b of out) if (b.visibility === 'Show') lookUp(b, g)
  src.replaced.forEach(retire)
  insertAt(doc, src.at, out)
  res.blocks += out.length
  res.replaced += src.replaced.length

  if (g.quality.on && src.quality.replaced.length) {
    const q = applyQuality(doc, src, g, lists, build, never)
    res.blocks += q
    res.replaced += src.quality.replaced.length
  }
  return res
}

function applyQuality (doc: FilterDoc, src: TieredSource, g: GearSettings, lists: Record<Rank, string[]>, build: string[], never: Set<string>): number {
  const qAnchor = src.quality.replaced[0]
  const styleFor = (min: number) => {
    // NeverSink's looks: q1 for 28%+, q2 for 24%+, the any-base rule below.
    const want = min >= 28 ? /q1$/ : min >= 24 ? /q2$/ : ANY_QUALITY_TIER
    return src.quality.replaced.find(b => want.test(b.tier ?? '')) ?? qAnchor
  }
  const base = [cond('Mirrored', '', ['False']), cond('Corrupted', '', ['False'])]
  const out: FilterBlock[] = []
  const rows: Array<[GearRow, string[] | null]> = [['build', build], ['r1', lists.r1], ['r2', lists.r2], ['r3', lists.r3]]
  for (const [row, bases] of rows) {
    const min = g.quality.min[row]
    const list = (bases ?? []).filter(b => !never.has(b))
    if (!min || !list.length) continue
    out.push(gearBlock(styleFor(min), `quality-${row}`, `${row === 'build' ? 'your build\'s' : `rank ${row.slice(1)}`} bases with ${min}%+ quality`, 'Show', [
      ...base, cond('Quality', '>=', [min]), cond('BaseType', '==', list)
    ], qAnchor.section))
  }
  const anyMin = g.quality.min.any
  if (anyMin && src.quality.anyClasses) {
    const anyStyle = src.quality.replaced.find(b => ANY_QUALITY_TIER.test(b.tier ?? '')) ?? qAnchor
    out.push(gearBlock(anyStyle, 'quality-any', `any base with ${anyMin}%+ quality`, 'Show', [
      ...base, cond('Quality', '>=', [anyMin]), cond('Class', '==', src.quality.anyClasses)
    ], qAnchor.section))
  }
  src.quality.replaced.forEach(retire)
  insertAt(doc, qAnchor, out)
  return out.length
}

// ---- Sweeping changes --------------------------------------------------------

export function shiftAll (g: GearSettings, by: number): void {
  for (const row of GEAR_ROWS) {
    for (const r of ['magic', 'rare'] as GearRarity[]) {
      const v = g.show[row][r]
      if (!v) continue
      g.show[row][r] = Math.min(5, Math.max(2, v + by))
    }
  }
}

export function magicOff (g: GearSettings): void {
  for (const row of GEAR_ROWS) g.show[row].magic = 0
}

export function magicLikeRares (g: GearSettings): void {
  for (const row of GEAR_ROWS) g.show[row].magic = g.show[row].rare
}
