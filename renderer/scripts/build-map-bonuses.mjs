// Builds public/data/map-bonuses.json: what each map mod adds to a map (Atlas
// Drops, rarity, pack size, and on T17 mods a "more Currency / Maps / Threads"
// bonus), from poedb.tw's map mod pages. Every map mod gives fixed amounts,
// shown on poedb but not in the game's stat data. Map mods shows them on each
// row. Run once a patch; the app also downloads a newer copy from the repo
// (main/src/woke/live-data.ts), so a fix reaches players without a release.
//
//   npm run map-bonuses
//
// Pages are cached in .map-bonuses-cache/; delete it to read poedb again.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RENDERER = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(RENDERER, 'public/data/map-bonuses.json')
const CACHE = join(RENDERER, '.map-bonuses-cache')
const STATS = join(RENDERER, 'public/data/en/stats.ndjson')
const UA = { 'User-Agent': 'Mozilla/5.0 (woke-poe-trade map-bonuses)' }
// poedb's map tier pages. Maps_high_tier is empty: top covers tiers 11-16.
const PAGES = { low: 'Maps_low_tier', mid: 'Maps_mid_tier', top: 'Maps_top_tier', t17: 'Maps_uber_tier' }

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function page (slug) {
  const file = join(CACHE, `${slug}.html`)
  if (existsSync(file)) return readFileSync(file, 'utf8')
  const res = await fetch(`https://poedb.tw/us/${slug}`, { headers: UA, signal: AbortSignal.timeout(120_000) })
  if (!res.ok) throw new Error(`${slug}: ${res.status}`)
  const html = await res.text()
  mkdirSync(CACHE, { recursive: true })
  writeFileSync(file, html)
  await sleep(1500)
  return html
}

// The JSON array after `"normal":[` (the page's rollable map mods).
function normalMods (html) {
  const at = html.indexOf('"normal":[')
  if (at < 0) return null
  const start = at + '"normal":'.length
  let depth = 0
  let inStr = false
  let i = start
  for (; i < html.length; i++) {
    const c = html[i]
    if (inStr) {
      if (c === '\\') i++
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '[') depth++
    else if (c === ']' && --depth === 0) { i++; break }
  }
  return JSON.parse(html.slice(start, i))
}

function plain (html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<span class="ndash">[^<]*<\/span>/g, '-')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&#39;/g, '\'').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/[—–]/g, '-')
    .split('\n').map(l => l.trim()).filter(Boolean)
}

// The game's stat lines, exact and with numbers as #, -> stat ref.
const exact = new Map()
const templ = new Map()
const toTemplate = s => s.replace(/\+?\(-?\d+(?:\.\d+)?-(-?\d+(?:\.\d+)?)\)/g, '#').replace(/[+-]?\d+(?:\.\d+)?/g, '#')
for (const line of readFileSync(STATS, 'utf8').split('\n')) {
  if (!line.trim()) continue
  const stat = JSON.parse(line)
  if (!stat.fromAreaMods || stat.fromAreaMods === 'heist_exclusive') continue
  for (const m of stat.matchers) {
    if (!exact.has(m.string)) exact.set(m.string, stat.ref)
    const t = toTemplate(m.string)
    if (!templ.has(t)) templ.set(t, stat.ref)
  }
}
function refOf (line) {
  if (exact.has(line)) return exact.get(line)
  const t = toTemplate(line)
  if (templ.has(t)) return templ.get(t)
  // poedb writes "2 Grasping Vines", the stat data "# Grasping Vine".
  const singular = t.replace(/(\w)s\b/g, '$1')
  for (const [k, ref] of templ) if (k.replace(/(\w)s\b/g, '$1') === singular) return ref
  return null
}

const BONUS = [
  [/^(\d+)% increased Atlas Drops in this Area$/, 'd'],
  [/^(\d+)% increased Rarity of Items found in this Area$/, 'r'],
  [/^(\d+)% increased Pack size$/, 'p']
]
const MORE = /^(\d+)% more (Currency|Maps|Threads|Divination Cards|Scarabs) found in Area$/
const MORE_KEY = { 'Currency': 'currency', 'Maps': 'maps', 'Threads': 'threads', 'Divination Cards': 'divCards', 'Scarabs': 'scarabs' }

// One row per distinct mod; the same mod on several tier pages lists each tier.
const rows = new Map()
const unmatched = new Set()
for (const [tier, slug] of Object.entries(PAGES)) {
  const list = normalMods(await page(slug))
  if (!list) { console.warn(`no mods on ${slug}`); continue }
  let n = 0
  for (const m of list) {
    const gen = Number(m.ModGenerationTypeID)
    if (gen !== 1 && gen !== 2) continue
    if (!(Number(m.DropChance) > 0)) continue
    const row = { n: m.Name, g: gen, lines: [], refs: [], d: 0, r: 0, p: 0 }
    for (const line of plain(m.str ?? '')) {
      const b = BONUS.find(([re]) => re.test(line))
      if (b) { row[b[1]] = Number(line.match(b[0])[1]); continue }
      const more = line.match(MORE)
      if (more) { row.m = { ...row.m, [MORE_KEY[more[2]]]: Number(more[1]) }; continue }
      // poedb's raw stat names ("map extra content weighting [1]") have no text in game.
      if (/\[[\d,.-]+\]$/.test(line)) continue
      row.lines.push(line)
      const ref = refOf(line)
      if (ref) row.refs.push(ref)
      else unmatched.add(`${tier}: ${line}`)
    }
    if (!row.lines.length) continue
    const key = JSON.stringify([row.n, row.lines, row.d, row.r, row.p, row.m])
    const have = rows.get(key)
    if (have) { if (!have.t.includes(tier)) have.t.push(tier) } else rows.set(key, { ...row, t: [tier] })
    n++
  }
  console.log(`${slug}: ${n}`)
}

const mods = [...rows.values()].map(({ n, g, t, lines, refs, d, r, p, m }) => ({ n, g, t, lines, refs: [...new Set(refs)], d, r, p, ...(m ? { m } : {}) }))
const built = new Date().toISOString().slice(0, 10)
writeFileSync(OUT, JSON.stringify({ v: 1, source: 'poedb.tw', built, mods }) + '\n')
console.log(`${mods.length} mods -> ${OUT}`)
if (unmatched.size) console.log(`No stat for ${unmatched.size} lines:\n  ${[...unmatched].join('\n  ')}`)
