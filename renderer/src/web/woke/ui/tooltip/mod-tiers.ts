// Each prefix and suffix's tier and roll for items that come without them (a
// PoB build's items, your character's read), from public/data/mod-tiers.json
// (scripts/build-mod-tiers.mjs: poedb's item class pages). Lines that match no
// rollable mod (uniques, implicits, influence mods it doesn't list) get none.
import { dataFileUrl } from '../../app/live-data'
import type { TipBase } from './tip-content'

export interface TierData {
  texts: string[]
  // Per item class: [text index, family, 1 prefix / 2 suffix, level].
  classes: Record<string, Array<[number, string, number, number]>>
}

export interface ModTier {
  tier: number
  // Where the roll sits in the tier's range, 0 to 100 (null: nothing to roll).
  roll: number | null
  // Each number's range, in the line's order: "(25-39)".
  ranges: Array<[number, number]>
  gen: 'prefix' | 'suffix'
}

let job: Promise<TierData | null> | null = null
export function loadModTiers (): Promise<TierData | null> {
  job ??= fetch(dataFileUrl('mod-tiers.json'))
    .then(r => r.ok ? r.json() as Promise<TierData> : null)
    .catch(() => { job = null; return null })
  return job
}

// The app's item category (items.ndjson's craftable.category) and the base's
// defences -> the data's class key.
const ARMOUR: Record<string, string> = { 'Helmet': 'Helmets', 'Gloves': 'Gloves', 'Boots': 'Boots', 'Body Armour': 'Body_Armours', 'Shield': 'Shields' }
const OTHER: Record<string, string> = {
  'Ring': 'Rings',
  'Amulet': 'Amulets',
  'Belt': 'Belts',
  'Quiver': 'Quivers',
  'One-Handed Sword': 'One_Hand_Swords',
  'Thrusting One-Handed Sword': 'Thrusting_One_Hand_Swords',
  'One-Handed Axe': 'One_Hand_Axes',
  'One-Handed Mace': 'One_Hand_Maces',
  'Sceptre': 'Sceptres',
  'Dagger': 'Daggers',
  'Rune Dagger': 'Rune_Daggers',
  'Claw': 'Claws',
  'Wand': 'Wands',
  'Two-Handed Sword': 'Two_Hand_Swords',
  'Two-Handed Axe': 'Two_Hand_Axes',
  'Two-Handed Mace': 'Two_Hand_Maces',
  'Staff': 'Staves',
  'Warstaff': 'Warstaves',
  'Bow': 'Bows'
}

export function tierClassKey (category: string | undefined, base: TipBase | undefined): string | null {
  if (!category) return null
  const armour = ARMOUR[category]
  if (armour) {
    const attrs = [base?.ar ? 'str' : '', base?.ev ? 'dex' : '', base?.es ? 'int' : ''].filter(Boolean)
    // A shield or body with no defence listed (rare): call it strength.
    return `${armour}_${attrs.length ? attrs.join('_') : 'str'}`
  }
  return OTHER[category] ?? null
}

const NUM = /[+-]?\d+(?:\.\d+)?/g
// "+(25-39) to maximum Life" -> template "# to maximum Life" and its ranges.
function rangesOf (text: string): { template: string, ranges: Array<[number, number]> } {
  const ranges: Array<[number, number]> = []
  const template = text
    .replace(/\+?\((-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)\)/g, (_, a: string, b: string) => { ranges.push([Number(a), Number(b)]); return '#' })
    .replace(/[+-]?\d+(?:\.\d+)?/g, (n: string) => { ranges.push([Number(n), Number(n)]); return '#' })
  return { template, ranges }
}

function valuesOf (line: string): { template: string, values: number[] } {
  const values: number[] = []
  const template = line.replace(NUM, (n: string) => { values.push(Math.abs(Number(n))); return '#' })
  return { template, values }
}

// whole: the line is the mod's only line (not one half of a hybrid).
interface Entry { template: string, ranges: Array<[number, number]>, family: string, gen: number, level: number, whole: boolean }

const prepared = new WeakMap<TierData, Map<string, Map<string, Entry[]>>>()

// Per class: every mod line by its template, with the mods that have that
// line (a two-line mod is listed under both of its lines).
function linesFor (data: TierData, key: string): Map<string, Entry[]> | null {
  let byClass = prepared.get(data)
  if (!byClass) { byClass = new Map(); prepared.set(data, byClass) }
  const hit = byClass.get(key)
  if (hit) return hit
  const rows = data.classes[key]
  if (!rows) return null
  const out = new Map<string, Entry[]>()
  for (const [t, family, gen, level] of rows) {
    const lines = data.texts[t].split('\n')
    lines.forEach((text) => {
      const { template, ranges } = rangesOf(text)
      const list = out.get(template) ?? []
      list.push({ template, ranges: ranges.map(([a, b]) => [Math.abs(a), Math.abs(b)].sort((x, y) => x - y) as [number, number]), family, gen, level, whole: lines.length === 1 })
      out.set(template, list)
    })
  }
  byClass.set(key, out)
  return out
}

// A mod line's tier among the mods of its family that roll the same line on
// this class: 1 is the highest level.
export function tierOfLine (data: TierData, key: string, line: string): ModTier | null {
  const lines = linesFor(data, key)
  if (!lines) return null
  const { template, values } = valuesOf(line)
  const options = lines.get(template) ?? []
  if (!options.length) return null
  const fits = options.filter(e => e.ranges.length === values.length && e.ranges.every(([a, b], i) => values[i] >= a && values[i] <= b))
  if (!fits.length) return null
  // A line a plain mod rolls reads as that mod before one half of a hybrid;
  // two tiers can share a value at their edge, and the higher reads truer.
  const hit = fits.sort((a, b) => Number(b.whole) - Number(a.whole) || b.level - a.level)[0]
  const family = options.filter(e => e.family === hit.family && e.gen === hit.gen)
  const tier = 1 + new Set(family.filter(e => e.level > hit.level).map(e => e.level)).size
  const rolls = hit.ranges.map(([a, b], i) => b > a ? (values[i] - a) / (b - a) : null).filter((r): r is number => r != null)
  return {
    tier,
    roll: rolls.length ? Math.round(rolls.reduce((s, r) => s + r, 0) / rolls.length * 100) : null,
    ranges: hit.ranges,
    gen: hit.gen === 1 ? 'prefix' : 'suffix'
  }
}
