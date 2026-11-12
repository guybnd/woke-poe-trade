// Builds the passive tree in public/data/tree from Path of Building's own tree
// data, or from GGG's own export when it comes out first. Run it after a
// league's tree lands in either:
//
//   npm run tree-data -- "%APPDATA%/Path of Building Community/TreeData/3_29/tree.lua"
//   npm run tree-data -- <checkout or download of grindinggear/skilltree-export>/data.json
//
// PoB is MIT licensed, and the tree is GGG's. Each node is one row:
// [id, x, y, kind, name, stats, linked ids, icon, group, orbit radius, angle].
// Ascendancy nodes have no place on the drawn tree, so they sit at 0, 0 and are
// only ever listed by name. They and class starts are in here because builds
// list them among their points. The art is GGG's, read from the addresses in
// PoB's sprites.lua, and cached by the app like item art.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RENDERER = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(RENDERER, 'public/data/tree/passive-tree.json')
const SOURCE = process.argv[2]
const SPRITE_KINDS = ['normalActive', 'notableActive', 'keystoneActive', 'normalInactive', 'notableInactive', 'keystoneInactive', 'masteryInactive', 'frame', 'groupBackground', 'background']
const FRAMES = ['PSSkillFrame', 'PSSkillFrameActive', 'NotableFrameUnallocated', 'NotableFrameAllocated', 'KeystoneFrameUnallocated', 'KeystoneFrameAllocated', 'JewelFrameUnallocated', 'JewelFrameAllocated']
if (!SOURCE) throw new Error('Usage: npm run tree-data -- <PoB TreeData/<version>/tree.lua or GGG skilltree-export data.json>')
const FROM_GGG = SOURCE.endsWith('.json')
// GGG's export has each sprite sheet at several zooms; PoB keeps this one.
const SPRITE_ZOOM = '0.3835'

function parseLua (src) {
  let i = src.indexOf('{')
  const ws = () => {
    for (;;) {
      while (/\s/.test(src[i])) i++
      if (src[i] === '-' && src[i + 1] === '-') { while (src[i] !== '\n') i++; continue }
      return
    }
  }
  const val = () => {
    ws()
    const c = src[i]
    if (c === '{') return table()
    if (c === '"') {
      let s = ''
      i++
      while (src[i] !== '"') {
        if (src[i] === '\\') { i++; s += src[i] === 'n' ? '\n' : src[i]; i++ } else s += src[i++]
      }
      i++
      return s
    }
    if (src.startsWith('true', i)) { i += 4; return true }
    if (src.startsWith('false', i)) { i += 5; return false }
    if (src.startsWith('nil', i)) { i += 3; return null }
    const m = /^-?[\d.]+(e[-+]?\d+)?/i.exec(src.slice(i, i + 32))
    if (!m) throw new Error(`Bad value at ${i}: ${src.slice(i, i + 40)}`)
    i += m[0].length
    return Number(m[0])
  }
  const table = () => {
    i++
    const arr = []
    const obj = {}
    let isObj = false
    for (;;) {
      ws()
      if (src[i] === '}') { i++; return isObj ? obj : arr }
      if (src[i] === ',' || src[i] === ';') { i++; continue }
      if (src[i] === '[') {
        i++
        const k = val()
        ws(); i++; ws(); i++
        obj[k] = val()
        isObj = true
        continue
      }
      const id = /^([A-Za-z_]\w*)\s*=/.exec(src.slice(i, i + 80))
      if (id) { i += id[0].length; obj[id[1]] = val(); isObj = true; continue }
      arr.push(val())
    }
  }
  return val()
}

// GGG's text carries keyword links, "[BoneFeeders|Summon Bone Feeders]" or
// "[Ignite]"; PoB's shows just the words, which is what builds and totals read.
const plain = text => typeof text === 'string' ? text.replace(/\[([^\]|]+)\|([^\]]+)\]/g, '$2').replace(/\[([^\]|]+)\]/g, '$1') : text
function unlink (t) {
  for (const n of Object.values(t.nodes)) {
    if (n.stats) n.stats = n.stats.map(plain)
    if (n.name) n.name = plain(n.name)
    for (const e of n.masteryEffects ?? []) if (e.stats) e.stats = e.stats.map(plain)
  }
  return t
}
const tree = FROM_GGG ? unlink(JSON.parse(readFileSync(SOURCE, 'utf8'))) : parseLua(readFileSync(SOURCE, 'utf8'))
const radii = tree.constants.orbitRadii
const perOrbit = tree.constants.skillsPerOrbit
const ANGLES_16 = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]
const ANGLES_40 = [0, 10, 20, 30, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 135, 140, 150, 160, 170, 180, 190, 200, 210, 220, 225, 230, 240, 250, 260, 270, 280, 290, 300, 310, 315, 320, 330, 340, 350]

function angle (orbit, index) {
  const n = perOrbit[orbit]
  const deg = n === 16 ? ANGLES_16[index] : n === 40 ? ANGLES_40[index] : index * 360 / n
  return deg * Math.PI / 180
}

const groupIndex = new Map()
const groups = []
const used = new Set()
const rows = []
// Mastery effect id -> its stat lines: builds save which effect each picked
// mastery has, by id.
const masteryEffects = {}
for (const [id, n] of Object.entries(tree.nodes)) {
  // Each line is one mod, wrapped in the data: joined, so totals read it whole.
  for (const e of n.masteryEffects ?? []) masteryEffects[e.effect] = (e.stats ?? []).map(l => l.replace(/\s*\n\s*/g, ' '))
  if (id === 'root' || n.group == null || n.isProxy) continue
  const group = tree.groups[n.group]
  if (!group || group.isProxy) continue
  const kind = n.isAscendancyStart ? 'ascstart' : n.ascendancyName ? 'asc' : n.classStartIndex != null ? 'start' : n.isKeystone ? 'key' : n.isNotable ? 'notable' : n.isMastery ? 'mastery' : n.isJewelSocket ? 'jewel' : 'small'
  const stats = kind === 'mastery' || kind === 'start' || kind === 'ascstart' ? [] : n.stats ?? []
  if (kind === 'ascstart' || kind === 'asc') {
    const named = kind === 'asc' && n.isNotable
    rows.push([Number(id), 0, 0, kind, named ? n.name : '', named ? stats : [], []])
    continue
  }
  if (!groupIndex.has(n.group)) {
    groupIndex.set(n.group, groups.length)
    groups.push([Math.round(group.x), Math.round(group.y), group.background?.image ?? '', group.background?.isHalfImage ? 1 : 0])
  }
  const icon = kind === 'mastery' ? n.inactiveIcon : n.icon
  if (icon) used.add(icon)
  const a = angle(n.orbit, n.orbitIndex)
  const r = radii[n.orbit]
  rows.push([
    Number(id),
    Math.round(group.x + r * Math.sin(a)),
    Math.round(group.y - r * Math.cos(a)),
    kind,
    kind === 'start' ? '' : n.name,
    stats,
    (n.out ?? []).map(Number),
    icon ?? '',
    groupIndex.get(n.group),
    r,
    Math.round(a * 1000) / 1000
  ])
}

// Every group gets its background, including those with no node drawn yet.
const sheets = FROM_GGG
  ? Object.fromEntries(Object.entries(tree.sprites).map(([kind, zooms]) => [kind, zooms[SPRITE_ZOOM] ?? Object.values(zooms).at(-1)]))
  : parseLua(readFileSync(join(dirname(SOURCE), 'sprites.lua'), 'utf8')).sprites
const sprites = {}
for (const kind of SPRITE_KINDS) {
  const sheet = sheets[kind]
  const coords = {}
  for (const [key, c] of Object.entries(sheet.coords)) {
    const wanted = kind === 'frame' ? FRAMES.includes(key) : kind === 'groupBackground' || kind === 'background' || used.has(key)
    if (wanted) coords[key] = [c.x, c.y, c.w, c.h]
  }
  sprites[kind] = { url: sheet.filename, coords }
}

// PoB also lists ascendancy notables GGG's export no longer has (retired ones
// old builds still name). Coming from GGG, keep the ones the last build had.
if (FROM_GGG && existsSync(OUT)) {
  const have = new Set(rows.map(r => r[0]))
  for (const r of JSON.parse(readFileSync(OUT, 'utf8')).nodes) {
    if (r[3] === 'asc' && !have.has(r[0])) rows.push(r)
  }
}

mkdirSync(dirname(OUT), { recursive: true })
const out = JSON.stringify({ nodes: rows, groups, sprites, masteryEffects })
writeFileSync(OUT, out)
console.log(`${rows.length} nodes, ${out.length} bytes -> ${OUT}`)
