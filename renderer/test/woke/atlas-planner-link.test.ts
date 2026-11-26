import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import { encodeAtlasTree, readAtlasTree } from '@/web/woke/atlas/atlas-tree'
import { decodeTree } from '@/web/woke/atlas/tree'
import { PLANNER_LACKS, plannerToLink, readCompact, rewritePlannerLinks } from '@/web/woke/atlas/planner-link'

// GGG's 3.30 export, stripped to positions and links (the testing fixture).
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../testing/fixtures/atlas-tree-export.json'), 'utf8'))
const model = readAtlasTree(data)

// Guy's link, 2026-11-26: 149 / 150 on the site.
const LINK = 'https://atlas-blush-beta.vercel.app/#oYDbMbVLW5Z9kjHiztXo_-172_l01DVe_Pefe9nYGfgg'
// What the site's own decoder reads from it (run on the site), start left out.
const SITE_READ = [
  565, 777, 866, 2111, 2328, 2730, 2792, 2929, 3204, 3296, 3795, 5720, 6530, 7540, 7791, 8132,
  10209, 10321, 10431, 10448, 10944, 11045, 11214, 11223, 11915, 12291, 12836, 13448, 13833, 14287, 14369, 15324,
  15921, 15961, 15967, 16341, 16490, 16780, 16822, 17151, 17584, 19675, 19729, 20223, 21096, 22689, 22844, 23195,
  24040, 24106, 25259, 25273, 25923, 26007, 26601, 27028, 27186, 28220, 28477, 28834, 28873, 28971, 29088, 29137,
  29605, 29621, 29991, 30044, 30207, 30266, 30277, 30402, 30893, 31171, 31240, 32019, 32157, 33008, 33684, 33820,
  33837, 33868, 34393, 34502, 34662, 34850, 35176, 36458, 37420, 37913, 38084, 38465, 38692, 39147, 39158, 39362,
  40369, 40490, 40832, 40846, 40852, 41053, 41351, 41591, 41694, 42156, 42605, 42692, 43052, 43591, 43714, 43872,
  44917, 44993, 47095, 47222, 47914, 48107, 48296, 48316, 50511, 50686, 50991, 51014, 51133, 51572, 52079, 52974,
  53193, 53540, 53613, 56639, 56860, 57123, 57566, 57854, 58023, 58167, 58224, 59989, 60045, 60645, 62796, 63460,
  63753, 64178, 64218, 64609, 65535
]

const sorted = (a: number[]) => [...a].sort((x, y) => x - y)

// The site's compact code for a set of passives on `m`, as its encoder writes it.
function siteCode (m: typeof model, taken: Set<number>, picks: Record<number, number> = {}): string {
  const bits: number[] = []
  const seen = new Set([m.start])
  const order = [m.start]
  for (let i = 0; i < order.length; i++) {
    for (const id of [...(m.links.get(order[i]) ?? [])].sort((a, b) => a - b)) {
      if (seen.has(id)) continue
      seen.add(id)
      bits.push(taken.has(id) ? 1 : 0)
      if (taken.has(id)) order.push(id)
    }
  }
  for (const id of order) if (m.variants.has(id)) { const v = picks[id] ?? 0; bits.push((v >> 2) & 1, (v >> 1) & 1, v & 1) }
  const bytes = [0xa1]
  bits.forEach((b, i) => { if (i % 8 === 0) bytes.push(0); if (b) bytes[bytes.length - 1] |= 128 >> (i % 8) })
  while (bytes.length > 1 && bytes[bytes.length - 1] === 0) bytes.pop()
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

describe('Atlas Tree Planner links', () => {
  it('reads Guy\'s link to the same 149 passives the site shows', () => {
    const url = plannerToLink(model, LINK)!
    expect(url).toMatch(/pathofexile\.com\/fullscreen-atlas-skill-tree\//)
    const t = decodeTree(url)
    expect(sorted(t.nodes)).toEqual(SITE_READ)
    // Its two picked types come along.
    expect(t.masteries).toHaveLength(2)
    for (const m of t.masteries) expect(model.variants.get(m.node)!.map(v => v.effect)).toContain(m.effect)
  })

  it('reads it on GGG\'s newer tree too, which has passives the site lacks', () => {
    // Today's export adds two notables in the walk; read without them, it
    // shifts every bit after (83 passives, ending far short of the link).
    const ids = new Set(PLANNER_LACKS)
    const newer = JSON.parse(JSON.stringify(data))
    newer.nodes['27261'] = { skill: 27261, name: 'Celestial Presence', group: Number(Object.keys(newer.groups)[0]), orbit: 0, orbitIndex: 0, out: [], isNotable: true, variantEffects: [{ effect: 1, stats: ['a'] }, { effect: 2, stats: ['b'] }] }
    newer.nodes['31171'].out = [...(newer.nodes['31171'].out ?? []), '27261']
    newer.nodes['53484'] = { skill: 53484, name: 'Runic Distortion', group: Number(Object.keys(newer.groups)[0]), orbit: 0, orbitIndex: 0, out: [], isNotable: true }
    newer.nodes['302'].out = [...(newer.nodes['302'].out ?? []), '53484']
    const m2 = readAtlasTree(newer)
    const bytes = Uint8Array.from(atob(LINK.split('#')[1].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    expect(readCompact(m2, bytes)).toBeNull()
    expect(sorted(readCompact(m2, bytes, ids)!.nodes)).toEqual(SITE_READ)
    expect(sorted(decodeTree(plannerToLink(m2, LINK)!).nodes)).toEqual(SITE_READ)
    // A link the site makes once it has the newer tree reads on it as well.
    const code = siteCode(m2, new Set([...SITE_READ, 27261]), { 27261: 1 })
    const t = decodeTree(plannerToLink(m2, `https://atlas-blush-beta.vercel.app/#${code}`)!)
    expect(sorted(t.nodes)).toEqual(sorted([...SITE_READ, 27261]))
    expect(t.masteries).toContainEqual({ node: 27261, effect: 2 })
  })

  it('round-trips a small plan with a picked type', () => {
    const notable = [...model.variants.keys()][0]
    const pathOut: number[] = []
    // A breadth-first path from the start to the notable.
    const prev = new Map<number, number>([[model.start, -1]])
    const q = [model.start]
    for (let i = 0; i < q.length && !prev.has(notable); i++) for (const n of model.links.get(q[i]) ?? []) if (!prev.has(n)) { prev.set(n, q[i]); q.push(n) }
    for (let c = notable; c !== model.start; c = prev.get(c)!) pathOut.push(c)
    const t = decodeTree(plannerToLink(model, `https://atlas-blush-beta.vercel.app/#${siteCode(model, new Set(pathOut), { [notable]: 1 })}`)!)
    expect(sorted(t.nodes)).toEqual(sorted(pathOut))
    expect(t.masteries).toEqual([{ node: notable, effect: model.variants.get(notable)![1].effect }])
  })

  it('reads the older id list and GGG codes in the hash', () => {
    const a = model.links.get(model.start)![0]
    const b = model.links.get(a)!.find(n => n !== model.start)!
    const far = SITE_READ.find(id => !model.links.get(model.start)!.includes(id) && id !== a && id !== b && !model.links.get(a)!.includes(id) && !model.links.get(b)!.includes(id))!
    expect(sorted(decodeTree(plannerToLink(model, `https://atlas-blush-beta.vercel.app/#${a},${b},${far}`)!).nodes)).toEqual(sorted([a, b]))
    const ggg = encodeAtlasTree([a, b], {}).split('/').pop()!
    expect(decodeTree(plannerToLink(model, `https://atlas-blush-beta.vercel.app/#${ggg}`)!).nodes).toEqual([a, b])
  })

  it('swaps links in text and says what\'s wrong with one it can\'t read', () => {
    const out = rewritePlannerLinks(`Tree: ${LINK}. Threads: Breach`, model)
    expect(out).toMatch(/^Tree: https:\/\/www\.pathofexile\.com\/fullscreen-atlas-skill-tree\/[\w-]+\. Threads: Breach$/)
    expect(() => rewritePlannerLinks('https://atlas-blush-beta.vercel.app/', model)).toThrow(/no tree/)
    expect(() => rewritePlannerLinks(LINK, null)).toThrow(/loading/)
    // Cut short: the walk ends with bits left over, or reads garbage types.
    expect(() => rewritePlannerLinks('https://atlas-blush-beta.vercel.app/#oQ', model)).toThrow(/doesn't fit/)
  })
})
