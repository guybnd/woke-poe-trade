import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import { pathTo, readAtlasTree } from '@/web/woke/atlas/atlas-tree'
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
    // The path out to it, the notable listed last with its pick.
    const path = pathTo(model, new Set([model.start]), notable).reverse().filter(id => id !== notable)
    const url = hypostasisToLink(model, `https://hypostasis.faith/atlas/data.html#s=${[...path, `${notable}:1`].join(',')}`)!
    const t = decodeTree(url)
    expect(t.nodes).toEqual([...path, notable])
    expect(t.masteries).toEqual([{ node: notable, effect }])
  })

  it('reads the long form as their viewer does: no masteries, no islands', () => {
    const near = model.links.get(model.start)![0]
    const mastery = [...model.nodes.values()].find(n => n.kind === 'mastery')!.id
    // A passive nowhere near the start, joined to nothing listed.
    const far = [...model.links.keys()].find(id => id !== model.start && !model.links.get(model.start)!.includes(id) && !model.links.get(near)!.includes(id))!
    const t = decodeTree(hypostasisToLink(model, `https://hypostasis.faith/atlas/#s=${near},${mastery},${far}`)!)
    expect(t.nodes).toEqual([near])
  })

  it('refuses Ruthless trees, links with no tree, and other pages', () => {
    const code = LINK.split('#')[1]
    expect(() => rewriteHypostasisLinks(`https://hypostasis.faith/atlas/ruthless.html#${code}`, model)).toThrow(/Ruthless/)
    expect(() => rewriteHypostasisLinks('https://hypostasis.faith/atlas/', model)).toThrow(/no tree/)
    expect(() => rewriteHypostasisLinks(`https://hypostasis.faith/other/x.html#${code}`, model)).toThrow(/isn't one of its atlas tree pages/)
    expect(rewriteHypostasisLinks(`https://hypostasis.faith/atlas/#${code}`, model)).toMatch(/pathofexile\.com/)
  })

  it('swaps the link inside guide text', () => {
    const text = `Breach farm\n${LINK}\n8x Breach Thread`
    const out = rewriteHypostasisLinks(text, model)
    expect(out).toContain('pathofexile.com/fullscreen-atlas-skill-tree/')
    expect(out).toContain('8x Breach Thread')
    expect(() => rewriteHypostasisLinks(text, null)).toThrow(/loading/)
  })

  it('leaves the sentence\'s punctuation after a link out of it', () => {
    for (const p of ['.', ',', ';', ':', '!', '?', '...']) {
      const out = rewriteHypostasisLinks(`My tree: ${LINK}${p} Enjoy`, model)
      expect(out).toMatch(/pathofexile\.com\/fullscreen-atlas-skill-tree\//)
      expect(out.endsWith(`${p} Enjoy`)).toBe(true)
    }
  })

  it('reads an empty pick ("id:") as no pick, not the first type', () => {
    const notable = [...model.variants.keys()][0]
    const path = pathTo(model, new Set([model.start]), notable).reverse().filter(id => id !== notable)
    const t = decodeTree(hypostasisToLink(model, `https://hypostasis.faith/atlas/data.html#s=${[...path, `${notable}:`].join(',')}`)!)
    expect(t.nodes).toEqual([...path, notable])
    expect(t.masteries).toEqual([])
  })
})
