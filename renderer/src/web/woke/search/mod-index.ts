// Uniques by their mods, for Search: type part of a mod ("item rarity") and
// get every unique with a line that has it, Foulborn mods and Vestigial
// implicits too. Built once from the tooltip's unique and Vestigial files,
// which Search already reads for its unique details. Loaded on first use, so
// startup doesn't carry it.
import { MOD_QUERY_MIN, modQueryWords, normText as norm, startsWords, wordsOf } from './mod-words'
import { plainLine } from './unique-details'
import type { TipUnique } from '../ui/tooltip/tip-content'

export { MOD_QUERY_MIN, modQueryWords }

export type ModKind = 'implicit' | 'explicit' | 'foulborn' | 'vestigial'

export interface ModLine {
  // The unique's name as the data and poe.ninja have it ("Foulborn Goldrim").
  unique: string
  // The line as the game shows it.
  line: string
  kind: ModKind
  // A jewel pool (Watcher's Eye) or the like: it can roll the line, not always has it.
  pool: boolean
  // The line's words, lower case, accents and apostrophes gone.
  words: string[]
  text: string
}

export interface ModHit {
  unique: string
  line: string
  kind: ModKind
  pool: boolean
  // 0 the words come in the query's order, 1 they're all there.
  rank: number
}

// Past these the data lists a pool to roll from, not one item's mods (same cut
// as the unique details).
const MOST_IMPLICITS = 4
const MOST_EXPLICITS = 12

export function buildModIndex (
  uniques: Readonly<Record<string, TipUnique>>,
  vestigial: Readonly<Record<string, string[][]>> | null | undefined
): ModLine[] {
  const out: ModLine[] = []
  const add = (unique: string, raw: string, kind: ModKind, pool: boolean, seen: Set<string>) => {
    const line = plainLine(raw)
    if (seen.has(line)) return
    seen.add(line)
    const text = norm(line)
    out.push({ unique, line, kind, pool, words: wordsOf(text), text })
  }
  for (const [name, tip] of Object.entries(uniques)) {
    const seen = new Set<string>()
    // A Foulborn copy repeats its unique's lines: only its own mods are new.
    const foul = name.startsWith('Foulborn ')
    for (const v of tip.v) {
      const pool = (v.i?.length ?? 0) > MOST_IMPLICITS || (v.e?.length ?? 0) > MOST_EXPLICITS
      if (!foul) {
        for (const l of v.i ?? []) add(name, l, 'implicit', pool, seen)
        for (const l of v.e ?? []) add(name, l, 'explicit', pool, seen)
      }
      for (const l of v.m ?? []) add(name, l, 'foulborn', pool, seen)
    }
  }
  for (const [name, mods] of Object.entries(vestigial ?? {})) {
    const seen = new Set<string>()
    for (const mod of mods) for (const l of mod) add(name, l, 'vestigial', false, seen)
  }
  return out
}

// The number in a query ("rarity 50"): only lines that can roll it or more.
export function queryAtLeast (query: string): number | null {
  const m = /(?:^|[\s,;])\+?(\d+(?:\.\d+)?)%?(?=[\s.,;]|$)/.exec(query)
  return m ? Number(m[1]) : null
}
// The most a line can roll: the top of its largest range ("Adds 1 to
// (650-850)" is 850, "(-10-40)%" is 40), else its first number ("+250 to"
// is 250, "1% per 15" is 1). Null when the line has no number.
export function rollMax (line: string): number | null {
  const tops = [...line.matchAll(/\((-?[\d.]+)-(-?[\d.]+)\)/g)].map(m => Math.max(Number(m[1]), Number(m[2])))
  if (tops.length) return Math.max(...tops)
  const m = /-?\d+(?:\.\d+)?/.exec(line)
  return m ? Number(m[0]) : null
}

// One hit per unique, its best line: every query word starts a word of the
// line, and a number in the query is a least roll. Order is the data's; the
// caller sorts by price.
export function searchMods (index: readonly ModLine[], query: string): ModHit[] {
  const parts = modQueryWords(query)
  if (!parts.length) return []
  const least = queryAtLeast(query)
  const phrase = parts.join(' ')
  const best = new Map<string, ModHit>()
  for (const m of index) {
    if (!startsWords(m.words, parts)) continue
    if (least != null && !((rollMax(m.line) ?? -Infinity) >= least)) continue
    const rank = m.text.includes(phrase) ? 0 : 1
    const hit = { unique: m.unique, line: m.line, kind: m.kind, pool: m.pool, rank }
    const had = best.get(m.unique)
    if (!had || order(hit) < order(had)) best.set(m.unique, hit)
  }
  return [...best.values()]
}
// A unique's own mods before its Vestigial one, a pool's lines last, then the
// words in order before words anywhere.
function order (h: ModHit): number {
  return (h.pool ? 4 : 0) + (h.kind === 'vestigial' ? 2 : 0) + h.rank
}

// The line in pieces, the query's words lit: each word the query starts.
export function litParts (line: string, query: string): Array<{ text: string, lit: boolean }> {
  const parts = modQueryWords(query)
  const out: Array<{ text: string, lit: boolean }> = []
  // Words and the gaps between them, so the line reads as it was.
  for (const piece of line.split(/([\p{L}\p{N}'’]+)/u)) {
    if (!piece) continue
    const w = norm(piece)
    const hit = parts.find(p => w.startsWith(p))
    if (hit) {
      // Light only the typed start: "rar" lights "Rar" of "Rarity". Folded
      // accents and dropped apostrophes can shift it, so then the whole word.
      const cut = norm(piece.slice(0, hit.length)) === hit ? hit.length : piece.length
      out.push({ text: piece.slice(0, cut), lit: true })
      if (cut < piece.length) out.push({ text: piece.slice(cut), lit: false })
    } else {
      out.push({ text: piece, lit: false })
    }
  }
  // Neighbouring plain pieces join, so the template draws few spans.
  return out.reduce<typeof out>((acc, p) => {
    const last = acc[acc.length - 1]
    if (last && last.lit === p.lit) last.text += p.text
    else acc.push({ ...p })
    return acc
  }, [])
}
