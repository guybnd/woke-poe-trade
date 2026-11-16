// 3.30 Covens of Umbra: Viscera facts for the Wickerman module. The table is
// public/data/league/viscera.json (scripts/build-viscera-data.mjs, from the
// Wickerman Ledger), fetched on first use and never bundled.
//
// League module: remove this folder, its entry in modules.ts, the strip in
// CheckedItem.vue and the lookup in WidgetSearch.vue when the league ends.
import { dataFileUrl, onSharedDataChange } from '../app/live-data'

export type VisceraSlot = 'Head' | 'Torso' | 'Upper Limb' | 'Lower Limb'

export interface VisceraTier {
  // Low, Med, High, or a named version (Queen, Variant 2, Grim Fate, Uber, Fixed).
  label: string
  // The implicit's text, ranges written "(10-15)"; several lines split by \n.
  text: string
  cat?: string
}

export interface VisceraDrop {
  boss: string
  map: string
  kind: string
  // The site inferred this link; the game hasn't confirmed it.
  unsure?: boolean
}

export interface Viscera {
  name: string
  slot: VisceraSlot
  cat: string
  tiers: VisceraTier[]
  act?: { n: number, boss: string, zone?: string, unsure?: boolean }
  maps: VisceraDrop[]
}

export interface VisceraTable {
  source: string
  read: string
  viscera: Viscera[]
  byName: Map<string, Viscera>
}

let job: Promise<VisceraTable | null> | null = null
onSharedDataChange(() => { job = null })

// Null when the file can't be read; a later call tries again.
export function loadViscera (): Promise<VisceraTable | null> {
  job ??= fetch(dataFileUrl('league/viscera.json'))
    .then(res => res.ok ? res.json() : Promise.reject(new Error(`viscera.json: ${res.status}`)))
    .then((d: Omit<VisceraTable, 'byName'>) => ({ ...d, byName: new Map(d.viscera.map(v => [v.name.toLowerCase(), v])) }))
    .catch((e) => {
      console.warn('[wickerman] No Viscera table', e)
      job = null
      return null
    })
  return job
}

// ---- which version an item is ----

// "(10-15)% chance" -> template "#% chance" and the allowed [min, max] per number.
function tierPattern (line: string): { template: string, ranges: Array<[number, number]> } {
  const ranges: Array<[number, number]> = []
  const template = line.replace(/\((-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)\)|-?\d+(?:\.\d+)?/g, (m, lo?: string, hi?: string) => {
    ranges.push(lo != null ? [Number(lo), Number(hi)] : [Number(m), Number(m)])
    return '#'
  })
  return { template: norm(template), ranges }
}

// An item line: an advanced copy writes "9(8-12)%"; the bracketed range goes.
function itemPattern (line: string): { template: string, values: number[] } {
  const values: number[] = []
  const template = line
    .replace(/(\d)\(-?\d+(?:\.\d+)?--?\d+(?:\.\d+)?\)/g, '$1')
    .replace(/-?\d+(?:\.\d+)?/g, (m) => { values.push(Number(m)); return '#' })
  return { template: norm(template), values }
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()

function lineMatches (tierLine: string, itemLine: string): boolean {
  const t = tierPattern(tierLine)
  const i = itemPattern(itemLine)
  if (t.template !== i.template || t.ranges.length !== i.values.length) return false
  return t.ranges.every(([lo, hi], k) => {
    const v = i.values[k]
    return v >= Math.min(lo, hi) && v <= Math.max(lo, hi)
  })
}

// The version an item holds: the tier whose every line the item text has,
// then the name's Lesser / Greater word when more than one fits. Null when
// none fits (a reworded line, or a version the table lacks).
export function heldTier (v: Viscera, itemName: string, itemLines: readonly string[]): number | null {
  const fits = v.tiers
    .map((tier, idx) => ({ idx, ok: tier.text.split('\n').every(tl => itemLines.some(il => lineMatches(tl, il))) }))
    .filter(f => f.ok)
    .map(f => f.idx)
  if (fits.length === 1) return fits[0]
  const byWord = /^lesser\s/i.test(itemName) ? 'Low' : /^greater\s/i.test(itemName) ? 'High' : null
  if (fits.length > 1) {
    // A plain name is the middle version.
    const named = fits.find(i => v.tiers[i].label === (byWord ?? 'Med'))
    return named ?? fits[0]
  }
  if (!byWord) return null
  const named = v.tiers.findIndex(t => t.label === byWord)
  return named >= 0 ? named : null
}

// ---- price another version ----

// The item text as if it held another version: the held version's lines
// become the other version's, each range at its first number (so the search
// from it finds the whole range), and the name takes that version's Lesser /
// Greater word. Null when the item's lines don't show its version.
export function otherTierText (v: Viscera, rawText: string, from: number, to: number): string | null {
  const held = v.tiers[from]
  const want = v.tiers[to]
  if (!held || !want) return null
  const lines = rawText.replace(/\r\n/g, '\n').split('\n')
  // An advanced copy keeps a roll's range, "16(14-18)%": write it the same way.
  const advanced = lines.some(l => /^\{ Implicit Modifier/.test(l.trim()))
  const rolled = (text: string) => text.replace(/\((-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)\)/g,
    (_m, lo: string, hi: string) => advanced ? `${lo}(${lo}-${hi})` : lo)

  const at: number[] = []
  for (const tl of held.text.split('\n')) {
    const i = lines.findIndex((il, k) => !at.includes(k) && lineMatches(tl, il.trim()))
    if (i === -1) return null
    at.push(i)
  }
  at.sort((a, b) => a - b)
  const out = lines.map((l, k) => k === at[0] ? want.text.split('\n').map(rolled).join('\n') : l)
    .filter((_l, k) => !at.slice(1).includes(k))

  // The name: the first line after the header that names this Viscera.
  const nameAt = out.findIndex(l => !/^(Item Class|Rarity):/.test(l) && l.trim())
  if (nameAt !== -1 && out[nameAt].trim().toLowerCase().endsWith(v.name.toLowerCase())) {
    out[nameAt] = tierItemName(v, to)
  }
  return out.join('\n')
}

// ---- search ----

export interface VisceraHit {
  v: Viscera
  // 0 name start, 1 name words, 2 a boss, zone or map, 3 an effect.
  rank: number
  // What matched, when it wasn't the name.
  why?: string
}

const words = (s: string) => norm(s).split(/[^\p{L}\p{N}%+]+/u).filter(Boolean)

function hasAll (text: string, parts: string[]): boolean {
  const ws = words(text)
  return parts.every(p => ws.some(w => w.startsWith(p)))
}

export function searchViscera (table: VisceraTable, query: string, limit = 6): VisceraHit[] {
  const q = norm(query)
  const parts = words(q)
  if (q.length < 3 || !parts.length) return []
  const hits: VisceraHit[] = []
  for (const v of table.viscera) {
    const name = norm(v.name)
    if (name.startsWith(q)) { hits.push({ v, rank: 0 }); continue }
    if (hasAll(v.name, parts)) { hits.push({ v, rank: 1 }); continue }
    const places = [
      ...(v.act ? [v.act.boss, v.act.zone ?? ''] : []),
      ...v.maps.flatMap(m => [m.boss, m.map])
    ].filter(Boolean)
    const place = places.find(p => hasAll(p, parts))
    if (place) { hits.push({ v, rank: 2, why: place }); continue }
    const tier = v.tiers.find(t => hasAll(t.text, parts))
    if (tier) hits.push({ v, rank: 3, why: tier.label })
  }
  return hits
    .sort((a, b) => a.rank - b.rank || a.v.name.localeCompare(b.v.name))
    .slice(0, limit)
}

// The Viscera a campaign zone's boss drops. Act from the area id: zone names
// repeat in acts 6-10.
export function visceraInZone (table: VisceraTable, zone: string, act: number | null): Viscera[] {
  const z = zone.trim().toLowerCase()
  if (act == null || !z) return []
  return table.viscera.filter(v => v.act?.n === act && v.act.zone?.toLowerCase() === z)
}

// The name the log gives a map: the table writes unique maps as
// "Mao Kun (unique Shore)".
const mapName = (map: string) => map.replace(/\s*\(unique [^)]*\)\s*$/i, '').trim().toLowerCase()

export interface VisceraHere {
  v: Viscera
  boss: string
  unsure: boolean
}

// The Viscera bosses drop in the zone you stand in: a campaign zone (by act
// and name), or a map, pinnacle or guardian arena by the name the log gives
// ("You have entered Graveyard.").
export function visceraHere (table: VisceraTable, zone: string, act: number | null): VisceraHere[] {
  const z = zone.trim().toLowerCase()
  if (!z) return []
  const out: VisceraHere[] = visceraInZone(table, zone, act).map(v => ({ v, boss: v.act!.boss, unsure: !!v.act!.unsure }))
  if (act == null) {
    for (const v of table.viscera) {
      for (const m of v.maps) {
        if (mapName(m.map) === z && !out.some(o => o.v === v)) out.push({ v, boss: m.boss, unsure: !!m.unsure })
      }
    }
  }
  return out
}

// ---- the version for your level ----

// Which version drops where isn't published; a guess from how 3.30 tiers its
// drops: Lesser (Low) in the acts, plain (Med) in maps up to area level 77,
// Greater (High) from 78. Named versions (Queen, Variant 2) aren't picked.
export function levelTierLabel (areaLevel: number | null): 'Low' | 'Med' | 'High' {
  if (areaLevel == null) return 'Med'
  return areaLevel < 68 ? 'Low' : areaLevel < 78 ? 'Med' : 'High'
}

const NEAREST: Record<'Low' | 'Med' | 'High', string[]> = {
  Low: ['Low', 'Med', 'High'],
  Med: ['Med', 'High', 'Low'],
  High: ['High', 'Med', 'Low']
}

// The index of the version for that level, or the closest one this Viscera has.
export function levelTier (v: Viscera, areaLevel: number | null): number {
  for (const label of NEAREST[levelTierLabel(areaLevel)]) {
    const i = v.tiers.findIndex(t => t.label === label)
    if (i !== -1) return i
  }
  return 0
}

// ---- prices ----

// The name poe.ninja lists a version under: "Lesser X" (Low), "X" (Med),
// "Greater X" (High). Named versions (Queen, Uber, Variant 2) go by the plain name.
export function tierItemName (v: Viscera, tier: number): string {
  const label = v.tiers[tier]?.label
  return label === 'Low' ? `Lesser ${v.name}` : label === 'High' ? `Greater ${v.name}` : v.name
}

// poe.ninja has one row per effect per name, its variant the effect with #
// for numbers. The row whose variant reads like this version's text, else
// the only row.
export function pickPriceRow<T extends { variant?: string }> (rows: readonly T[], tierText: string): T | null {
  if (rows.length <= 1) return rows[0] ?? null
  const shape = (s: string) => norm(s.replace(/\(-?\d+(?:\.\d+)?--?\d+(?:\.\d+)?\)|-?\d+(?:\.\d+)?/g, '#'))
  const want = shape(tierText.split('\n')[0])
  return rows.find(r => r.variant != null && shape(r.variant.split('\n')[0]) === want) ?? null
}

// "Act 1 · Fire Fury, The Coast"
export function actLine (v: Viscera): string | null {
  if (!v.act) return null
  return [v.act.boss, v.act.zone].filter(Boolean).join(', ')
}
