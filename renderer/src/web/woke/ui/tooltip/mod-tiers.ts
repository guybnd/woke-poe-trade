// Each prefix and suffix's tier and roll for items that come without them (a
// PoB build's items, your character's read), from public/data/mod-tiers.json
// (scripts/build-mod-tiers.mjs: poedb's item class pages). Lines that match no
// rollable mod (uniques, implicits, influence mods it doesn't list) get none.
import { dataFileUrl, onSharedDataChange } from '../../app/live-data'
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
// A newer download is read the next time it's asked for.
onSharedDataChange(() => { job = null })
export function loadModTiers (): Promise<TierData | null> {
  if (!job) {
    const mine = fetch(dataFileUrl('mod-tiers.json'))
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<TierData> })
      // A failed read is tried again on the next ask.
      .catch(() => { if (job === mine) job = null; return null })
    job = mine
  }
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
  // Ward bases roll their own mods, which the data doesn't list.
  if (armour && base?.wd) return null
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

// A whole mod: its lines, family, prefix (1) or suffix (2) and level.
interface Row { lines: Array<{ template: string, ranges: Array<[number, number]> }>, family: string, gen: number, level: number, sig: string }
const preparedRows = new WeakMap<TierData, Map<string, Row[]>>()

function rowsFor (data: TierData, key: string): Row[] | null {
  let byClass = preparedRows.get(data)
  if (!byClass) { byClass = new Map(); preparedRows.set(data, byClass) }
  const hit = byClass.get(key)
  if (hit) return hit
  const raw = data.classes[key]
  if (!raw) return null
  const rows = raw.map(([t, family, gen, level]): Row => {
    const lines = data.texts[t].split('\n').map((text) => {
      const { template, ranges } = rangesOf(text)
      return { template, ranges: ranges.map(([a, b]) => [Math.abs(a), Math.abs(b)].sort((x, y) => x - y) as [number, number]) }
    })
    return { lines, family, gen, level, sig: lines.map(l => l.template).join('\n') }
  })
  byClass.set(key, rows)
  return rows
}

const fitsLine = (l: Row['lines'][number], v: { template: string, values: number[] }) =>
  l.template === v.template && l.ranges.length === v.values.length && l.ranges.every(([a, b], i) => v.values[i] >= a && v.values[i] <= b)

function tierFrom (rows: Row[], row: Row, lineIndex: number, values: number[]): ModTier {
  const same = rows.filter(r => r.family === row.family && r.gen === row.gen && r.sig === row.sig)
  const tier = 1 + new Set(same.filter(r => r.level > row.level).map(r => r.level)).size
  const ranges = row.lines[lineIndex].ranges
  const rolls = ranges.map(([a, b], i) => b > a ? (values[i] - a) / (b - a) : null).filter((r): r is number => r != null)
  return {
    tier,
    roll: rolls.length ? Math.round(rolls.reduce((s, r) => s + r, 0) / rolls.length * 100) : null,
    ranges,
    gen: row.gen === 1 ? 'prefix' : 'suffix'
  }
}

// Every mod line of one item at once: a hybrid mod whose lines are all on the
// item takes them first (its two halves are one prefix, not two mods); the
// rest go one line at a time. Null where no mod of the class rolls the line.
export function tiersOfMods (data: TierData, key: string, mods: string[]): Array<ModTier | null> {
  const rows = rowsFor(data, key)
  const out: Array<ModTier | null> = mods.map(() => null)
  if (!rows) return out
  const items = mods.map(m => valuesOf(m))
  const taken = new Set<number>()
  const hybrids = rows.filter(r => r.lines.length > 1).sort((a, b) => b.level - a.level)
  for (const row of hybrids) {
    const picked: number[] = []
    for (const l of row.lines) {
      const at = items.findIndex((v, i) => !taken.has(i) && !picked.includes(i) && fitsLine(l, v))
      if (at < 0) break
      picked.push(at)
    }
    if (picked.length !== row.lines.length) continue
    picked.forEach((at, li) => { taken.add(at); out[at] = tierFrom(rows, row, li, items[at].values) })
  }
  items.forEach((v, i) => {
    if (taken.has(i)) return
    const fits = rows.filter(r => r.lines.length === 1 && fitsLine(r.lines[0], v)).sort((a, b) => b.level - a.level)
    if (fits.length) out[i] = tierFrom(rows, fits[0], 0, v.values)
  })
  return out
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
