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

const OUT = path.resolve(import.meta.dirname, '../renderer/src/web/woke/loot-filter/day1-prices.json')
const GUESSES = path.resolve(import.meta.dirname, '../renderer/src/web/woke/loot-filter/item-guesses.json')
const UA = { 'User-Agent': 'woke-poe-trade day1-prices (GitHub Actions)' }

// poe.ninja's pages. Currency-style pages have their own history call.
// poe.ninja moved many pages to the exchange (currency) layout; each type
// is tried there first, then as an item page.
const CURRENCY_TYPES = ['Currency', 'Fragment', 'DivinationCard', 'Essence', 'Fossil', 'Resonator', 'Oil', 'DeliriumOrb', 'Omen', 'Tattoo', 'Scarab',
  'Vial', 'Artifact', 'Runegraft', 'AllflameEmber', 'Astrolabe', 'Ducat', 'EnshroudingCrystal']
// Exchange types with no exchange page go first, in their order.
let itemNext = 0
const ITEM_TYPES = [
  'Invitation', 'UniqueWeapon', 'UniqueArmour', 'UniqueAccessory', 'UniqueFlask', 'UniqueJewel', 'UniqueMap', 'UniqueRelic', 'UniqueTincture',
  'SkillGem', 'Map', 'BlightedMap', 'BlightRavagedMap', 'Beast', 'ClusterJewel'
]

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
// The job has 5 hours: stop asking after 4 and write what there is.
const DEADLINE = Date.now() + 4 * 3600e3
let late = 0

async function get (url, tries = 6) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: UA })
      if (res.status === 404) return null
      if (res.ok) return await res.json()
      // Too many requests: wait as long as poe.ninja asks, or a while.
      if (res.status === 429) await sleep((Number(res.headers.get('retry-after')) || 20) * 1000)
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

// A typical price over the whole league (Guy 2026-11-28, NeverSink
// retirement M1): the middle of every day's value, the league's first
// three days left out (they're the day-1 price). The Loot tab's guess for an
// item with no live price or a thin one, in place of NeverSink's tier guess.
export function typical (points) {
  const days = (points ?? [])
    .filter(p => p && Number.isFinite(p.daysAgo) && p.value > 0)
    .sort((a, b) => b.daysAgo - a.daysAgo)
  const vals = (days.length > 6 ? days.slice(3) : days).map(p => p.value).sort((a, b) => a - b)
  if (!vals.length) return null
  const mid = Math.floor(vals.length / 2)
  return vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2
}

// A few requests at a time, so poe.ninja isn't hammered.
async function pool (jobs, size = 2) {
  const out = []
  let next = 0
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < jobs.length) {
      const i = next++
      if (Date.now() > DEADLINE) { late++; continue }
      out[i] = await jobs[i]()
      await sleep(400)
    }
  }))
  return out
}

export function plainGems (lines) {
  const best = new Map()
  for (const l of lines) {
    if (l.corrupted) continue
    const b = best.get(l.name)
    if (!b || (l.gemLevel ?? 0) < (b.gemLevel ?? 0) || ((l.gemLevel ?? 0) === (b.gemLevel ?? 0) && (l.gemQuality ?? 0) < (b.gemQuality ?? 0))) best.set(l.name, l)
  }
  return [...best.values()]
}

const round = v => v >= 100 ? Math.round(v) : Number(v.toPrecision(3))

const NINJA = 'https://poe.ninja/poe1/api/economy/stash/current'
const CHALLENGE = l => l && !/Standard|Hardcore|Solo Self-Found|SSF|HC|Ruthless/i.test(l)

// A history answer in any of the shapes poe.ninja has used.
const pointsOf = h => Array.isArray(h) ? h : h?.receiveCurrencyGraphData ?? h?.data ?? h?.history ?? null

// poe.ninja moves its API now and then: try the history URLs it has used,
// on one item, and keep the first that answers with points. Logged.
async function pickHistory (templates, sample) {
  for (const t of templates) {
    const url = t(sample)
    const h = await get(url, 1)
    const pts = pointsOf(h)
    console.log(`history ${Array.isArray(pts) ? `ok (${pts.length} points)` : 'no'}: ${url}${h && !Array.isArray(pts) ? `\n  ${JSON.stringify(h).slice(0, 200)}` : ''}`)
    if (Array.isArray(pts) && pts.length) return t
  }
  return null
}

async function main () {
  let league = process.argv[2]
  if (!league) {
    // GGG's own list, as the app reads it.
    const list = await get('https://www.pathofexile.com/api/leagues?type=main&realm=pc')
    league = Array.isArray(list) ? list.map(l => l.id).find(CHALLENGE) : undefined
  }
  if (!league) throw new Error('No challenge league found.')
  const q = encodeURIComponent(league)
  console.log(`league ${league}`)
  const items = []
  const guesses = []

  for (const type of CURRENCY_TYPES) {
    const page = await get(`${NINJA}/currency/overview?league=${q}&type=${type}`)
    if (!page?.lines?.length) { ITEM_TYPES.splice(itemNext++, 0, type); continue }
    const idOf = new Map((page.currencyDetails ?? []).map(d => [d.name, d.id]))
    const jobs = page.lines.map(line => ({ name: line.currencyTypeName, id: idOf.get(line.currencyTypeName), details: line.detailsId }))
    const url = await pickHistory([
      j => `${NINJA}/currency/history?league=${q}&type=${type}&id=${j.id}`,
      j => `${NINJA}/currency/history?league=${q}&type=${type}&currencyId=${j.id}`,
      j => `${NINJA}/currency/history?league=${q}&type=${type}&detailsId=${j.details}`,
      j => `https://poe.ninja/api/data/currencyhistory?league=${q}&type=${type}&currencyId=${j.id}`
    ], jobs.find(j => j.id != null) ?? jobs[0])
    if (!url) { console.warn(`no history for ${type}`); continue }
    const rows = await pool(jobs.map(j => async () => {
      const pts = pointsOf(await get(url(j)))
      const v = firstDays(pts)
      const t = typical(pts)
      return [v ? [type, j.name, '', round(v)] : null, t ? [type, j.name, '', round(t)] : null]
    }))
    for (const [r, g] of rows.filter(Boolean)) {
      if (r) items.push(r)
      if (g) guesses.push(g)
    }
    console.log(`${type}: ${rows.filter(r => r?.[0]).length} of ${jobs.length}`)
  }
  const divine = items.find(r => r[0] === 'Currency' && r[1] === 'Divine Orb')?.[3] ?? null

  let itemUrl = null
  for (const type of ITEM_TYPES) {
    const page = await get(`${NINJA}/item/overview?league=${q}&type=${type}`)
    if (!page?.lines?.length) { console.warn(`no ${type} page`); continue }
    // Gems: only each gem's plainest line (lowest level, not corrupted), as
    // dropped; every level and quality would take hours.
    const lines = type === 'SkillGem' ? plainGems(page.lines) : page.lines.filter(l => !(l.links >= 5))
    itemUrl ??= await pickHistory([
      (l, t = type) => `${NINJA}/item/history?league=${q}&type=${t}&id=${l.id}`,
      (l, t = type) => `${NINJA}/item/history?league=${q}&type=${t}&itemId=${l.id}`,
      (l, t = type) => `${NINJA}/item/history?league=${q}&type=${t}&detailsId=${l.detailsId}`,
      (l, t = type) => `https://poe.ninja/api/data/itemhistory?league=${q}&type=${t}&itemId=${l.id}`
    ], lines[0])
    if (!itemUrl) { console.warn('no item history'); break }
    const rows = await pool(lines.map(line => async () => {
      const pts = pointsOf(await get(itemUrl(line, type)))
      const variant = line.variant ?? (line.gemLevel ? `${line.gemLevel}/${line.gemQuality ?? 0}${line.corrupted ? 'c' : ''}` : '')
      const v = firstDays(pts)
      const t = typical(pts)
      return [v ? [type, line.name, variant, round(v)] : null, t ? [type, line.name, variant, round(t)] : null]
    }))
    for (const [r, g] of rows.filter(Boolean)) {
      if (r) items.push(r)
      if (g) guesses.push(g)
    }
    console.log(`${type}: ${rows.filter(r => r?.[0]).length} of ${lines.length}`)
  }

  if (late) console.warn(`out of time: ${late} items not asked`)
  if (items.length < 500) throw new Error(`Only ${items.length} items priced: poe.ninja's history may have changed. Not writing.`)
  items.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]) || a[2].localeCompare(b[2]))
  const made = new Date().toISOString().slice(0, 10)
  await fs.writeFile(OUT, JSON.stringify({ league, made, divine, items }) + '\n')
  // Read first by the app, to skip the table in the league it came from.
  await fs.writeFile(OUT.replace(/\.json$/, '.meta.json'), JSON.stringify({ league, made, count: items.length }) + '\n')
  console.log(`wrote ${items.length} items to ${path.relative(process.cwd(), OUT)}`)
  // The guesses: always read by the Loot tab, so only what it can use (no
  // gem levels: gems are priced by live bands).
  const kept = guesses.filter(g => g[0] !== 'SkillGem').sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]) || a[2].localeCompare(b[2]))
  await fs.writeFile(GUESSES, JSON.stringify({ league, made, items: kept }) + '\n')
  console.log(`wrote ${kept.length} guesses to ${path.relative(process.cwd(), GUESSES)}`)
}

if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) {
  main().catch(e => { console.error(e); process.exit(1) })
}
