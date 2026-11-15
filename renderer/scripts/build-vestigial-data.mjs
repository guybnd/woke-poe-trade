// The mod each unique leaves behind as a Vestigial implicit (3.29+: an
// Enshrouded unique charged in the Domain of Timeless Conflict drops another
// unique of its slot carrying a weaker copy of one of its mods), for Search.
//
//   npm run vestigial-data                    fetch Path of Building's data
//   npm run vestigial-data -- <folder>        read Vestigial.lua and
//                                             ModItemExclusive.lua from a folder
//
// Path of Building keeps which unique each "Divergent" mod comes from in
// src/Data/Vestigial.lua, and the mod text in src/Data/ModItemExclusive.lua.
// The files are Lua literals; this reads them with regular expressions and
// never runs them.
//
// Writes public/data/tips/vestigial.json: { "<unique>": [["<line>", ...], ...] },
// one list of lines per mod (a few uniques have one per variant). Then run
// src/assets/bump-data-version.mjs.
// @ts-check
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const POB = 'https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding/dev/src/Data/'
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public/data/tips/vestigial.json')

/** @param {string} name */
async function source (name) {
  const dir = process.argv[2]
  if (dir) return fs.readFileSync(path.join(dir, name), 'utf8')
  const res = await fetch(POB + name, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) throw new Error(`${name}: ${res.status}`)
  return await res.text()
}

/** Lua string literals in a chunk of a table. @param {string} body */
function strings (body) {
  return [...body.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(m => m[1].replace(/\\(.)/g, '$1'))
}

/**
 * @param {string} vestigialLua
 * @param {string} modsLua
 * @returns {Record<string, string[][]>}
 */
export function vestigialByUnique (vestigialLua, modsLua) {
  /** @type {Map<string, string[]>} */
  const lines = new Map()
  // ["DivergentX"] = { affix = "", "line one", "line two", statOrder = ...
  for (const m of modsLua.matchAll(/\["(Divergent[^"]+)"\] = \{ affix = "[^"]*", (.*?), statOrder/g)) {
    lines.set(m[1], strings(m[2]))
  }
  /** @type {Record<string, string[][]>} */
  const out = {}
  for (const m of vestigialLua.matchAll(/\["(Divergent[^"]+)"\] = \{([^}]*)\}/g)) {
    const mod = lines.get(m[1])
    if (!mod?.length) continue
    for (const name of strings(m[2])) {
      const list = out[name] ??= []
      if (!list.some(l => l.join('\n') === mod.join('\n'))) list.push(mod)
    }
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = vestigialByUnique(await source('Vestigial.lua'), await source('ModItemExclusive.lua'))
  const count = Object.keys(data).length
  if (count < 100) throw new Error(`Only ${count} uniques: the source format changed?`)
  fs.writeFileSync(OUT, JSON.stringify(data) + '\n')
  console.log(`${count} uniques -> ${path.relative(process.cwd(), OUT)}`)
}
