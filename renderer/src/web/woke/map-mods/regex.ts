// Builds an in-game stash search string for maps, like poe.re: each picked
// mod becomes the shortest piece of its text that no other map mod contains.
//
// PoE search rules this relies on: the search is case-insensitive, space-
// separated "quoted terms" must all match, `|` inside a term is OR, and a
// leading `!` negates the whole term.

import { MAX_SEARCH_LENGTH } from '../shared/library'
export { MAX_SEARCH_LENGTH }

export interface MapRegexInput {
  avoid: string[]
  want: string[]
  mins: Partial<Record<MinStat, number>>
  // 'good' highlights maps you can run; 'bad' highlights maps with avoided mods.
  highlight: 'good' | 'bad'
  // true: a map passes when it meets any one minimum instead of all of them.
  minsAny?: boolean
}

export type MinStat = 'quantity' | 'rarity' | 'packSize' | 'quality' | 'currency' | 'scarabs' | 'maps' | 'divCards'

// The tail of each map property line ("Atlas Drops: +112%"), picked so it
// matches only that line. `.` stands in for the `+`. 'quantity' is the 3.30
// Atlas Drops line, which replaced Item Quantity on every map, old ones too.
const MIN_PREFIX: Record<MinStat, string> = {
  quantity: 'ops: .',
  rarity: 'rity: .',
  packSize: 'ze: .',
  quality: 'lity: .',
  currency: 'ncy: .',
  scarabs: 'abs: .',
  maps: 'aps: .',
  divCards: 'rds: .'
}

export const MIN_LABELS: Record<MinStat, string> = {
  quantity: 'Atlas drops',
  rarity: 'Item rarity',
  packSize: 'Pack size',
  quality: 'Quality',
  currency: 'More currency',
  scarabs: 'More scarabs',
  maps: 'More maps',
  divCards: 'More div cards'
}

// Non-mod text on a map tooltip; mod tokens must not match it.
export const TOOLTIP_LINES = [
  'item class: maps',
  'rarity: rare',
  'rarity: magic',
  'rarity: normal',
  'map tier: 16',
  'atlas drops: +100%',
  'item quantity: +100%',
  'item rarity: +100%',
  'monster pack size: +100%',
  'quality: +20%',
  'more currency: +100%',
  'more scarabs: +100%',
  'more maps: +100%',
  'more divination cards: +100%',
  'item level: 83',
  'corrupted',
  'unidentified',
  'travel to this map by using it in a personal map device. maps can only be used once.',
  'delirium reward type',
  'map'
]

// "#% increased Pack size" -> lowercase text split at the rolled numbers
// and at line breaks: the search box takes one line, so a token can't span two.
function segments (matcher: string): string[] {
  return matcher.toLowerCase().split(/[#0-9+%\n-]+/).map(s => s.trim()).filter(Boolean)
}

function usable (token: string): boolean {
  // Leading/trailing spaces are fragile, and quotes/regex characters would
  // need escaping.
  return token.length >= 3 && token.trim() === token && !/["|!\\.*?()[\]{}^$]/.test(token)
}

// Joins two words (or the two lines of a mod) by a single letter: "m h"
// from "from hits" also matches a rare map's random name ("Grim Hollow") by
// chance, so such a token is only used when a mod has nothing better.
function joinsByLetter (token: string): boolean {
  const words = token.split(/[ \n]/)
  return words.length > 1 && words.some(word => word.length < 2)
}

// Shortest substring of `target` found in none of `others`, of at least `minLen`
// letters when it has one that long.
export function uniqueToken (target: string, others: string[], minLen = 3): string | null {
  const segs = segments(target)
  // Compared line by line. A line that reads exactly like one of the target's
  // (a two-line mod that contains a one-line one) shows the same text in the
  // tooltip, so matching it too is right.
  const own = new Set(target.toLowerCase().split('\n'))
  const hay = others.flatMap(o => o.toLowerCase().split('\n')).filter(h => !own.has(h))
  let fallback: string | null = null
  for (let len = minLen; len <= 40; len++) {
    const found: string[] = []
    for (const seg of segs) {
      for (let i = 0; i + len <= seg.length; i++) {
        const tok = seg.slice(i, i + len)
        if (!usable(tok)) continue
        if (!hay.some(h => h.includes(tok))) found.push(tok)
      }
    }
    found.sort()
    const safe = found.find(t => !joinsByLetter(t))
    if (safe) return safe
    fallback ??= found[0] ?? null
  }
  return fallback ?? (minLen > 3 ? uniqueToken(target, others) : null)
}

// Regex for whole numbers >= n (n in 1..999), e.g. 80 -> ([89][0-9]|[1-9][0-9][0-9]).
export function atLeast (n: number): string {
  n = Math.max(1, Math.min(999, Math.floor(n)))
  const range = (from: number) => from === 9 ? '9' : `[${from}-9]`
  const digits = String(n).split('').map(Number)
  const alts: string[] = []
  // Same number of digits as n. Trailing zeros fold into the last non-zero
  // digit's range: 80 -> [8-9][0-9] instead of 9[0-9]|8[0-9].
  let k = digits.length - 1
  while (k > 0 && digits[k] === 0) k--
  for (let i = 0; i <= k; i++) {
    const prefix = digits.slice(0, i).join('')
    const rest = '[0-9]'.repeat(digits.length - i - 1)
    if (i === k) {
      alts.push(prefix + range(digits[i]) + rest)
    } else if (digits[i] < 9) {
      alts.push(prefix + range(digits[i] + 1) + rest)
    }
  }
  // More digits, up to three.
  for (let len = digits.length + 1; len <= 3; len++) {
    alts.push('[1-9]' + '[0-9]'.repeat(len - 1))
  }
  return alts.length === 1 ? alts[0] : `(${alts.join('|')})`
}

export interface MapRegexResult {
  text: string
  length: number
  tooLong: boolean
  // Mods we couldn't find a unique token for.
  missing: string[]
  // Mod -> the text it was shortened to. Each costs its length plus one `|`.
  tokens: Record<string, string>
  // Mods left out by auto-trim to fit the search box.
  dropped: string[]
}

export function tokenCost (token: string): number {
  return token.length + 1
}

// `universe`: every map mod matcher string (all variants), used to make the
// tokens unique. `extraText`: other text a map tooltip can show (map names).
// `minToken`: raise it for items whose random names can't be listed.
export function buildMapRegex (input: MapRegexInput, universe: string[], extraText: string[] = [], minToken = 3): MapRegexResult {
  const missing: string[] = []
  const tokens: Record<string, string> = {}

  function tokensFor (mods: string[], allowed: string[]): string[] {
    const allowedSet = new Set(allowed.map(m => m.toLowerCase()))
    const others = [...universe.filter(u => !allowedSet.has(u.toLowerCase())), ...TOOLTIP_LINES, ...extraText]
    const out = new Set<string>()
    for (const m of mods) {
      const tok = uniqueToken(m, others, minToken)
      if (tok) {
        out.add(tok)
        tokens[m] = tok
      } else missing.push(m)
    }
    return [...out].sort()
  }

  const terms: string[] = []
  // A token may also match other mods from the same group: it doesn't change
  // the result and gives shorter tokens.
  const avoid = tokensFor(input.avoid, input.avoid)
  if (input.highlight === 'bad') {
    if (avoid.length) terms.push(`"${avoid.join('|')}"`)
  } else {
    if (avoid.length) terms.push(`"!${avoid.join('|')}"`)
    const want = tokensFor(input.want, input.want)
    if (want.length) terms.push(`"${want.join('|')}"`)
    const mins: string[] = []
    for (const key of Object.keys(MIN_PREFIX) as MinStat[]) {
      const v = input.mins[key]
      if (v && v > 0) mins.push(`${MIN_PREFIX[key]}${atLeast(v)}%`)
    }
    if (input.minsAny && mins.length > 1) terms.push(`"${mins.join('|')}"`)
    else terms.push(...mins.map(m => `"${m}"`))
  }

  const text = terms.join(' ')
  return { text, length: text.length, tooLong: text.length > MAX_SEARCH_LENGTH, missing, tokens, dropped: [] }
}

// Drops mods until the search fits: wanted mods first, then avoided ones,
// each time the one with the lowest `priority` (ties: longest token first).
// Tokens are rebuilt after each drop, since a dropped mod can no longer
// share text with the ones kept.
export function buildTrimmedMapRegex (
  input: MapRegexInput,
  universe: string[],
  extraText: string[],
  priority: (mod: string) => number,
  minToken = 3
): MapRegexResult {
  let cur = { ...input, avoid: [...input.avoid], want: [...input.want] }
  let res = buildMapRegex(cur, universe, extraText, minToken)
  const dropped: string[] = []
  while (res.tooLong) {
    const pool = cur.want.length && cur.highlight === 'good' ? cur.want : cur.avoid
    if (!pool.length) break
    const pick = [...pool].sort((a, b) =>
      priority(a) - priority(b) || (res.tokens[b]?.length ?? 0) - (res.tokens[a]?.length ?? 0))[0]
    dropped.push(pick)
    cur = { ...cur, avoid: cur.avoid.filter(m => m !== pick), want: cur.want.filter(m => m !== pick) }
    res = buildMapRegex(cur, universe, extraText, minToken)
  }
  return { ...res, dropped }
}
