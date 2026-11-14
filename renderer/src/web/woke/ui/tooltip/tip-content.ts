// Turns the item tooltip data (public/data/tips, built by
// scripts/build-tip-data.mjs) into lines to draw. Pure: GameTooltip.vue draws
// the result, item-tip.ts loads the data and adds the price.

export type TipTone = 'label' | 'value' | 'text' | 'mod' | 'dim' | 'gem' | 'flavour' | 'corrupted' | 'mutated' | 'unique' | 'rare' | 'currency' | 'card'
export interface TipPart { text: string, tone: TipTone }
export type TipLine = TipPart[]
export type TipFrame = 'normal' | 'unique' | 'currency' | 'card' | 'gem-r' | 'gem-g' | 'gem-b' | 'gem-w'

export interface TipModel {
  name: string
  base?: string
  frame: TipFrame
  sections: TipLine[][]
}

type Range = [number, number]

export interface TipUnique {
  b: string
  f?: string
  v: Array<{ n?: string, l?: number, i?: string[], e?: string[], m?: string[] }>
}
export interface TipGem {
  c: string
  s?: number
  t: string[]
  d?: string
  cm?: number
  ct?: number
  st?: string[]
  q?: Array<{ t: string, v: number[] }>
  lv: Record<string, { r?: number, a?: { s?: number, d?: number, i?: number }, c?: string, x?: string[] }>
}
// From the wiki (scripts/build-drop-data.mjs): d, never drops; r, only from
// somewhere in particular (a boss, a league mechanic, a recipe); t, where from.
export interface TipDrop { d?: 1, r?: 1, t?: string }
export interface TipItem { d?: string, u?: string, n?: number }
export interface TipBase {
  ar?: Range
  ev?: Range
  es?: Range
  wd?: Range
  ph?: Range
  at?: number
  cr?: number
  l?: number
  s?: number
  d?: number
  i?: number
}
export interface TipPack {
  uniques?: Record<string, TipUnique>
  gems?: Record<string, TipGem>
  items?: Record<string, TipItem>
  bases?: Record<string, TipBase>
  drops?: Record<string, TipDrop>
}

export type TipKind = 'unique' | 'gem' | 'card' | 'item'

// poe.ninja's row types ("UniqueArmour", "SkillGem", "DivinationCard"...).
export function kindOfNinjaType (type: string): TipKind {
  if (/^Unique/.test(type)) return 'unique'
  if (/Gem/.test(type)) return 'gem'
  if (type === 'DivinationCard') return 'card'
  return 'item'
}

const part = (text: string, tone: TipTone): TipPart => ({ text, tone })
const plain = (text: string, tone: TipTone): TipLine => [part(text, tone)]
const pair = (label: string, value: string): TipLine => [part(`${label}: `, 'label'), part(value, 'value')]
// Mod text from poe.ninja wraps at the game's width; ours wraps on its own.
const unwrap = (s: string) => s.replace(/\s*\n\s*/g, ' ')

// ---- the game's "<gemitem>{Level 21 Vaal Cold Snap}" text markup ----

const TAG_TONES: Record<string, TipTone> = {
  default: 'label',
  normal: 'text',
  whiteitem: 'text',
  magicitem: 'mod',
  augmented: 'mod',
  enchanted: 'mod',
  rareitem: 'rare',
  uniqueitem: 'unique',
  gemitem: 'gem',
  currencyitem: 'currency',
  divination: 'card',
  corrupted: 'corrupted',
  fractured: 'text',
  brequelmutated: 'mutated',
  legiondivergent: 'mutated'
}

export function parseMarkup (source: string, tone: TipTone = 'gem'): TipLine[] {
  const lines: TipLine[] = [[]]
  const stack: TipTone[] = [tone]
  let text = ''
  const flush = () => {
    if (text) lines[lines.length - 1].push(part(text, stack[stack.length - 1]))
    text = ''
  }
  const openTag = /^<([a-zA-Z0-9_:]+)>\{/
  for (let i = 0; i < source.length; i++) {
    const c = source[i]
    if (c === '<') {
      const m = openTag.exec(source.slice(i))
      if (m) {
        flush()
        // A size tag only changes the type size, so it keeps the tone around it.
        stack.push(TAG_TONES[m[1]] ?? stack[stack.length - 1])
        i += m[0].length - 1
        continue
      }
    }
    if (c === '}' && stack.length > 1) {
      flush()
      stack.pop()
      continue
    }
    if (c === '\r') continue
    if (c === '\n') {
      flush()
      lines.push([])
      continue
    }
    text += c
  }
  flush()
  return lines.filter(l => l.some(p => p.text.trim()))
}

// ---- a unique's stats, worked out from its base and local mods ----

const NUM = '(\\(\\d+(?:\\.\\d+)?-\\d+(?:\\.\\d+)?\\)|\\d+(?:\\.\\d+)?)'
const RE_MORE = new RegExp(`^${NUM}% (increased|reduced) (.+)$`)
const RE_FLAT = new RegExp(`^\\+${NUM} to (.+)$`)
const RE_ADDS = new RegExp(`^Adds ${NUM} to ${NUM} Physical Damage$`)

function parseRange (s: string): Range {
  const m = /^\((.+)-(.+)\)$/.exec(s)
  return m ? [Number(m[1]), Number(m[2])] : [Number(s), Number(s)]
}

const add = (a: Range, b: Range): Range => [a[0] + b[0], a[1] + b[1]]
const scale = (a: Range, inc: Range): Range => [a[0] * (1 + inc[0] / 100), a[1] * (1 + inc[1] / 100)]

function show (r: Range, digits = 0): string {
  // A "reduced" range runs high to low.
  const a = Math.min(r[0], r[1]).toFixed(digits)
  const b = Math.max(r[0], r[1]).toFixed(digits)
  return a === b ? a : `${a}-${b}`
}

const INC_TARGETS: Record<string, Array<'ar' | 'ev' | 'es' | 'wd' | 'ph' | 'as' | 'cr'>> = {
  'Armour': ['ar'],
  'Evasion Rating': ['ev'],
  'Evasion': ['ev'],
  'Energy Shield': ['es'],
  'Armour and Evasion': ['ar', 'ev'],
  'Armour and Energy Shield': ['ar', 'es'],
  'Evasion and Energy Shield': ['ev', 'es'],
  'Armour, Evasion and Energy Shield': ['ar', 'ev', 'es'],
  'Ward': ['wd'],
  'Physical Damage': ['ph'],
  'Attack Speed': ['as'],
  'Critical Strike Chance': ['cr']
}
const FLAT_TARGETS: Record<string, Array<'ar' | 'ev' | 'es' | 'wd'>> = {
  'Armour': ['ar'],
  'Evasion Rating': ['ev'],
  'maximum Energy Shield': ['es'],
  'Armour and Evasion Rating': ['ar', 'ev'],
  'Armour and Energy Shield': ['ar', 'es'],
  'Evasion Rating and Energy Shield': ['ev', 'es'],
  'Ward': ['wd']
}

export function gearStats (base: TipBase, mods: string[]): TipLine[] {
  const inc: Record<string, Range> = {}
  const flat: Record<string, Range> = {}
  let addedLow: Range = [0, 0]
  let addedHigh: Range = [0, 0]
  const none = new Set<string>()
  for (const raw of mods) {
    const mod = unwrap(raw)
    const adds = RE_ADDS.exec(mod)
    if (adds) {
      addedLow = add(addedLow, parseRange(adds[1]))
      addedHigh = add(addedHigh, parseRange(adds[2]))
      continue
    }
    const more = RE_MORE.exec(mod)
    if (more) {
      const sign = more[2] === 'reduced' ? -1 : 1
      const r = parseRange(more[1])
      for (const key of INC_TARGETS[more[3]] ?? []) inc[key] = add(inc[key] ?? [0, 0], [r[0] * sign, r[1] * sign])
      continue
    }
    const plus = RE_FLAT.exec(mod)
    if (plus) {
      for (const key of FLAT_TARGETS[plus[2]] ?? []) flat[key] = add(flat[key] ?? [0, 0], parseRange(plus[1]))
      continue
    }
    if (mod === 'Has no Energy Shield') none.add('es')
    if (mod === 'Has no Armour') none.add('ar')
    if (mod === 'Has no Evasion Rating') none.add('ev')
    if (mod === 'No Physical Damage') none.add('ph')
  }

  const lines: TipLine[] = []
  // Flat defence is local only on armour: on a ring, it's a global mod.
  const isArmour = !!(base.ar ?? base.ev ?? base.es ?? base.wd)
  const defence = (key: 'ar' | 'ev' | 'es' | 'wd', label: string) => {
    if (!isArmour || none.has(key) || !(base[key] ?? flat[key])) return
    const total = scale(add(base[key] ?? [0, 0], flat[key] ?? [0, 0]), inc[key] ?? [0, 0])
    lines.push(pair(label, show(total)))
  }
  defence('ar', 'Armour')
  defence('ev', 'Evasion Rating')
  defence('es', 'Energy Shield')
  defence('wd', 'Ward')

  if (base.ph && !none.has('ph')) {
    const low = scale(add([base.ph[0], base.ph[0]], addedLow), inc.ph ?? [0, 0])
    const high = scale(add([base.ph[1], base.ph[1]], addedHigh), inc.ph ?? [0, 0])
    const wrap = (r: Range) => r[0].toFixed(0) === r[1].toFixed(0) ? show(r) : `(${show(r)})`
    lines.push(pair('Physical Damage', `${wrap(low)}-${wrap(high)}`))
  }
  if (base.cr) lines.push(pair('Critical Strike Chance', `${show(scale([base.cr / 100, base.cr / 100], inc.cr ?? [0, 0]), 2)}%`))
  if (base.at) lines.push(pair('Attacks per Second', show(scale([1000 / base.at, 1000 / base.at], inc.as ?? [0, 0]), 2)))
  return lines
}

const RE_ATTR_FLAT = new RegExp(`^\\+?${NUM} (Strength|Dexterity|Intelligence) Requirement$`)
const RE_ATTR_MORE = new RegExp(`^${NUM}% (increased|reduced) Attribute Requirements$`)

// What a unique really asks for: its mods can change its base's requirements.
export function attributeNeeds (base: TipBase | undefined, mods: string[]): string[] {
  const needs: Record<string, Range> = {}
  for (const [key, value] of [['Strength', base?.s], ['Dexterity', base?.d], ['Intelligence', base?.i]] as const) {
    if (value) needs[key] = [value, value]
  }
  let inc: Range = [0, 0]
  for (const mod of mods) {
    if (mod === 'Has no Attribute Requirements') return []
    const flat = RE_ATTR_FLAT.exec(mod)
    if (flat) needs[flat[2]] = add(needs[flat[2]] ?? [0, 0], parseRange(flat[1]))
    const more = RE_ATTR_MORE.exec(mod)
    if (more) {
      const r = parseRange(more[1])
      const sign = more[2] === 'reduced' ? -1 : 1
      inc = add(inc, [r[0] * sign, r[1] * sign])
    }
  }
  return (['Strength', 'Dexterity', 'Intelligence'] as const)
    .filter(key => needs[key])
    .map(key => `${show(scale(needs[key], inc))} ${key.slice(0, 3)}`)
}

function requirements (level: number | undefined, list: string[]): TipLine | null {
  if (!level && !list.length) return null
  const line: TipLine = [part('Requires ', 'label')]
  line.push(part([...(level ? [`Level ${level}`] : []), ...list].join(', '), 'value'))
  return line
}

const present = (sections: TipLine[][]) => sections.filter(s => s.length)

// ---- one builder per kind ----

// The data lists every mod a unique can roll, so a synthesised or random one has
// dozens that never appear together. No real item has this many of either kind.
const MOST_IMPLICITS = 4
const MOST_EXPLICITS = 12
// The data doesn't say which are fixed, so this is only the start of the list.
const EXPLICITS_SHOWN = 6

// Where a unique comes from, when that isn't a random drop.
const DROP_TEXT_MAX = 180
export function dropLines (drop: TipDrop | undefined): TipLine[] {
  if (!drop?.d && !drop?.r) return []
  const where = drop.t && drop.t.length > DROP_TEXT_MAX ? `${drop.t.slice(0, DROP_TEXT_MAX - 1).trimEnd()}…` : drop.t
  return [
    // The wiki's "drop disabled" covers uniques you still get from a vendor,
    // a card or a boss, so both read the same: just not at random.
    plain('Restricted drop: not a random drop on its base', 'corrupted'),
    ...(where ? [plain(where, 'dim')] : [])
  ]
}

export function uniqueTip (name: string, unique: TipUnique, base: TipBase | undefined, variant?: string, drop?: TipDrop): TipModel {
  const row = unique.v.find(r => r.n === variant) ?? unique.v[0]
  const allImplicits = row?.i ?? []
  const allExplicits = row?.e ?? []
  const implicits = allImplicits.length > MOST_IMPLICITS ? [] : allImplicits
  const explicits = allExplicits.length > MOST_EXPLICITS ? allExplicits.slice(0, EXPLICITS_SHOWN) : allExplicits
  const mutated = row?.m ?? []
  // Every explicit counts, since a fixed one can be past the cut. An implicit
  // pool doesn't: none of it is sure, and it would inflate the item's stats.
  const stats = base ? gearStats(base, [...implicits, ...allExplicits, ...mutated]) : []
  const need = requirements(row?.l ?? base?.l, attributeNeeds(base, [...implicits, ...allExplicits, ...mutated]))
  const moreExplicits = allExplicits.length - explicits.length
  return {
    name,
    base: unique.b || undefined,
    frame: 'unique',
    sections: present([
      stats,
      need ? [need] : [],
      implicits.length < allImplicits.length
        ? [plain(`${allImplicits.length} possible implicit mods`, 'dim')]
        : implicits.map(m => plain(unwrap(m), 'mod')),
      [
        ...mutated.map(m => plain(unwrap(m), 'mutated')),
        ...explicits.map(m => plain(unwrap(m), 'mod')),
        ...(moreExplicits ? [plain(`and ${moreExplicits} more mods`, 'dim')] : [])
      ],
      unique.f ? unique.f.split('\n').map(l => plain(l, 'flavour')) : [],
      dropLines(drop)
    ])
  }
}

// poe.ninja's gem variants: "1", "21/20", "20/20c", "21/23c".
export function parseGemVariant (variant?: string): { level: number, quality: number, corrupted: boolean } {
  const m = /^(\d+)(?:\/(\d+))?(c)?$/.exec(variant ?? '')
  return m
    ? { level: Number(m[1]), quality: Number(m[2] ?? 0), corrupted: !!m[3] }
    : { level: 1, quality: 0, corrupted: false }
}

function qualityLine (q: { t: string, v: number[] }, quality: number): string {
  // RePoE's values are per 1000 points of quality per 1%: 1000 is 1% a point.
  // The data script keeps only "#% increased" style lines, with one number.
  const value = (q.v[0] ?? 0) * quality / 1000
  const text = q.t.replace('#', String(Math.floor(Math.abs(value))))
  return value < 0 ? text.replace(' increased ', ' reduced ').replace(' more ', ' less ') : text
}

export function gemTip (name: string, gem: TipGem, variant?: string): TipModel {
  const { level: asked, quality, corrupted } = parseGemVariant(variant)
  const levels = Object.keys(gem.lv).map(Number).sort((a, b) => a - b)
  // Above what the data holds (a corrupted 23), show the highest it has.
  const level = levels.includes(asked) ? asked : levels.filter(l => l <= asked).pop() ?? levels[0]
  const row = gem.lv[level] ?? {}
  const figures: TipLine[] = [pair('Level', String(asked))]
  if (gem.cm) figures.push(pair('Cost & Reservation Multiplier', `${gem.cm}%`))
  if (row.c) figures.push(pair('Cost', row.c))
  if (gem.ct && !gem.t.includes('Attack')) figures.push(pair('Cast Time', `${(gem.ct / 1000).toFixed(2)} sec`))
  if (quality) figures.push(pair('Quality', `+${quality}%`))
  const need = requirements(row.r, attributeNeeds({ s: row.a?.s, d: row.a?.d, i: row.a?.i }, []))
  const stats = [...(gem.st ?? []), ...(row.x ?? [])]
  const fromQuality = quality ? (gem.q ?? []).map(q => qualityLine(q, quality)) : []
  return {
    name,
    frame: `gem-${['r', 'g', 'b', 'w'].includes(gem.c) ? gem.c : 'w'}` as TipFrame,
    sections: present([
      gem.t.length ? [plain(gem.t.join(', '), 'text')] : [],
      figures,
      need ? [need] : [],
      gem.d ? [plain(gem.d, 'gem')] : [],
      [...stats, ...fromQuality].map(l => plain(l, 'mod')),
      corrupted ? [plain('Corrupted', 'corrupted')] : []
    ])
  }
}

export function itemTip (name: string, item: TipItem, kind: TipKind): TipModel {
  return {
    name,
    frame: kind === 'card' ? 'card' : 'currency',
    sections: present([
      item.n ? [pair('Stack Size', String(item.n))] : [],
      item.d ? parseMarkup(item.d) : [],
      item.u ? item.u.split('\n').map(l => plain(l, 'dim')) : []
    ])
  }
}

export function baseTip (name: string, base: TipBase): TipModel {
  const need = requirements(base.l, attributeNeeds(base, []))
  return { name, frame: 'normal', sections: present([gearStats(base, []), need ? [need] : []]) }
}

// What a kind of item needs from the pack.
export function packFiles (kind: TipKind): Array<keyof TipPack> {
  if (kind === 'unique') return ['uniques', 'bases', 'drops']
  if (kind === 'gem') return ['gems']
  return ['items', 'bases']
}

// base: shown when the data has no text for a unique. atBase: the base this
// unique is being looked at on, for those that come on several.
export function buildTip (pack: TipPack, ref: { name: string, kind: TipKind, variant?: string, base?: string, atBase?: string }): TipModel | null {
  const { name, kind, variant } = ref
  if (kind === 'unique') {
    const unique = pack.uniques?.[name]
    // Known by name but with no text: its base at least.
    const drop = pack.drops?.[name]
    if (!unique) return ref.base ? { name, base: ref.base, frame: 'unique', sections: present([dropLines(drop)]) } : null
    const on = ref.atBase ?? unique.b
    return uniqueTip(name, { ...unique, b: on }, pack.bases?.[on], variant, drop)
  }
  if (kind === 'gem') {
    const gem = pack.gems?.[name]
    return gem ? gemTip(name, gem, variant) : null
  }
  const item = pack.items?.[name]
  if (item) return itemTip(name, item, kind)
  const base = pack.bases?.[name]
  return base ? baseTip(name, base) : null
}
