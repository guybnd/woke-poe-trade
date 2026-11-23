// Builds public/data/card-drops.json: where each divination card drops. The
// Ctrl+Space search lists a card's maps and other sources, and a map's cards
// by price. Run it once a league:
//
//   npm run card-drops
//
// Source: the community Divcord sheet (verified drop sources), as parsed by
// divicards (github.com/shonya3/divicards-site, gen/json): the current atlas
// maps for each card, verified sources (campaign zones, bosses, league
// content) and the lowest area level; the weights are the Prohibited
// Library's stacked-deck sheet, also via divicards.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public/data/card-drops.json')
const BASE = 'https://raw.githubusercontent.com/shonya3/divicards-site/main/gen/json'
const UA = { 'User-Agent': 'woke-poe-trade card-drops' }

async function get (file) {
  const res = await fetch(`${BASE}/${file}`, { headers: UA, signal: AbortSignal.timeout(120_000) })
  if (!res.ok) throw new Error(`${res.status} from ${file}`)
  return res.json()
}

// The latest league's weights: "3.29" sorts after "3.9".
function latest (weights) {
  const keys = Object.keys(weights ?? {})
  if (!keys.length) return null
  const num = k => k.split('.').map(Number)
  keys.sort((a, b) => { const [x, y] = [num(a), num(b)]; return (x[0] - y[0]) || (x[1] - y[1]) })
  return keys[keys.length - 1]
}

// One verified source as a short line for the card.
export function sourceText (src, acts) {
  if (src.kind === 'category') return src.id
  if (src.type === 'Act') {
    const a = acts.get(src.id)
    return a ? `${a.name} (Act ${a.act})` : null
  }
  if (src.type === 'Map') return src.id
  // "Delve chest" (Chest), "Omniphobia (maps only)" (Maps Only): the name says it.
  if (src.id.toLowerCase().includes(src.type.toLowerCase()) || src.id.endsWith(')')) return src.id
  return `${src.id} (${src.type})`
}

export function buildCardDrops (poeData, records) {
  const acts = new Map(poeData.acts.map(a => [a.id, a]))
  const maps = {}
  for (const m of poeData.maps) maps[m.name] = m.tier
  const cards = {}
  let total = 0
  const season = latest(Object.values(poeData.cards.dict).find(c => c.weights)?.weights)
  for (const c of Object.values(poeData.cards.dict)) total += c.weights?.[season] ?? 0
  for (const c of Object.values(poeData.cards.dict)) {
    const e = {}
    if (c.disabled) e.x = 1
    const atlas = (c.atlasMaps ?? []).filter(m => maps[m] != null)
    if (atlas.length) e.m = atlas.sort((a, b) => maps[b] - maps[a] || (a < b ? -1 : 1))
    if (c.minLevel) e.l = c.minLevel
    const w = c.weights?.[season]
    // "1 in N cards": a share of every card that drops.
    if (w && total) e.w = Math.round(total / w)
    cards[c.name] = e
  }
  for (const r of records) {
    const e = cards[r.card]
    if (!e) continue
    for (const src of r.sources) {
      if (src.type === 'Disabled') { e.x = 1; continue }
      const text = sourceText(src, acts)
      if (!text) continue
      // An atlas map is already a chip.
      if (src.type === 'Map' && e.m?.includes(text)) continue
      ;(e.s ??= [])
      if (!e.s.includes(text)) e.s.push(text)
    }
  }
  return { season, maps, cards }
}

async function main () {
  const [poeData, records] = await Promise.all([get('poeData.json'), get('records.json')])
  const out = buildCardDrops(poeData, records)
  const sorted = { ...out, cards: Object.fromEntries(Object.entries(out.cards).sort(([a], [b]) => a < b ? -1 : 1)) }
  mkdirSync(dirname(OUT), { recursive: true })
  const text = JSON.stringify(sorted)
  writeFileSync(OUT, text)
  const list = Object.values(out.cards)
  console.log(`card-drops.json: ${list.length} cards, ${list.filter(c => c.m).length} on atlas maps, ${list.filter(c => c.s).length} with other sources, weights ${out.season}, ${(text.length / 1024).toFixed(0)} KB`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
