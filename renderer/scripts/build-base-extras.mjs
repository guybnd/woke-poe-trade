// What a base item gives before any mods, for the item tooltip: its implicit
// (an Amethyst Ring's chaos resistance), a flask's recovery, charges and
// effect, a tincture's mana burn and cooldown. RePoE's base data, which
// build-tip-data.mjs reads, has these only as mod ids.
//
//   npm run base-extras                    fetch Path of Building's data
//   npm run base-extras -- <folder>        read src/Data/Bases/*.lua from a folder
//
// Path of Building's src/Data/Bases/*.lua are Lua literals; this reads them
// with regular expressions and never runs them.
//
// Writes public/data/tips/base-extras.json:
//   { "<base>": { im?: string[], fl?: { l?, m?, d, u, x, b? }, tc?: { mb, cd } } }
// Then run src/assets/bump-data-version.mjs.
// @ts-check
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const POB = 'https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding/dev/src/Data/Bases/'
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public/data/tips/base-extras.json')
const FILES = ['amulet', 'axe', 'belt', 'body', 'boots', 'bow', 'claw', 'dagger', 'flask', 'gloves', 'helmet', 'jewel', 'mace', 'quiver', 'ring', 'shield', 'staff', 'sword', 'tincture', 'wand']

/** @param {string} name */
async function source (name) {
  const dir = process.argv[2]
  if (dir) return fs.readFileSync(path.join(dir, `${name}.lua`), 'utf8')
  const res = await fetch(`${POB}${name}.lua`, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) throw new Error(`${name}: ${res.status}`)
  return await res.text()
}

/** @param {string} s */
const unquote = (s) => s.replace(/\\n/g, '\n').replace(/\\(.)/g, '$1')

/** @param {string} body @param {string} key */
function num (body, key) {
  const m = new RegExp(`\\b${key} = (-?[\\d.]+)`).exec(body)
  return m ? Number(m[1]) : undefined
}

/**
 * @param {string} lua
 * @returns {Record<string, { im?: string[], fl?: Record<string, unknown>, tc?: Record<string, number> }>}
 */
export function baseExtras (lua) {
  /** @type {Record<string, { im?: string[], fl?: Record<string, unknown>, tc?: Record<string, number> }>} */
  const out = {}
  const multi = new Set()
  // itemBases["Name"] = { ... \n}
  for (const m of lua.matchAll(/^itemBases\["((?:[^"\\]|\\.)+)"\] = \{\n([\s\S]*?)\n\}/gm)) {
    const name = unquote(m[1])
    const body = m[2]
    // Hidden copies are legacy bases (old quivers) that share a current one's name.
    if (/^\thidden = true,$/m.test(body)) continue
    /** @type {{ im?: string[], fl?: Record<string, unknown>, tc?: Record<string, number> }} */
    const entry = {}
    const implicit = /^\timplicit = "((?:[^"\\]|\\.)*)",$/m.exec(body)
    if (implicit) {
      const lines = unquote(implicit[1]).split('\n').map(l => l.trim()).filter(Boolean)
      // "{variant:1}" style markup belongs to uniques; a base with it is skipped.
      if (lines.length && !lines.some(l => l.includes('{'))) entry.im = lines
    }
    const flask = /^\tflask = \{(.*)\},$/m.exec(body)
    if (flask) {
      const f = flask[1]
      const buff = /buff = \{([^}]*)\}/.exec(f)
      const life = num(f, 'life')
      const mana = num(f, 'mana')
      entry.fl = {
        ...(life ? { l: life } : {}),
        ...(mana ? { m: mana } : {}),
        d: num(f, 'duration'),
        u: num(f, 'chargesUsed'),
        x: num(f, 'chargesMax'),
        ...(buff ? { b: [...buff[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(b => unquote(b[1])) } : {})
      }
    }
    const tincture = /^\ttincture = \{(.*)\},?$/m.exec(body)
    if (tincture) {
      const mb = num(tincture[1], 'manaBurn')
      const cd = num(tincture[1], 'cooldown')
      if (mb != null && cd != null) entry.tc = { mb, cd }
    }
    if (!Object.keys(entry).length) continue
    const seen = out[name]
    if (!seen) { out[name] = entry; continue }
    // One name, several bases (Two-Stone Ring, Shadowed Ring, the talismans):
    // their implicits differ, so the name alone can't say which it is.
    if (String(seen.im) !== String(entry.im)) multi.add(name)
  }
  return Object.fromEntries(Object.entries(out)
    .map(([name, { im, ...rest }]) => /** @type {const} */ ([name, multi.has(name) ? rest : { ...(im ? { im } : {}), ...rest }]))
    .filter(([, entry]) => Object.keys(entry).length))
}

async function main () {
  /** @type {Record<string, unknown>} */
  const all = {}
  for (const file of FILES) {
    const found = baseExtras(await source(file))
    for (const [name, entry] of Object.entries(found)) all[name] ??= entry
  }
  const sorted = Object.fromEntries(Object.entries(all).sort(([a], [b]) => a < b ? -1 : 1))
  fs.writeFileSync(OUT, JSON.stringify(sorted))
  console.log(`base-extras.json: ${Object.keys(sorted).length} bases`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
