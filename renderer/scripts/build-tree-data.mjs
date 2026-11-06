// Builds the passive tree in public/data/tree from Path of Building's own tree
// data. Run it after a league's tree lands in PoB:
//
//   npm run tree-data -- "%APPDATA%/Path of Building Community/TreeData/3_29/tree.lua"
//
// PoB is MIT licensed, and the tree is GGG's. Each node is one row:
// [id, x, y, kind, name, stats, linked ids]. Ascendancy nodes have no place on
// the drawn tree, so they sit at 0, 0 and are only ever listed by name. They and
// class starts are in here because builds list them among their points.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RENDERER = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(RENDERER, 'public/data/tree/passive-tree.json')
const SOURCE = process.argv[2]
if (!SOURCE) throw new Error('Usage: npm run tree-data -- <path to PoB TreeData/<version>/tree.lua>')

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

const tree = parseLua(readFileSync(SOURCE, 'utf8'))
const radii = tree.constants.orbitRadii
const perOrbit = tree.constants.skillsPerOrbit
const ANGLES_16 = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]
const ANGLES_40 = [0, 10, 20, 30, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 135, 140, 150, 160, 170, 180, 190, 200, 210, 220, 225, 230, 240, 250, 260, 270, 280, 290, 300, 310, 315, 320, 330, 340, 350]

function angle (orbit, index) {
  const n = perOrbit[orbit]
  const deg = n === 16 ? ANGLES_16[index] : n === 40 ? ANGLES_40[index] : index * 360 / n
  return deg * Math.PI / 180
}

const rows = []
for (const [id, n] of Object.entries(tree.nodes)) {
  if (id === 'root' || n.group == null || n.isProxy) continue
  const group = tree.groups[n.group]
  if (!group || group.isProxy) continue
  const kind = n.isAscendancyStart ? 'ascstart' : n.ascendancyName ? 'asc' : n.classStartIndex != null ? 'start' : n.isKeystone ? 'key' : n.isNotable ? 'notable' : n.isMastery ? 'mastery' : n.isJewelSocket ? 'jewel' : 'small'
  // Small passives are many and alike: their stats are the weight of this file
  // and nothing lists them.
  const stats = kind === 'small' || kind === 'mastery' || kind === 'start' || kind === 'ascstart' ? [] : n.stats ?? []
  if (kind === 'ascstart' || kind === 'asc') {
    const named = kind === 'asc' && n.isNotable
    rows.push([Number(id), 0, 0, kind, named ? n.name : '', named ? stats : [], []])
    continue
  }
  const a = angle(n.orbit, n.orbitIndex)
  const r = radii[n.orbit]
  rows.push([
    Number(id),
    Math.round(group.x + r * Math.sin(a)),
    Math.round(group.y - r * Math.cos(a)),
    kind,
    kind === 'small' || kind === 'mastery' || kind === 'start' ? '' : n.name,
    stats,
    (n.out ?? []).map(Number)
  ])
}

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(rows))
console.log(`${rows.length} nodes, ${JSON.stringify(rows).length} bytes -> ${OUT}`)
