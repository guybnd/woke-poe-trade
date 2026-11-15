// What Search shows under a unique's prices: its mods per variant, the
// Foulborn kinds and the mod each one replaces, and the Vestigial implicit it
// leaves behind. Built from the tooltip data (public/data/tips).
import type { TipBase, TipUnique } from '../ui/tooltip/tip-content'

export interface UniqueVariant {
  name?: string
  implicits: string[]
  explicits: string[]
  // Lines not every variant has: what picking this variant changes.
  differs: string[]
}
export interface FoulbornKind {
  name?: string
  adds: string[]
  // The unique's lines a Foulborn copy doesn't have.
  replaces: string[]
}
export interface UniqueDetails {
  variants: UniqueVariant[]
  foulborn: FoulbornKind[]
  vestigial: string[][]
}

// Past these the data lists a pool to roll from (Watcher's Eye, jewels), not
// one item's mods: too long for the pane. Same cut as the price check's.
const MOST_IMPLICITS = 4
const MOST_EXPLICITS = 12

// A line with its numbers taken out, so "(25-33)% increased Cold Damage" and
// "(25-36)% increased Cold Damage" count as the same mod.
export function modShape (line: string): string {
  return plainLine(line)
    .replace(/[+-]?\(-?[\d.]+-[\d.]+\)|[+-]?\d+(?:\.\d+)?/g, '#')
    .toLowerCase()
}

// "[Keyword|Shown]" and "[Keyword]" are wiki links in the data, plain text in game.
export function plainLine (line: string): string {
  return line.replace(/\[([^\]|]*)\|([^\]]*)\]/g, '$2').replace(/\[([^\]]*)\]/g, '$1')
}

type Row = TipUnique['v'][number]
// Plain uniques' vendor note, which Foulborn copies don't list: not a mod they lose.
const NOT_A_MOD = new Set(['Item sells for much more to vendors'])
// Path of Building writes "Doppelganger Guise" for the game's "Doppelgänger Guise".
const foldAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

function shapeCounts (lines: string[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const l of lines) out.set(modShape(l), (out.get(modShape(l)) ?? 0) + 1)
  return out
}
// Lines with no counterpart left in `counts`, each counterpart used once.
function unmatched (lines: string[], counts: Map<string, number>): string[] {
  const left = new Map(counts)
  return lines.filter(l => {
    const n = left.get(modShape(l)) ?? 0
    if (n > 0) { left.set(modShape(l), n - 1); return false }
    return true
  })
}
const matched = (lines: string[], counts: Map<string, number>) => lines.length - unmatched(lines, counts).length
function maxBy<T> (list: T[], score: (t: T) => number): T | undefined {
  let best: T | undefined
  let top = -1
  for (const t of list) {
    const n = score(t)
    if (n > top) { top = n; best = t }
  }
  return best
}
const linesOf = (r: Row) => [...(r.i ?? []), ...(r.e ?? [])]

export function uniqueDetails (
  name: string,
  uniques: Record<string, TipUnique> | null | undefined,
  vestigial: Record<string, string[][]> | null | undefined
): UniqueDetails | null {
  const tip = uniques?.[name]
  const foul = uniques?.[`Foulborn ${name}`]
  const rows = (tip?.v ?? []).filter(r => (r.i?.length ?? 0) <= MOST_IMPLICITS && (r.e?.length ?? 0) <= MOST_EXPLICITS)
  const shared = (line: string) => rows.every(r => linesOf(r).includes(line))
  const variants: UniqueVariant[] = rows.map(r => ({
    name: r.n,
    implicits: r.i ?? [],
    explicits: r.e ?? [],
    differs: rows.length > 1 ? linesOf(r).filter(l => !shared(l)) : []
  })).filter(v => v.implicits.length || v.explicits.length)

  const foulborn: FoulbornKind[] = []
  for (const r of foul?.v ?? []) {
    if (!r.m?.length) continue
    const kept = shapeCounts(linesOf(r))
    // The plain variant this copy came from: the same name, or else the one
    // sharing most of its lines.
    const from = tip?.v.find(p => p.n != null && p.n === r.n) ??
      maxBy(tip?.v ?? [], p => matched(linesOf(p), kept))
    const replaces = from ? unmatched(linesOf(from), kept).filter(l => !NOT_A_MOD.has(l)) : []
    foulborn.push({ name: r.n, adds: r.m, replaces })
  }

  const vest = vestigial?.[name] ?? vestigial?.[foldAccents(name)] ?? []
  if (!variants.length && !foulborn.length && !vest.length) return null
  return { variants, foulborn, vestigial: vest }
}

// The dim line under the details: base, level, attributes, base defences and
// the dust it disenchants for at item level 84 without quality.
export function uniqueFacts (base: string, b: TipBase | undefined, level: number | undefined, disenchant: number | undefined): string[] {
  const range = (r: [number, number] | undefined, label: string) =>
    r ? `${label} ${r[0] === r[1] ? r[0] : `${r[0]}–${r[1]}`}` : null
  const lvl = level ?? b?.l
  return [
    base,
    lvl ? `Level ${lvl}` : null,
    b?.s ? `${b.s} Str` : null,
    b?.d ? `${b.d} Dex` : null,
    b?.i ? `${b.i} Int` : null,
    range(b?.ar, 'Armour'),
    range(b?.ev, 'Evasion'),
    range(b?.es, 'Energy Shield'),
    disenchant ? `${dustAt84(disenchant)} dust` : null
  ].filter((p): p is string => !!p)
}

// Parser.ts's disenchant formula at item level 84, no quality or influence: x2500.
function dustAt84 (value: number): string {
  const dust = Math.floor(value * 2500)
  return dust >= 1000 ? `${Math.round(dust / 100) / 10}k` : String(dust)
}
