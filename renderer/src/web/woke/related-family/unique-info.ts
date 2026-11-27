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
  // Whether a unique is of the checked item's slot (see vestigialSources).
  sameSlot?: (name: string) => boolean
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
  const vestigialFrom = vestigialSources(vestigialLines(input.rawText), input.vestigial, input.name, input.sameSlot)
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

// The uniques whose Vestigial mod reads as these lines. Each Vestigial mod has
// one fixed value, so the same text with its numbers names the source even
// when many uniques leave that kind of mod ("+40% to Item Rarity" is
// Aurseize's; four others leave other amounts). Only when no unique leaves
// those exact numbers (data a patch behind) is it matched with numbers aside,
// and then too many matches name none. A Vestigial mod comes from a unique of
// the item's own slot: sameSlot, when given, keeps only those (it answers
// true for a unique whose slot it doesn't know).
export function vestigialSources (
  lines: string[],
  vestigial: Record<string, string[][]> | null | undefined,
  self: string,
  sameSlot?: (name: string) => boolean
): string[] {
  if (!lines.length || !vestigial) return []
  const names = Object.keys(vestigial).filter(name => name !== self && (!sameSlot || sameSlot(name)))
  const key = (ls: string[], f: (l: string) => string) => ls.map(l => f(gemWording(l))).sort().join('\u0000')
  const match = (f: (l: string) => string) => {
    const want = key(lines, f)
    return names.filter(name => vestigial[name].some(mod => key(mod.flatMap(l => l.split('\n')), f) === want))
  }
  const exact = match(l => l.trim().toLowerCase())
  if (exact.length) return exact.length <= MOST_SOURCES ? exact : []
  const out = match(modShape)
  return out.length <= MOST_SOURCES ? out : []
}

// Path of Building and the game word skill mods apart: "Supported by Level 30
// Rage Support" / "...Level 30 Rage", "Grants Level 20 Ravenous" / "...Ravenous
// Skill", "Grants Summon Harbinger of Focus" / "Grants Level 20 Summon ...".
// Both sides drop the words that differ before comparing.
function gemWording (line: string): string {
  let l = plainLine(line).trim()
  if (/Supported by /i.test(l)) l = l.replace(/ Support$/i, '')
  if (/^Grants /i.test(l)) l = l.replace(/^Grants Level [+-]?\d+ /i, 'Grants ').replace(/ Skill$/i, '')
  return l
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

// ---- versions (Guy's pick 4) ----

export interface VersionRow {
  // poe.ninja's variant, as the price check's own row names it.
  variant: string
  // What the side list calls it: the variant without the unique's one base.
  label: string
  // The data's variant name ("Fire"), for the tooltip and the mods it loads.
  tipVariant?: string
  // Lines only this version has.
  lines: string[]
  chaos: number
  own: boolean
}

// A unique's poe.ninja rows as versions: one per variant, linked ones left
// out (a 6L price is the links', not the version's). Shown when there are two
// or more. `ownVariant` is the checked item's poe.ninja variant.
export function uniqueVersions (
  name: string,
  rows: Array<{ variant?: string, chaos: number }>,
  ownVariant: string | undefined,
  uniques: Record<string, TipUnique> | null | undefined,
  oneBase: string | undefined
): VersionRow[] {
  const details = uniqueDetails(name, uniques, null)
  const unlinked = (v: string) => v.split(', ').filter(p => !/^\dL$/.test(p))
  const ownKey = ownVariant != null ? unlinked(ownVariant).join(', ') : undefined
  const seen = new Set<string>()
  const out: VersionRow[] = []
  for (const r of rows) {
    if (!r.variant || /(^|, )\dL$/.test(r.variant)) continue
    if (seen.has(r.variant)) continue
    seen.add(r.variant)
    const parts = r.variant.split(', ')
    const label = parts.filter(p => p !== oneBase).join(', ')
    if (!label) continue
    const tip = details?.variants.find(v => v.name != null && parts.includes(v.name))
    out.push({
      variant: r.variant,
      label,
      tipVariant: tip?.name,
      lines: (tip?.differs ?? []).map(plainLine),
      chaos: r.chaos,
      own: ownKey === r.variant
    })
  }
  out.sort((a, b) => b.chaos - a.chaos)
  return out.length >= 2 ? out : []
}

// ---- chance (Guy's pick 3) ----

export interface ChanceInfo {
  // An Orb of Chance on a normal base can make it.
  can: boolean
  base: string
  // Why not, when it can't: the wiki's short source ("Uber Eater") and sentence.
  label?: string
  why?: string
}

export function chanceInfo (name: string, base: string | undefined, drop: { d?: 1, r?: 1, t?: string, s?: string } | undefined): ChanceInfo | null {
  if (!base) return null
  // A Heist replica is stolen, never dropped.
  if (name.startsWith('Replica ')) return { can: false, base, label: 'Heist', why: 'Replicas come from Heist, not from drops.' }
  if (!drop?.d && !drop?.r) return { can: true, base }
  return {
    can: false,
    base,
    label: drop.s ?? (drop.d ? 'No drop' : 'Restricted'),
    why: drop.t ?? (drop.d ? 'The game never drops it.' : 'The PoE wiki doesn\'t say where it comes from.')
  }
}
