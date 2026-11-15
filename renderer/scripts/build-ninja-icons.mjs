// Item art for poe.ninja categories whose items aren't in the game data yet
// (3.30 Viscera), for the Market window's Prices tab. poe.ninja's dense feed,
// which the app reads, has no art; its per-category overview does.
//
//   npm run ninja-icons -- <league> [Type ...]      e.g. Covens Viscera
//
// Writes public/data/league/ninja-icons.json: { Type: { "Item name": "<path>" } },
// the path after https://web.poecdn.com/gen/image/. Run it once a league; then
// run src/assets/bump-data-version.mjs.
// @ts-check
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public/data/league/ninja-icons.json')
const PREFIX = 'https://web.poecdn.com/gen/image/'

const [league, ...args] = process.argv.slice(2)
if (!league) {
  console.error('Usage: npm run ninja-icons -- <league> [Type ...]')
  process.exit(1)
}
const types = args.length ? args : ['Viscera']

/** @type {Record<string, Record<string, string>>} */
const out = {}
for (const type of types) {
  const url = `https://poe.ninja/poe1/api/economy/stash/current/item/overview?league=${encodeURIComponent(league)}&type=${encodeURIComponent(type)}`
  const res = await fetch(url, { headers: { 'User-Agent': 'woke-poe-trade ninja-icons' }, signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`${type}: HTTP ${res.status}`)
  const { lines } = /** @type {{ lines: Array<{ name: string, icon?: string }> }} */ (await res.json())
  /** @type {Record<string, string>} */
  const icons = {}
  for (const line of lines) {
    if (!line.icon?.startsWith(PREFIX) || icons[line.name]) continue
    icons[line.name] = line.icon.slice(PREFIX.length)
  }
  out[type] = Object.fromEntries(Object.entries(icons).sort(([a], [b]) => a.localeCompare(b)))
  console.log(`${type}: ${Object.keys(icons).length} items`)
}
fs.writeFileSync(OUT, JSON.stringify(out) + '\n')
