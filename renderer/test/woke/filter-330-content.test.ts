// 3.30 (Covens of Umbra) in our own loot filter lists (WOKEPOET-191): the
// preview's drop table, the safety net and NeverSink 8.21's real filter.
import { describe, it, expect, beforeAll } from 'vitest'
import { ITEM_BY_REF } from '@/assets/data'
import { dropWindows, everyDrop, rollDrops, tableNames, THREADS } from '@/web/woke/loot-filter/drops'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import { auditBases, safetyBases, safetyBlocks, stackNet, SAFETY_RULE_TYPE } from '@/web/woke/loot-filter/safety'
import { insertBuildBlocks } from '@/web/woke/loot-filter/build-rules'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { loadGameData } from '../helpers/game-data'
import { neverSink } from '../helpers/neversink'

beforeAll(loadGameData)

const everything: PriceLookup = () => ({ chaos: 100, thin: false })
const NEW_BASES = ['Astrolabe Amulet', 'Cogwork Ring', 'Composite Ring', 'Geodesic Ring', 'Helical Ring', 'Manifold Ring', 'Ratcheting Ring', 'Cord Belt', 'Focused Amulet', 'Simplex Amulet', 'Stygian Vise']
const SOUL_CORES = ['Finesse', 'Instability', 'Intellect', 'Might'].map(s => `Soul Core of ${s}`)

const drop = (baseType: string, itemClass: string, stackSize = 1) =>
  ({ name: baseType, baseType, itemClass, stackSize, rarity: 'Normal', areaLevel: 83, itemLevel: 83, influences: [], explicitModNames: [] }) as unknown as ItemFacts

describe('the preview drop table', () => {
  it('only names items the 3.30 game data has', () => {
    // The data is the trade site's, and shards can't be traded.
    const missing = tableNames().filter(e => !ITEM_BY_REF(e.ns, e.name)?.length).map(e => e.name)
    expect(missing).toEqual(['Transmutation Shard'])
  })

  it('drops nothing 3.30 took out of the core pool', () => {
    const gone = tableNames().map(e => e.name).filter(n => /Scarab|^Sacrifice at|^Mortal |^Vial of|^Orb of Binding$/.test(n))
    expect(gone).toEqual([])
  })

  it('drops every Thread and Frayed Thread in maps, never in the campaign', () => {
    expect(THREADS).toHaveLength(10)
    for (const name of [...THREADS, 'Frayed Thread']) expect(ITEM_BY_REF('ITEM', name)?.[0]?.name, name).toBe(name)
    // What a big pile at that area level holds.
    const names = (area: number) => new Set(rollDrops(area, 3, 40000).map(d => d.facts.baseType))
    for (const name of [...THREADS, 'Frayed Thread']) {
      expect(names(83).has(name), name).toBe(true)
      expect(names(45).has(name), name).toBe(false)
    }
    const thread = everyDrop(83).find(d => d.facts.baseType === 'Breach Thread')!
    expect(thread.facts).toMatchObject({ itemClass: 'Map Fragments', stackSize: 1 })
    expect(rollDrops(83, 4, 5000).some(d => THREADS.includes(d.facts.baseType!))).toBe(true)
  })

  it('drops Royal Visage only from area level 81', () => {
    expect(rollDrops(80, 3, 100000).some(d => d.facts.baseType === 'Royal Visage')).toBe(false)
    expect(rollDrops(81, 3, 100000).find(d => d.facts.baseType === 'Royal Visage')?.facts.itemClass).toBe('Stackable Currency')
  })

  it('has the bases new to the core pool, in maps', () => {
    const pile = (area: number) => new Set(rollDrops(area, 5, 40000).map(d => d.facts.baseType))
    const maps = pile(83)
    const campaign = pile(60)
    for (const base of NEW_BASES) {
      expect(maps.has(base), base).toBe(true)
      expect(campaign.has(base), base).toBe(false)
    }
  })

  it('gives a base the game\'s own DropLevel, not the area it starts in', () => {
    const vise = everyDrop(83).find(d => d.facts.baseType === 'Stygian Vise')!
    expect(vise.facts.dropLevel).toBe(1)
    expect(everyDrop(83).find(d => d.facts.baseType === 'Simplex Amulet')!.facts.dropLevel).toBe(80)
  })

  it('never drops a base below its own DropLevel', () => {
    expect(dropWindows().filter(w => w.from < w.dropLevel).map(w => w.name)).toEqual([])
    // Every row can still drop somewhere.
    expect(dropWindows().filter(w => w.to != null && w.to < w.from).map(w => w.name)).toEqual([])
    for (const area of [1, 8, 20, 40, 60, 69, 83]) {
      const under = rollDrops(area, 11, 5000).filter(d => (d.facts.dropLevel ?? 0) > area && d.facts.mapTier == null)
      expect(under.map(d => d.facts.baseType), `area ${area}`).toEqual([])
    }
  })

  it('drops a magic or rare Stygian Vise at item tier 5 only, which NeverSink shows', () => {
    const vises = everyDrop(83).filter(d => d.facts.baseType === 'Stygian Vise')
    expect(vises.map(d => [d.facts.rarity, d.facts.unidentifiedItemTier])).toEqual([['Normal', undefined], ['Magic', 5], ['Rare', 5]])
    for (const d of rollDrops(83, 9, 20000).filter(x => x.facts.baseType === 'Stygian Vise')) {
      expect(d.facts.unidentifiedItemTier).toBe(d.facts.rarity === 'Normal' ? undefined : 5)
    }
    const doc = parseFilter(neverSink('3-STRICT'))
    const rare = vises.find(d => d.facts.rarity === 'Rare')!
    expect(matchItem(doc, rare.facts).final?.block).toMatchObject({ type: 'exoticbases', tier: 'exoticstiered' })
    // Other gear has no tier the table can vouch for.
    expect(everyDrop(83).find(d => d.facts.baseType === 'Vaal Regalia' && d.facts.rarity === 'Rare')!.facts.unidentifiedItemTier).toBeUndefined()
  })
})

describe('the safety net on NeverSink 8.21', () => {
  it('prices every Thread, Royal Visage, the Soul Cores and Essence of Trickery', () => {
    const verdicts = auditBases(parseFilter(neverSink('1-REGULAR')), everything, 20)
    const groupOf = (base: string) => verdicts.filter(v => v.base === base).map(v => v.group.type)
    for (const t of THREADS) expect(groupOf(t), t).toContain('fragments')
    expect(groupOf('Frayed Thread')).toContain('currency')
    expect(groupOf('Royal Visage')).toContain('mapenchantments')
    expect(groupOf('Divine Vessel')).toContain('fragments')
    expect(groupOf('Essence of Trickery')).toContain('currency->essence')
    for (const s of SOUL_CORES) expect(groupOf(s), s).toContain('currency')
  })

  it('shows a valuable Thread a strict filter hides', () => {
    const doc = parseFilter([
      'Hide # $type->fragments $tier->t3',
      '\tClass == "Map Fragments" "Misc Map Items"',
      '\tBaseType == "Breach Thread" "Ritual Thread"',
      ''
    ].join('\n'))
    const look: PriceLookup = (_, base) => base === 'Breach Thread' ? { chaos: 40, thin: false } : base === 'Ritual Thread' ? { chaos: 1, thin: false } : null
    const net = safetyBases(doc, look, 20)
    expect(net.plain).toEqual(['Breach Thread'])
    insertBuildBlocks(doc, safetyBlocks(net))
    expect(matchItem(doc, drop('Breach Thread', 'Map Fragments')).final?.block.type).toBe(SAFETY_RULE_TYPE)
    expect(matchItem(doc, drop('Ritual Thread', 'Map Fragments')).visibility).toBe('Hide')
  })

  it('never asks for a stack of Divine Vessels bigger than the 20 they stack to', () => {
    const doc = parseFilter([
      'Hide # $type->fragments $tier->t3',
      '\tClass == "Map Fragments" "Misc Map Items"',
      '\tBaseType == "Breach Thread" "Divine Vessel"',
      ''
    ].join('\n'))
    // 0.6c: only a stack of 40 is over a 20c line.
    const cheap: PriceLookup = () => ({ chaos: 0.6, thin: false })
    expect(stackNet(doc, cheap, 20)).toEqual({ 40: ['Breach Thread'] })
    // 1.5c: 20 Divine Vessels make the line.
    const dearer: PriceLookup = () => ({ chaos: 1.5, thin: false })
    expect(stackNet(doc, dearer, 20)).toEqual({ 20: ['Breach Thread', 'Divine Vessel'] })
  })
})
