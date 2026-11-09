// What a trade listing's tooltip adds to the plain item: weapon lines, each mod's
// tier and roll, and the numbers the trade filters search on. The trade site
// sends all of it with the listing. Pure functions.
import { ModifierType } from '@/parser/modifiers'
import { incrRoll } from '@/parser/advanced-mod-desc'
import { linesToStatStrings, tryParseTranslation } from '@/parser/stat-translations'
import { modDomain, modText, stripLinks, ListingItem, ListingMod } from './listing-tip'

export type PartTone = 'label' | 'value' | 'aug' | 'fire' | 'cold' | 'lightning' | 'chaos'

export interface PropPart {
  text: string
  tone: PartTone
}

export interface ModPart {
  text: string
  // A number on the line, drawn brighter than its words.
  number?: boolean
  // The mod's possible range for the number before it.
  range?: boolean
}

export interface ModLine {
  parts: ModPart[]
  tags: string[]
  kind: '' | 'crafted' | 'fractured'
  // Where the roll sits in its range, 0 to 100. Null when the line can't roll.
  quality: number | null
}

export interface ModGroup {
  heading: string
  lines: ModLine[]
}

export interface FootStat {
  label: string
  value: string
}

export interface ListingDetail {
  props: PropPart[][]
  requires: PropPart[]
  implicits: ModLine[]
  groups: ModGroup[]
  tail: Array<{ text: string, kind: 'fractured' | 'dim' }>
  foot: FootStat[]
  footNote: string
}

const VALUE_TONES: Record<number, PartTone> = { 1: 'aug', 4: 'fire', 5: 'cold', 6: 'lightning', 7: 'chaos' }
const QUALITY_TYPE = 6
const VALUE_FIRST_MODE = 1
const TEMPLATE_MODE = 3

function valueTone (id: number): PartTone {
  return VALUE_TONES[id] ?? 'value'
}

function propLine (prop: NonNullable<ListingItem['properties']>[number]): PropPart[] {
  const name = stripLinks(prop.name ?? '')
  if (!prop.values.length) return [{ text: name, tone: 'label' }]
  if (prop.displayMode === TEMPLATE_MODE) {
    return name.split(/(\{\d+\}|%\d+)/).filter(Boolean).map((piece) => {
      const at = /^(?:\{(\d+)\}|%(\d+))$/.exec(piece)
      const value = at ? prop.values[Number(at[1] ?? at[2])] : undefined
      return value ? { text: value[0], tone: valueTone(value[1]) } : { text: piece, tone: 'label' as const }
    })
  }
  const parts: PropPart[] = [{ text: `${name}: `, tone: 'label' }]
  prop.values.forEach(([text, id], i) => {
    if (i) parts.push({ text: ', ', tone: 'label' })
    parts.push({ text, tone: valueTone(id) })
  })
  return parts
}

function requiresLine (item: ListingItem): PropPart[] {
  const parts: PropPart[] = []
  for (const req of item.requirements ?? []) {
    const value = req.values[0]
    if (!value) continue
    if (parts.length) parts.push({ text: ', ', tone: 'label' })
    if (req.displayMode === VALUE_FIRST_MODE) {
      parts.push({ text: value[0], tone: valueTone(value[1]) }, { text: ` ${stripLinks(req.name ?? '')}`, tone: 'label' })
    } else {
      parts.push({ text: `${stripLinks(req.name ?? '')} `, tone: 'label' }, { text: value[0], tone: valueTone(value[1]) })
    }
  }
  return parts.length ? [{ text: 'Requires ', tone: 'label' }, ...parts] : []
}

interface Span {
  low: number
  high: number
  // Below zero to above it: the range keeps its signs and the number is read with its own.
  signed?: boolean
}

function tidy (n: number): number {
  return Number(n.toFixed(2))
}

// A catalyst's quality on a ring, amulet or belt raises the mods it matches, so
// "+51(30-50) to Dexterity" at 20% is a 42.5 roll, not a perfect one. The trade
// site sends no mod tags, so each catalyst's tag is matched on the line's words.
// Ranges stay as the game shows them; only the roll is read against the raised range.
export interface Catalyst {
  kind: string
  percent: number
}

const CATALYST_LINES: Record<string, (text: string) => boolean> = {
  'Attribute': t => /\b(?:Strength|Dexterity|Intelligence|Attributes)\b/.test(t) && !/Requirements?\b/.test(t),
  'Resistance': t => /\bResistances?\b/.test(t) && !/Penetrat|^Minions\b/.test(t),
  'Life and Mana': t => /\b(?:Life|Mana)\b/.test(t) && !/\bwhile Leeching\b/.test(t),
  'Defence': t => /\b(?:Armour|Evasion|Energy Shield)\b/.test(t),
  'Elemental Damage': t => /\b(?:Fire|Cold|Lightning|Elemental) Damage\b/.test(t),
  'Physical and Chaos Damage': t => /\b(?:Physical|Chaos) Damage\b/.test(t) && !/\btaken\b/.test(t),
  'Attack': t => /\b(?:Attacks?|Accuracy)\b/.test(t) && !/\bBlock\b/.test(t),
  'Caster': t => /\b(?:Spells?|Cast Speed)\b/.test(t) && !/\b(?:Block|Suppress)\b/.test(t),
  'Speed': t => /\b(?:Attack|Cast|Movement) Speed\b/.test(t),
  'Critical': t => /\bCritical Strike\b/.test(t)
}

export function catalystOf (item: ListingItem): Catalyst | null {
  const prop = item.properties?.find(p => p.type === QUALITY_TYPE)
  const kind = /^Quality \((.+) Modifiers\)$/.exec(prop?.name ?? '')?.[1]
  const percent = Number(prop?.values[0]?.[0]?.replace(/[^\d.]/g, ''))
  return kind && percent > 0 ? { kind, percent } : null
}

/** How much the catalyst raises each mod on this line, in percent. Prefix and suffix quality go by the mods' tiers. */
function catalystBoost (catalyst: Catalyst | null, text: string, implicit: boolean): (m: ModOf) => number {
  if (!catalyst) return () => 0
  if (catalyst.kind === 'Prefix' || catalyst.kind === 'Suffix') {
    const letter = catalyst.kind[0]
    return m => !implicit && m.tier?.startsWith(letter) ? catalyst.percent : 0
  }
  const raised = CATALYST_LINES[catalyst.kind]?.(text) ?? false
  return () => raised ? catalyst.percent : 0
}

/** A magnitude as the game raises it: truncated, to whole numbers unless it has decimals. */
function raise (n: number, percent: number): number {
  if (!percent) return n
  const dp = Number.isInteger(n) ? 0 : 2
  return Math.sign(n) * incrRoll(Math.abs(n), percent, dp)
}

type ModOf = NonNullable<Exclude<ListingMod, string>['mods']>[number]

/** One span per number the line rolls. Two mods on one line add together. Null if it can't be read. */
function lineSpans (mod: Exclude<ListingMod, string>, boost: (m: ModOf) => number = () => 0): Span[] | null {
  const mods = mod.mods ?? []
  const count = Math.max(0, ...mods.map(m => m.magnitudes?.length ?? 0))
  const spans: Span[] = []
  for (let i = 0; i < count; i++) {
    // A roll that can land on either side of zero, like "(-10-10) to maximum
    // number of Eaten Souls". Only ever seen on a single mod.
    const only = mods.length === 1 ? mods[0].magnitudes?.[i] : undefined
    const [lo, hi] = [Number(only?.min), Number(only?.max)].map(n => raise(n, boost(mods[0])))
    if (only && lo < 0 && hi > 0) {
      spans.push({ low: tidy(lo), high: tidy(hi), signed: true })
      continue
    }
    let low = 0
    let high = 0
    for (const m of mods) {
      // Each mod is raised on its own before they add up, as the game does.
      const a = raise(Number(m.magnitudes?.[i]?.min ?? 0), boost(m))
      const b = raise(Number(m.magnitudes?.[i]?.max ?? 0), boost(m))
      if (!Number.isFinite(a) || !Number.isFinite(b) || a * b < 0) return null
      // A "reduced" stat is sent negative but shown as a positive number.
      low += Math.min(Math.abs(a), Math.abs(b))
      high += Math.max(Math.abs(a), Math.abs(b))
    }
    spans.push({ low: tidy(low), high: tidy(high) })
  }
  return spans
}

// A roll can pass its range, as with "increased Explicit Modifier magnitudes".
// A number far from its range means the trade site's values are in other units.
const MAX_BOOST = 2

function fits (value: number, span: Span): boolean {
  if (span.signed) return value >= span.low - 0.05 && value <= span.high * MAX_BOOST + 0.05
  return value >= span.low * 0.99 - 0.05 && value <= span.high * MAX_BOOST + 0.05
}

/** For each span, the index of its number in the text, or null if they don't line up. */
function alignSpans (numbers: number[], signedNumbers: number[], spans: Span[]): number[] | null {
  if (numbers.length === spans.length) {
    return spans.every((s, i) => fits(s.signed ? signedNumbers[i] : numbers[i], s)) ? spans.map((_, i) => i) : null
  }
  // A roll past zero has no safe match among other numbers on the line.
  if (spans.some(s => s.signed)) return null
  const out: number[] = []
  let from = 0
  for (const span of spans) {
    let at = from
    const inRange = (n: number) => n >= span.low * 0.99 - 0.05 && n <= span.high + 0.05
    while (at < numbers.length && !inRange(numbers[at])) at++
    if (at >= numbers.length) return null
    // Two candidates: a fixed number could look like the roll, so show no roll.
    if (spans.length === 1 && numbers.slice(at + 1).some(inRange)) return null
    out.push(at)
    from = at + 1
  }
  return out
}

const NUMBER = /\d+(?:\.\d+)?/g

/** Rounded down: 100 means a perfect roll and nothing less. */
function percent (place: number): number {
  return Math.floor(place * 100 + 1e-9)
}

/** The text with each number as its own part. */
function textParts (text: string): ModPart[] {
  const parts: ModPart[] = []
  let last = 0
  for (const match of text.matchAll(NUMBER)) {
    parts.push({ text: text.slice(last, match.index) }, { text: match[0], number: true })
    last = match.index + match[0].length
  }
  parts.push({ text: text.slice(last) })
  return parts.filter(p => p.text)
}

/** The number as the stat has it: "-5" and "5% reduced" are both below zero. */
function signedValue (text: string, match: RegExpMatchArray): number {
  const value = Number(match[0])
  const before = text[(match.index ?? 0) - 1]
  return before === '-' || /\b(?:reduced|less)\b/.test(text) ? -value : value
}

/** Whether a bigger number on this line is the worse roll, as with "-20% to all Resistances". */
function biggerIsWorse (mod: Exclude<ListingMod, string>, text: string, spans: Span[]): boolean {
  const line = linesToStatStrings(text.split('\n')).next()
  const better = line.done ? undefined : tryParseTranslation(line.value, ModifierType.Explicit, undefined)?.stat.better
  // Numbers past zero are placed by their real sign, so only the stat's direction counts.
  if (spans.some(s => s.signed)) return better === -1
  const negative = (mod.mods ?? []).some(m => Number(m.magnitudes?.[0]?.min) < 0 || Number(m.magnitudes?.[0]?.max) < 0)
  if (better === 1) return negative
  if (better === -1) return !negative
  // Not in the game data, or neither way is better: only a written minus says.
  return negative && text.startsWith('-')
}

function buildLine (mod: ListingMod, kind: ModLine['kind'], catalyst: Catalyst | null = null, implicit = false): ModLine {
  const text = modText(mod)
  const plain: ModLine = { parts: textParts(text), tags: [], kind, quality: null }
  if (typeof mod === 'string') return plain
  plain.tags = (mod.mods ?? []).map(m => m.tier ?? '').filter(Boolean)

  const shown = lineSpans(mod)
  if (!shown?.length) return plain
  const found = Array.from(text.matchAll(NUMBER))
  const numbers = found.map(m => Number(m[0]))
  const signed = found.map(m => signedValue(text, m))
  // What the roll is read against: the shown range, raised by a matching catalyst.
  // A raised range the numbers don't fit means the line guess was wrong: read it unraised.
  let spans = catalyst ? lineSpans(mod, catalystBoost(catalyst, text, implicit)) ?? shown : shown
  let aligned = alignSpans(numbers, signed, spans)
  if (!aligned && spans !== shown) {
    spans = shown
    aligned = alignSpans(numbers, signed, spans)
  }
  if (!aligned) return plain

  const worse = biggerIsWorse(mod, text, spans)
  const parts: ModPart[] = []
  const rolls: number[] = []
  let last = 0
  aligned.forEach((at, i) => {
    const span = spans[i]
    const range = shown[i]
    if (range.low === range.high) return
    const match = found[at]
    const end = match.index + match[0].length
    parts.push(...textParts(text.slice(last, end)), { text: range.signed ? `(${range.low} to ${range.high})` : `(${range.low}-${range.high})`, range: true })
    last = end
    const value = span.signed ? signedValue(text, match) : Number(match[0])
    const place = span.high === span.low ? 1 : Math.min(1, Math.max(0, (value - span.low) / (span.high - span.low)))
    rolls.push(worse ? 1 - place : place)
  })
  if (!rolls.length) return plain
  parts.push(...textParts(text.slice(last)))
  return { ...plain, parts, quality: percent(rolls.reduce((a, b) => a + b, 0) / rolls.length) }
}

function modKind (mod: ListingMod, fallback: ModLine['kind']): ModLine['kind'] {
  const domain = modDomain(mod)
  return domain === 'fractured' || domain === 'crafted' ? domain : fallback
}

type Affix = 'Prefix' | 'Suffix' | 'Crafted' | ''

function affixOf (tier: string | undefined, kind: ModLine['kind']): Affix {
  if (kind === 'crafted') return 'Crafted'
  if (tier?.startsWith('P')) return 'Prefix'
  if (tier?.startsWith('S')) return 'Suffix'
  return ''
}

function headingOf (mod: ListingMod, kind: ModLine['kind']): string {
  if (typeof mod === 'string') return ''
  let last: Affix = ''
  const pieces: string[] = []
  for (const m of mod.mods ?? []) {
    if (!m.name) continue
    const affix = affixOf(m.tier, kind)
    pieces.push(affix && affix !== last ? `${affix} "${m.name}"` : `"${m.name}"`)
    last = affix
  }
  return pieces.join(' + ')
}

const AFFIX_ORDER: Record<Affix, number> = { 'Prefix': 0, 'Suffix': 1, 'Crafted': 2, '': 3 }

function buildGroups (item: ListingItem, catalyst: Catalyst | null): ModGroup[] {
  const listed = (item.explicitMods ?? []).filter(m => !['enchant', 'implicit'].includes(modDomain(m)))
  const entries: Array<{ mod: ListingMod, kind: ModLine['kind'] }> = [
    ...(item.fracturedMods ?? []).map(mod => ({ mod, kind: 'fractured' as const })),
    ...(item.utilityMods ?? []).map(mod => ({ mod, kind: '' as const })),
    ...listed.map(mod => ({ mod, kind: modKind(mod, '') })),
    ...(item.craftedMods ?? []).map(mod => ({ mod, kind: 'crafted' as const }))
  ].filter(e => modText(e.mod))

  const groups: Array<ModGroup & { order: number }> = []
  for (const { mod, kind } of entries) {
    const heading = headingOf(mod, kind)
    const line = buildLine(mod, kind, catalyst)
    const firstTier = typeof mod === 'string' ? undefined : mod.mods?.[0]?.tier
    const known = groups.find(g => g.heading === heading)
    if (known) known.lines.push(line)
    else groups.push({ heading, lines: [line], order: heading ? AFFIX_ORDER[affixOf(firstTier, kind)] : AFFIX_ORDER[''] })
  }
  // Stable, so a unique's mods stay in the game's order.
  return groups
    .map((g, i) => ({ g, i }))
    .sort((a, b) => a.g.order - b.g.order || a.i - b.i)
    .map(({ g }) => ({ heading: g.heading, lines: g.lines }))
}

function whole (n: number): string {
  return String(Math.round(n))
}

function footStats (item: ListingItem): FootStat[] {
  const x = item.extended
  if (!x) return []
  const out: FootStat[] = []
  const add = (label: string, n: number | undefined) => { if (n) out.push({ label, value: whole(n) }) }
  add('pDPS', x.pdps)
  add('eDPS', x.edps)
  add('DPS', x.dps)
  add('Armour', x.ar)
  add('Evasion', x.ev)
  add('Energy Shield', x.es)
  add('Ward', x.ward)
  if (out.length && x.base_defence_percentile != null) out.push({ label: 'Base', value: `${x.base_defence_percentile}%` })
  return out
}

function qualityOf (item: ListingItem): number {
  const raw = item.properties?.find(p => p.type === QUALITY_TYPE)?.values[0]?.[0]
  return raw ? Number(raw.replace(/[^\d.]/g, '')) || 0 : 0
}

export function listingDetail (item: ListingItem): ListingDetail {
  const listed = item.explicitMods ?? []
  const ofDomain = (domain: string) => listed.filter(m => modDomain(m) === domain)
  const implicitMods = [
    ...(item.enchantMods ?? []), ...ofDomain('enchant'),
    ...(item.implicitMods ?? []), ...ofDomain('implicit')
  ]
  const tail: ListingDetail['tail'] = []
  if (item.fractured) tail.push({ text: 'Fractured Item', kind: 'fractured' })
  if (item.synthesised) tail.push({ text: 'Synthesised Item', kind: 'dim' })
  const foot = footStats(item)
  const catalyst = catalystOf(item)
  return {
    props: (item.properties ?? []).map(propLine),
    requires: requiresLine(item),
    implicits: implicitMods.filter(modText).map(m => buildLine(m, '', catalyst, true)),
    groups: buildGroups(item, catalyst),
    tail,
    foot,
    // These numbers assume 20% quality, what the trade filters search on.
    footNote: foot.length && qualityOf(item) < 20 ? 'at 20% quality' : ''
  }
}
