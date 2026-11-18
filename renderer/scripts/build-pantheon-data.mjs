// Builds the Pantheon table the Ctrl+Space search shows
// (public/data/pantheon-data.json, fetched when the palette opens, so it adds
// nothing to the JS bundle). Run it once a league, after PoB's game export:
//   npm run pantheon-data
// Sources: Path of Building's Pantheons.lua (the game's gods, souls and their
// powers) and, for each upgrade soul, the map poedb lists for that boss.
// A soul whose boss page poedb doesn't have, or lists no map for, keeps no map.
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, '../public/data/pantheon-data.json')
const POB = 'https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding/dev/src/Data/Pantheons.lua'
const UA = { 'User-Agent': 'Mozilla/5.0 (woke-poe-trade pantheon-data)' }

async function get (url) {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(120_000) })
  return { status: res.status, text: res.ok ? await res.text() : '' }
}

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
const unlua = (s) => s.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\')

// { id, major, souls: [{ name, lines }] } in the file's order.
export function parsePantheons (lua) {
  const gods = []
  let god = null
  let soul = null
  for (const line of lua.split(/\r?\n/)) {
    let m = /^\t\["(\w+)"\] = \{/.exec(line)
    if (m) {
      god = { id: m[1], major: false, souls: [] }
      gods.push(god)
      continue
    }
    if (!god) continue
    if (/isMajorGod = true/.test(line)) god.major = true
    m = /\{ name = "((?:[^"\\]|\\.)*)"/.exec(line)
    if (m) {
      soul = { name: unlua(m[1]), lines: [] }
      god.souls.push(soul)
      continue
    }
    m = /line = "((?:[^"\\]|\\.)*)"/.exec(line)
    if (m && soul) soul.lines.push(...unlua(m[1]).split('\n'))
  }
  return gods
}

// The map poedb gives the boss's first monster variety, as "Underground Sea".
// Only atlas maps (MapWorlds*): other areas are old atlases or league content.
async function mapOf (boss) {
  const { status, text } = await get(`https://poedb.tw/us/${encodeURIComponent(boss.replaceAll(' ', '_'))}`)
  if (status !== 200) return null
  const first = text.split('data-category="MonsterVarieties"')[1]
  const area = first ? /<th>Area<td>(.*?)<tr>/.exec(first)?.[1] : undefined
  const map = area ? /WorldAreas%2FMapWorlds[A-Za-z0-9_]+"[^>]*>([^<]+)</.exec(area)?.[1] : undefined
  return map ? decode(map).trim() : null
}

const { text: lua } = await get(POB)
const gods = parsePantheons(lua)
if (gods.length < 10) throw new Error(`too few gods: ${gods.length}`)
const missing = []
for (const god of gods) {
  // "Soul of the Brine King" -> "The Brine King".
  const first = god.souls[0]?.name ?? god.id
  const name = first.replace(/^Soul of /, '')
  god.name = name[0].toUpperCase() + name.slice(1)
  for (const soul of god.souls.slice(1)) {
    const map = await mapOf(soul.name)
    if (map) soul.map = map
    else missing.push(soul.name)
    await new Promise(resolve => setTimeout(resolve, 300))
  }
}
const out = gods.map(({ id, name, major, souls }) => ({ id, name, major, souls }))
writeFileSync(OUT, JSON.stringify({ gods: out }) + '\n')
console.log(`${out.length} gods, ${out.reduce((n, g) => n + g.souls.length - 1, 0)} upgrade souls -> ${OUT}`)
if (missing.length) console.log(`No map on poedb for: ${missing.join('; ')}`)
