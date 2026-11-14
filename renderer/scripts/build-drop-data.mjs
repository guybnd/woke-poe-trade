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

// The wiki sends its markup HTML-escaped. An item link is a hoverbox: a small
// icon ("16x16px|link=|alt=Name") and a whole item box shown on hover.
const decode = (s) => s
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&#0?39;/g, '\'')
  .replace(/&quot;/g, '"')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&#91;/g, '[')
  .replace(/&#93;/g, ']')

// Drops every <span> whose class says it's only shown on hover, with all that's
// inside it, however deep.
function dropHoverDisplays (s) {
  let out = ''
  let skipDepth = 0
  for (const m of s.matchAll(/(<span\b[^>]*>)|(<\/span>)|([^<]+|<)/g)) {
    if (m[1]) {
      if (skipDepth) skipDepth++
      else if (/hoverbox__display/.test(m[1])) skipDepth = 1
      else out += m[1]
    } else if (m[2]) {
      if (skipDepth) skipDepth--
      else out += m[2]
    } else if (!skipDepth) out += m[3]
  }
  return out
}

// "[[Page|Shown]]" and "[[Page]]" links, entities, and markup the tooltip
// can't draw, down to plain text.
function plainText (s) {
  return dropHoverDisplays(decode(s))
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/\d+x\d+px\|link=[^|<]*\|alt=([^<]*)/g, '$1')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\[(?:confirmation|citation) needed\]/gi, '')
    .replace(/'''?/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function page (offset) {
  const url = 'https://www.poewiki.net/w/api.php?' + new URLSearchParams({
    action: 'cargoquery',
    tables: 'items',
    fields: 'name,drop_enabled,is_drop_restricted,drop_text',
    // Every unique: a name with any row that drops at random is left out.
    where: 'rarity_id="unique"',
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
  // name -> { d: 1 } drop disabled, or { r: 1 } restricted; t: where from.
  const out = {}
  const droppable = new Set()
  for (let offset = 0; ; offset += PAGE) {
    const rows = await page(offset)
    for (const row of rows) {
      const name = plainText(row.name ?? '')
      if (!name) continue
      if (row['drop enabled'] !== '0' && row['is drop restricted'] !== '1') {
        droppable.add(name)
        continue
      }
      const entry = row['drop enabled'] === '0' ? { d: 1 } : { r: 1 }
      const text = plainText(row['drop text'] ?? '')
      if (text) entry.t = text
      // Listed twice: restricted beats drop disabled, and a text beats none.
      const had = out[name]
      if (had?.r && entry.d) continue
      out[name] = had?.t && !entry.t ? { ...entry, t: had.t } : entry
    }
    if (rows.length < PAGE) break
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  for (const name of droppable) delete out[name]
  mkdirSync(OUT, { recursive: true })
  const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a < b ? -1 : 1))
  const text = JSON.stringify(sorted)
  writeFileSync(join(OUT, 'drops.json'), text)
  const n = Object.values(out)
  console.log(`drops.json: ${n.length} uniques (${n.filter(e => e.d).length} don't drop), ${(text.length / 1024).toFixed(0)} KB`)
}

await main()
