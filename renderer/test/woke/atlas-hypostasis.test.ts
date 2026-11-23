import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import { readAtlasTree } from '@/web/woke/atlas/atlas-tree'
import { decodeTree } from '@/web/woke/atlas/tree'
import { decodeShort, hypostasisToLink, rewriteHypostasisLinks } from '@/web/woke/atlas/hypostasis'

// GGG's 3.30 export, stripped to positions and links (the testing fixture).
const model = readAtlasTree(JSON.parse(fs.readFileSync(path.join(__dirname, '../../../testing/fixtures/atlas-tree-export.json'), 'utf8')))

// Guy's link, 2026-11-23.
const LINK = 'https://hypostasis.faith/atlas/data.html#t=qrmXAv4r4tzGXlcXtlRxmi_Xj9_rZ29b_70CSbHFCTOFS3hD-'

describe('hypostasis.faith atlas links', () => {
  it('reads the short form against the tree, checksum and all', () => {
    const items = decodeShort(model, LINK.split('#t=')[1])
    expect(items).not.toBeNull()
    // Every node is joined to the start through the others.
    const ids = new Set(items!.map(([id]) => id))
    const seen = new Set([model.start])
    const queue = [model.start]
    for (let i = 0; i < queue.length; i++) for (const n of model.links.get(queue[i]) ?? []) if (ids.has(n) && !seen.has(n)) { seen.add(n); queue.push(n) }
    expect(seen.size - 1).toBe(ids.size)
  })

  it('becomes a pathofexile.com link with the same passives', () => {
    const items = decodeShort(model, LINK.split('#t=')[1])!
    const url = hypostasisToLink(model, LINK)!
    expect(url).toMatch(/pathofexile\.com\/fullscreen-atlas-skill-tree\//)
    expect(decodeTree(url).nodes.sort((a, b) => a - b)).toEqual(items.map(([id]) => id).sort((a, b) => a - b))
  })

  it('refuses a code that is cut short or changed', () => {
    const code = LINK.split('#t=')[1]
    expect(decodeShort(model, code.slice(0, -3))).toBeNull()
    expect(decodeShort(model, code.slice(0, 6) + (code[6] === 'A' ? 'B' : 'A') + code.slice(7))).toBeNull()
    expect(() => rewriteHypostasisLinks(LINK.slice(0, -3), model)).toThrow(/hypostasis/)
  })

  it('reads the long form (#s=id,id:choice) with picked types', () => {
    const notable = [...model.variants.keys()][0]
    const effect = model.variants.get(notable)![1].effect
    const near = model.links.get(model.start)![0]
    const url = hypostasisToLink(model, `https://hypostasis.faith/atlas/data.html#s=${near},${notable}:1`)!
    const t = decodeTree(url)
    expect(t.nodes).toEqual([near, notable])
    expect(t.masteries).toEqual([{ node: notable, effect }])
  })

  it('swaps the link inside guide text', () => {
    const text = `Breach farm\n${LINK}\n8x Breach Thread`
    const out = rewriteHypostasisLinks(text, model)
    expect(out).toContain('pathofexile.com/fullscreen-atlas-skill-tree/')
    expect(out).toContain('8x Breach Thread')
    expect(() => rewriteHypostasisLinks(text, null)).toThrow(/loading/)
  })
})
