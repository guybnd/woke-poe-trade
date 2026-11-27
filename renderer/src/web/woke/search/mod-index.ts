// Uniques by their mods, for Search: type part of a mod ("item rarity") and
// get every unique with a line that has it, Foulborn mods and Vestigial
// implicits too. Built once from the tooltip's unique and Vestigial files,
// which Search already reads for its unique details. Loaded on first use, so
// startup doesn't carry it.
import { MOD_QUERY_MIN, modQueryWords, normText as norm, startsWords, wordsOf } from './mod-words'
import { plainLine } from './unique-details'
import type { TipUnique } from '../ui/tooltip/tip-content'

export { MOD_QUERY_MIN, modQueryWords }
export { SHORT_NAME_KEYS } from './mod-words'

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
  // The unique's item class ("Boots", "Ring"), when its base is known.
  slot?: string
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

// `slotOf`: a base's item class ("Goathide Boots" is "Boots"), for slot words.
export function buildModIndex (
  uniques: Readonly<Record<string, TipUnique>>,
  vestigial: Readonly<Record<string, string[][]>> | null | undefined,
  slotOf: (base: string) => string | undefined = () => undefined
): ModLine[] {
  const out: ModLine[] = []
  const slots = new Map<string, string | undefined>()
  const slotFor = (unique: string) => {
    if (!slots.has(unique)) {
      const base = uniques[unique]?.b ?? uniques[unique.replace(/^Foulborn /, '')]?.b
      slots.set(unique, base ? slotOf(base) : undefined)
    }
    return slots.get(unique)
  }
  const add = (unique: string, raw: string, kind: ModKind, pool: boolean, seen: Set<string>) => {
    const line = plainLine(raw)
    if (seen.has(line)) return
    seen.add(line)
    const text = norm(line)
    out.push({ unique, line, kind, pool, words: wordsOf(text), text, slot: slotFor(unique) })
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

// Words that filter instead of matching mod text: "rarity vestig" is
// Vestigial lines with rarity. Kinds, then slots, then short names.
const KIND_WORDS: ReadonlyArray<[string, ModKind | 'pool', string]> = [
  ['vestigial', 'vestigial', 'Vestigial'],
  ['foulborn', 'foulborn', 'Foulborn'],
  ['implicit', 'implicit', 'Implicit'],
  ['explicit', 'explicit', 'Explicit']
]
const POOL_WORDS = new Set(['roll', 'rolls', 'pool'])
const WEAPONS = ['Claw', 'Bow', 'Sceptre', 'Wand', 'Staff', 'Warstaff', 'Dagger', 'Rune Dagger', 'One-Handed Axe', 'Two-Handed Axe', 'One-Handed Mace', 'Two-Handed Mace', 'One-Handed Sword', 'Two-Handed Sword']
const SLOT_WORDS: ReadonlyArray<[string[], string[], string]> = [
  [['helm', 'helms', 'helmet', 'helmets', 'hat'], ['Helmet'], 'Helmets'],
  [['glove', 'gloves'], ['Gloves'], 'Gloves'],
  [['boot', 'boots'], ['Boots'], 'Boots'],
  [['body', 'chest', 'chests'], ['Body Armour'], 'Body armours'],
  [['belt', 'belts'], ['Belt'], 'Belts'],
  [['ring', 'rings'], ['Ring'], 'Rings'],
  [['amulet', 'amulets', 'ammy', 'amu'], ['Amulet'], 'Amulets'],
  [['shield', 'shields'], ['Shield'], 'Shields'],
  [['quiver', 'quivers'], ['Quiver'], 'Quivers'],
  [['jewel', 'jewels'], ['Jewel', 'Abyss Jewel', 'Cluster Jewel'], 'Jewels'],
  [['flask', 'flasks'], ['Flask'], 'Flasks'],
  [['sword', 'swords'], ['One-Handed Sword', 'Two-Handed Sword'], 'Swords'],
  [['axe', 'axes'], ['One-Handed Axe', 'Two-Handed Axe'], 'Axes'],
  [['mace', 'maces'], ['One-Handed Mace', 'Two-Handed Mace'], 'Maces'],
  [['bow', 'bows'], ['Bow'], 'Bows'],
  [['wand', 'wands'], ['Wand'], 'Wands'],
  [['staff', 'staves', 'staffs'], ['Staff', 'Warstaff'], 'Staves'],
  [['claw', 'claws'], ['Claw'], 'Claws'],
  [['dagger', 'daggers'], ['Dagger', 'Rune Dagger'], 'Daggers'],
  [['sceptre', 'sceptres', 'scepter'], ['Sceptre'], 'Sceptres'],
  [['weapon', 'weapons'], WEAPONS, 'Weapons']
]
// Short names players type, as the words they stand for.
export const SHORT_NAMES: Readonly<Record<string, { words: string[], label: string }>> = {
  iir: { words: ['item', 'rarity'], label: 'Item Rarity' },
  iiq: { words: ['item', 'quantity'], label: 'Item Quantity' },
  ms: { words: ['movement', 'speed'], label: 'Movement Speed' },
  es: { words: ['energy', 'shield'], label: 'Energy Shield' },
  aoe: { words: ['area'], label: 'Area of Effect' },
  cdr: { words: ['cooldown', 'recovery'], label: 'Cooldown Recovery' },
  dot: { words: ['damage', 'over', 'time'], label: 'Damage over Time' },
  ias: { words: ['attack', 'speed'], label: 'Attack Speed' },
  ci: { words: ['chaos', 'inoculation'], label: 'Chaos Inoculation' },
  eb: { words: ['eldritch', 'battery'], label: 'Eldritch Battery' },
  mom: { words: ['mind', 'over', 'matter'], label: 'Mind Over Matter' },
  rt: { words: ['resolute', 'technique'], label: 'Resolute Technique' }
}

export interface ModReading {
  hits: ModHit[]
  // What the query was read as, for the group's heading: "Vestigial", "Boots".
  notes: string[]
  // The words matched as mod text, for lighting: "es" is energy shield.
  words: string[]
}

// Pairs of words found together in the mod text: "energy shield" or "flask
// charges" are mod words, so there "shield" and "flask" aren't slots.
const pairsOf = new WeakMap<readonly ModLine[], Set<string>>()
function pairs (index: readonly ModLine[]): Set<string> {
  let p = pairsOf.get(index)
  if (!p) {
    p = new Set()
    for (const m of index) for (let i = 1; i < m.words.length; i++) p.add(`${m.words[i - 1]} ${m.words[i]}`)
    pairsOf.set(index, p)
  }
  return p
}
// `slotWords`: the slot words as typed. A line that has the word itself
// counts too, so "bow damage" keeps "Damage with Bow Attacks" on a quiver.
interface Reading { parts: string[], kinds: Set<ModKind | 'pool'>, slots: Set<string>, slotWords: string[], notes: string[] }
const shortName = (w: string) => Object.hasOwn(SHORT_NAMES, w) ? SHORT_NAMES[w] : undefined
// A kind word, whole or its first 6 letters ("vestig"): fewer would catch
// words on the way to others ("expl" is explode too).
const KIND_PREFIX = 6
// The query read with filter words, or null when it has none.
function filterReading (index: readonly ModLine[], raw: string[]): Reading | null {
  const out: Reading = { parts: [], kinds: new Set(), slots: new Set(), slotWords: [], notes: [] }
  let filtered = false
  raw.forEach((w, i) => {
    const short = shortName(w)
    if (short) { out.parts.push(...short.words); out.notes.push(short.label); filtered = true; return }
    // A word in a pair the mod text has ("energy shield") stays a mod word.
    const paired = (i > 0 && pairs(index).has(`${raw[i - 1]} ${w}`)) || (i + 1 < raw.length && pairs(index).has(`${w} ${raw[i + 1]}`))
    if (!paired) {
      const kind = w.length >= KIND_PREFIX ? KIND_WORDS.find(([word]) => word.startsWith(w)) : undefined
      if (kind) { out.kinds.add(kind[1]); out.notes.push(kind[2]); filtered = true; return }
      // "can roll" is one filter.
      if (w === 'can' && POOL_WORDS.has(raw[i + 1])) return
      if (POOL_WORDS.has(w)) { out.kinds.add('pool'); out.notes.push('Can roll'); filtered = true; return }
      const slot = SLOT_WORDS.find(([words]) => words.includes(w))
      if (slot) { for (const c of slot[1]) out.slots.add(c); out.slotWords.push(w); out.notes.push(slot[2]); filtered = true; return }
    }
    out.parts.push(w)
  })
  return filtered ? out : null
}

function run (index: readonly ModLine[], r: Reading, least: number | null): ModHit[] {
  const { parts } = r
  // A filter alone ("vestigial boots") lists every line it keeps.
  if (!parts.length && !r.kinds.size && !r.slots.size) return []
  const phrase = parts.join(' ')
  const best = new Map<string, ModHit>()
  for (const m of index) {
    if (r.kinds.size && !(r.kinds.has(m.kind) || (r.kinds.has('pool') && m.pool))) continue
    if (r.slots.size && !((m.slot && r.slots.has(m.slot)) || startsWords(m.words, r.slotWords))) continue
    if (parts.length && !startsWords(m.words, parts)) continue
    if (least != null && !((rollMax(m.line) ?? -Infinity) >= least)) continue
    const rank = parts.length && m.text.includes(phrase) ? 0 : 1
    const hit = { unique: m.unique, line: m.line, kind: m.kind, pool: m.pool, rank }
    const had = best.get(m.unique)
    if (!had || order(hit) < order(had)) best.set(m.unique, hit)
  }
  return [...best.values()]
}

// The query read loosely: filter words and short names first; if that finds
// nothing, every word as mod text. One hit per unique, its best line; a
// number is a least roll. Order is the data's; the caller sorts by price.
export function readMods (index: readonly ModLine[], query: string): ModReading {
  const words = modQueryWords(query)
  if (!words.length) {
    // "iir", "es": too short on their own, but a short name.
    const only = wordsOf(norm(query)).filter(w => !/^\d+$/.test(w))
    if (!(only.length && only.every(w => shortName(w)))) return { hits: [], notes: [], words: [] }
    words.push(...only)
  }
  const least = queryAtLeast(query)
  const filter = filterReading(index, words)
  if (filter) {
    const hits = run(index, filter, least)
    if (hits.length) return { hits, notes: filter.notes, words: filter.parts }
  }
  const plain: Reading = { parts: words, kinds: new Set(), slots: new Set(), slotWords: [], notes: [] }
  return { hits: run(index, plain, least), notes: [], words }
}

// The hits alone.
export function searchMods (index: readonly ModLine[], query: string): ModHit[] {
  return readMods(index, query).hits
}
// A unique's own mods before its Vestigial one, a pool's lines last, then the
// words in order before words anywhere.
function order (h: ModHit): number {
  return (h.pool ? 4 : 0) + (h.kind === 'vestigial' ? 2 : 0) + h.rank
}

// The line in pieces, the query's words lit: each word the query starts.
// `query` is the typed text, or the words readMods matched.
export function litParts (line: string, query: string | readonly string[]): Array<{ text: string, lit: boolean }> {
  const parts = typeof query === 'string' ? modQueryWords(query) : query
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
