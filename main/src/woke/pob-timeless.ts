// Timeless jewels in the PoB tree view (WOKEPOET-205): what a Timeless jewel
// does to the passives in its ring, worked out the way Path of Building does
// (Classes/PassiveSpec.lua, Modules/DataLegionLookUpTableHelper.lua).
//
// The seed tables are about 235 MB, so they aren't shipped: they're read from
// the Path of Building install on this PC. With no install, or files this
// code can't read, every answer is "not found" and the tree says so quietly.
import { promises as fs } from 'fs'
import path from 'path'
import zlib from 'zlib'
import { promisify } from 'util'

const inflate = promisify(zlib.inflate)

// ---- what the jewel says ----

type ConquerorType = 'vaal' | 'karui' | 'maraketh' | 'templar' | 'eternal' | 'kalguur'

export interface Conquest {
  // The jewel's number: Glorious Vanity's 100-8000, Elegant Hubris' 2000-160000 and so on.
  seed: number
  type: ConquerorType
  // 1 to 3, or "1_v2" for the later conquerors; only keystones depend on it.
  id: string
}

// PoB's Modules/ModParser.lua, Legion modifiers. The Abyss jewels (Subjugating,
// Binding) work differently and aren't covered.
const CONQUEST_LINES = [
  /^bathed in the blood of (\d+) sacrificed in the name of (.+)$/i,
  /^carved to glorify (\d+) new faithful converted by high templar (.+)$/i,
  /^commanded leadership over (\d+) warriors under (.+)$/i,
  /^commissioned (\d+) coins to commemorate (.+)$/i,
  /^denoted service of (\d+) dekhara in the akhara of (.+)$/i,
  /^remembrancing (\d+) songworthy deeds by the line of (.+)$/i
]

const CONQUERORS: Record<string, { id: string, type: ConquerorType }> = {
  xibaqua: { id: '1', type: 'vaal' },
  zerphi: { id: '2', type: 'vaal' },
  doryani: { id: '3', type: 'vaal' },
  ahuana: { id: '2_v2', type: 'vaal' },
  deshret: { id: '1', type: 'maraketh' },
  asenath: { id: '2', type: 'maraketh' },
  nasima: { id: '3', type: 'maraketh' },
  balbala: { id: '1_v2', type: 'maraketh' },
  cadiro: { id: '1', type: 'eternal' },
  victario: { id: '2', type: 'eternal' },
  chitus: { id: '3', type: 'eternal' },
  caspiro: { id: '3_v2', type: 'eternal' },
  kaom: { id: '1', type: 'karui' },
  rakiata: { id: '2', type: 'karui' },
  kiloava: { id: '3', type: 'karui' },
  akoya: { id: '3_v2', type: 'karui' },
  venarius: { id: '1', type: 'templar' },
  dominus: { id: '2', type: 'templar' },
  avarius: { id: '3', type: 'templar' },
  maxarius: { id: '1_v2', type: 'templar' },
  vorana: { id: '1', type: 'kalguur' },
  uhtred: { id: '2', type: 'kalguur' },
  medved: { id: '3', type: 'kalguur' }
}

export function readConquest (mods: string[]): Conquest | null {
  for (const line of mods) {
    for (const re of CONQUEST_LINES) {
      const m = re.exec(line.trim())
      const who = m && CONQUERORS[m[2].trim().toLowerCase()]
      if (m && who) return { seed: Number(m[1]), type: who.type, id: who.id }
    }
  }
  return null
}

// ---- Path of Building's files ----

// PoB's jewel type numbers and seed ranges (Modules/Data.lua), by conqueror.
const JEWEL_TYPE: Record<ConquerorType, { type: number, file: string, min: number, max: number, div: number }> = {
  vaal: { type: 1, file: 'GloriousVanity', min: 100, max: 8000, div: 1 },
  karui: { type: 2, file: 'LethalPride', min: 10000, max: 18000, div: 1 },
  maraketh: { type: 3, file: 'BrutalRestraint', min: 500, max: 8000, div: 1 },
  templar: { type: 4, file: 'MilitantFaith', min: 2000, max: 10000, div: 1 },
  eternal: { type: 5, file: 'ElegantHubris', min: 100, max: 8000, div: 20 },
  kalguur: { type: 6, file: 'HeroicTragedy', min: 100, max: 8000, div: 1 }
}

interface StatMod { fmt: string, index: number, min: number, max: number }

export interface LegionNode {
  id: string
  dn: string
  sd: string[]
  sortedStats: string[]
  stats: Record<string, StatMod>
}

export interface TimelessData {
  // Tree node id → its row in the seed tables.
  index: Map<number, { index: number, size: number }>
  size: number
  sizeNotable: number
  // Per jewel type, the tables' local ids → PoB's legion ids.
  localToGlobal: Map<number, Map<number, number>>
  nodes: LegionNode[]
  additions: LegionNode[]
  // Ids from this number on replace the passive; below it, they add to it.
  additionCount: number
  // Where the seed tables are.
  dir: string
  // NodeIndexMapping.lua's mtime: cached seeds are only good for this load.
  version: number
}

// Reads a Lua table literal as PoB writes its data files: tables, strings,
// numbers and booleans. Arrays come back as objects keyed 1..n.
export function parseLuaTable (src: string): unknown {
  let i = 0
  const fail = (): never => { throw new Error(`Lua table: unexpected input at ${i}`) }
  const skip = () => {
    for (;;) {
      while (i < src.length && /\s/.test(src[i])) i++
      if (src.startsWith('--', i)) {
        while (i < src.length && src[i] !== '\n') i++
      } else return
    }
  }
  const str = (): string => {
    const q = src[i++]
    let out = ''
    while (i < src.length && src[i] !== q) {
      if (src[i] === '\\') {
        const c = src[i + 1]
        out += c === 'n' ? '\n' : c === 't' ? '\t' : c
        i += 2
      } else out += src[i++]
    }
    if (src[i] !== q) fail()
    i++
    return out
  }
  const value = (): unknown => {
    skip()
    const c = src[i]
    if (c === '{') return table()
    if (c === '"' || c === "'") return str()
    const word = /^(true|false|nil|-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)/.exec(src.slice(i, i + 40))
    if (!word) return fail()
    i += word[1].length
    return word[1] === 'true' ? true : word[1] === 'false' ? false : word[1] === 'nil' ? null : Number(word[1])
  }
  const table = (): Record<string, unknown> => {
    i++
    const out: Record<string, unknown> = {}
    let n = 1
    for (;;) {
      skip()
      if (src[i] === '}') { i++; return out }
      let key: string | null = null
      if (src[i] === '[') {
        i++
        const k = value()
        skip()
        if (src[i] !== ']') fail()
        i++
        skip()
        if (src[i] !== '=') fail()
        i++
        key = String(k)
      } else {
        const name = /^([A-Za-z_]\w*)\s*=(?!=)/.exec(src.slice(i, i + 80))
        if (name) {
          key = name[1]
          i += name[0].length
        }
      }
      const v = value()
      out[key ?? String(n++)] = v
      skip()
      if (src[i] === ',' || src[i] === ';') i++
    }
  }
  const start = src.indexOf('{')
  if (start < 0) fail()
  i = start
  return table()
}

function list<T> (t: unknown): T[] {
  const out: T[] = []
  const o = t as Record<string, T> | undefined
  if (!o) return out
  for (let k = 1; o[k] !== undefined; k++) out.push(o[k])
  return out
}

function legionNode (raw: Record<string, unknown>): LegionNode {
  const stats: Record<string, StatMod> = {}
  for (const [k, v] of Object.entries((raw.stats ?? {}) as Record<string, Record<string, unknown>>)) {
    stats[k] = { fmt: String(v.fmt ?? 'd'), index: Number(v.index), min: Number(v.min), max: Number(v.max) }
  }
  return {
    id: String(raw.id ?? ''),
    dn: String(raw.dn ?? ''),
    sd: list<string>(raw.sd),
    sortedStats: list<string>(raw.sortedStats),
    stats
  }
}

export function readNodeIndexMapping (src: string): Pick<TimelessData, 'index' | 'size' | 'sizeNotable' | 'localToGlobal'> {
  const index = new Map<number, { index: number, size: number }>()
  const localToGlobal = new Map<number, Map<number, number>>()
  let size = 0
  let sizeNotable = 0
  for (const line of src.split('\n')) {
    let m = /^nodeIDList\[(\d+)\] = \{ index = (\d+), size = (\d+) \}/.exec(line)
    if (m) { index.set(Number(m[1]), { index: Number(m[2]), size: Number(m[3]) }); continue }
    m = /^nodeIDList\["localIdToGlobalId"\]\[(\d+)\]\[(\d+)\] = (\d+)/.exec(line)
    if (m) {
      const type = Number(m[1])
      let map = localToGlobal.get(type)
      if (!map) localToGlobal.set(type, map = new Map())
      map.set(Number(m[2]), Number(m[3]))
      continue
    }
    m = /^nodeIDList\["(size|sizeNotable)"\] = (\d+)/.exec(line)
    if (m) {
      if (m[1] === 'size') size = Number(m[2])
      else sizeNotable = Number(m[2])
    }
  }
  return { index, size, sizeNotable, localToGlobal }
}

// The PoB folders to look in: next to the exe the user set, then the
// installer's default.
export function pobDirs (pobExe?: string): string[] {
  const out: string[] = []
  if (pobExe?.trim()) out.push(path.dirname(pobExe.trim()))
  if (process.env.APPDATA) out.push(path.join(process.env.APPDATA, 'Path of Building Community'))
  return out
}

const dataCache = new Map<string, { mtime: number, data: Promise<TimelessData | null> }>()

async function loadData (dir: string, version: number): Promise<TimelessData | null> {
  const tables = path.join(dir, 'Data', 'TimelessJewelData')
  const [mapping, legion] = await Promise.all([
    fs.readFile(path.join(tables, 'NodeIndexMapping.lua'), 'utf8'),
    fs.readFile(path.join(tables, 'LegionPassives.lua'), 'utf8')
  ])
  const m = readNodeIndexMapping(mapping)
  const raw = parseLuaTable(legion) as Record<string, unknown>
  const nodes = list<Record<string, unknown>>(raw.nodes).map(legionNode)
  const additions = list<Record<string, unknown>>(raw.additions).map(legionNode)
  // PoB keeps this count in Modules/Data.lua (#legionAdditions).
  let additionCount = additions.length
  try {
    const dataLua = await fs.readFile(path.join(dir, 'Modules', 'Data.lua'), 'utf8')
    const c = /data\.timelessJewelAdditions\s*=\s*(\d+)/.exec(dataLua)
    if (c) additionCount = Number(c[1])
  } catch {}
  if (!m.size || !nodes.length || !additions.length) return null
  return { ...m, nodes, additions, additionCount, dir: tables, version }
}

export async function findTimelessData (pobExe?: string): Promise<TimelessData | null> {
  for (const dir of pobDirs(pobExe)) {
    let mtime: number
    try {
      mtime = (await fs.stat(path.join(dir, 'Data', 'TimelessJewelData', 'NodeIndexMapping.lua'))).mtimeMs
    } catch { continue }
    let cached = dataCache.get(dir)
    if (!cached || cached.mtime !== mtime) {
      cached = { mtime, data: loadData(dir, mtime).catch(() => null) }
      dataCache.set(dir, cached)
    }
    const data = await cached.data
    if (data) return data
  }
  return null
}

// Unpacks in flight, so asks that overlap share one copy of a table.
const unpacking = new Map<string, Promise<Buffer | null>>()

function readTable (dir: string, file: string): Promise<Buffer | null> {
  const key = path.join(dir, file)
  let p = unpacking.get(key)
  if (!p) {
    p = unpackTable(dir, file).finally(() => unpacking.delete(key))
    unpacking.set(key, p)
  }
  return p
}

// A seed table, unpacked: one .zip, or .zip.part0, .part1 and so on.
async function unpackTable (dir: string, file: string): Promise<Buffer | null> {
  let packed: Buffer
  try {
    packed = await fs.readFile(path.join(dir, `${file}.zip`))
  } catch {
    const parts: Buffer[] = []
    for (let p = 0; ; p++) {
      try {
        parts.push(await fs.readFile(path.join(dir, `${file}.zip.part${p}`)))
      } catch { break }
    }
    if (!parts.length) return null
    packed = Buffer.concat(parts)
  }
  try {
    return await inflate(packed)
  } catch {
    return null
  }
}

// ---- reading a seed ----

// What the seed table says for one passive: PoB's readLUT.
export function readSeed (data: TimelessData, table: Buffer, kind: ConquerorType, seed: number, nodeId: number): number[] {
  const t = JEWEL_TYPE[kind]
  const at = data.index.get(nodeId)
  if (!at) return []
  const seedSize = t.max - t.min + 1
  const offset = seed / t.div - t.min
  const local = data.localToGlobal.get(t.type)
  const global = (id: number) => local?.get(id) ?? id
  if (t.type === 1) {
    // Glorious Vanity: a byte per node and seed giving each result's length,
    // then every node's results back to back, in index order.
    const sizesEnd = data.size * seedSize
    let start = sizesEnd
    for (const v of data.index.values()) if (v.index < at.index) start += v.size
    const row = at.index * seedSize
    for (let k = 0; k < offset; k++) start += table[row + k]
    const len = table[row + offset]
    if (!len || start + len > table.length) return []
    const out = [...table.subarray(start, start + len)]
    if (len === 2 || len === 3) out[0] = global(out[0])
    else if (len === 6 || len === 8) for (let k = 0; k < len / 2; k++) out[k] = global(out[k])
    return out
  }
  if (at.index > data.sizeNotable) return []
  const pos = at.index * seedSize + offset
  if (pos >= table.length) return []
  return [global(table[pos])]
}

// ---- what happens to a passive ----

export interface TimelessNode {
  id: number
  kind: 'small' | 'notable' | 'key'
  name: string
}

// A passive's new look: `replace` swaps the name and stats, otherwise the
// stats are added to the passive's own.
export interface Rewrite {
  replace: boolean
  name?: string
  stats: string[]
}

// PoB's replaceHelperFunc: a rolled value into a stat line.
function fill (line: string, key: string, mod: StatMod | undefined, value: number | undefined): string {
  if (!mod || value == null) return line
  let v = value
  if (mod.fmt === 'g') {
    if (key.includes('per_minute')) v = Math.round(v / 60 * 10) / 10
    else if (key.includes('permyriad')) v = v / 100
    else if (key.includes('_ms')) v = v / 1000
  }
  if (mod.min !== mod.max) return line.split(`(${mod.min}-${mod.max})`).join(String(v))
  if (mod.min !== v) return line.split(String(mod.min)).join(String(v))
  return line
}

const ATTRIBUTES = new Set(['Strength', 'Dexterity', 'Intelligence'])

function byId (data: TimelessData, id: string): LegionNode | undefined {
  return data.nodes.find(n => n.id === id)
}

export function rewriteNode (data: TimelessData, conquest: Conquest, node: TimelessNode, seedOf: (id: number) => number[]): Rewrite | null {
  const { type, id } = conquest
  const legion = (local: number) => data.nodes[local - data.additionCount]
  if (node.kind === 'key') {
    const n = byId(data, `${type}_keystone_${id}`)
    return n ? { replace: true, name: n.dn, stats: n.sd } : null
  }
  if (node.kind === 'notable') {
    const d = seedOf(node.id)
    if (!d.length) return null
    if (type === 'vaal') {
      if (d.length === 2 || d.length === 3) {
        const n = legion(d[0])
        if (!n) return null
        return { replace: true, name: n.dn, stats: n.sd.map((line, i) => fill(line, n.sortedStats[i], n.stats[n.sortedStats[i]], d[n.stats[n.sortedStats[i]]?.index])) }
      }
      if (d.length === 6 || d.length === 8) {
        const half = d.length / 2
        let bias = 0
        for (let k = 0; k < half; k++) bias += d[k] <= 21 ? 1 : -1
        // PoB's legionNodes[77] and [78].
        const n = data.nodes[bias >= 0 ? 76 : 77]
        if (!n) return null
        const sums = new Map<number, number>()
        for (let k = 0; k < half; k++) sums.set(d[k], (sums.get(d[k]) ?? 0) + d[k + half])
        const stats = [...n.sd]
        for (const [add, roll] of sums) {
          const a = data.additions[add]
          if (!a) continue
          for (let line of a.sd) {
            for (const [k, mod] of Object.entries(a.stats)) line = fill(line, k, mod, roll)
            stats.push(line)
          }
        }
        return { replace: true, name: n.dn, stats }
      }
      return null
    }
    const v = d[0]
    if (v >= data.additionCount) {
      const n = legion(v)
      return n ? { replace: true, name: n.dn, stats: n.sd } : null
    }
    const a = data.additions[v]
    return a ? { replace: false, stats: a.sd } : null
  }
  // A small passive.
  const attr = ATTRIBUTES.has(node.name)
  switch (type) {
    case 'vaal': {
      const d = seedOf(node.id)
      const n = d.length ? legion(d[0]) : undefined
      if (!n) return null
      return { replace: true, name: n.dn, stats: n.sd.map((line, i) => fill(line, n.sortedStats[i], n.stats[n.sortedStats[i]], d[1])) }
    }
    case 'karui': return { replace: false, stats: [`+${attr ? 2 : 4} to Strength`] }
    case 'maraketh': return { replace: false, stats: [`+${attr ? 2 : 4} to Dexterity`] }
    case 'kalguur': return { replace: false, stats: [`${attr ? 1 : 2}% increased Ward`] }
    case 'templar': {
      if (!attr) return { replace: false, stats: ['+5 to Devotion'] }
      const n = byId(data, 'templar_devotion_node')
      return n ? { replace: true, name: n.dn, stats: n.sd } : null
    }
    case 'eternal': {
      const n = byId(data, 'eternal_small_blank')
      return n ? { replace: true, name: n.dn, stats: n.sd } : null
    }
  }
  return null
}

// ---- the request ----

export interface TimelessAsk {
  pobExe?: string
  jewels: Array<{ mods: string[], nodes: TimelessNode[] }>
}

export interface TimelessAnswer {
  // A PoB install with the seed tables was found.
  found: boolean
  // Per jewel, by node id; null for a jewel this can't read.
  jewels: Array<Record<number, Rewrite> | null>
}

// Seed results by table, seed and node, so reopening a build doesn't unpack
// the tables again. Glorious Vanity's unpacks to about 50 MB, so the tables
// themselves aren't kept.
const seedCache = new Map<string, number[]>()
const SEED_CACHE_MAX = 4000

export async function timelessRewrites (ask: TimelessAsk): Promise<TimelessAnswer> {
  const jewels = Array.isArray(ask?.jewels) ? ask.jewels : []
  const data = await findTimelessData(typeof ask?.pobExe === 'string' ? ask.pobExe : undefined)
  if (!data) return { found: false, jewels: jewels.map(() => null) }
  const out: TimelessAnswer['jewels'] = []
  for (const jewel of jewels) {
    const conquest = readConquest(Array.isArray(jewel?.mods) ? jewel.mods : [])
    if (!conquest) { out.push(null); continue }
    const t = JEWEL_TYPE[conquest.type]
    const s = conquest.seed / t.div
    if (!Number.isInteger(s) || s < t.min || s > t.max) { out.push(null); continue }
    const nodes = (Array.isArray(jewel.nodes) ? jewel.nodes : []).filter(n => Number.isInteger(n?.id))
    // Glorious Vanity reads its table for every passive; the others only for notables.
    const needs = nodes.filter(n => n.kind === 'notable' || (n.kind === 'small' && conquest.type === 'vaal'))
    const key = (id: number) => `${data.dir}|${data.version}|${conquest.type}|${conquest.seed}|${id}`
    // This jewel's seeds, kept here so filling the cache can't drop them.
    const seeds = new Map<number, number[]>()
    const missing: TimelessNode[] = []
    for (const n of needs) {
      const hit = seedCache.get(key(n.id))
      if (hit) seeds.set(n.id, hit)
      else missing.push(n)
    }
    if (missing.length) {
      const buf = await readTable(data.dir, t.file)
      if (!buf) { out.push(null); continue }
      for (const n of missing) {
        const d = readSeed(data, buf, conquest.type, conquest.seed, n.id)
        seeds.set(n.id, d)
        if (seedCache.size >= SEED_CACHE_MAX) seedCache.delete(seedCache.keys().next().value!)
        seedCache.set(key(n.id), d)
      }
    }
    const result: Record<number, Rewrite> = {}
    for (const n of nodes) {
      const r = rewriteNode(data, conquest, n, id => seeds.get(id) ?? [])
      if (r) result[n.id] = r
    }
    out.push(result)
  }
  return { found: true, jewels: out }
}
