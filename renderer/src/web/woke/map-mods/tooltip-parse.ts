// Map scan mode: turns OCR'd tooltip lines into map mods and properties.
// OCR text is noisy, so mods are matched to the known map mod list by
// similarity rather than exactly.

export interface ScannedMap {
  tier?: number
  props: {
    quantity?: number
    rarity?: number
    packSize?: number
    quality?: number
    currency?: number
    scarabs?: number
    maps?: number
    divCards?: number
  }
  mods: Array<{ matcher: string, roll?: number }>
  // Lines that look like map mods but matched weakly or not at all, so the
  // verdict can't be trusted as a pass.
  weak: string[]
}

// Property lines ("Atlas Drops: +87%") by their label. OCR often misreads
// a letter or two of the game font (Q as O, M as NM), so labels are matched
// by similarity, not exactly.
const PROP_LABELS: Array<[keyof ScannedMap['props'] | 'tier', string]> = [
  ['tier', 'map tier'],
  ['quantity', 'atlas drops'],
  ['quantity', 'item quantity'],
  ['rarity', 'item rarity'],
  ['packSize', 'monster pack size'],
  ['quality', 'quality'],
  ['currency', 'more currency'],
  ['scarabs', 'more scarabs'],
  ['maps', 'more maps'],
  ['divCards', 'more divination cards']
]
// Other "Label: value" lines on map tooltips; known, so not mistaken for an
// unreadable mod.
const OTHER_LABELS = ['monster level', 'item level', 'map area', 'reward', 'conqueror map', 'unique map', 'scarab', 'stack size', 'limit']
const PROP_LINE = /^\s*([a-z][a-z .']*?)\s*[:;.,]?\s*\+?\s*(\d+)\s*%?\s*(\(.*\))?\s*$/i

export function parsePropLine (line: string): { key: keyof ScannedMap['props'] | 'tier' | 'other', value: number } | null {
  const m = PROP_LINE.exec(line)
  if (!m) return null
  const label = m[1].toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()
  if (OTHER_LABELS.some(o => similarity(label, o) >= 0.75)) return { key: 'other', value: Number(m[2]) }
  let best: { key: keyof ScannedMap['props'] | 'tier', score: number } | null = null
  for (const [key, name] of PROP_LABELS) {
    const score = similarity(label, name)
    if (score >= 0.7 && (!best || score > best.score)) best = { key, score }
  }
  return best ? { key: best.key, value: Number(m[2]) } : null
}

export function normalize (s: string): string {
  return s
    .toLowerCase()
    .replace(/[0-9]+(\.[0-9]+)?/g, '#')
    .replace(/[+]/g, '')
    .replace(/#\s*%/g, '#%')
    .replace(/[^a-z#%' ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein (a: string, b: string): number {
  if (a === b) return 0
  const prev = new Array<number>(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

export function similarity (a: string, b: string): number {
  const len = Math.max(a.length, b.length)
  return len === 0 ? 1 : 1 - levenshtein(a, b) / len
}

const MIN_SIMILARITY = 0.8
// Below this a match counts as a guess.
const SURE_SIMILARITY = 0.9
// Words that start map mod lines; such a line with no match is suspicious.
const MOD_LIKE = /^(monsters?|players?|rare|unique|area|buffs|auras|debuffs|the maven|#% (more|less|increased|reduced))/

interface Known { matcher: string, norm: string }

const CACHE_MAX = 2000
// Words most map mods share; they don't narrow anything down.
const COMMON = new Set(['increased', 'reduced', 'more', 'less', 'monsters', 'monster', 'area', 'this', 'have', 'with', 'from', 'found', 'players', 'player', 'chance', 'damage', 'additional'])

function keyWords (norm: string): string[] {
  return norm.split(' ').map(w => w.replace(/[#%']/g, '')).filter(w => w.length >= 4 && !COMMON.has(w))
}

// A line with fixed numbers ("at 50% value") is a different mod from one with
// others ("at 25% value"), though the two normalise alike.
function sameFixedNumbers (matcherLine: string, line: string): boolean {
  const fixed = matcherLine.match(/\d+/g)
  return !fixed || fixed.join(' ') === (line.match(/\d+/g) ?? []).join(' ')
}

export class TooltipMatcher {
  // Known mods by the less common words in them, so a line is compared with
  // the few dozen mods sharing a word with it instead of all ~500.
  private readonly byWord = new Map<string, Known[]>()
  // Mods without such a word: always compared.
  private readonly plain: Known[] = []
  // Mods that show on several tooltip lines, each line normalised. OCR reads
  // them one line at a time, so they're matched against runs of lines.
  private readonly multi: Array<{ matcher: string, raw: string[], lines: string[] }> = []
  // Mods the user rated: always compared, whatever words OCR got wrong.
  private always: Known[] = []
  private alwaysKey = ''
  // The same tooltip is read many times (rerolls, re-hovers).
  private readonly cache = new Map<string, { matcher: string, score: number } | null>()

  constructor (matchers: string[]) {
    for (const m of matchers) {
      const k = { matcher: m, norm: normalize(m) }
      if (m.includes('\n')) this.multi.push({ matcher: m, raw: m.split('\n'), lines: m.split('\n').map(normalize) })
      const words = keyWords(k.norm)
      if (!words.length) this.plain.push(k)
      for (const w of new Set(words)) {
        const list = this.byWord.get(w)
        if (list) list.push(k)
        else this.byWord.set(w, [k])
      }
    }
  }

  // Mods with a rating in the active profile.
  setAlwaysCheck (matchers: string[]) {
    const key = matchers.slice().sort().join('\n')
    if (key === this.alwaysKey) return
    this.alwaysKey = key
    this.always = matchers.map(m => ({ matcher: m, norm: normalize(m) }))
    this.cache.clear()
  }

  private candidates (norm: string): Set<Known> {
    const out = new Set<Known>(this.plain)
    for (const w of keyWords(norm)) {
      for (const k of this.byWord.get(w) ?? []) out.add(k)
    }
    return out
  }

  private best (norm: string): { matcher: string, score: number } | null {
    const cached = this.cache.get(norm)
    if (cached !== undefined) return cached
    let best: { matcher: string, score: number } | null = null
    const consider = (k: Known) => {
      // Cheap length filter before the edit distance.
      if (Math.abs(k.norm.length - norm.length) > norm.length * (1 - MIN_SIMILARITY) + 2) return
      const score = similarity(norm, k.norm)
      if (score >= MIN_SIMILARITY && (!best || score > best.score)) {
        best = { matcher: k.matcher, score }
      }
    }
    for (const k of this.always) consider(k)
    const near = this.candidates(norm)
    for (const k of near) consider(k)
    // OCR garbled every telling word: fall back to all mods. The cache keeps
    // this to once per line.
    if (!best) for (const list of this.byWord.values()) for (const k of list) if (!near.has(k)) consider(k)
    if (this.cache.size >= CACHE_MAX) this.cache.clear()
    this.cache.set(norm, best)
    return best
  }

  matchLine (line: string): { matcher: string, roll?: number, score: number } | null {
    const norm = normalize(line)
    if (norm.length < 8) return null
    const best = this.best(norm)
    if (!best) return null
    // Keep the sign: "Players have -12% to all maximum Resistances".
    const num = /(-?\d+)/.exec(line)
    return { matcher: best.matcher, roll: num ? Number(num[1]) : undefined, score: best.score }
  }

  // Runs of lines that spell out a multi-line mod. A rating on it counts as
  // well as any rating on its lines read alone, and those lines aren't weak.
  private multiLineMods (lines: string[]): { mods: Array<{ matcher: string, roll?: number }>, used: Set<number> } {
    const mods: Array<{ matcher: string, roll?: number }> = []
    const used = new Set<number>()
    const norms = lines.map(normalize)
    for (const m of this.multi) {
      for (let i = 0; i + m.lines.length <= norms.length; i++) {
        if (!m.lines.every((l, j) => similarity(norms[i + j], l) >= SURE_SIMILARITY && sameFixedNumbers(m.raw[j], lines[i + j]))) continue
        // The roll is the number standing in for a '#', not a fixed one.
        const rolled = m.raw.findIndex(r => r.includes('#'))
        const num = rolled >= 0 ? /(-?\d+)/.exec(lines[i + rolled]) : null
        mods.push({ matcher: m.matcher, roll: num ? Number(num[1]) : undefined })
        for (let j = 0; j < m.lines.length; j++) used.add(i + j)
        break
      }
    }
    return { mods, used }
  }

  // Null when the lines don't look like a map tooltip.
  parse (lines: string[]): ScannedMap | null {
    const out: ScannedMap = { props: {}, mods: [], weak: [] }
    let isMap = false
    const seen = new Set<string>()
    const multi = this.multiLineMods(lines)
    for (const m of multi.mods) {
      seen.add(m.matcher)
      out.mods.push(m)
    }
    for (const [lineIndex, line] of lines.entries()) {
      // Header line of magic maps (read when it's blue): "Map (Tier 16)".
      const header = /\bmap\s*\(\s*tier\s*(\d+)\s*\)/i.exec(line)
      if (header) {
        out.tier = Number(header[1])
        isMap = true
        continue
      }
      const prop = parsePropLine(line)
      if (prop) {
        if (prop.key === 'tier') out.tier = prop.value
        else if (prop.key !== 'other') out.props[prop.key] = prop.value
        isMap = true
        continue
      }
      const mod = this.matchLine(line)
      if (mod && !seen.has(mod.matcher)) {
        seen.add(mod.matcher)
        out.mods.push({ matcher: mod.matcher, roll: mod.roll })
      }
      const norm = normalize(line)
      if (multi.used.has(lineIndex)) continue
      if ((mod && mod.score < SURE_SIMILARITY) || (!mod && norm.length >= 15 && MOD_LIKE.test(norm))) {
        out.weak.push(line)
      }
    }
    if (!isMap && !out.mods.length) return null
    return out
  }
}
