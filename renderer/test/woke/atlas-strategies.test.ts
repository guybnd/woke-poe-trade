// Atlas strategies like PoB builds: the atlas tree as an editable tree, its
// share links, folders, strategy codes, Threads from guide text, and regex
// folders in the Regex library.
import { describe, it, expect } from 'vitest'
import { LIT_COLOURS, litColour } from '@/web/woke/atlas/mechanic-colours'
import { atlasTotals, filterTotals } from '@/web/woke/atlas/totals'
import { assetUrl, encodeAtlasTree, pathTo, pointsUsed, readAtlasTree, refundSet } from '@/web/woke/atlas/atlas-tree'
import { decodeTree } from '@/web/woke/atlas/tree'
import { allFolders, claimRegexFolders, dropDraft, isDirty, restoreDrafts, sameTree, saveDraft, setDraft, strategyBack, takeDrafts, workingTree, folderTree, freeRegexFolder, movedFolder, regexFolderOf, emptyStrategy } from '@/web/woke/atlas/strategies'
import { readStrategyCode, strategyCode } from '@/web/woke/atlas/strategy-code'
import type { AtlasStrategy } from '@/web/woke/atlas/strategies'
import { parseGuideText } from '@/web/woke/atlas/guide'
import { parseCostLines, priceLines, treeWarnings } from '@/web/woke/atlas/loadout'
import { categoryView } from '@/web/woke/regex-library/widget'
import type { RegexEntry } from '@/web/woke/regex-library/widget'
import { buildRegexFolder, strategyRegexFolder } from '@/web/woke/regex-library/folder-names'

// A small atlas in GGG's export shape: start -> 1 -> 2 -> 3 (notable with a
// type to pick), and 2 -> 4 (Unwavering Vision); 9 is a mastery label.
const atlas = {
  nodes: {
    root: { out: ['100'] },
    100: { skill: 100, name: '', group: 1, orbit: 0, orbitIndex: 0, out: ['1'] },
    1: { skill: 1, name: 'Small', stats: ['1% more'], group: 1, orbit: 1, orbitIndex: 0, out: ['2'] },
    2: { skill: 2, name: 'Small', stats: ['1% more'], group: 1, orbit: 1, orbitIndex: 1, out: ['3', '4'] },
    3: {
      skill: 3,
      name: 'Dextral Threads',
      isNotable: true,
      stats: ['200% increased chance for [Thread|Threads] in your Maps to be of type'],
      variantEffects: [{ effect: 52289, stats: ['[BreachThread|Breach]'] }, { effect: 36845, stats: ['[RitualThread|Ritual]'] }],
      group: 1,
      orbit: 1,
      orbitIndex: 2,
      out: []
    },
    4: { skill: 4, name: 'Unwavering Vision', isKeystone: true, stats: [], group: 1, orbit: 1, orbitIndex: 3, out: [] },
    9: { skill: 9, name: 'Threads', isMastery: true, group: 1, orbit: 0, orbitIndex: 0, out: [] }
  },
  groups: { 1: { x: 0, y: 0, background: { image: 'PSGroupBackground1' } } },
  constants: { orbitRadii: [0, 82], skillsPerOrbit: [1, 6] },
  sprites: {
    frame: { 0.3835: { filename: 'https://web.poecdn.com/frame.webp', coords: { NotableFrameAllocated: { x: 0, y: 0, w: 10, h: 10 } } } },
    mastery: { 0.3835: { filename: 'https://web.poecdn.com/mastery.webp', coords: {} } }
  },
  points: { totalPoints: 3 }
}

describe('atlas tree model', () => {
  const model = readAtlasTree(atlas)

  it('reads nodes, the start, picks and the art', () => {
    expect(model.start).toBe(100)
    expect(model.nodes.get(100)?.kind).toBe('start')
    expect(model.nodes.get(3)?.kind).toBe('notable')
    expect(model.nodes.get(3)?.stats).toEqual(['200% increased chance for Threads in your Maps to be of type'])
    expect(model.variants.get(3)).toEqual([{ effect: 52289, text: 'Breach' }, { effect: 36845, text: 'Ritual' }])
    expect(model.art.sprites.masteryInactive.url).toContain('mastery')
    expect(model.points).toBe(3)
    // Masteries are labels: nothing reaches them.
    expect(model.links.has(9)).toBe(false)
  })

  it('takes the shortest path and refunds what hangs off a node', () => {
    const taken = new Set([100])
    expect(pathTo(model, taken, 3).sort()).toEqual([1, 2, 3])
    const all = new Set([100, 1, 2, 3, 4])
    expect(refundSet(model, all, 2).sort()).toEqual([2, 3, 4])
    expect(refundSet(model, all, 3)).toEqual([3])
    expect(pathTo(model, all, 9)).toEqual([])
    expect(pointsUsed(model, all)).toBe(4)
  })

  it('writes a link the decoder reads back, with picked types', () => {
    const url = encodeAtlasTree([1, 2, 3], { 3: 36845 })
    expect(url).toMatch(/^https:\/\/www\.pathofexile\.com\/fullscreen-atlas-skill-tree\/[\w-]+$/)
    const back = decodeTree(url)
    expect(back.nodes).toEqual([1, 2, 3])
    expect(back.masteries).toEqual([{ node: 3, effect: 36845 }])
  })

  it('reads poeplanner atlas links (little-endian, GGG node ids)', () => {
    const url = 'https://poeplanner.com/atlas-tree/BQAeAABrAF17YR-ZSEz1AEhiA7L6uy7B7njjwCohYPONNyBV6pRpKOfGhoxB3_K1Zky6fVoiiEyET_cdfXQdt12L4X2RCnsndQ5KWcze_rbyntiiymdge2BPL3-rtdi9x9U_KY1FdsFsWYZw43435fFaeQXx4WU34wD5ghndg-EQ0w4ZCszk-7GHt321gojrX1x1xIXiDl7fThtzPiFMxSEkMqt2F1ATfa7v6AoZlJNhyXAYiwtxfW1Zb4gHZofa-gk2QZYvctlcqUNmH9RsuWLe-p196z3ZxofUI98UAB-LCAAAAAAAAAMDAAAAAAAAAAAA'
    const t = decodeTree(url)
    expect(t.version).toBe(5)
    expect(t.nodes).toHaveLength(107)
    expect(t.nodes.slice(0, 3)).toEqual([31581, 8033, 18585])
    expect(t.nodes).toContain(28029)
    expect(t.masteries).toEqual([])
    // Our own links still go the GGG way, and junk with a non-zero first byte is refused.
    expect(decodeTree(encodeAtlasTree([3, 1, 2], {})).nodes).toEqual([3, 1, 2])
    expect(() => decodeTree('https://poeplanner.com/atlas-tree/' + btoa('\xff\xff\x00\x00\x00\x01\x00'))).toThrow()
    expect(() => decodeTree('BQAeAAD_AF17')).toThrow()
    expect(() => decodeTree(url.replace('/atlas-tree/', '/'))).toThrow()
  })

  it('reads the art from the export repository beside data.json', () => {
    const data = 'https://raw.githubusercontent.com/grindinggear/atlastree-export/master/data.json'
    expect(assetUrl('https://web.poecdn.com/image/passive-skill/atlas-skills-3.webp?b8c5c9bc', data))
      .toBe('https://raw.githubusercontent.com/grindinggear/atlastree-export/master/assets/atlas-skills-3.webp')
    expect(assetUrl('https://web.poecdn.com/x.webp', 'https://example.com/tree')).toBe('https://web.poecdn.com/x.webp')
    expect(readAtlasTree(atlas, data).art.sprites.frame.url).toBe('https://raw.githubusercontent.com/grindinggear/atlastree-export/master/assets/frame.webp')
  })

  it('warns when the Threads break the tree', () => {
    const threads = [{ type: 'Breach', count: 8 }, { type: 'Ritual', count: 4 }]
    expect(treeWarnings(model, new Set([100, 1, 2, 4]), threads)).toContain('Unwavering Vision allows one Thread type')
    expect(treeWarnings(model, new Set([100, 1, 2]), threads)).toEqual([])
    expect(treeWarnings(model, new Set([100, 1, 2, 3, 4]), [])).toEqual(['1 over the 3 points'])
  })
})

function strat (over: Partial<AtlasStrategy>): AtlasStrategy {
  return { ...emptyStrategy([]), ...over }
}

describe('strategy folders', () => {
  const list = [
    strat({ id: 1, name: 'Breach', folder: 'Juicing' }),
    strat({ id: 2, name: 'Ritual', folder: 'Juicing/Deep' }),
    strat({ id: 3, name: 'Alch', folder: '' })
  ]

  it('nests folders, counting what is under each', () => {
    const root = folderTree(list, ['Bossing'])
    expect(root.children.map(c => c.name)).toEqual(['Bossing', 'Juicing'])
    const juicing = root.children[1]
    expect(juicing.total).toBe(2)
    expect(juicing.children[0].path).toBe('Juicing/Deep')
    expect(root.strategies.map(s => s.name)).toEqual(['Alch'])
    expect(allFolders(list)).toEqual(['Juicing', 'Juicing/Deep'])
  })

  it('moves a folder with everything under it', () => {
    expect(movedFolder('Juicing/Deep', 'Juicing', 'League/Juice')).toBe('League/Juice/Deep')
    expect(movedFolder('Juicingx', 'Juicing', 'X')).toBe('Juicingx')
  })

  it('round-trips a folder as a strategy code, folders relative to it', () => {
    const code = strategyCode([{ ...list[0], threads: [{ type: 'Breach', count: 8 }], regexes: [{ name: 'Map mods', text: '"!ref"' }] }, list[1]], 'Juicing')
    const back = readStrategyCode(code)
    expect(back.map(s => [s.name, s.folder])).toEqual([['Breach', ''], ['Ritual', 'Deep']])
    expect(back[0].threads).toEqual([{ type: 'Breach', count: 8 }])
    expect(back[0].regexes).toEqual([{ name: 'Map mods', text: '"!ref"' }])
    expect(() => readStrategyCode('woke-atlas:nope')).toThrow()
  })
})

describe('guide text and costs', () => {
  it('reads Thread lines', () => {
    const s = parseGuideText('Breach juice\n8x Breach Thread\nRitual Threads x4\n1x Vaal Orb')
    expect(s.threads).toEqual([{ type: 'Breach', count: 8 }, { type: 'Ritual', count: 4 }])
    expect(s.name).toBe('Breach juice')
    expect(s.scarabs).toBe('1x Vaal Orb')
  })

  it('prices currency lines by name, plural or not', () => {
    const items = [{ type: 'Currency', name: 'Chaos Orb', variant: '', chaos: 1 }, { type: 'Currency', name: 'Vaal Orb', variant: '', chaos: 2 }]
    const priced = priceLines(parseCostLines('2 Chaos Orbs\n1x Vaal Orb\nMystery'), items)
    expect(priced.map(p => [p.qty, p.item?.name ?? null])).toEqual([[2, 'Chaos Orb'], [1, 'Vaal Orb'], [1, null]])
  })
})

describe('regex library folders', () => {
  const entry = (id: number, category: string): RegexEntry => ({ id, name: String(id), text: 't' + id, category, tags: [], notes: '', hotkey: null })
  const entries = [
    entry(1, 'Maps'),
    entry(2, 'Atlas strategies/Juicing/Breach'),
    entry(3, 'Atlas strategies/Juicing/Breach'),
    entry(4, 'Atlas strategies/Alch'),
    entry(5, 'PoB builds/RF')
  ]

  it('shows plain categories as before and nested ones as folders', () => {
    const top = categoryView(entries, '')
    expect(top.groups.map(g => g.category)).toEqual(['Maps'])
    expect(top.folders.map(f => [f.name, f.count])).toEqual([['Atlas strategies', 3], ['PoB builds', 1]])
    const atlasView = categoryView(entries, 'Atlas strategies')
    expect(atlasView.folders.map(f => f.path)).toEqual(['Atlas strategies/Juicing'])
    expect(atlasView.groups.map(g => [g.label, g.entries.length])).toEqual([['Alch', 1]])
    const juicing = categoryView(entries, 'Atlas strategies/Juicing')
    expect(juicing.groups.map(g => [g.label, g.entries.length])).toEqual([['Breach', 2]])
  })

  it('names the folders after the strategy and the build file', () => {
    expect(strategyRegexFolder({ folder: 'Juicing/Deep', name: 'Breach / Ritual' })).toBe('Atlas strategies/Juicing/Deep/Breach - Ritual')
    expect(buildRegexFolder('3.30/RF Jugg.xml')).toBe('PoB builds/3.30/RF Jugg')
  })
})

describe('each strategy keeps its own regex folder', () => {
  it('gives same-named strategies their own folders, the first keeping the old one', () => {
    const list = [
      { ...emptyStrategy([]), id: 1, name: 'Breach', folder: 'Juicing' },
      { ...emptyStrategy([]), id: 2, name: 'Breach', folder: 'Juicing' }
    ]
    claimRegexFolders(list)
    expect(list.map(s => s.regexFolder)).toEqual(['Atlas strategies/Juicing/Breach', 'Atlas strategies/Juicing/Breach (2)'])
  })

  it('skips a folder something else is filed in', () => {
    const list = [{ ...emptyStrategy([]), id: 1, name: 'Breach', folder: '' }]
    expect(freeRegexFolder(list[0], list, f => f === 'Atlas strategies/Breach')).toBe('Atlas strategies/Breach (2)')
    expect(regexFolderOf({ name: 'X', folder: 'A' })).toBe('Atlas strategies/A/X')
  })

  it('leaves its folder out of a strategy code', () => {
    const code = strategyCode([{ ...emptyStrategy([]), id: 1, name: 'A', regexFolder: 'Atlas strategies/A' }])
    expect(atob(code.slice('woke-atlas:'.length))).not.toContain('regexFolder')
  })
})

describe('mechanics on the atlas tree', () => {
  it('names each passive after its wheel\'s mastery', () => {
    const model = readAtlasTree(atlas)
    expect(model.mechanics).toEqual(['Threads'])
    expect(model.mechanicOf.get(3)).toBe('Threads')
    // The start and the mastery itself are not lit.
    expect(model.mechanicOf.has(100)).toBe(false)
    expect(model.mechanicOf.has(9)).toBe(false)
    // No art for its icon in this small sheet: no icon, not a broken one.
    expect(model.mechanicArt.has('Threads')).toBe(false)
  })

  it('colours mechanics by the order they were picked', () => {
    expect(litColour(['Breach', 'Ritual'], 'Ritual')).toBe(LIT_COLOURS[1])
    expect(litColour(['Breach'], 'Breach')).toBe(LIT_COLOURS[0])
  })
})

describe('unsaved tree edits', () => {
  it('keeps an edit as a draft until saved, and drops one back at the saved tree', () => {
    const s = { ...emptyStrategy([]), id: 4, treeUrl: 'saved' }
    const w = { drafts: {} } as unknown as Parameters<typeof setDraft>[0]
    setDraft(w, s, 'edited')
    expect(isDirty(w, s)).toBe(true)
    expect(workingTree(w, s)).toBe('edited')
    setDraft(w, s, 'saved')
    expect(isDirty(w, s)).toBe(false)
    expect(w.drafts).toEqual({})
    setDraft(w, s, 'edited')
    saveDraft(w, s)
    expect(s.treeUrl).toBe('edited')
    expect(w.drafts).toEqual({})
    setDraft(w, s, 'again')
    dropDraft(w, s)
    expect(workingTree(w, s)).toBe('edited')
  })
})

describe('drafts and removed strategies', () => {
  it('counts a re-encoded link of the same plan as saved, but a new order as a change', () => {
    const a = encodeAtlasTree([1, 2, 3], { 3: 36845 })
    expect(sameTree(a, encodeAtlasTree([1, 2, 3], { 3: 36845 }))).toBe(true)
    expect(sameTree(a, encodeAtlasTree([3, 2, 1], { 3: 36845 }))).toBe(false)
    expect(sameTree(a, encodeAtlasTree([1, 2], {}))).toBe(false)
  })

  it('takes a removed strategy\'s draft away and puts it back on Undo', () => {
    const w = { strategies: [], drafts: { 5: 'x', 6: 'y' } } as unknown as Parameters<typeof takeDrafts>[0]
    const taken = takeDrafts(w, [5])
    expect(w.drafts).toEqual({ 6: 'y' })
    restoreDrafts(w, taken)
    expect(w.drafts).toEqual({ 5: 'x', 6: 'y' })
  })

  it('puts a removed strategy back under a new id when one added since took its id, its draft moved along', () => {
    const gone = { ...emptyStrategy([]), id: 2, name: 'Gone' }
    const w = { strategies: [{ ...emptyStrategy([]), id: 1 }, gone], drafts: { 2: 'draft' } } as unknown as Parameters<typeof takeDrafts>[0]
    w.strategies = w.strategies.filter(s => s.id !== 2)
    const taken = takeDrafts(w, [2])
    const added = emptyStrategy(w.strategies)
    expect(added.id).toBe(2)
    w.strategies.push(added)
    const back = strategyBack(w, gone, taken)
    expect(back.id).toBe(3)
    expect(back.name).toBe('Gone')
    expect(w.drafts).toEqual({ 3: 'draft' })
    expect(workingTree(w, added)).toBe('')
  })

  it('puts a removed strategy back under its own id when it is still free', () => {
    const gone = { ...emptyStrategy([]), id: 2 }
    const w = { strategies: [{ ...emptyStrategy([]), id: 1 }], drafts: {} } as unknown as Parameters<typeof takeDrafts>[0]
    expect(strategyBack(w, gone, { 2: 'd' })).toBe(gone)
    expect(w.drafts).toEqual({ 2: 'd' })
  })
})

describe('atlas totals', () => {
  it('sums stat lines across taken passives, by mechanic, with picked types', () => {
    const model = readAtlasTree(atlas)
    const groups = atlasTotals(model, new Set([100, 1, 2, 3]), { 3: 36845 })
    expect(groups.map(g => g.mechanic)).toEqual(['Threads'])
    const rows = groups[0].rows.map(r => r.text)
    expect(rows).toContain('2% more')
    expect(rows).toContain('200% increased chance for Threads in your Maps to be of type: Ritual')
    expect(groups[0].rows.find(r => r.text === '2% more')?.ids).toEqual([1, 2])
    expect(filterTotals(groups, 'ritual')[0].rows).toHaveLength(1)
    expect(filterTotals(groups, 'nothing')).toEqual([])
  })

  it('adds only amounts: tiers, ranges and counts stay as written, signs stay', () => {
    const line = (stats: string[]) => ({ ...atlas.nodes[1], stats })
    const data = {
      ...atlas,
      nodes: {
        ...atlas.nodes,
        1: line(['Tier 1-15 Maps found have 7% chance to become 1 tier higher', '10% increased chance to contain Memory Tears (Tier 16+)', 'Expeditions in your Maps have +1 Remnants']),
        2: { ...line(['Tier 1-15 Maps found have 7% chance to become 1 tier higher', '10% increased chance to contain Memory Tears (Tier 16+)', 'Expeditions in your Maps have +1 Remnants']), skill: 2 }
      }
    }
    const rows = atlasTotals(readAtlasTree(data), [100, 1, 2], {})[0].rows.map(r => r.text)
    expect(rows).toEqual([
      'Tier 1-15 Maps found have 14% chance to become 1 tier higher',
      '20% increased chance to contain Memory Tears (Tier 16+)',
      'Expeditions in your Maps have +2 Remnants'
    ])
  })

  it('reads a typed notable with no stat of its own as its picked type', () => {
    const data = { ...atlas, nodes: { ...atlas.nodes, 3: { ...atlas.nodes[3], stats: [] } } }
    const model = readAtlasTree(data)
    expect(atlasTotals(model, [100, 1, 2, 3], { 3: 52289 })[0].rows.map(r => r.text)).toContain('Breach')
    expect(atlasTotals(model, [100, 1, 2, 3], {})[0].rows.map(r => r.text)).toContain('No type picked')
  })
})

describe('the plan\'s order', () => {
  it('keeps the order passives were taken through a link', () => {
    expect(decodeTree(encodeAtlasTree([3, 1, 2], {})).nodes).toEqual([3, 1, 2])
  })
})
