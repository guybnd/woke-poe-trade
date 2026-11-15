// Builds public/data/mod-tiers.json: every prefix and suffix that can roll on
// each kind of gear, with its tier family, level and value ranges, from
// poedb.tw's item class pages (current for the league as soon as poedb is;
// RePoE lags). The build window's tooltips use it to give a PoB or character
// item's mods their tier and roll, as the trade site does for listings.
//
//   npm run mod-tiers
//
// One page at a time with a pause between, cached in .mod-tiers-cache/ so a
// second run reads nothing from the site.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RENDERER = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(RENDERER, 'public/data/mod-tiers.json')
const CACHE = join(RENDERER, '.mod-tiers-cache')
const UA = { 'User-Agent': 'Mozilla/5.0 (woke-poe-trade mod-tiers)' }

const ARMOUR = ['str', 'dex', 'int', 'str_dex', 'str_int', 'dex_int']
// The app's class key -> poedb page.
const PAGES = {
  ...Object.fromEntries(['Helmets', 'Gloves', 'Boots', 'Shields'].flatMap(c => ARMOUR.map(a => [`${c}_${a}`, `${c}_${a}`]))),
  ...Object.fromEntries([...ARMOUR, 'str_dex_int'].map(a => [`Body_Armours_${a}`, `Body_Armours_${a}`])),
  Rings: 'Rings',
  Amulets: 'Amulets',
  Belts: 'Belts',
  Quivers: 'Quivers',
  One_Hand_Swords: 'One_Hand_Swords',
  Thrusting_One_Hand_Swords: 'Thrusting_One_Hand_Swords',
  One_Hand_Axes: 'One_Hand_Axes',
  One_Hand_Maces: 'One_Hand_Maces',
  Sceptres: 'Sceptres',
  Daggers: 'Daggers',
  Rune_Daggers: 'Rune_Daggers',
  Claws: 'Claws',
  Wands: 'Wands',
  Two_Hand_Swords: 'Two_Hand_Swords',
  Two_Hand_Axes: 'Two_Hand_Axes',
  Two_Hand_Maces: 'Two_Hand_Maces',
  Staves: 'Staves',
  Warstaves: 'Warstaves',
  Bows: 'Bows'
}

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

// The first `new ModsView({...})` on the page: the item class's own mods.
function modsView (html) {
  const at = html.indexOf('new ModsView(')
  if (at < 0) return null
  const start = at + 'new ModsView('.length
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
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) { i++; break }
  }
  return JSON.parse(html.slice(start, i))
}

// "<span class='mod-value'>+(25<span class="ndash">—</span>39)</span> to maximum Life" -> "+(25-39) to maximum Life"
function plain (html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<span class="ndash">[^<]*<\/span>/g, '-')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&#39;/g, '\'').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/—/g, '-')
    .split('\n').map(l => l.trim()).filter(Boolean).join('\n')
}

const texts = []
const textIndex = new Map()
const textId = (t) => {
  let id = textIndex.get(t)
  if (id == null) { id = texts.length; texts.push(t); textIndex.set(t, id) }
  return id
}

const classes = {}
for (const [key, slug] of Object.entries(PAGES)) {
  const view = modsView(await page(slug))
  if (!view || !Array.isArray(view.normal)) { console.warn(`no mods on ${slug}`); continue }
  const rows = []
  for (const m of view.normal) {
    // 1 prefix, 2 suffix: the only ones with tiers.
    const gen = Number(m.ModGenerationTypeID)
    if (gen !== 1 && gen !== 2) continue
    // Mods that never roll on their own (essence-only and the like) aren't tiers.
    if (!(Number(m.DropChance) > 0)) continue
    const text = plain(m.str ?? '')
    if (!text) continue
    const family = (m.ModFamilyList ?? []).join('+')
    rows.push([textId(text), family, gen, Number(m.Level) || 1])
  }
  classes[key] = rows
  console.log(`${key}: ${rows.length}`)
}

const out = JSON.stringify({ v: 1, source: 'poedb.tw', built: new Date().toISOString().slice(0, 10), texts, classes })
writeFileSync(OUT, out)
console.log(`${texts.length} mod texts, ${out.length} bytes -> ${OUT}`)
