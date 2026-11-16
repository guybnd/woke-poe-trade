// Builds the Blood Altar recipe table the Ctrl+Space search shows
// (public/data/bestiary-data.json, fetched when the palette opens, so it adds
// nothing to the JS bundle). Run it once a league, after poedb has the patch:
//   npm run bestiary-data
// Source: poedb's Bestiary Recipe page (the game's recipes, current patch) and
// its Bestiary page's boss drops (what each spirit boss's den drops).
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, '../public/data/bestiary-data.json')
const UA = { 'User-Agent': 'Mozilla/5.0 (woke-poe-trade bestiary-data)' }

async function get (url) {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(120_000) })
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return await res.text()
}

function decode (s) {
  return s
    .replace(/<span class="ndash">[^<]*<\/span>/g, '–')
    .replace(/&ndash;|&#8211;|—/g, '–')
    .replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
}
const strip = (s) => decode(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()

// Each recipe: { g: "Create a Unique", r: "Ring", n: [notes], b: [named beasts], a: any rare slots, red?: red beast slots }
async function recipes () {
  const html = await get('https://poedb.tw/us/Bestiary_Recipe')
  const at = html.search(/Bestiary Recipe \/\d+/)
  if (at < 0) throw new Error('no recipe table on the page')
  const table = html.slice(html.indexOf('<table', at), html.indexOf('</table>', at))
  const out = []
  for (const [, row] of table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1])
    if (cells.length < 2) continue
    // "Group: Result<br>Note<div class="explicitMod">Mod line<br/>Mod line</div>"
    const lines = cells[0].replace(/<\/?div[^>]*>/g, '<br>').split(/<br\s*\/?>/).map(strip).filter(Boolean)
    const head = lines.shift() ?? ''
    const colon = head.indexOf(': ')
    if (colon < 0) continue
    const g = head.slice(0, colon)
    const r = head.slice(colon + 2)
    // poedb repeats a skill's name as a link under "Aspect of the Cat skill".
    const n = lines.filter(l => !r.includes(l))
    const b = [...cells[1].matchAll(/<a [^>]*href="\/us\/([^"]+)"/g)].map(m => decodeURIComponent(m[1]).replace(/_/g, ' '))
    // Flask recipes start with a slot for any red (unique) beast, drawn with the same art.
    const red = (cells[1].match(/title="AnyRedBeast/g) ?? []).length
    const a = (cells[1].match(/AspectAll\.webp/g) ?? []).length - red
    if (!b.length && !a && !red) continue
    out.push({ g, r, ...(n.length ? { n } : {}), b, a, ...(red ? { red } : {}) })
  }
  return out
}

// The spirit bosses' uniques, by the boss's name: "Farrul" -> Farrul's Bite...
async function denDrops () {
  const html = await get('https://poedb.tw/us/Bestiary')
  const at = html.indexOf('>Boss Drops<')
  if (at < 0) throw new Error('no boss drops on the Bestiary page')
  const list = html.slice(at, html.indexOf('</ul>', at))
  const drops = {}
  for (const [, name] of list.matchAll(/class="UniqueItems[^"]*"[^>]*>([^<]+)<\/a>/g)) {
    const item = decode(name).trim()
    const boss = item.match(/^([A-Z][a-z]+)'/)?.[1]
    if (boss) (drops[boss] ??= []).push(item)
  }
  return drops
}

const list = await recipes()
const dens = await denDrops()
if (list.length < 60) throw new Error(`too few recipes: ${list.length}`)
if (Object.keys(dens).length < 4) throw new Error(`too few dens: ${Object.keys(dens).join(', ')}`)
writeFileSync(OUT, JSON.stringify({ recipes: list, dens }) + '\n')
console.log(`${list.length} recipes, dens ${Object.keys(dens).join(', ')} -> ${OUT}`)
