// Builds public/data/league-invest/leagues.json from poe.ninja
// league dump CSVs (https://poe.ninja/poe1/data), so the investments widget
// has past leagues without the player importing anything.
//
//   npx tsx scripts/build-invest-bundle.ts <dir with *.items.csv / *.currency.csv>
//
// Only challenge softcore leagues are kept (no Standard, Hardcore, Ruthless),
// and only items that could ever be ranked: medium/high confidence on some
// early days (5 of the first 15) and worth at least 5c at some point.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { DumpImporter } from '../src/web/woke/league-invest/dumps'
import type { LeagueHistory } from '../src/web/woke/league-invest/dumps'

const dir = process.argv[2]
if (!dir) throw new Error('Usage: build-invest-bundle.ts <dump dir>')

const importer = new DumpImporter()
for (const f of readdirSync(dir)) {
  if (/\.(items|currency)\.csv$/i.test(f)) importer.addCsv(readFileSync(path.join(dir, f), 'utf8'))
}

const SKIP = /^(Standard|Hardcore)$|Hardcore|Ruthless|^HC |^SSF|Solo Self-Found/i
const round = (v: number | null) => v == null ? null : Number(v.toPrecision(4))

const out: LeagueHistory[] = []
for (const league of importer.leagues()) {
  if (SKIP.test(league)) continue
  const h = importer.build(league, 5)
  const items = h.items.filter(i => i.conf.slice(0, 15).filter(c => c >= 1).length >= 5)
  if (!items.length) continue
  out.push({
    ...h,
    imported: 0,
    divine: h.divine.map(round),
    items: items.map(i => ({ ...i, div: i.div.map(round) }))
  })
  console.log(`${league}: ${items.length} items, ${h.days} days from ${h.start}`)
}

const target = path.join(__dirname, '../public/data/league-invest')
mkdirSync(target, { recursive: true })
// Empty variant/links and imported are left out (store.ts fills them in): 16 KB less JS.
const slim = out.map(({ imported: _, ...h }) => ({
  ...h,
  items: h.items.map(({ variant, links, ...i }) => ({ ...i, ...(variant ? { variant } : {}), ...(links ? { links } : {}) }))
}))
writeFileSync(path.join(target, 'leagues.json'), JSON.stringify(slim))
console.log(`Wrote ${out.length} league(s)`)
