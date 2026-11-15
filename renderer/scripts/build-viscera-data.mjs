// 3.30 Covens of Umbra: every Viscera, its versions' effects and which bosses
// drop it, for the Wickerman module (src/web/woke/wickerman).
//
//   npm run viscera-data                 fetch wickermanledger.site and rebuild
//   npm run viscera-data -- <app.js>     rebuild from a saved copy of its script
//
// The Wickerman Ledger keeps its data as literals in its one script. This reads
// them with a small literal parser and never runs the site's code. Effect text
// is from the 3.30 datamine, campaign zones from Maxroll's guide and map
// bosses from the PoE wiki (the site's own credits); the site marks links it
// inferred, and so does the file. The site's best-in-slot picks are its own
// work and are left out.
//
// Writes public/data/league/viscera.json; then run src/assets/bump-data-version.mjs.
// @ts-check
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = 'https://wickermanledger.site/'
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public/data/league/viscera.json')

// The site says Arm and Leg; the game's item text says Upper and Lower Limb.
const SLOT = { Head: 'Head', Torso: 'Torso', Arm: 'Upper Limb', Leg: 'Lower Limb' }

async function siteScript () {
  const file = process.argv[2]
  if (file) return fs.readFileSync(file, 'utf8')
  const get = async (/** @type {string} */ url) => {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
    if (!res.ok) throw new Error(`${url}: ${res.status}`)
    return await res.text()
  }
  const html = await get(SITE)
  const src = /<script[^>]+src="(app\.[\w.]+\.js)"/.exec(html)?.[1]
  if (!src) throw new Error("Couldn't find the site's script")
  return await get(new URL(src, SITE).href)
}

/**
 * Reads the Viscera block: `const h=...;t("Name","Slot","cat",i(low,med,high),[act,boss,zone],[[boss,map,kind?,confirmed?]])`.
 * Literals only: strings, numbers, !0/!1, null, arrays, objects, names bound
 * by `const` in the block, and the calls t(...) and i(...).
 * @param {string} src
 */
export function readViscera (src) {
  const start = src.indexOf('function(){const i=(s,x,g)=>')
  const end = src.indexOf('window.VISCERA=k', start)
  if (start < 0 || end < 0) throw new Error("The site's script has changed shape")
  let p = src.indexOf('const h=', start)
  /** @type {Record<string, unknown>} */
  const env = {}
  /** @type {any[]} */
  const out = []
  const ws = () => { while (/\s/.test(src[p])) p++ }
  const fail = (/** @type {string} */ what) => { throw new Error(`${what} at ${p}: ${src.slice(p, p + 40)}`) }
  const str = () => {
    const q = src[p++]; let s = ''
    while (src[p] !== q) {
      if (p >= end) fail('Unclosed string')
      if (src[p] === '\\') { const c = src[p + 1]; s += /** @type {Record<string, string>} */ ({ n: '\n', t: '\t' })[c] ?? c; p += 2; continue }
      if (q === '`' && src.startsWith('${', p)) fail('Template expression')
      s += src[p++]
    }
    p++
    return s
  }
  /** @param {string} close @returns {any[]} */
  const list = (close) => {
    p++; const a = []; ws()
    while (src[p] !== close) { a.push(val()); ws(); if (src[p] === ',') p++; ws() }
    p++
    return a
  }
  /** @returns {any} */
  const val = () => {
    ws()
    const c = src[p]
    if (c === '"' || c === "'" || c === '`') return str()
    if (c === '[') return list(']')
    if (c === '!') { p += 2; return src[p - 1] === '0' }
    const num = /^-?(\d+(\.\d+)?|\.\d+)/.exec(src.slice(p, p + 30))
    if (num) { p += num[0].length; return Number(num[0]) }
    const id = /^[A-Za-z_$][\w$]*/.exec(src.slice(p, p + 60))
    if (!id) return fail('Unexpected token')
    p += id[0].length; ws()
    if (id[0] === 'null') return null
    if (src[p] === '(') {
      const args = list(')')
      if (id[0] === 'i') return [['Low', args[0]], ['Med', args[1]], ['High', args[2]]]
      if (id[0] === 't') { out.push(args); return undefined }
      return fail(`Unknown call ${id[0]}`)
    }
    if (!(id[0] in env)) return fail(`Unknown name ${id[0]}`)
    return env[id[0]]
  }
  while (p < end) {
    ws()
    if (src.startsWith('const ', p)) {
      p += 6
      for (;;) {
        ws()
        const id = /^[A-Za-z_$][\w$]*/.exec(src.slice(p, p + 60))
        if (!id) fail('Expected a name')
        p += /** @type {RegExpExecArray} */ (id)[0].length; ws()
        if (src[p] !== '=') fail('Expected =')
        p++
        env[/** @type {RegExpExecArray} */ (id)[0]] = val(); ws()
        if (src[p] === ',') { p++; continue }
        if (src[p] === ';') p++
        break
      }
      continue
    }
    val(); ws()
    if (src[p] === ',' || src[p] === ';') p++
  }
  return out.map(([name, slot, cat, tiers, camp, maps]) => {
    if (!(slot in SLOT)) throw new Error(`${name}: unknown slot ${slot}`)
    return {
      name,
      slot: SLOT[/** @type {keyof typeof SLOT} */ (slot)],
      cat,
      tiers: tiers.map((/** @type {any[]} */ [label, text, tcat]) => tcat && tcat !== cat ? { label, text, cat: tcat } : { label, text }),
      // The site writes "Zone not confirmed" where it has no zone.
      ...(camp ? { act: { n: camp[0], boss: camp[1], ...(/not confirmed/i.test(camp[2]) ? {} : { zone: camp[2] }), ...(camp[3] === false ? { unsure: true } : {}) } } : {}),
      maps: (maps ?? []).map((/** @type {any[]} */ [boss, map, kind, ok]) => ({
        boss, map, kind: kind || 'Map boss', ...(ok === false ? { unsure: true } : {})
      }))
    }
  })
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const viscera = readViscera(await siteScript())
  if (viscera.length < 100) throw new Error(`Only ${viscera.length} Viscera read; the site's script may have changed`)
  viscera.sort((a, b) => a.name.localeCompare(b.name))
  const file = {
    source: 'Wickerman Ledger (wickermanledger.site): effects from the 3.30 datamine, campaign zones from Maxroll, map bosses from the PoE wiki',
    read: new Date().toISOString().slice(0, 10),
    viscera
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  // One Viscera per line, so a refresh diffs by Viscera.
  fs.writeFileSync(OUT, '{"source":' + JSON.stringify(file.source) + ',"read":' + JSON.stringify(file.read) + ',"viscera":[\n' +
    viscera.map(v => JSON.stringify(v)).join(',\n') + '\n]}\n')
  console.log(`${viscera.length} Viscera written to ${path.relative(process.cwd(), OUT)}. Now run: node src/assets/bump-data-version.mjs`)
}
