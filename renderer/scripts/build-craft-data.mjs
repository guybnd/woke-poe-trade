// Builds the crafting bench and Harvest craft table the Ctrl+Space search
// shows (public/data/craft-data.json, fetched when the palette opens, so it
// adds nothing to the JS bundle). Run it once a league,
// after poedb has the new patch:
//   npm run craft-data
// Sources: poedb's Crafting Bench and Horticrafting pages (the game's data,
// current patch), and RePoE's mods.json for which crafted mods are prefixes.
// A mod RePoE doesn't know yet (new this patch) has no affix side.
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, '../public/data/craft-data.json')
const UA = { 'User-Agent': 'Mozilla/5.0 (woke-poe-trade craft-data)' }

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
// poedb writes skill links as "[SummonSpectralWolf::10|Summon Spectral Wolf]".
const strip = (s) => decode(s.replace(/<[^>]+>/g, '')).replace(/\[[^\]|]+\|([^\]]+)\]/g, '$1').replace(/\s+/g, ' ').trim()

function cells (row) {
  return [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => m[1])
}

// The rows of the table that follows a page heading such as "Crafting Bench /800".
function tableAfter (html, heading) {
  const at = html.search(heading)
  if (at < 0) throw new Error(`no ${heading} on the page`)
  const start = html.indexOf('<table', at)
  const end = html.indexOf('</table>', start)
  return [...html.slice(start, end).matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(m => m[1])
}

// "4x <a>Orb of Alchemy</a>" (bench) or "<a>Wild …</a> x300" (Harvest).
function costs (cell) {
  const out = []
  for (const m of cell.matchAll(/(?:([\d,]+)x\s*)?<a[^>]*>(?:<img[^>]*>)?([^<]+)<\/a>(?:\s*x([\d,]+))?/g)) {
    const qty = Number((m[1] ?? m[3] ?? '1').replaceAll(',', ''))
    out.push([qty, decode(m[2]).trim()])
  }
  return out
}

async function bench (sides) {
  const html = await get('https://poedb.tw/us/Crafting_Bench')
  const rows = tableAfter(html, /Crafting Bench \/\d+/)
  const list = []
  for (const row of rows) {
    const [mod, cost, classes, unlock] = cells(row)
    if (unlock === undefined) continue
    const id = mod.match(/Mods%2F([A-Za-z0-9_]+)/)?.[1]
    const body = mod.match(/<span class="(?:explicitMod|enchantMod)">([\s\S]*)<\/span>\s*$/)?.[1]
    let lines, family
    if (body) {
      // Hidden stats ("map extra content weighting [1]") are poedb's extras.
      const shown = body
        .replace(/<span class="secondary">[\s\S]*?<\/span>/g, '')
        .replace(/<span class="ndash">[^<]*<\/span>/g, '–')
      const parts = shown.split(/<br\s*\/?>/)
      lines = parts.map(strip).filter(Boolean)
      family = parts.map(p => strip(p.replace(/<span class='mod-value'>[\s\S]*?<\/span>(?=[^<]*(?:<|$))/g, '#'))).filter(Boolean).join(' / ')
    } else {
      lines = [strip(mod)]
      family = null
    }
    if (!lines.length || !lines[0]) continue
    const group = unlock.match(/title="([^"]+)"/)?.[1]
    // Socket crafts are plain text: their tooltip group ("Socket Links - 5 Linked Sockets").
    if (!family) family = group ? group.split(' - ')[0] : lines[0]
    const side = id ? sides.get(id) : undefined
    list.push({
      f: family,
      t: lines.join('\n'),
      c: costs(cost),
      i: strip(classes).split(' · ').map(s => s.trim()).filter((s, k, a) => s && a.indexOf(s) === k),
      u: strip(unlock),
      ...(side ? { s: side } : {})
    })
  }
  // The same craft under different item lists (weapons / armour / jewellery): one row.
  const merged = new Map()
  for (const r of list) {
    const key = `${r.t}|${JSON.stringify(r.c)}|${r.u}`
    const had = merged.get(key)
    if (had) had.i = [...new Set([...had.i, ...r.i])]
    else merged.set(key, r)
  }
  return [...merged.values()]
}

async function harvest () {
  const html = await get('https://poedb.tw/us/Horticrafting')
  const rows = tableAfter(html, /Horticrafting Station \/\d+/)
  const list = []
  for (const row of rows) {
    const [text, cost] = cells(row)
    if (!cost) continue
    list.push({ t: strip(text), c: costs(cost) })
  }
  return list
}

async function affixSides () {
  const mods = JSON.parse(await get('https://raw.githubusercontent.com/repoe-fork/repoe-fork.github.io/master/data/mods.json'))
  const sides = new Map()
  for (const [id, m] of Object.entries(mods)) {
    if (m.generation_type === 'prefix') sides.set(id, 'p')
    else if (m.generation_type === 'suffix') sides.set(id, 's')
  }
  return sides
}

// Compact: currency and item class names once, tiers under their mod family.
//   cur: currency names; cls: item class names
//   bench: [{ f: family, s?: 'p'|'s', r: [[text, [[qty, cur#]], [cls#], unlock]] }]
//   harvest: [[text, [[qty, cur#]]]]
const sides = await affixSides()
const rows = await bench(sides)
const crafts = await harvest()
if (rows.length < 400 || crafts.length < 40) throw new Error(`too few rows: ${rows.length} bench, ${crafts.length} harvest`)
const cur = []
const cls = []
const idx = (list, name) => { let i = list.indexOf(name); if (i < 0) { i = list.length; list.push(name) } return i }
const cost = (c) => c.map(([q, name]) => [q, idx(cur, name)])
const families = new Map()
for (const r of rows) {
  const fam = families.get(r.f) ?? { f: r.f, r: [], sides: new Set() }
  if (r.s) fam.sides.add(r.s)
  fam.r.push([r.t, cost(r.c), r.i.map(n => idx(cls, n)), r.u])
  families.set(r.f, fam)
}
const bench_ = [...families.values()].map(({ f, r, sides }) => {
  const one = sides.size === 1 ? [...sides][0] : undefined
  return { f, ...(one ? { s: one } : {}), r }
})
const data = { cur, cls, bench: bench_, harvest: crafts.map(h => [h.t, cost(h.c)]) }
writeFileSync(OUT, JSON.stringify(data) + '\n')
console.log(`${rows.length} bench rows in ${families.size} families, ${crafts.length} Harvest crafts -> ${OUT}`)
