// What each essence forces on each item slot, for the essence's tooltip
// (Guy's pick I6 in the tooltip audit, 2026-11-25).
//
//   npm run essence-data                    fetch Path of Building's data
//   npm run essence-data -- <folder>        read Essence.lua, ModExplicit.lua and ModItemExclusive.lua from a folder
//
// Path of Building's src/Data/Essence.lua names each essence's mod per slot
// by id; ModExplicit.lua and ModItemExclusive.lua give each id's lines. Read
// as text with regular expressions, never run.
//
// Writes public/data/tips/essences.json:
//   { "<essence>": [[slots[], lines[]], ...] }, slots with the same lines together.
// Then run src/assets/bump-data-version.mjs.
// @ts-check
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const POB = 'https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding/dev/src/Data/'
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public/data/tips/essences.json')

/** @param {string} name */
async function source (name) {
  const dir = process.argv[2]
  if (dir) return fs.readFileSync(path.join(dir, `${name}.lua`), 'utf8')
  const res = await fetch(`${POB}${name}.lua`, { signal: AbortSignal.timeout(120_000) })
  if (!res.ok) throw new Error(`${name}: ${res.status}`)
  return await res.text()
}

/** @param {string} s */
const unquote = (s) => s.replace(/\\(.)/g, '$1')

/**
 * Each mod id's lines: the quoted strings that aren't a key's value, before statOrder.
 * @param {string} lua
 * @param {Set<string>} wanted
 * @param {Record<string, string[]>} out
 */
export function modLines (lua, wanted, out = {}) {
  for (const m of lua.matchAll(/^\t\["([^"]+)"\] = \{ (.*)$/gm)) {
    if (!wanted.has(m[1]) || out[m[1]]) continue
    const head = m[2].split(/\bstatOrder = /)[0]
    const lines = [...head.matchAll(/(?:^|, )"((?:[^"\\]|\\.)*)"/g)].map(x => unquote(x[1]))
    if (lines.length) out[m[1]] = lines
  }
  return out
}

/**
 * @param {string} lua
 * @returns {Array<{ name: string, mods: Record<string, string> }>}
 */
export function essencesIn (lua) {
  const out = []
  for (const m of lua.matchAll(/name = "([^"]+)", [^\n]*?mods = \{ ([^}]*)\}/g)) {
    /** @type {Record<string, string>} */
    const mods = {}
    for (const s of m[2].matchAll(/\["([^"]+)"\] = "([^"]+)"/g)) mods[s[1]] = s[2]
    out.push({ name: m[1], mods })
  }
  return out
}

/**
 * Slots with the same lines, together, in the order first seen.
 * @param {Record<string, string>} mods
 * @param {Record<string, string[]>} lines
 * @returns {Array<[string[], string[]]>}
 */
export function grouped (mods, lines) {
  /** @type {Map<string, [string[], string[]]>} */
  const groups = new Map()
  for (const [slot, id] of Object.entries(mods)) {
    const text = lines[id]
    if (!text) continue
    const key = text.join('\n')
    const g = groups.get(key)
    if (g) g[0].push(slot)
    else groups.set(key, [[slot], text])
  }
  return [...groups.values()]
}

async function main () {
  const essences = essencesIn(await source('Essence'))
  const wanted = new Set(essences.flatMap(e => Object.values(e.mods)))
  const lines = modLines(await source('ModExplicit'), wanted)
  modLines(await source('ModItemExclusive'), wanted, lines)
  /** @type {Record<string, Array<[string[], string[]]>>} */
  const out = {}
  for (const e of essences) {
    const g = grouped(e.mods, lines)
    if (g.length && !out[e.name]) out[e.name] = g
  }
  fs.writeFileSync(OUT, JSON.stringify(Object.fromEntries(Object.entries(out).sort(([a], [b]) => a < b ? -1 : 1))))
  console.log(`essences.json: ${Object.keys(out).length} essences`)
  console.log(`Ids with no lines: ${[...wanted].filter(id => !lines[id]).join(', ') || 'none'}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
