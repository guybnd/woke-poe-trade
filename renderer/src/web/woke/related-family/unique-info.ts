// What the price check's side list shows about a checked unique beyond its
// relatives (Guy, 2026-11-26): its Foulborn kinds (the mod each adds and the
// one it gives up, each priced, against a plain copy's price), the Vestigial
// mod it leaves, and, for an item carrying a Vestigial implicit, the unique
// that mod comes from. Pure: RelatedItems.vue passes the tooltip data and
// prices. Loaded with the first unique checked, not at startup.
import { modShape, plainLine, uniqueDetails } from '../search/unique-details'
import type { TipUnique } from '../ui/tooltip/tip-content'

export interface FoulKindRow {
  // poe.ninja's variant name for the kind ("Aura Effect"), when it has one.
  name?: string
  adds: string[]
  replaces: string[]
  chaos: number | null
  // Its price over a plain copy's: 1.7 reads "×1.7".
  ratio: number | null
  // The checked item is this kind.
  own: boolean
}

export interface UniqueInfo {
  foulborn: FoulKindRow[]
  vestigial: string[][]
  // A Vestigial implicit on the checked item: the uniques that leave it.
  vestigialFrom: string[]
}

export interface UniqueInfoInput {
  // The unique's English name, without "Foulborn ".
  name: string
  foulborn: boolean
  // The item's game text (an advanced copy names its mod sections).
  rawText: string
  uniques: Record<string, TipUnique> | null | undefined
  vestigial: Record<string, string[][]> | null | undefined
  // poe.ninja's Foulborn rows of this unique: variant and chaos price.
  foulPrices: Array<{ variant?: string, chaos: number }>
  // A plain copy's price in chaos.
  plain: number | null
}

// More uniques than this leave the same Vestigial mod shape: too vague to name.
const MOST_SOURCES = 4

export function uniqueInfo (input: UniqueInfoInput): UniqueInfo | null {
  const details = uniqueDetails(input.name, input.uniques, input.vestigial)
  const itemShapes = new Set(input.rawText.split(/\r?\n/).map(l => modShape(itemLine(l))))
  const priced = input.foulPrices
  const foulborn = (details?.foulborn ?? []).map((k): FoulKindRow => {
    // A kind is priced by its own row, or by the only row when it's the only kind.
    const row = priced.find(p => k.name != null && p.variant === k.name) ??
      (details!.foulborn.length === 1 && priced.length === 1 ? priced[0] : undefined)
    const chaos = row?.chaos ?? null
    const lines = k.adds.flatMap(a => plainLine(a).split('\n'))
    return {
      name: k.name,
      adds: k.adds.map(plainLine),
      replaces: k.replaces.map(plainLine),
      chaos,
      ratio: chaos != null && input.plain != null && input.plain > 0 ? chaos / input.plain : null,
      own: input.foulborn && lines.length > 0 && lines.every(l => itemShapes.has(modShape(l)))
    }
  })
  // A Foulborn copy matches one kind at most: two that both match (one's
  // mods a part of the other's) mark the one with more mods.
  const owns = foulborn.filter(k => k.own)
  if (owns.length > 1) {
    const most = Math.max(...owns.map(k => k.adds.length))
    let kept = false
    for (const k of owns) {
      if (k.adds.length === most && !kept) kept = true
      else k.own = false
    }
  }
  const vestigialFrom = vestigialSources(vestigialLines(input.rawText), input.vestigial, input.name)
  const vestigial = details?.vestigial ?? []
  if (!foulborn.length && !vestigial.length && !vestigialFrom.length) return null
  return { foulborn, vestigial, vestigialFrom }
}

// A mod line of the game's advanced copy as the data writes it: the rolled
// value in front of its range ("22(15-30)%") and the trailing notes go.
export function itemLine (line: string): string {
  return line.trim()
    .replace(/ \((?:implicit|crafted|fractured|enchant)\)$/, '')
    .replace(/ — Unscalable Value$/, '')
    .replace(/[+-]?\d+(?:\.\d+)?(?=\(-?[\d.]+-[\d.]+\))/g, '')
}

// The lines under the item's "{ Vestigial Implicit Modifier }" headers,
// without the keyword reminders the copy prints under a mod "(Withered ...)".
export function vestigialLines (rawText: string): string[] {
  const out: string[] = []
  let inside = false
  for (const line of rawText.split(/\r?\n/)) {
    if (line.startsWith('{')) { inside = line.includes('Vestigial Implicit Modifier'); continue }
    if (line.startsWith('--------')) { inside = false; continue }
    const text = itemLine(line)
    if (inside && text && !/^\(.*\)$/.test(text)) out.push(text)
  }
  return out
}

// The uniques whose Vestigial mod reads as these lines, numbers aside (the
// item rolled a value; the data lists one).
export function vestigialSources (lines: string[], vestigial: Record<string, string[][]> | null | undefined, self: string): string[] {
  if (!lines.length || !vestigial) return []
  const want = lines.map(modShape).sort().join('\u0000')
  const out = Object.keys(vestigial).filter(name =>
    name !== self && vestigial[name].some(mod => mod.flatMap(l => l.split('\n')).map(modShape).sort().join('\u0000') === want))
  return out.length <= MOST_SOURCES ? out : []
}

// The trade site's search for one Foulborn kind: Foulborn copies of the
// unique with the kind's mods. A mod is looked up whole, then line by line
// (one on two lines in the data may be one stat or two); one the stat data
// can't read is left out, so the search is never narrower than the kind.
export function foulKindQuery (
  base: { name: string, type?: string },
  adds: string[],
  statId: (text: string) => string | null
): object {
  const ids = [...new Set(adds.flatMap(a => {
    const whole = statId(a)
    return whole != null ? [whole] : a.split('\n').map(statId)
  }).filter((id): id is string => id != null))]
  return {
    ...base,
    stats: ids.length ? [{ type: 'and', filters: ids.map(id => ({ id })) }] : undefined,
    filters: { misc_filters: { filters: { foulborn_item: { option: 'true' } } } }
  }
}

// "+(15-30)% to Chaos Resistance" as the stat data's matchers read it:
// "#% to Chaos Resistance" (the parser takes the sign with the number), and
// the signed form, which a few matchers keep ("+# to Level of ...").
export function statMatchTexts (line: string): string[] {
  const plain = plainLine(line)
  const unsigned = plain.replace(/[+-]?\(-?[\d.]+-[\d.]+\)/g, '#').replace(/[+-]?\d+(?:\.\d+)?/g, '#')
  const signed = plain.replace(/\(-?[\d.]+-[\d.]+\)/g, '#').replace(/\d+(?:\.\d+)?/g, '#')
  return unsigned === signed ? [unsigned] : [unsigned, signed]
}
