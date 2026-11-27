// Matching a query against stat text (a unique's mods, a passive's stats):
// every query word must start a word of the line, in any order, and numbers
// aren't words. Shared by the unique mod search and the passive tree lookup.
import { foldAccents } from './search'

// Stat text search starts at this many letters: "it" or "lif" is on hundreds of lines.
export const MOD_QUERY_MIN = 4

export function normText (text: string): string {
  return foldAccents(text.toLowerCase()).replace(/['’]/g, '').replace(/\s+/g, ' ').trim()
}
const WORD = /[^\p{L}\p{N}]+/u
export function wordsOf (text: string): string[] {
  return text.split(WORD).filter(Boolean)
}

// The query's words that match stat text: numbers are left out ("30% rarity"
// is "rarity"), and too few letters gives none.
export function modQueryWords (query: string): string[] {
  const words = wordsOf(normText(query)).filter(w => !/^\d+$/.test(w))
  // "a b c d" is four letters but matches nearly every line: one word needs 3.
  return words.join('').length >= MOD_QUERY_MIN && words.some(w => w.length >= 3) ? words : []
}

// Every part starts one of the words.
export function startsWords (words: readonly string[], parts: readonly string[]): boolean {
  return parts.every(p => words.some(w => w.startsWith(p)))
}

// Short names the mod search reads ("iir", "es"): mod-index.ts has what they
// stand for. Here so Search knows to load the index for a 2-letter query.
export const SHORT_NAME_KEYS: ReadonlySet<string> = new Set(['iir', 'iiq', 'ms', 'es', 'aoe', 'cdr', 'dot', 'ias', 'ci', 'eb', 'mom', 'rt'])
export function hasShortName (query: string): boolean {
  return wordsOf(normText(query)).some(w => SHORT_NAME_KEYS.has(w))
}
