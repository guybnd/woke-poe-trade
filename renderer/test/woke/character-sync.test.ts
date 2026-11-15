// The synced character (main/src/woke/personal/character-sync.ts) and how the
// overlay compares it with a PoB build (pob-builds/character.ts).
import { describe, expect, it } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { AUTO_MS, CharacterSync, MANUAL_MS, fileStore, gemGroups, parseCharacterItems, parsePassives } from '../../../main/src/woke/personal/character-sync'
import type { CharacterSnapshot as MainSnapshot, CharacterStore } from '../../../main/src/woke/personal/character-sync'
import type { HttpReply } from '../../../main/src/woke/personal/stash-reader'
import { characterDiff, gearDiff, gemDiff } from '@/web/woke/pob-builds/character'
import type { CharacterSnapshot } from '@/web/woke/pob-builds/character'
import type { PobDetails, PobItem } from '@/web/woke/pob-builds/widget'

const HELM = {
  inventoryId: 'Helm',
  frameType: 2,
  name: 'Gale Crown',
  typeLine: 'Leather Hood',
  baseType: 'Leather Hood',
  explicitMods: ['+45 to maximum [Life|Life]'],
  sockets: [{ group: 0, sColour: 'G' }, { group: 0, sColour: 'B' }, { group: 1, sColour: 'R' }],
  socketedItems: [
    { frameType: 4, typeLine: 'Precision', baseType: 'Precision', socket: 0, support: false, properties: [{ name: 'Level', values: [['14', 0]] }, { name: 'Quality', values: [['+7%', 1]] }] },
    { frameType: 4, typeLine: 'Anomalous Arcane Surge Support', baseType: 'Arcane Surge Support', socket: 1, support: true, properties: [{ name: 'Level', values: [['3', 0]] }] },
    { frameType: 4, typeLine: 'Leap Slam', baseType: 'Leap Slam', socket: 2, support: false },
    // An abyss jewel in a socket isn't a gem.
    { frameType: 2, typeLine: 'Murderous Eye Jewel', socket: 2 }
  ]
}

const ITEMS = JSON.stringify({
  items: [
    HELM,
    { inventoryId: 'BodyArmour', frameType: 3, name: 'Tabula Rasa', typeLine: 'Simple Robe', baseType: 'Simple Robe' },
    { inventoryId: 'Flask', x: 0, frameType: 1, name: '', typeLine: 'Seething Divine Life Flask of Staunching', baseType: 'Divine Life Flask' },
    { inventoryId: 'Weapon2', frameType: 0, name: '', typeLine: 'Driftwood Wand', baseType: 'Driftwood Wand' },
    // Not equipment.
    { inventoryId: 'MainInventory', frameType: 0, typeLine: 'Scroll of Wisdom' }
  ]
})

describe('parseCharacterItems', () => {
  it('reads every equipped slot in PoB names, flasks and swap included', () => {
    const r = parseCharacterItems(ITEMS)!
    expect(r.gear.map(s => s.slot)).toEqual(['Helmet', 'Body Armour', 'Flask 1', 'Weapon 1 Swap'])
    expect(r.gear[0].item).toMatchObject({ rarity: 'RARE', name: 'Gale Crown', base: 'Leather Hood' })
  })

  it('groups socketed gems by link, with level, quality and plain names', () => {
    const groups = gemGroups('Helmet', HELM)
    expect(groups).toHaveLength(2)
    expect(groups[0].gems).toEqual([
      { name: 'Precision', level: 14, quality: 7, support: false, colour: 'G' },
      { name: 'Arcane Surge Support', level: 3, quality: null, support: true, colour: 'B' }
    ])
    expect(groups[1].gems.map(g => g.name)).toEqual(['Leap Slam'])
  })

  it('is null for anything but an items reply', () => {
    expect(parseCharacterItems('<html>')).toBeNull()
    expect(parseCharacterItems('{"error":{}}')).toBeNull()
  })
})

describe('parsePassives', () => {
  it('reads nodes, cluster nodes, masteries and jewels', () => {
    const t = parsePassives(JSON.stringify({
      hashes: [100, 200, 200, 300],
      hashes_ex: [65600],
      mastery_effects: { 4000: 48385, 4100: '12345' },
      items: [{ x: 2, frameType: 2, name: 'Grim Spark', typeLine: 'Cobalt Jewel', baseType: 'Cobalt Jewel' }]
    }))!
    expect(t.nodes).toEqual([100, 200, 300])
    expect(t.clusterNodes).toEqual([65600])
    expect(t.masteries).toEqual({ 4000: 48385, 4100: 12345 })
    expect(t.jewels).toHaveLength(1)
    expect(t.jewels[0].x).toBe(2)
  })

  it('unpacks the older list of packed mastery numbers', () => {
    const t = parsePassives(JSON.stringify({ hashes: [], mastery_effects: [4000 + 48385 * 0x10000] }))!
    expect(t.masteries).toEqual({ 4000: 48385 })
  })

  it('is null without hashes', () => {
    expect(parsePassives('{}')).toBeNull()
  })
})

const ok = (body: unknown): HttpReply => ({ status: 200, headers: {}, body: JSON.stringify(body) })
const CHARS = [{ name: 'SlayMe', league: 'Covens', class: 'Slayer', level: 64, lastActive: true }]

function setup (opts: { replies?: (url: string) => HttpReply, account?: string | null } = {}) {
  let now = 1_000_000
  const urls: string[] = []
  const saved: MainSnapshot[] = []
  const store: CharacterStore = { load: async () => null, save: async (s) => { saved.push(s) } }
  const replies = opts.replies ?? ((url: string) => url.includes('get-characters')
    ? ok(CHARS)
    : url.includes('get-items') ? { status: 200, headers: {}, body: ITEMS } : ok({ hashes: [1, 2, 3] }))
  const sync = new CharacterSync({
    fetch: async (url) => { urls.push(url); return replies(url) },
    now: () => now,
    sleep: async () => {},
    account: () => opts.account === undefined ? 'guy' : opts.account,
    store,
    onStatus: () => {},
    signedOut: () => {}
  })
  return { sync, urls, saved, advance: (ms: number) => { now += ms } }
}

describe('CharacterSync', () => {
  it('reads list, items and passives, then saves the snapshot', async () => {
    const t = setup()
    const s = await t.sync.read('manual')
    expect(t.urls.map(u => /character-window\/([\w-]+)/.exec(u)![1])).toEqual(['get-characters', 'get-items', 'get-passive-skills'])
    expect(t.urls[1]).toContain('character=SlayMe')
    expect(s.snapshot?.character).toEqual({ name: 'SlayMe', league: 'Covens', class: 'Slayer', level: 64 })
    expect(s.snapshot?.tree.nodes).toEqual([1, 2, 3])
    expect(t.saved).toHaveLength(1)
  })

  it('reads on area changes (when on) at most every 5 minutes, and Read now at most every 30 s', async () => {
    const t = setup()
    t.sync.auto = true
    await t.sync.read('area')
    expect(t.urls).toHaveLength(3)
    t.advance(AUTO_MS - 1)
    await t.sync.read('area')
    expect(t.urls).toHaveLength(3)
    await t.sync.read('manual')
    expect(t.urls).toHaveLength(6)
    t.advance(MANUAL_MS - 1)
    await t.sync.read('manual')
    expect(t.urls).toHaveLength(6)
  })

  it('says when Read now comes too soon', async () => {
    const t = setup()
    await t.sync.read('manual')
    t.advance(10_000)
    const s = await t.sync.read('manual')
    expect(s.error).toBe('Read just now; again in 20 s.')
    expect(s.snapshot).not.toBeNull()
  })

  it('makes no area reads with auto off, the default', async () => {
    const t = setup()
    await t.sync.read('area')
    expect(t.urls).toHaveLength(0)
  })

  it('does nothing signed out', async () => {
    const t = setup({ account: null })
    const s = await t.sync.read('manual')
    expect(t.urls).toHaveLength(0)
    expect(s.error).toBe('Signed out of pathofexile.com.')
  })

  it('stops on a 429 and keeps the last read', async () => {
    let limited = false
    const t = setup({
      replies: (url) => limited ? { status: 429, headers: {}, body: '' } : url.includes('get-characters') ? ok(CHARS) : url.includes('get-items') ? { status: 200, headers: {}, body: ITEMS } : ok({ hashes: [7] })
    })
    await t.sync.read('manual')
    limited = true
    t.advance(MANUAL_MS)
    const s = await t.sync.read('manual')
    expect(s.error).toMatch(/slow down/)
    expect(s.snapshot?.tree.nodes).toEqual([7])
  })

  it("doesn't call a read of another account yours", async () => {
    const t = setup()
    await t.sync.read('manual')
    let account = 'someoneelse'
    const other = new CharacterSync({
      fetch: async () => ok(CHARS), now: () => 0, account: () => account, store: { load: async () => t.saved[0], save: async () => {} }, onStatus: () => {}, signedOut: () => {}
    })
    expect((await other.current()).snapshot).toBeNull()
    account = 'GUY'
    expect((await other.current()).snapshot?.character.name).toBe('SlayMe')
  })
})

describe('fileStore', () => {
  it('writes current.json and a file per character, and loads it back', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woke-char-'))
    const store = fileStore(dir)
    const t = setup()
    await t.sync.read('manual')
    await store.save(t.saved[0])
    expect(fs.existsSync(path.join(dir, 'current.json'))).toBe(true)
    expect(fs.existsSync(path.join(dir, 'characters', 'SlayMe.json'))).toBe(true)
    expect((await store.load())?.character.name).toBe('SlayMe')
    fs.rmSync(dir, { recursive: true, force: true })
  })
})

const item = (rarity: PobItem['rarity'], name: string, base = ''): PobItem => ({ rarity, name, base, sockets: '', implicits: [], mods: [] })

describe('gearDiff', () => {
  it('marks matches, same bases, different items and missing slots', () => {
    const rows = gearDiff([
      { slot: 'Body Armour', item: item('UNIQUE', 'Tabula Rasa', 'Simple Robe') },
      { slot: 'Helmet', item: item('UNIQUE', "Starkonja's Head", 'Silken Hood') },
      { slot: 'Gloves', item: item('RARE', 'Build Gloves', 'Deerskin Gloves') },
      { slot: 'Belt', item: item('RARE', 'Build Belt', 'Heavy Belt') }
    ], [
      { slot: 'Body Armour', item: item('UNIQUE', 'Tabula Rasa', 'Simple Robe') },
      { slot: 'Helmet', item: item('RARE', 'Gale Crown', 'Leather Hood') },
      { slot: 'Belt', item: item('RARE', 'Rune Clasp', 'Heavy Belt') },
      { slot: 'Weapon 1 Swap', item: item('NORMAL', 'Driftwood Wand') }
    ])
    expect(Object.fromEntries(rows.map(r => [r.slot, r.state]))).toEqual({
      'Body Armour': 'match', 'Helmet': 'differs', 'Gloves': 'missing', 'Belt': 'base'
    })
  })
})

describe('gemDiff', () => {
  it('finds the matching link and marks missing and extra gems', () => {
    const groups = [{
      label: '',
      slot: 'Helmet',
      enabled: true,
      isMain: false,
      gems: [
        { name: 'Precision', level: 20, quality: 0, enabled: true },
        { name: 'Arcane Surge Support', level: 20, quality: 0, enabled: true, support: true },
        { name: 'Inspiration Support', level: 20, quality: 0, enabled: true, support: true }
      ]
    }]
    const d = gemDiff(groups, gemGroups('Helmet', HELM))
    expect(d[0].gems.map(g => [g.name, g.have])).toEqual([['Precision', true], ['Arcane Surge Support', true], ['Inspiration Support', false]])
    expect(d[0].extra).toEqual([])
  })
})

describe('characterDiff', () => {
  it('counts passives to take and to refund against the build tree', () => {
    const snap: CharacterSnapshot = {
      version: 1,
      account: 'guy',
      readAt: 0,
      character: { name: 'SlayMe', league: 'Covens', class: 'Slayer', level: 64 },
      gear: [],
      gems: [],
      tree: { nodes: [1, 2, 3, 9], clusterNodes: [], masteries: {}, jewels: [] }
    }
    const details = {
      className: 'Duelist',
      ascendClassName: 'Slayer',
      level: 68,
      mainSkill: '',
      notes: '',
      skills: [],
      trees: [{ title: 'Level 68', url: '', isActive: true, nodes: [1, 2, 3, 4, 5] }]
    } as PobDetails
    const d = characterDiff(snap, details, null, 64, 10)
    expect(d.tree?.added).toBe(2)
    expect(d.tree?.removed).toBe(1)
    expect(d.treeTitle).toBe('Level 68')
  })
})

describe('treeAhead with your real points', () => {
  const trees = [
    { title: 'Level 30', url: '', isActive: false, nodes: [1, 2, 3] },
    { title: 'Level 60', url: '', isActive: false, nodes: [1, 2, 3, 4, 5, 6] },
    { title: 'Level 90', url: '', isActive: true, nodes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 65600] }
  ]
  it('moves past every tree the spent points cover, counted alike on both sides', async () => {
    const { treeAhead, useLivePoints } = await import('@/web/woke/pob-builds/build-model')
    // As character.ts counts: start nodes (here 1) and cluster passives aren't points.
    const points = (ids: number[]) => ids.filter(id => id !== 1 && id < 0x10000).length
    useLivePoints(() => ({ have: 5, points }))
    expect(treeAhead(trees, trees[0], 1, 1).title).toBe('Level 90')
    useLivePoints(() => ({ have: 4, points }))
    expect(treeAhead(trees, trees[0], 1, 1).title).toBe('Level 60')
    // Never behind the guess by level.
    useLivePoints(() => ({ have: 0, points }))
    expect(treeAhead(trees, trees[0], 90, 10).title).toBe('Level 90')
    useLivePoints(() => null)
    expect(treeAhead(trees, trees[0], 1, 1).title).toBe('Level 30')
  })
})

describe('upgradeList', () => {
  it('lists slots that differ, priced uniques cheapest first, then unpriced, then rares', async () => {
    const { upgradeList } = await import('@/web/woke/pob-builds/character')
    const rows = gearDiff([
      { slot: 'Body Armour', item: item('UNIQUE', "Utula's Hunger", 'Zodiac Leather') },
      { slot: 'Helmet', item: item('UNIQUE', "Devoto's Devotion", 'Nightmare Bascinet') },
      { slot: 'Gloves', item: item('RARE', 'Hate Grasp', 'Ringmail Gloves') },
      { slot: 'Amulet', item: item('UNIQUE', 'Odd Amulet', 'Onyx Amulet') },
      { slot: 'Boots', item: item('UNIQUE', 'Legacy of Fury', 'Wyrmscale Boots') }
    ], [
      { slot: 'Boots', item: item('UNIQUE', 'Legacy of Fury', 'Wyrmscale Boots') },
      { slot: 'Gloves', item: item('RARE', 'Hypnotic Mitts', 'Ringmail Gloves') }
    ])
    const prices: Record<string, number> = { "Utula's Hunger": 120, "Devoto's Devotion": 4 }
    const r = upgradeList(rows, it => prices[it.name] != null ? { chaos: prices[it.name] } : null)
    expect(r.rows.map(x => x.item.name)).toEqual(["Devoto's Devotion", "Utula's Hunger", 'Odd Amulet'])
    expect(r.chaos).toBe(124)
    expect(r.atLeast).toBe(true)
  })
})

describe('gearDiff across ring and flask slots', () => {
  it('treats rings and flasks worn in another order as the same gear', () => {
    const rows = gearDiff([
      { slot: 'Ring 1', item: item('UNIQUE', 'Ventor\'s Gamble', 'Gold Ring') },
      { slot: 'Ring 2', item: item('UNIQUE', 'The Taming', 'Prismatic Ring') },
      { slot: 'Flask 1', item: item('MAGIC', 'Quicksilver Flask of Adrenaline', 'Quicksilver Flask') }
    ], [
      { slot: 'Ring 1', item: item('UNIQUE', 'The Taming', 'Prismatic Ring') },
      { slot: 'Ring 2', item: item('UNIQUE', 'Ventor\'s Gamble', 'Gold Ring') },
      { slot: 'Flask 3', item: item('MAGIC', 'Quicksilver Flask of the Cheetah', 'Quicksilver Flask') }
    ])
    expect(Object.fromEntries(rows.map(r => [r.slot, r.state]))).toEqual({ 'Ring 1': 'match', 'Ring 2': 'match', 'Flask 1': 'base' })
  })
})

describe('jewelDiff', () => {
  it('places read jewels by the game slot order and compares socket by socket', async () => {
    const { jewelDiff } = await import('@/web/woke/pob-builds/character')
    const rows = jewelDiff(
      [{ node: 100, item: item('UNIQUE', 'Watcher\'s Eye', 'Prismatic Jewel') }, { node: 200, item: item('RARE', 'Grim Spark', 'Cobalt Jewel') }],
      [{ x: 1, item: item('RARE', 'Rune Eye', 'Cobalt Jewel') }, { x: 2, item: item('MAGIC', 'Lucky Jewel', 'Crimson Jewel') }],
      [100, 200, 300],
      null
    )
    expect(Object.fromEntries(rows.map(r => [r.node, r.state]))).toEqual({ 100: 'missing', 200: 'base', 300: 'extra' })
  })
})
