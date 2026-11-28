// The loot filter's own item lists (Guy 2026-11-28, NeverSink retirement M1):
// every currency, fragment and divination card the game has, with the Class
// the filter's Class condition names and the item's art path, read from the
// game's data as RePoE exports it. The Loot tab builds its rows from this
// table instead of NeverSink's BaseType lists.
//
// Runs in GitHub Actions (item-lists.yml), not in the app.
//
//   node scripts/gen-item-lists.mjs [base_items.json item_classes.json]
//
// With two paths it reads local copies (tests, a one-off run); without, it
// downloads RePoE's current export.
//
// Writes renderer/src/web/woke/loot-filter/item-lists.json:
//   { made, source, classes: [class, ...], items: [[name, classIndex, art], ...] }
// Each Class is written once and the rows name it by index (all JS is on a
// budget, and "Divination Cards" on 455 rows is 9 KB).
// `art`: the icon's path under Art/2DItems, without .dds ("Currency/Essence/
// GreedEssence5"). The Loot tab sorts items into its sections by it.
import fs from 'node:fs/promises'
import path from 'node:path'

const OUT = path.resolve(import.meta.dirname, '../renderer/src/web/woke/loot-filter/item-lists.json')
const UA = { 'User-Agent': 'woke-poe-trade item-lists (GitHub Actions)' }
// RePoE's export, current fork first. Logged: the first that answers wins.
const SOURCES = [
  'https://repoe-fork.github.io',
  'https://repoe-fork.github.io/RePoE'
]

// The item classes the Loot tab lists by name (RePoE's ids). Gear, gems,
// maps and jewels come from elsewhere (game data in the app, poe.ninja).
export const CLASSES = new Set([
  'StackableCurrency',
  'DelveStackableSocketableCurrency',
  'MapFragment',
  'MiscMapItem',
  'DivinationCard',
  'VaultKey'
])
// And by the filter's Class name, for classes whose RePoE id isn't certain
// (corpses came in 3.24 as "Corpses").
export const CLASS_NAMES = new Set(['Corpses'])

// A name the game's filter takes: plain text, no test or unused items.
const BAD_NAME = /\[|\]|^$|UNUSED|DNT|^Test |PlaceHolder|Placeholder/

// The rows for the table, sorted by name: one per name (the game has a few
// names twice, for one look or another; the filter matches them by name).
export function listItems (bases, classes) {
  const seen = new Map()
  for (const b of Object.values(bases ?? {})) {
    if (!b || b.release_state !== 'released') continue
    if (!CLASSES.has(b.item_class) && !CLASS_NAMES.has(classes?.[b.item_class]?.name)) continue
    const name = typeof b.name === 'string' ? b.name.trim() : ''
    if (BAD_NAME.test(name) || seen.has(name)) continue
    const cls = classes?.[b.item_class]?.name
    if (!cls) continue
    const dds = b.visual_identity?.dds_file ?? ''
    const art = dds.replace(/^Art\/2DItems\//, '').replace(/\.dds$/, '')
    seen.set(name, [name, cls, art])
  }
  return [...seen.values()].sort((a, b) => a[0].localeCompare(b[0]))
}

// A table that can't be right is not written (the old one stays).
export function checkItems (items) {
  const names = new Set(items.map(r => r[0]))
  const must = ['Chaos Orb', 'Divine Orb', 'Orb of Alchemy', 'Rain of Chaos', 'Deafening Essence of Greed', 'Fractured Fossil', 'Golden Oil', 'Fragment of the Phoenix']
  const missing = must.filter(n => !names.has(n))
  if (missing.length) throw new Error(`The game data has no ${missing.join(', ')}: RePoE's export may have changed. Not writing.`)
  if (items.length < 600) throw new Error(`Only ${items.length} items: RePoE's export may have changed. Not writing.`)
  const cards = items.filter(r => r[1] === 'Divination Cards').length
  if (cards < 300) throw new Error(`Only ${cards} divination cards. Not writing.`)
}

// The file's text: classes once, rows by class index, one row per line.
export function packItems (items, made, source) {
  const classes = [...new Set(items.map(r => r[1]))]
  const at = new Map(classes.map((c, i) => [c, i]))
  return `{"made":${JSON.stringify(made)},"source":${JSON.stringify(source)},"classes":${JSON.stringify(classes)},"items":[\n${items.map(([n, c, a]) => JSON.stringify([n, at.get(c), a])).join(',\n')}\n]}\n`
}

async function get (url) {
  const res = await fetch(url, { headers: UA })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return await res.json()
}

async function download () {
  for (const root of SOURCES) {
    try {
      const [bases, classes] = await Promise.all([get(`${root}/base_items.json`), get(`${root}/item_classes.json`)])
      console.log(`read ${root}`)
      return { bases, classes, source: root }
    } catch (e) {
      console.warn(`no export at ${root}: ${e.message}`)
    }
  }
  throw new Error('RePoE\'s export is not reachable.')
}

async function main () {
  const [basesFile, classesFile] = process.argv.slice(2)
  const { bases, classes, source } = basesFile && classesFile
    ? { bases: JSON.parse(await fs.readFile(basesFile, 'utf8')), classes: JSON.parse(await fs.readFile(classesFile, 'utf8')), source: 'local' }
    : await download()
  const items = listItems(bases, classes)
  checkItems(items)
  const made = new Date().toISOString().slice(0, 10)
  // One row per line: the diff of a new league's table reads as a list.
  const text = packItems(items, made, source)
  await fs.writeFile(OUT, text)
  const by = {}
  for (const r of items) by[r[1]] = (by[r[1]] ?? 0) + 1
  console.log(`wrote ${items.length} items to ${path.relative(process.cwd(), OUT)}: ${JSON.stringify(by)}`)
}

if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) {
  main().catch(e => { console.error(e); process.exit(1) })
}
