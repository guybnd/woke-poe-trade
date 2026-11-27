// Watcher's Eye: the aura mods it can roll, from the tooltip's unique data
// (the same lines Ctrl+Space's mod search lists), grouped by aura. No app
// imports here, so the tests load it on its own.

export const WATCHERS_EYE = "Watcher's Eye"
export const WATCHERS_EYE_BASE = 'Prismatic Jewel'

// The auras Watcher's Eye has mods for, in the order the window shows them.
export const WE_AURAS = [
  'Anger', 'Hatred', 'Wrath', 'Determination', 'Grace', 'Discipline', 'Haste', 'Zealotry', 'Pride',
  'Precision', 'Malevolence', 'Vitality', 'Clarity',
  'Purity of Elements', 'Purity of Fire', 'Purity of Ice', 'Purity of Lightning'
] as const
export type WeAura = typeof WE_AURAS[number]

// Vaal, awakened and other copies of a gem name that still run the aura.
export function auraOfGem (gem: string): WeAura | null {
  const name = gem.replace(/^Vaal /, '').replace(/ Support$/, '').trim()
  return (WE_AURAS as readonly string[]).includes(name) ? name as WeAura : null
}

export interface WeRange { lo: number, hi: number }

export interface WeMod {
  // Stable id: the line with its numbers as "#".
  id: string
  aura: WeAura
  // The line as the game shows it, ranges included ("(10-15)% increased ...").
  line: string
  // The line as the game copies it: a long one can break where the game breaks it.
  copy: string
  ranges: WeRange[]
  // A minimum can be set: one range that rolls upward.
  tunable: boolean
}

// "(10-15)", "(1.2-1.8)", "-(10-5)": a range, its sign kept outside.
const RANGE = /\((-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)\)/g

export function flatLine (line: string): string {
  return line.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim()
}

export function modId (line: string): string {
  return flatLine(line).replace(RANGE, '#').replace(/[+-]?\d+(?:\.\d+)?/g, '#')
}

export function auraOfLine (line: string): WeAura | null {
  const flat = flatLine(line)
  for (const a of WE_AURAS) {
    if (new RegExp(`(?:affected by|using) ${a}(?![a-z])`).test(flat)) return a
  }
  return null
}

function rangesOf (line: string): WeRange[] {
  return [...line.matchAll(RANGE)].map(m => ({ lo: Number(m[1]), hi: Number(m[2]) }))
}

// The jewel's lines (from uniques.json) as aura mods. The three base lines
// (maximum Life, Mana, Energy Shield) every Watcher's Eye has are left out.
export function weMods (lines: readonly string[]): WeMod[] {
  const seen = new Set<string>()
  const out: WeMod[] = []
  for (const raw of lines) {
    const line = flatLine(raw)
    const aura = auraOfLine(line)
    if (!aura) continue
    const id = modId(line)
    if (seen.has(id)) continue
    seen.add(id)
    const ranges = rangesOf(line)
    const signed = /-\(/.test(line)
    out.push({ id, aura, line, copy: raw.trim(), ranges, tunable: ranges.length === 1 && !signed && ranges[0].hi > ranges[0].lo })
  }
  return out.sort((a, b) => WE_AURAS.indexOf(a.aura) - WE_AURAS.indexOf(b.aura))
}

export function byAura (mods: readonly WeMod[], auras: readonly string[]): Array<{ aura: WeAura, mods: WeMod[] }> {
  return WE_AURAS.filter(a => auras.includes(a)).map(aura => ({ aura, mods: mods.filter(m => m.aura === aura) }))
}

// A minimum inside the mod's range, or null for "any roll".
export function clampMin (mod: WeMod, min: number | null | undefined): number | null {
  if (min == null || !Number.isFinite(min) || !mod.tunable) return null
  const r = mod.ranges[0]
  if (min <= r.lo) return null
  return Math.min(min, r.hi)
}

// The line (or lines) as an advanced copy writes it, rolled at `min` (or the bottom of
// each range), so the price check reads both the roll and its range.
export function rolledLine (mod: WeMod, min: number | null): string {
  let i = 0
  return mod.copy.replace(RANGE, (_m, lo: string, hi: string) => {
    const first = i++ === 0
    const v = first && min != null ? String(min) : lo
    return `${v}(${lo}-${hi})`
  })
}

export interface WePick { id: string, min?: number | null }

// A Watcher's Eye with the picked mods, as if copied in game (advanced copy),
// for the price check. Its aura mods start ticked there.
export function weItemText (mods: readonly WeMod[], picks: readonly WePick[]): string {
  const lines = picks
    .map(p => { const m = mods.find(m => m.id === p.id); return m ? rolledLine(m, clampMin(m, p.min)) : null })
    .filter((l): l is string => l != null)
  return [
    'Item Class: Jewels', 'Rarity: Unique', WATCHERS_EYE, WATCHERS_EYE_BASE, '--------',
    'Limited to: 1', '--------',
    'Item Level: 86', '--------',
    '{ Unique Modifier }', '(4-6)% increased maximum Energy Shield',
    '{ Unique Modifier }', '(4-6)% increased maximum Life',
    '{ Unique Modifier }', '(4-6)% increased maximum Mana',
    ...lines.flatMap(l => ['{ Unique Modifier }', l])
  ].join('\n')
}

// The official trade search: the jewel with all picked mods, or at least
// `atLeast` of them. `stat` gives a mod's trade id (null leaves it out).
export function weTradeQuery (
  mods: readonly WeMod[],
  picks: readonly WePick[],
  stat: (mod: WeMod) => string | null,
  opts: { atLeast?: number | null, status: string }
) {
  const filters = picks.flatMap(p => {
    const m = mods.find(m => m.id === p.id)
    const id = m && stat(m)
    if (!m || !id) return []
    const min = clampMin(m, p.min)
    return [{ id, ...(min != null ? { value: { min } } : {}) }]
  })
  const any = opts.atLeast != null && opts.atLeast < filters.length
  return {
    query: {
      status: { option: opts.status },
      name: WATCHERS_EYE,
      type: WATCHERS_EYE_BASE,
      stats: filters.length
        ? [any ? { type: 'count', value: { min: opts.atLeast }, filters } : { type: 'and', filters }]
        : []
    },
    sort: { price: 'asc' as const }
  }
}
