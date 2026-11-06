// Would this item beat the one your build wears there? Reads numbers off the
// two items and your saved resistances; it isn't a full recalculation.
import { ItemCategory } from '@/parser'
import type { ParsedItem } from '@/parser'
import type { PobStats } from './widget'

const SLOTS: Partial<Record<ItemCategory, string[]>> = {
  [ItemCategory.Helmet]: ['Helmet'],
  [ItemCategory.BodyArmour]: ['Body Armour'],
  [ItemCategory.Gloves]: ['Gloves'],
  [ItemCategory.Boots]: ['Boots'],
  [ItemCategory.Belt]: ['Belt'],
  [ItemCategory.Amulet]: ['Amulet'],
  [ItemCategory.Ring]: ['Ring 1', 'Ring 2', 'Ring 3'],
  [ItemCategory.Shield]: ['Weapon 2'],
  [ItemCategory.Quiver]: ['Weapon 2']
}

const WEAPONS = new Set<ItemCategory>([
  ItemCategory.Claw, ItemCategory.Bow, ItemCategory.Sceptre, ItemCategory.Wand, ItemCategory.Staff, ItemCategory.Warstaff,
  ItemCategory.Dagger, ItemCategory.RuneDagger, ItemCategory.OneHandedAxe, ItemCategory.TwoHandedAxe,
  ItemCategory.OneHandedMace, ItemCategory.TwoHandedMace, ItemCategory.OneHandedSword, ItemCategory.TwoHandedSword
])

// The build's slots an item of this category could go in.
export function slotsFor (category: ItemCategory | undefined): string[] {
  if (!category) return []
  if (WEAPONS.has(category)) return ['Weapon 1']
  return SLOTS[category] ?? []
}

type Element = 'Fire' | 'Cold' | 'Lightning' | 'Chaos'
const ELEMENTS: Element[] = ['Fire', 'Cold', 'Lightning', 'Chaos']

// A stat's ref and which resistances it counts for.
function resistancesOf (ref: string): Element[] {
  const m = /^\+#% to (.+?) Resistances?$/.exec(ref)
  if (!m) return []
  if (m[1] === 'all Elemental') return ['Fire', 'Cold', 'Lightning']
  return m[1].split(' and ').filter((e): e is Element => (ELEMENTS as string[]).includes(e))
}

function statTotals (item: ParsedItem): Map<string, number> {
  const out = new Map<string, number>()
  for (const calc of item.statsByType) {
    const value = calc.sources.reduce((sum, s) => sum + (s.contributes?.value ?? s.stat.roll?.value ?? 0), 0)
    out.set(calc.stat.ref, (out.get(calc.stat.ref) ?? 0) + value)
  }
  return out
}

function resistances (totals: Map<string, number>): Record<Element, number> {
  const out: Record<Element, number> = { Fire: 0, Cold: 0, Lightning: 0, Chaos: 0 }
  for (const [ref, value] of totals) {
    for (const e of resistancesOf(ref)) out[e] += value
  }
  return out
}

export interface SwapRow {
  label: string
  yours: string
  theirs: string
  delta: string
  tone: 'up' | 'down' | 'dim'
  note?: string
}

export interface SwapResult {
  verdict: 'better' | 'worse' | 'mixed' | 'same'
  summary: string
  rows: SwapRow[]
}

const LIFE = '+# to maximum Life'
const FLAT_ES = '+# to maximum Energy Shield'
const SPEED = '#% increased Movement Speed'

// Ones that decide the verdict, in the order shown.
const KEY_STATS: Array<{ label: string, read: (item: ParsedItem, totals: Map<string, number>) => number, unit?: string }> = [
  { label: 'Movement speed', read: (_, t) => t.get(SPEED) ?? 0, unit: '%' },
  { label: 'Life', read: (_, t) => t.get(LIFE) ?? 0 },
  // On jewellery it's only in the mods; on armour they're in its number already.
  { label: 'Energy shield', read: (i, t) => i.armourES ?? t.get(FLAT_ES) ?? 0 },
  { label: 'Armour', read: i => i.armourAR ?? 0 },
  { label: 'Evasion', read: i => i.armourEV ?? 0 }
]

function signed (n: number): string {
  return n > 0 ? `+${n}` : String(n)
}

function shown (n: number, unit = ''): string {
  return n ? `${n}${unit}` : 'none'
}

// `stats`: what PoB saved, when it describes the gear being compared.
export function swapCheck (yours: ParsedItem, theirs: ParsedItem, stats: PobStats | null): SwapResult {
  const yourStats = statTotals(yours)
  const theirStats = statTotals(theirs)
  const rows: SwapRow[] = []
  let gains = 0
  let losses = 0

  // A build on Chaos Inoculation has 1 life, so life means nothing to it.
  const noLife = stats?.Life != null && stats.Life <= 1
  for (const s of KEY_STATS) {
    if (noLife && s.label === 'Life') continue
    const a = s.read(yours, yourStats)
    const b = s.read(theirs, theirStats)
    if (a === b) continue
    if (b > a) gains++
    else losses++
    rows.push({ label: s.label, yours: shown(a, s.unit), theirs: shown(b, s.unit), delta: signed(b - a) + (s.unit ?? ''), tone: b > a ? 'up' : 'down' })
  }

  const yourRes = resistances(yourStats)
  const theirRes = resistances(theirStats)
  const broken: string[] = []
  let wasted = false
  for (const e of ELEMENTS) {
    const delta = theirRes[e] - yourRes[e]
    if (!delta) continue
    const row: SwapRow = {
      label: `${e} resistance`,
      yours: shown(yourRes[e], '%'),
      theirs: shown(theirRes[e], '%'),
      delta: `${signed(delta)}%`,
      tone: delta > 0 ? 'up' : 'down'
    }
    const over = stats?.[`${e}ResistOverCap`]
    const now = stats?.[`${e}Resist`]
    // Most builds leave chaos uncapped on purpose: it shows, but doesn't decide.
    const counts = e !== 'Chaos'
    if (over != null && now != null) {
      // At the cap when over it, or at the usual cap with nothing to spare.
      const capped = over > 0 || now >= 75
      const next = over + delta
      if (!capped) {
        row.note = `${now}% to ${now + delta}%`
        if (counts) { if (delta > 0) gains++; else losses++ }
      } else if (next < 0) {
        row.note = `${now}% to ${now + next}%: under your cap`
        row.tone = 'down'
        broken.push(`${e} ${now}% to ${now + next}%`)
      } else {
        row.note = `over cap ${over} to ${next}: no change`
        row.tone = 'dim'
        if (delta > 0) wasted = true
      }
    } else if (counts) {
      if (delta > 0) gains++
      else losses++
    }
    rows.push(row)
  }

  // Everything else on either item, as a plain list. Mods with no number count too.
  const seen = new Set([LIFE, SPEED])
  let others = false
  for (const ref of [...yourStats.keys(), ...theirStats.keys()]) {
    if (seen.has(ref) || resistancesOf(ref).length) continue
    seen.add(ref)
    const has = yourStats.has(ref)
    const gets = theirStats.has(ref)
    const a = yourStats.get(ref) ?? 0
    const b = theirStats.get(ref) ?? 0
    if (has && gets && a === b) continue
    // What feeds an armour piece's own number is already in it.
    if (!/(Energy Shield|Armour|Evasion Rating)$/.test(ref)) others = true
    rows.push({
      label: ref.replace(/^[+-]?#%?\s*/, '').replace(/#/g, '').trim(),
      yours: has ? (a ? String(a) : 'yes') : 'none',
      theirs: gets ? (b ? String(b) : 'yes') : 'none',
      delta: !gets ? 'lost' : !has ? 'new' : signed(b - a),
      tone: 'dim'
    })
  }

  if (broken.length) {
    return { verdict: 'worse', summary: `Drops you under the cap: ${broken.join(', ')}.`, rows }
  }
  if (!rows.length) return { verdict: 'same', summary: 'The same numbers as yours.', rows }
  // The other mods may be why either item is worth wearing, and only PoB can
  // weigh those. So a verdict needs them out of the way.
  if (gains && losses) return { verdict: 'mixed', summary: 'A trade-off: see what you give up.', rows }
  if (others) {
    const lead = gains ? 'More of what your build counts on' : losses ? 'Less of what your build counts on' : 'Neither is ahead on what your build counts on'
    return { verdict: 'mixed', summary: `${lead}, but the other mods differ too.`, rows }
  }
  if (losses) {
    const why = wasted ? ' Your resistances are already over the cap, and you lose the rest.' : ''
    return { verdict: 'worse', summary: `Worse for this build.${why}`, rows }
  }
  if (gains) return { verdict: 'better', summary: 'Better for this build.', rows }
  return { verdict: 'same', summary: 'Nothing here changes what your build counts on.', rows }
}
