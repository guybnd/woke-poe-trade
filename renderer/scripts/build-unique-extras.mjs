// The text of uniques poe.ninja has no listing of (so build-tip-data.mjs left
// them out), for the item tooltip: Corpse Rose, Hide of the Vendigo, The Utmost...
//
//   npm run unique-extras                    fetch Path of Building's data
//   npm run unique-extras -- <folder>        read src/Data/Uniques/*.lua from a folder
//
// Path of Building keeps each unique as a block of game text in
// src/Data/Uniques/<slot>.lua: name, base, header lines ("League:",
// "Variant:", "Implicits: 2"...), then the mods, each optionally tagged
// "{variant:1,3}", "{tags:...}", "{range:...}". This reads them as text.
//
// Writes public/data/tips/unique-extras.json in uniques.json's shape
// ({ b, v: [{ n?, i?, e? }] }), only for uniques in the app that uniques.json lacks.
// Run it after tip-data, then src/assets/bump-data-version.mjs.
// @ts-check
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const POB = 'https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding/dev/src/Data/Uniques/'
const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(HERE, '../public/data/tips/unique-extras.json')
const FILES = ['amulet', 'axe', 'belt', 'body', 'boots', 'bow', 'claw', 'dagger', 'fishing', 'flask', 'gloves', 'helmet', 'jewel', 'mace', 'quiver', 'ring', 'shield', 'staff', 'sword', 'tincture', 'wand']
const HEADER = /^(League|Source|Variant|Selected Variant|Selected Variant Group|Selected Alt Variant(?: Two| Three)?|Has Alt Variant(?: Two| Three)?|Implicits|Limited to|Radius|Upgrade|Version|Crafted|Talisman Tier|Sockets|LevelReq|Requires Level)\b:?/

/** @param {string} name */
async function source (name) {
  const dir = process.argv[2]
  if (dir) return fs.readFileSync(path.join(dir, `${name}.lua`), 'utf8')
  const res = await fetch(`${POB}${name}.lua`, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) throw new Error(`${name}: ${res.status}`)
  return await res.text()
}

/** @param {string} line */
function tagged (line) {
  /** @type {number[] | null} */
  let variants = null
  let text = line
  // Leading {key:value} tags.
  for (let m = /^\{([a-z]+)(?::([^}]*))?\}/i.exec(text); m; m = /^\{([a-z]+)(?::([^}]*))?\}/i.exec(text)) {
    if (m[1] === 'variant') variants = m[2].split(',').map(Number)
    text = text.slice(m[0].length)
  }
  return { variants, text }
}

/**
 * One unique's block, as the tooltip data wants it. Variants named for patches
 * ("Pre 3.11.0", "Current") are versions: the last is the item as it drops
 * now. Any other variants (String of Servitude's "Life", "Item Rarity") are
 * different copies of it: the lines every copy has, then each copy as its own
 * named variant.
 * @param {string} block
 * @returns {{ name: string, b: string, v: Array<{ n?: string, i: string[], e: string[] }> } | null}
 */
export function parseUnique (block) {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return null
  const [name, base] = lines
  /** @type {string[]} */
  const variants = []
  let implicits = 0
  let at = 2
  for (; at < lines.length; at++) {
    const header = HEADER.exec(lines[at])
    if (!header) break
    if (header[1] === 'Variant') variants.push(lines[at].slice(lines[at].indexOf(':') + 1).trim())
    if (header[1] === 'Implicits') implicits = Number(lines[at].split(':')[1]) || 0
  }
  // "Implicits: N" counts the lines as written, variant tags and all.
  const mods = lines.slice(at).map((l, k) => ({ ...tagged(l), implicit: k < implicits }))
    // The game shows Corrupted under the mods, not as one.
    .filter(m => m.text && m.text !== 'Corrupted')
  /** @param {(v: number[] | null) => boolean} keep */
  const pick = (keep) => {
    const chosen = mods.filter(m => keep(m.variants))
    return { i: chosen.filter(m => m.implicit).map(m => m.text), e: chosen.filter(m => !m.implicit).map(m => m.text) }
  }
  const versions = variants.every(v => /^(Pre \d|Current)/i.test(v))
  if (!variants.length || versions) {
    return { name, b: base, v: [pick(v => !v || v.includes(variants.length))] }
  }
  return {
    name,
    b: base,
    v: [pick(v => !v), ...variants.map((n, k) => ({ n, ...pick(v => !v || v.includes(k + 1)) }))]
  }
}

/** @param {string} lua */
export function uniquesIn (lua) {
  return [...lua.matchAll(/\[\[\n?([\s\S]*?)\]\]/g)].map(m => parseUnique(m[1])).filter(u => u !== null)
}

async function main () {
  const known = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(HERE, '../public/data/tips/uniques.json'), 'utf8'))))
  const wanted = new Set(fs.readFileSync(path.join(HERE, '../public/data/en/items.ndjson'), 'utf8').trim().split('\n')
    .map(l => JSON.parse(l)).filter(i => i.namespace === 'UNIQUE' && !known.has(i.name)).map(i => i.name))
  /** @type {Record<string, unknown>} */
  const out = {}
  for (const file of FILES) {
    for (const u of uniquesIn(await source(file))) {
      if (!wanted.has(u.name) || out[u.name]) continue
      out[u.name] = { b: u.b, v: u.v.map(r => ({ ...(r.n ? { n: r.n } : {}), ...(r.i.length ? { i: r.i } : {}), ...(r.e.length ? { e: r.e } : {}) })) }
    }
  }
  const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a < b ? -1 : 1))
  fs.writeFileSync(OUT, JSON.stringify(sorted))
  console.log(`unique-extras.json: ${Object.keys(sorted).length} uniques`)
  console.log(`Still with no text: ${[...wanted].filter(n => !out[n]).join(', ') || 'none'}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
