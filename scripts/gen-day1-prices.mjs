// Day-1 prices (Guy 2026-11-27): what every item poe.ninja lists was worth
// on the first three days of a league, the middle of the three. The loot
// filter falls back on them when live prices are missing (the first hours
// of a new league, or an item poe.ninja has no line for yet).
//
// Reads poe.ninja's full-league daily history, one request per item, so it
// runs in GitHub Actions (day1-prices.yml), not in the app.
//
//   node scripts/gen-day1-prices.mjs [league]
//
// Writes renderer/src/web/woke/loot-filter/day1-prices.json:
//   { league, made, divine, items: [[type, name, variant, chaos], ...] }
import fs from 'node:fs/promises'
import path from 'node:path'

const API = 'https://poe.ninja/api/data'
const OUT = path.resolve(import.meta.dirname, '../renderer/src/web/woke/loot-filter/day1-prices.json')
const UA = { 'User-Agent': 'woke-poe-trade day1-prices (GitHub Actions)' }

// poe.ninja's pages. Currency-style pages have their own history call.
const CURRENCY_TYPES = ['Currency', 'Fragment']
const ITEM_TYPES = [
  'DivinationCard', 'Essence', 'Fossil', 'Resonator', 'Oil', 'DeliriumOrb', 'Omen', 'Tattoo', 'Scarab',
  'Vial', 'Invitation', 'Artifact', 'Runegraft', 'AllflameEmber', 'Astrolabe', 'Ducat', 'EnshroudingCrystal',
  'UniqueWeapon', 'UniqueArmour', 'UniqueAccessory', 'UniqueFlask', 'UniqueJewel', 'UniqueMap', 'UniqueRelic', 'UniqueTincture',
  'SkillGem', 'Map', 'BlightedMap', 'BlightRavagedMap', 'Beast', 'ClusterJewel'
]

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function get (url, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: UA })
      if (res.status === 404) return null
      if (res.ok) return await res.json()
      throw new Error(`HTTP ${res.status}`)
    } catch (e) {
      if (i >= tries) {
        console.warn(`gave up on ${url}: ${e.message}`)
        return null
      }
      await sleep(1500 * i * i)
    }
  }
}

// The league's first three days: the points with the most days ago.
// Their middle value (the median of three), or of what there is.
export function firstDays (points) {
  const vals = (points ?? [])
    .filter(p => p && Number.isFinite(p.daysAgo) && p.value > 0)
    .sort((a, b) => b.daysAgo - a.daysAgo)
    .slice(0, 3)
    .map(p => p.value)
    .sort((a, b) => a - b)
  if (!vals.length) return null
  return vals[Math.floor(vals.length / 2)]
}

// A few requests at a time, so poe.ninja isn't hammered.
async function pool (jobs, size = 4) {
  const out = []
  let next = 0
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < jobs.length) {
      const i = next++
      out[i] = await jobs[i]()
      await sleep(150)
    }
  }))
  return out
}

const round = v => v >= 100 ? Math.round(v) : Number(v.toPrecision(3))

async function main () {
  let league = process.argv[2]
  if (!league) {
    const index = await get(`${API}/getindexstate`)
    league = index?.economyLeagues?.find(l => !/Standard|Hardcore|HC|SSF|Ruthless/i.test(l.name))?.name
    if (!league) throw new Error('No challenge league in poe.ninja\'s index.')
  }
  const q = encodeURIComponent(league)
  console.log(`league ${league}`)
  const items = []
  let divine = null

  for (const type of CURRENCY_TYPES) {
    const page = await get(`${API}/currencyoverview?league=${q}&type=${type}`)
    if (!page?.lines) { console.warn(`no ${type} page`); continue }
    const idOf = new Map((page.currencyDetails ?? []).map(d => [d.name, d.id]))
    const rows = await pool(page.lines.map(line => async () => {
      const id = idOf.get(line.currencyTypeName)
      if (id == null) return null
      const h = await get(`${API}/currencyhistory?league=${q}&type=${type}&currencyId=${id}`)
      const v = firstDays(h?.receiveCurrencyGraphData)
      return v ? [type, line.currencyTypeName, '', round(v)] : null
    }))
    for (const r of rows) if (r) items.push(r)
    console.log(`${type}: ${rows.filter(Boolean).length} of ${page.lines.length}`)
  }
  divine = items.find(r => r[0] === 'Currency' && r[1] === 'Divine Orb')?.[3] ?? null

  for (const type of ITEM_TYPES) {
    const page = await get(`${API}/itemoverview?league=${q}&type=${type}`)
    if (!page?.lines) { console.warn(`no ${type} page`); continue }
    const lines = page.lines.filter(l => !(l.links >= 5))
    const rows = await pool(lines.map(line => async () => {
      const h = await get(`${API}/itemhistory?league=${q}&type=${type}&itemId=${line.id}`)
      const v = firstDays(Array.isArray(h) ? h : h?.data)
      return v ? [type, line.name, line.variant ?? (line.gemLevel ? `${line.gemLevel}/${line.gemQuality ?? 0}${line.corrupted ? 'c' : ''}` : ''), round(v)] : null
    }))
    for (const r of rows) if (r) items.push(r)
    console.log(`${type}: ${rows.filter(Boolean).length} of ${lines.length}`)
  }

  if (items.length < 500) throw new Error(`Only ${items.length} items priced: poe.ninja's history may have changed. Not writing.`)
  items.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]) || a[2].localeCompare(b[2]))
  await fs.writeFile(OUT, JSON.stringify({ league, made: new Date().toISOString().slice(0, 10), divine, items }) + '\n')
  console.log(`wrote ${items.length} items to ${path.relative(process.cwd(), OUT)}`)
}

if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) {
  main().catch(e => { console.error(e); process.exit(1) })
}
