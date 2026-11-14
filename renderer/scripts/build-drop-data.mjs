// Builds public/data/tips/drops.json: uniques that don't drop anywhere, and
// where the ones with a restricted drop come from. The item tooltip says so,
// since a unique that only drops from a boss or a league mechanic won't turn up
// as a random drop on its base. Run it once a league, next to tip-data:
//
//   npm run drop-data
//
// Source: the PoE wiki's item table (drop_enabled, is_drop_restricted, drop_text).
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public/data/tips')
const UA = 'woke-poe-trade drop-data'
const PAGE = 500

// "[[Page|Shown]]" and "[[Page]]" links, HTML entities, and markup the
// tooltip can't draw.
function plainText (s) {
  return s
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/'''?/g, '')
    .replace(/&#0?39;/g, '\'')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

async function page (offset) {
  const url = 'https://www.poewiki.net/w/api.php?' + new URLSearchParams({
    action: 'cargoquery',
    tables: 'items',
    fields: 'name,drop_enabled,is_drop_restricted,drop_text',
    where: 'rarity_id="unique" AND (is_drop_restricted=1 OR drop_enabled=0)',
    order_by: 'name',
    limit: String(PAGE),
    offset: String(offset),
    format: 'json'
  })
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status} from ${url}`)
  const body = await res.json()
  if (!Array.isArray(body.cargoquery)) throw new Error(`No rows from ${url}: ${JSON.stringify(body).slice(0, 200)}`)
  return body.cargoquery.map(r => r.title)
}

async function main () {
  // name -> { d: 1 } doesn't drop, or { r: 1, t?: "where from" } restricted.
  const out = {}
  for (let offset = 0; ; offset += PAGE) {
    const rows = await page(offset)
    for (const row of rows) {
      const name = plainText(row.name ?? '')
      if (!name) continue
      const entry = row['drop enabled'] === '0' ? { d: 1 } : { r: 1 }
      const text = plainText(row['drop text'] ?? '')
      if (text) entry.t = text
      // A name listed twice (variants, Foulborn): a droppable one wins.
      const had = out[name]
      if (had && had.r && entry.d) continue
      out[name] = had?.t && !entry.t ? { ...entry, t: had.t } : entry
    }
    if (rows.length < PAGE) break
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  mkdirSync(OUT, { recursive: true })
  const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a < b ? -1 : 1))
  const text = JSON.stringify(sorted)
  writeFileSync(join(OUT, 'drops.json'), text)
  const n = Object.values(out)
  console.log(`drops.json: ${n.length} uniques (${n.filter(e => e.d).length} don't drop), ${(text.length / 1024).toFixed(0)} KB`)
}

await main()
