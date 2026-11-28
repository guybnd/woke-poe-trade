// The loot filter's mod names for identified gear (Guy 2026-11-28, NeverSink
// retirement M6, pick A): every prefix and suffix name that can roll on each
// kind of gear, with what it does and its tier there, read from the game's
// data as RePoE exports it. A filter can only see a mod by its name
// (HasExplicitMod "Merciless"), and the name tells the stat and the tier, so
// Rare weights score identified gear from this table.
//
// Runs in GitHub Actions (affix-tiers.yml), not in the app.
//
//   node scripts/gen-affix-tiers.mjs [mods.json base_items.json stat_translations.json]
//
// With three paths it reads local copies (tests, a one-off run); without, it
// downloads RePoE's current export.
//
// Writes renderer/public/data/affix-tiers.json:
//   { made, source, texts: [stat text, ...], classes: { Class: [[name, text index, tier], ...] } }
// `Class` is the filter's Class name ("Boots"). A text is the mod's lines
// with numbers as '#' ("+# to maximum Life"), several lines joined by "\n".
// Tier 1 is the best of its kind on that class (the highest level).
import fs from 'node:fs/promises'
import path from 'node:path'

const OUT = path.resolve(import.meta.dirname, '../renderer/public/data/affix-tiers.json')
const UA = { 'User-Agent': 'woke-poe-trade affix-tiers (GitHub Actions)' }
const SOURCES = [
  'https://repoe-fork.github.io',
  'https://repoe-fork.github.io/RePoE'
]

// The gear Rare weights decide (weights.ts GEAR_CLASSES).
export const GEAR_CLASSES = ['Amulets', 'Belts', 'Body Armours', 'Boots', 'Bows', 'Claws', 'Daggers', 'Gloves', 'Helmets', 'One Hand Axes', 'One Hand Maces', 'One Hand Swords', 'Quivers', 'Rings', 'Rune Daggers', 'Sceptres', 'Shields', 'Staves', 'Thrusting One Hand Swords', 'Two Hand Axes', 'Two Hand Maces', 'Two Hand Swords', 'Wands', 'Warstaves']
// RePoE's item class ids, where they differ from the filter's names.
const CLASS_ID = {
  'Body Armours': 'Body Armour',
  'Helmets': 'Helmet',
  'Bows': 'Bow',
  'Claws': 'Claw',
  'Daggers': 'Dagger',
  'One Hand Axes': 'One Hand Axe',
  'One Hand Maces': 'One Hand Mace',
  'One Hand Swords': 'One Hand Sword',
  'Quivers': 'Quiver',
  'Rings': 'Ring',
  'Rune Daggers': 'Rune Dagger',
  'Sceptres': 'Sceptre',
  'Shields': 'Shield',
  'Staves': 'Staff',
  'Thrusting One Hand Swords': 'Thrusting One Hand Sword',
  'Two Hand Axes': 'Two Hand Axe',
  'Two Hand Maces': 'Two Hand Mace',
  'Two Hand Swords': 'Two Hand Sword',
  'Wands': 'Wand',
  'Warstaves': 'Warstaff',
  'Amulets': 'Amulet',
  'Belts': 'Belt'
}

// The weight a mod spawns with on an item with these tags: the first of its
// spawn tags the item has decides.
function spawnWeight (mod, tags) {
  for (const w of mod.spawn_weights ?? []) {
    if (tags.has(w.tag)) return Number(w.weight) || 0
  }
  return 0
}

// A stat's text with numbers as '#', from the game's translations.
function textOf (stats, translations) {
  const lines = []
  const done = new Set()
  for (const s of stats ?? []) {
    if (done.has(s.id)) continue
    const tr = translations.get(s.id)
    if (!tr) continue
    for (const id of tr.ids ?? []) done.add(id)
    // The wording for this mod's values (each line has a range it's for).
    const value = (id) => { const x = (stats ?? []).find(y => y.id === id); return x ? Number(x.max) || 0 : 0 }
    const fits = (e) => (e.condition ?? []).every((c, i) => {
      const v = value(tr.ids[i])
      return (c?.min == null || v >= c.min) && (c?.max == null || v <= c.max)
    })
    const en = (tr.English ?? []).find(e => e && typeof e.string === 'string' && fits(e))
    if (!en) continue
    const line = en.string.replace(/\{(\d+)(?::[^}]*)?\}/g, (_, i) => {
      const f = en.format?.[Number(i)] ?? '#'
      return f === 'ignore' ? '' : f
    }).replace(/\s+/g, ' ').trim()
    if (line) lines.push(line)
  }
  return lines.join('\n')
}

export function buildTable (mods, bases, statTranslations) {
  const translations = new Map()
  for (const tr of statTranslations ?? []) for (const id of tr.ids ?? []) if (!translations.has(id)) translations.set(id, tr)
  // Each class's base tag sets (released bases only).
  const tagsOf = new Map()
  for (const b of Object.values(bases ?? {})) {
    if (!b || b.release_state !== 'released' || b.domain !== 'item') continue
    const cls = GEAR_CLASSES.find(c => (CLASS_ID[c] ?? c) === b.item_class || c === b.item_class)
    if (!cls) continue
    const list = tagsOf.get(cls) ?? []
    const key = [...b.tags].sort().join(',')
    if (!list.some(t => t.key === key)) list.push({ key, tags: new Set(b.tags) })
    tagsOf.set(cls, list)
  }
  const rollable = Object.values(mods ?? {}).filter(m => m && m.domain === 'item' && (m.generation_type === 'prefix' || m.generation_type === 'suffix') &&
    !m.is_essence_only && typeof m.name === 'string' && m.name.trim())
  const texts = []
  const textIndex = new Map()
  const textId = (t) => {
    let id = textIndex.get(t)
    if (id == null) { id = texts.length; texts.push(t); textIndex.set(t, id) }
    return id
  }
  const classes = {}
  for (const cls of GEAR_CLASSES) {
    const tagSets = tagsOf.get(cls) ?? []
    const here = rollable.filter(m => tagSets.some(t => spawnWeight(m, t.tags) > 0))
    // Tiers by kind (mod type and prefix or suffix), highest level first.
    const kinds = new Map()
    for (const m of here) {
      const k = `${m.type}|${m.generation_type}`
      const list = kinds.get(k) ?? []
      list.push(m)
      kinds.set(k, list)
    }
    const rows = new Map()
    for (const list of kinds.values()) {
      const levels = [...new Set(list.map(m => Number(m.required_level) || 0))].sort((a, b) => b - a)
      for (const m of list) {
        const text = textOf(m.stats, translations)
        if (!text) continue
        const tier = levels.indexOf(Number(m.required_level) || 0) + 1
        const name = m.name.trim()
        const row = [name, textId(text), tier]
        // A name twice on one class (two kinds share it): its best tier.
        const had = rows.get(name)
        if (!had || had[2] > tier) rows.set(name, row)
      }
    }
    classes[cls] = [...rows.values()].sort((a, b) => a[0].localeCompare(b[0]))
  }
  return { texts, classes }
}

// A table that can't be right is not written (the old one stays).
export function checkTable ({ texts, classes }) {
  for (const cls of GEAR_CLASSES) {
    if (!(classes[cls]?.length >= 40)) throw new Error(`Only ${classes[cls]?.length ?? 0} mods on ${cls}: RePoE's export may have changed. Not writing.`)
  }
  const has = (cls, name, text) => classes[cls].some(r => r[0] === name && texts[r[1]].includes(text))
  const must = [['Two Hand Swords', 'Merciless', 'increased Physical Damage'], ['Boots', "Hellion's", 'Movement Speed'], ['Body Armours', 'Prime', 'maximum Life']]
  for (const [cls, name, text] of must) {
    if (!has(cls, name, text)) throw new Error(`${name} (${text}) isn't on ${cls}: RePoE's export may have changed. Not writing.`)
  }
}

async function get (url) {
  const res = await fetch(url, { headers: UA })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return await res.json()
}

async function download () {
  for (const root of SOURCES) {
    try {
      const [mods, bases, translations] = await Promise.all([get(`${root}/mods.json`), get(`${root}/base_items.json`), get(`${root}/stat_translations.json`)])
      console.log(`read ${root}`)
      return { mods, bases, translations, source: root }
    } catch (e) {
      console.warn(`no export at ${root}: ${e.message}`)
    }
  }
  throw new Error('RePoE\'s export is not reachable.')
}

async function main () {
  const [modsFile, basesFile, trFile] = process.argv.slice(2)
  const read = async f => JSON.parse(await fs.readFile(f, 'utf8'))
  const { mods, bases, translations, source } = modsFile && basesFile && trFile
    ? { mods: await read(modsFile), bases: await read(basesFile), translations: await read(trFile), source: 'local' }
    : await download()
  const table = buildTable(mods, bases, translations)
  checkTable(table)
  const made = new Date().toISOString().slice(0, 10)
  // One class per line, so a new league's diff reads by class.
  const cls = Object.entries(table.classes).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(',\n')
  const text = `{"made":${JSON.stringify(made)},"source":${JSON.stringify(source)},\n"texts":${JSON.stringify(table.texts)},\n"classes":{\n${cls}\n}}\n`
  await fs.writeFile(OUT, text)
  const n = Object.values(table.classes).reduce((s, v) => s + v.length, 0)
  console.log(`wrote ${n} mod names (${table.texts.length} texts, ${text.length} bytes) to ${path.relative(process.cwd(), OUT)}`)
}

if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) {
  main().catch(e => { console.error(e); process.exit(1) })
}
