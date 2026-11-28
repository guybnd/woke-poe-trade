// Base families (Guy, 2026-11-28): Base ranks folds the bases of one family
// (Talismans, Runic, Heist gear...) in a column into one row you can drag as
// a whole, or open to move single bases. The family comes from the item's
// art (the same in every language), read from its icon URL.

export interface Family { id: string, label: string }

// First match wins; tested against the art path (".../Rings/HeistRing1").
const RULES: Array<[RegExp, Family]> = [
  [/Talisman/i, { id: 'talisman', label: 'Talismans' }],
  [/Spirit(Helmet|Gloves|Boots)BaseType/, { id: 'runic', label: 'Runic (ward)' }],
  [/BreachlordRing/, { id: 'breachring', label: 'Breach rings' }],
  [/LakeRing/, { id: 'lakering', label: 'Lake rings' }],
  [/\/Heist|^Heist|HeistShield/, { id: 'heist', label: 'Heist gear' }],
  [/Ritual(Str|Dex|Int)(Gloves|Boots)/, { id: 'ritual', label: 'Ritual gear' }],
  [/Abyss|Eye$/, { id: 'abyss', label: 'Abyss' }],
  [/MaskCrown|Helmet(StrDex|DexInt)R$/, { id: 'crown', label: 'Crowns and masks' }]
]

// The art path inside a poecdn "gen/image" URL, or null.
export function artPath (icon: string | null | undefined): string | null {
  const seg = icon?.split('/image/')[1]?.split('/')[0]
  if (!seg) return null
  try {
    const json = JSON.parse(atob(seg.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(seg.length / 4) * 4, '='))) as unknown[]
    const f = (json[2] as { f?: unknown } | undefined)?.f
    return typeof f === 'string' ? f.replace(/^2DItems\//, '') : null
  } catch { return null }
}

const cache = new Map<string, Family | null>()
export function familyOf (name: string, icon: string | null | undefined): Family | null {
  if (cache.has(name)) return cache.get(name)!
  const path = artPath(icon)
  const fam = path ? RULES.find(([re]) => re.test(path))?.[1] ?? null : null
  cache.set(name, fam)
  return fam
}

// A column's cards: bases, with each family of `min` or more folded into one
// row at its first base's place.
export type LaneRow = { kind: 'base', base: string } | { kind: 'family', family: Family, bases: string[] }
export function foldFamilies (bases: readonly string[], fam: (b: string) => Family | null, min = 3): LaneRow[] {
  const groups = new Map<string, string[]>()
  for (const b of bases) { const f = fam(b); if (f) groups.set(f.id, [...(groups.get(f.id) ?? []), b]) }
  const out: LaneRow[] = []
  const done = new Set<string>()
  for (const b of bases) {
    const f = fam(b)
    const g = f && groups.get(f.id)
    if (!f || !g || g.length < min) { out.push({ kind: 'base', base: b }); continue }
    if (done.has(f.id)) continue
    done.add(f.id)
    out.push({ kind: 'family', family: f, bases: g })
  }
  return out
}
