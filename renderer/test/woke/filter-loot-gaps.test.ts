// The Loot tab's sections for what NeverSink still decided (NeverSink
// retirement M4a, 2026-11-28): replicas, unique maps, cluster jewel bases,
// heist gear, corpses, life and mana flasks.
import { describe, it, expect, beforeAll } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { CURRENCY_TYPE, applyCurrency, currencyItems, defaultCurrency, kindOf, sectionMode } from '@/web/woke/loot-filter/currency-weights'
import { CLUSTER_ROWS, clusterEnchantRows, clusterFloor, clusterSizeOf } from '@/web/woke/loot-filter/jewel-classes'
import { TOP_LIFE_MANA } from '@/web/woke/loot-filter/flask-classes'
import { BASE_FACTS } from '@/web/woke/loot-filter/base-facts'
import type { PriceLookup } from '@/web/woke/loot-filter/economy'
import { priceLookup } from '@/web/woke/loot-filter/economy'
import type { PriceItem } from '@/web/woke/market/types'
import { uniquesOnBase } from '@/web/woke/shared/uniques-on-base'
import { neverSink } from '../helpers/neversink'
import { loadGameData } from '../helpers/game-data'

const SEMI = neverSink('2-SEMI-STRICT')
const facts = (base: string, cls: string, rarity: ItemFacts['rarity'], itemLevel: number, more: Partial<ItemFacts> = {}): ItemFacts =>
  ({ name: base, baseType: base, itemClass: cls, rarity, itemLevel, areaLevel: 83, influences: [], explicitModNames: [], ...more } as ItemFacts)
const on = () => { const c = defaultCurrency(); c.on = true; return c }
const priceItem = (type: string, name: string, chaos: number, more: Partial<PriceItem> = {}): PriceItem => ({ type, name, variant: '', chaos, ...more })

beforeAll(() => loadGameData())

describe('Loot sections for NeverSink\'s last gaps', () => {
  it('prices a replica base by its most valuable Replica, Always shown above NeverSink\'s replica rules', () => {
    const lookup = priceLookup([priceItem('UniqueAccessory', 'Replica Headhunter', 900), priceItem('UniqueAccessory', 'Headhunter', 9000), priceItem('Currency', 'Divine Orb', 160)], uniquesOnBase, 'max', 'drop')
    const items = currencyItems(parseFilter(SEMI), lookup).filter(i => i.cat === 'uniqrep')
    const belt = items.find(i => i.bt === 'Leather Belt')!
    expect(belt).toMatchObject({ name: 'Replica Leather Belt', chaos: 900, est: false, top: 'Replica Headhunter' })
    expect(kindOf('uniqrep')).toBe('uniques')
    expect(sectionMode({ catMode: {} }, 'uniqrep')).toBe('always')
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(), lookup)
    const hit = matchItem(doc, facts('Leather Belt', 'Belts', 'Unique', 84, { replica: true }))
    expect(hit.final?.block).toMatchObject({ type: CURRENCY_TYPE, visibility: 'Show', tier: 's5' })
    // An unpriced replica still shows (Always).
    const other = items.find(i => i.bt !== 'Leather Belt')!
    expect(other.est).toBe(true)
    expect(matchItem(doc, facts(other.bt!, 'Belts', 'Unique', 84, { replica: true })).visibility).toBe('Show')
    // The plain Headhunter is still the unique base's, not the replica row's.
    expect(matchItem(doc, facts('Leather Belt', 'Belts', 'Unique', 84)).final?.block.comment).not.toMatch(/uniqrep/)
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
  })

  it('shows every unique map, at least at what the cheapest one sells for', () => {
    const maps = uniquesOnBase('Map')
    expect(maps.length).toBeGreaterThan(10)
    const lookup = priceLookup([priceItem('UniqueMap', maps[0], 4), priceItem('UniqueMap', maps[1], 40), priceItem('UniqueMap', maps[2], 0.5, { gaps: 7 })], uniquesOnBase, 'max', 'drop')
    const row = currencyItems(parseFilter(SEMI), lookup).find(i => i.cat === 'mapuniq')!
    expect(row).toMatchObject({ name: 'Unique map', chaos: 4, top: maps[1] })
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(), lookup)
    const hit = matchItem(doc, { ...facts('Map (Tier 16)', 'Maps', 'Unique', 83), mapTier: 16 })
    expect(hit.final?.block).toMatchObject({ type: CURRENCY_TYPE, visibility: 'Show', tier: 's3' })
  })

  it('cluster jewel bands priced by the cheapest of their kind, money enchants get rows above the NeverSink price rules', () => {
    const L = (passives: number, ilvl: number, node: string, chaos: number, listings = 20) => ({ size: 'Large' as const, passives, ilvl, node, chaos, listings })
    const lines = [
      L(8, 84, 'Chaos Damage', 100),
      L(8, 84, 'Fire Damage', 6),
      L(8, 84, 'Cold Damage', 1, 2),
      L(8, 75, 'Fire Damage', 2),
      // Thin data under 84: capped at the same enchant's 84+ price.
      L(8, 68, 'Chaos Damage', 263),
      L(12, 84, 'Minion Damage', 2897),
      L(12, 84, 'Fire Damage', 7)
    ]
    const at84 = CLUSTER_ROWS.find(r => r.name === 'Large Cluster Jewel, 8 passives, item level 84+')!
    expect(clusterFloor(at84, lines)).toBe(6)
    expect(clusterFloor(CLUSTER_ROWS.find(r => r.name === 'Large Cluster Jewel, 8 passives, item level under 84')!, lines)).toBe(2)
    const rows = clusterEnchantRows(lines)
    expect(rows.map(r => [r.name, r.chaos])).toEqual([
      ['Large Cluster Jewel, Minion Damage, 12 passives, item level 84+', 2897],
      ['Large Cluster Jewel, Chaos Damage, 8 passives, item level 84+', 100],
      ['Large Cluster Jewel, Chaos Damage, 8 passives, item level under 84', 100]
    ])
    expect(clusterSizeOf(rows[0].name)).toBe('Large')
    const doc = parseFilter(SEMI)
    const lookup: PriceLookup = () => null
    applyCurrency(doc, on(), lookup, null, null, null, lines)
    const jewel = (passives: number, ilvl: number, node?: string) => facts('Large Cluster Jewel', 'Jewels', 'Rare', ilvl, { enchantmentPassiveNum: passives, enchantPassiveNodes: node ? [node] : [] })
    // The money enchant is loud; another enchant on the same band is the band's price.
    expect(matchItem(doc, jewel(12, 84, 'Minion Damage')).final?.block).toMatchObject({ type: CURRENCY_TYPE, tier: 's5' })
    // A type NeverSink's price rules name and we have no row for: theirs.
    expect(matchItem(doc, jewel(8, 84, 'Fire Damage')).final?.block).toMatchObject({ type: 'jewels->clustereco' })
    // Any other type: the band row, at the band's price.
    expect(matchItem(doc, jewel(10, 84, 'Wand Damage')).final?.block.comment).toMatch(/jewclus/)
    // A 9-passive Large: a guess, still shown (Always).
    expect(matchItem(doc, jewel(9, 84)).final?.block).toMatchObject({ type: CURRENCY_TYPE, visibility: 'Show' })
    // Enchant rows above NeverSink's cluster price rules; band rows under
    // them, so those rules still catch a passive type without a row.
    const ench = doc.blocks.findIndex(b => b.comment.includes('jewclus') && b.conditions.some(c => c.key === 'EnchantmentPassiveNode'))
    const band = doc.blocks.findIndex(b => b.comment.includes('jewclus') && !b.conditions.some(c => c.key === 'EnchantmentPassiveNode'))
    const eco = doc.blocks.findIndex(b => b.type === 'jewels->clustereco')
    expect(eco).toBeGreaterThanOrEqual(0)
    expect(ench).toBeLessThan(eco)
    expect(band).toBeGreaterThan(eco)
    // A type poe.ninja prices only under 84 gets no row there.
    expect(clusterEnchantRows([L(8, 84, 'Fire Damage', 6), L(8, 68, 'Cold Damage', 2), L(8, 68, 'Wand Damage', 40)]).map(r => r.name)).toEqual([])
  })

  it('heist gear louder from item level 83, unique contracts loud, corpses by name', () => {
    const lookup: PriceLookup = (g, base) => g.type === 'corpses' && base === 'Perfect Forest Tiger' ? { chaos: 80, thin: false } : null
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(), lookup)
    expect(matchItem(doc, facts('Whisper-woven Cloak', 'Heist Cloaks', 'Normal', 84)).final?.block).toMatchObject({ type: CURRENCY_TYPE, visibility: 'Show', tier: 's2' })
    expect(matchItem(doc, facts('Whisper-woven Cloak', 'Heist Cloaks', 'Rare', 75)).final?.block).toMatchObject({ type: CURRENCY_TYPE, visibility: 'Show', tier: 's1' })
    expect(matchItem(doc, facts('Master Lockpick', 'Heist Tools', 'Magic', 83)).visibility).toBe('Show')
    expect(matchItem(doc, facts('Contract: Bunker', 'Contracts', 'Unique', 83)).final?.block).toMatchObject({ type: CURRENCY_TYPE, tier: 's3' })
    expect(matchItem(doc, facts('Perfect Forest Tiger', 'Corpses', 'Normal', 83)).final?.block).toMatchObject({ type: CURRENCY_TYPE, tier: 's5' })
    // No price: a guess by grade.
    expect(matchItem(doc, facts('Perfect Warlord', 'Corpses', 'Normal', 83)).final?.block).toMatchObject({ type: CURRENCY_TYPE, tier: 's3' })
    expect(matchItem(doc, facts('Imperfect Warlord', 'Corpses', 'Normal', 83)).final?.block).toMatchObject({ type: CURRENCY_TYPE, visibility: 'Show', tier: 's1' })
  })

  it('life and mana flasks by quality and item level', () => {
    for (const b of TOP_LIFE_MANA) expect(BASE_FACTS[b][0]).toBeGreaterThanOrEqual(60)
    const top = Object.keys(BASE_FACTS).filter(b => / (Life|Mana|Hybrid) Flask$/.test(b) && BASE_FACTS[b][0] >= 60).sort()
    expect(TOP_LIFE_MANA).toEqual(top)
    const doc = parseFilter(SEMI)
    applyCurrency(doc, on(), () => null)
    const step = (f: ItemFacts) => matchItem(doc, { corrupted: false, mirrored: false, quality: 0, ...f })
    expect(step(facts('Divine Life Flask', 'Life Flasks', 'Magic', 84, { quality: 30 })).final?.block).toMatchObject({ type: CURRENCY_TYPE, tier: 's3' })
    // Any flask over 20% shows at least Decent (Guy 2026-11-28).
    expect(step(facts('Divine Life Flask', 'Life Flasks', 'Magic', 84, { quality: 23 })).final?.block).toMatchObject({ type: CURRENCY_TYPE, tier: 's3' })
    expect(step(facts('Eternal Mana Flask', 'Mana Flasks', 'Normal', 84, { quality: 5 })).final?.block).toMatchObject({ type: CURRENCY_TYPE, visibility: 'Hide' })
    // Tinctures score on Equipment, not here.
    expect(matchItem(doc, facts('Oakbranch Tincture', 'Tinctures', 'Normal', 84, { quality: 27 })).final?.block.comment ?? '').not.toMatch(/flasktinc/)
    // A corrupted one is NeverSink's (or Equipment's) to decide.
    expect(step(facts('Divine Life Flask', 'Life Flasks', 'Magic', 84, { quality: 30, corrupted: true })).final?.block.comment ?? '').not.toMatch(/flasklife/)
    expect(kindOf('flasklife')).toBe('flasks')
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
  })
})

describe('Equipment tinctures', () => {
  it('lists every tincture base and scores it like a utility flask', async () => {
    const { TINCTURE_BASES, compileFlasks } = await import('@/web/woke/loot-filter/flask-weights')
    const { defaultWeights } = await import('@/web/woke/loot-filter/weight-settings')
    expect([...TINCTURE_BASES]).toEqual(Object.keys(BASE_FACTS).filter(b => / Tincture$/.test(b)).sort())
    const w = { ...defaultWeights(), on: true }
    const blocks = compileFlasks(w)
    const tinc = blocks.filter(b => b.conditions.some(c => c.key === 'Class' && c.values.includes('Tinctures')))
    expect(tinc.length).toBeGreaterThan(1)
    expect(tinc.every(b => b.tier!.startsWith('flasktinc'))).toBe(true)
    // Good at 26%+ and item level 85: far over the line.
    const top = tinc.find(b => b.conditions.some(c => c.key === 'Quality' && c.values[0] === '26') && b.conditions.some(c => c.key === 'ItemLevel'))!
    expect(top.visibility).toBe('Show')
    expect(tinc.at(-1)).toMatchObject({ visibility: 'Hide', tier: 'flasktinc0' })
  })
})
