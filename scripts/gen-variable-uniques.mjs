// Writes renderer/src/web/woke/shared/variable-uniques.ts: the uniques whose
// price depends on a roll hidden until identified, from Path of Building's
// unique data (PathOfBuildingCommunity/PathOfBuilding, dev branch).
//
//   node scripts/gen-variable-uniques.mjs
//
// - Variable: a unique with 2+ current variants (legacy "Pre 3.x" ones and
//   uniques no longer obtainable left out), plus the generated ones PoB builds
//   in code (Watcher's Eye, Forbidden Flame and Flesh, Megalomaniac...).
// - Foulborn: a unique with 2+ possible mutated mods (ModFoulbornMap.jsonc,
//   which PoB takes from poewiki's Foulborn table).
// Run it after a league adds uniques, and review the diff.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const RAW = 'https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding/dev/src/Data'
const FILES = ['amulet', 'axe', 'belt', 'body', 'boots', 'bow', 'claw', 'dagger', 'fishing', 'flask', 'gloves', 'helmet', 'jewel', 'mace', 'quiver', 'ring', 'shield', 'staff', 'sword', 'wand']

// Built in PoB's Special/Generated.lua code, not as item text.
const GENERATED = [
  'Watcher\'s Eye', 'Forbidden Flame', 'Forbidden Flesh', 'Megalomaniac', 'Impossible Escape',
  'Sublime Vision', 'Bound by Destiny', 'The Balance of Terror', 'Precursor\'s Emblem', 'Skin of the Lords',
  'Forbidden Shako', 'Replica Forbidden Shako', 'Pearl of Tsoatha', 'Replica Dragonfang\'s Flight', 'Vorana\'s March'
]
// Already in the app before this list, not variants in PoB's data.
const KEPT = ['Rational Doctrine', 'Melding of the Flesh', 'Dissolution of the Flesh', 'Beauty']
// PoB variants that are a version or a base, not a roll: the base shows them
// before identifying (Beacon of Madness's implicit, Grand Spectrum's jewel).
const NOT_ROLLED = new Set(['The Rat Cage', 'The Restless Ward', 'Rathpith Globe', 'Font of Thunder', 'Beacon of Madness', 'Grand Spectrum'])

async function get (path) {
  const res = await fetch(`${RAW}/${path}`)
  if (!res.ok) throw new Error(`${path}: ${res.status}`)
  return res.text()
}

function currentVariants (lines) {
  const out = []
  for (const l of lines) {
    if (!l.startsWith('Variant:')) continue
    const v = l.slice(8).trim()
    if (/\bPre[ .]?\d|^\d+\.\d+/.test(v)) continue
    const name = v.replace(/\s*\(Current\)|^Current\s*(-\s*)?|\s+Current$/g, '').replace(/^[ (]+|[ )]+$/g, '')
    if (name && !out.includes(name)) out.push(name)
  }
  return out
}

const variable = new Set([...GENERATED, ...KEPT])
// A unique's one base (trade needs it with the name); none when it drops on
// several (Grand Spectrum, Precursor's Emblem): trade then searches the name.
const bases = new Map()
for (const file of FILES) {
  const text = await get(`Uniques/${file}.lua`)
  for (const [, block] of text.matchAll(/\[\[\n?([\s\S]*?)\]\]/g)) {
    const lines = block.trim().split('\n').map(l => l.trim())
    if (lines.length < 2) continue
    const name = lines[0]
    if (NOT_ROLLED.has(name)) continue
    if (lines.some(l => l.startsWith('Source:') && l.includes('No longer obtainable'))) continue
    if (currentVariants(lines).length >= 2) variable.add(name)
    // The base line(s) follow the name: one, or one per variant.
    const baseLines = []
    for (const l of lines.slice(1)) {
      const m = /^(?:\{variant:[^}]*\})?(.+)$/.exec(l)
      if (!l.startsWith(lines[1].startsWith('{') ? '{' : lines[1]) || /^[A-Z][a-z]+:/.test(m[1])) break
      baseLines.push(m[1].replace(/ \(.*\)$/, ''))
    }
    const set = new Set(baseLines)
    const one = set.size === 1 ? [...set][0] : null
    // A unique listed once per base (Grand Spectrum) has none either.
    bases.set(name, bases.has(name) && bases.get(name) !== one ? null : one)
  }
}

const mapText = (await get('ModFoulbornMap.jsonc')).replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1')
const foulMap = JSON.parse(mapText)
const foulborn = Object.keys(foulMap).filter(k => Object.keys(foulMap[k]).length > 1)

// Generated ones' bases, read from Special/Generated.lua by hand.
const GENERATED_BASES = {
  "Watcher's Eye": 'Prismatic Jewel', 'Forbidden Flame': 'Crimson Jewel', 'Forbidden Flesh': 'Cobalt Jewel',
  Megalomaniac: 'Medium Cluster Jewel', 'Impossible Escape': 'Viridian Jewel', 'Sublime Vision': 'Prismatic Jewel',
  'Bound by Destiny': 'Prismatic Jewel', 'The Balance of Terror': 'Cobalt Jewel', "Precursor's Emblem": null,
  'Skin of the Lords': 'Simple Robe', 'Forbidden Shako': 'Great Crown', 'Replica Forbidden Shako': 'Great Crown',
  'Pearl of Tsoatha': 'Prismatic Ring', "Replica Dragonfang's Flight": 'Onyx Amulet', "Vorana's March": 'Runic Sabatons',
  'Rational Doctrine': 'Cobalt Jewel', 'Melding of the Flesh': 'Cobalt Jewel', 'Dissolution of the Flesh': 'Crimson Jewel', Beauty: 'Vaal Aspect'
}
for (const [name, base] of Object.entries(GENERATED_BASES)) if (!bases.has(name)) bases.set(name, base)
// A unique on several bases (Doryani's Delusion, Precursor's Emblem) stays
// on poe.ninja: a trade search by name alone would mix its bases.
const multiBase = [...variable].filter(n => !bases.get(n))
for (const n of multiBase) variable.delete(n)

const sorted = xs => [...xs].sort((a, b) => a.localeCompare(b))
// The repo's lint: single quotes, double only around an apostrophe.
const quote = n => n.includes("'") ? JSON.stringify(n) : `'${n}'`
const list = xs => sorted(xs).map(n => `  ${quote(n)}`).join(',\n')
const out = `// Generated by scripts/gen-variable-uniques.mjs from Path of Building's
// unique data. Don't edit by hand: run the script and review the diff.
//
// Uniques whose price depends on a roll hidden until identified (a random
// variant, aura mods, an ascendancy notable...). poe.ninja's one price for
// them misleads, so their unidentified price comes from trade, on a click.
export const VARIABLE_UNIQUE_NAMES: readonly string[] = [
${list(variable)}
]

// Each one's base, for the trade search; absent when it drops on several.
export const VARIABLE_UNIQUE_BASES: Readonly<Record<string, string>> = {
${sorted(variable).filter(n => bases.get(n)).map(n => `  ${quote(n)}: ${quote(bases.get(n))}`).join(',\n')}
}
`
writeFileSync(fileURLToPath(new URL('../renderer/src/web/woke/shared/variable-uniques.ts', import.meta.url)), out)
console.log(`${variable.size} variable (left out on several bases: ${multiBase.join(', ') || 'none'})`)
// Foulborn uniques with 2+ possible mutations, for the list's doc page only
// (the app doesn't use it yet, so it stays out of the bundle).
console.log(`${foulborn.length} Foulborn: ${sorted(foulborn).join(', ')}`)
