// NeverSink's cluster jewel price rules following poe.ninja.
import { describe, it, expect } from 'vitest'
import { applyClusterPrices, normalizeClusterPrices, planClusterRules, readClusterLines, ruleKey } from '@/web/woke/loot-filter/cluster-prices'
import type { ClusterPriceSettings, NinjaClusterLine } from '@/web/woke/loot-filter/cluster-prices'
import { blocksOf } from '@/web/woke/loot-filter/edits'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { composeFilter } from '@/web/woke/loot-filter/compose'
import { defaultPresets } from '@/web/woke/loot-filter/presets'
import { LEVELS, neverSink } from '../helpers/neversink'

const line = (name: string, base: string, passives: number, ilvl: number, chaos: number, listingCount = 50): NinjaClusterLine =>
  ({ name, baseType: `${base} Cluster Jewel`, variant: `${passives} passives`, levelRequired: ilvl, chaosValue: chaos, listingCount })

const LINES: NinjaClusterLine[] = [
  line('Minions deal 10% increased Damage', 'Large', 12, 84, 400),
  line('12% increased Fire Damage', 'Large', 12, 84, 40),
  line('Wand Attacks deal 12% increased Damage with Hits and Ailments', 'Large', 12, 84, 3),
  line('12% increased Cold Damage', 'Large', 12, 84, 900, 2),
  line('Staff Attacks deal 12% increased Damage with Hits and Ailments, Mace or Sceptre Attacks deal 12% increased Damage with Hits and Ailments', 'Large', 8, 84, 30),
  line('Minions deal 10% increased Damage', 'Large', 8, 68, 120),
  line('6% increased Mana Reservation Efficiency of Skills', 'Small', 3, 84, 200),
  line('Not an enchant at all', 'Large', 12, 84, 9999)
]
const PRICES = readClusterLines(LINES)
const ON: ClusterPriceSettings = { on: true, top: 100, good: 15, pins: {} }

describe('reading poe.ninja', () => {
  it('names each line by the passive type the filter uses', () => {
    expect(PRICES.map(p => `${p.size} ${p.passives} ${p.ilvl} ${p.node}`)).toEqual([
      'Large 12 84 Minion Damage', 'Large 12 84 Fire Damage', 'Large 12 84 Wand Damage', 'Large 12 84 Cold Damage',
      'Large 8 84 Mace and Staff Damage', 'Large 8 68 Minion Damage', 'Small 3 84 Reservation Efficiency'
    ])
  })
})

describe('planning NeverSink\'s rules', () => {
  const doc = parseFilter(neverSink('1-REGULAR'))
  const plans = planClusterRules(doc, PRICES, ON)
  const plan = (tier: string) => plans.find(p => p.block.tier === tier)!

  it('reads each rule as size, passives and item level', () => {
    expect(ruleKey(blocksOf(doc, 'jewels->clustereco', 'n12_i84_t1')[0])).toEqual({ size: 'Large', passives: [12], ilvl: 84 })
    expect(ruleKey(blocksOf(doc, 'jewels->clustereco', 'n12_i75_t1')[0])).toEqual({ size: 'Large', passives: [12], ilvl: 75 })
    // NeverSink's Medium "4" rules say EnchantmentPassiveNum <= 5: 4 and 5.
    expect(ruleKey(blocksOf(doc, 'jewels->clustereco', 'n4_i84_t1')[0])).toEqual({ size: 'Medium', passives: [5, 4], ilvl: 84 })
  })

  it('puts types over the top line in t1 and over the good line in t2, skipping thin prices', () => {
    expect(plan('n12_i84_t1').nodes).toEqual(['Minion Damage'])
    // t2 holds t1's types too, as NeverSink's does.
    expect(plan('n12_i84_t2').nodes).toEqual(['Fire Damage', 'Minion Damage'])
    expect(plan('n8_i84_t2').nodes).toEqual(['Mace and Staff Damage'])
    // 75-83 has no row of its own on poe.ninja: priced at 68.
    expect(plan('n8_i75_t1').nodes).toEqual(['Minion Damage'])
    expect(plan('n3_i84_t1').nodes).toEqual(['Reservation Efficiency'])
  })

  it('follows your picks over the price', () => {
    const p = planClusterRules(doc, PRICES, { ...ON, pins: { 'Large|Wand Damage': 'top', 'Large|Minion Damage': 'never' } })
    const at = (tier: string) => p.find(x => x.block.tier === tier)!.nodes
    expect(at('n12_i84_t1')).toEqual(['Wand Damage'])
    expect(at('n11_i84_t1')).toEqual(['Wand Damage'])
    expect(at('n12_i84_t2')).toEqual(['Fire Damage', 'Wand Damage'])
  })

  it('prices a rule over every passive count it catches', () => {
    const lines = [line('Minions have 12% increased maximum Life', 'Medium', 5, 84, 300)]
    const p = planClusterRules(doc, readClusterLines(lines), ON)
    expect(p.find(x => x.block.tier === 'n4_i84_t1')!.nodes).toEqual(['Minion Life'])
  })
})

describe('rewriting the filter', () => {
  it.each(LEVELS)('%s: lists what prices say, turns off what has nothing, and the game can read it', (level) => {
    const doc = parseFilter(neverSink(level))
    applyClusterPrices(doc, PRICES, ON)
    for (const b of blocksOf(doc, 'jewels->clustereco')) {
      const nodes = b.conditions.find(c => c.key === 'EnchantmentPassiveNode')?.values ?? []
      if (!b.disabled) expect(nodes.length, b.tier ?? '').toBeGreaterThan(0)
    }
    const text = serializeFilter(doc)
    expect(text).not.toMatch(/^\s*EnchantmentPassiveNode ==\s*$/m)
  })

  it('leaves NeverSink alone when off or without prices', () => {
    const doc = parseFilter(neverSink('1-REGULAR'))
    const before = serializeFilter(doc)
    expect(applyClusterPrices(doc, PRICES, { ...ON, on: false })).toBe(0)
    expect(applyClusterPrices(doc, [], ON)).toBe(0)
    expect(serializeFilter(doc)).toBe(before)
  })

  it('goes in before your edits, so they win', () => {
    const c = composeFilter(neverSink('1-REGULAR'), {
      presets: defaultPresets(),
      rules: [],
      edits: [{ id: 1, kind: 'visibility', type: 'jewels->clustereco', tier: 'n12_i84_t1', visibility: 'Hide' }],
      buildRules: { gems: false, uniques: false, bases: false, flasks: false, links: false } as never,
      build: null,
      moves: [],
      safetyNet: { on: false, minChaos: 1 },
      prices: { lookup: null, safety: null, breakdown: null },
      dustList: null,
      heldBack: () => false,
      stackHeld: () => false,
      clusterPrices: PRICES
    })
    const b = blocksOf(c.doc, 'jewels->clustereco', 'n12_i84_t1')[0]
    expect(b.visibility).toBe('Hide')
    expect(b.conditions.find(x => x.key === 'EnchantmentPassiveNode')?.values).toEqual(['Minion Damage'])
    expect(c.clusterSig).not.toBe('')
  })
})

describe('settings', () => {
  it('keeps good at or under top and drops unknown pins', () => {
    expect(normalizeClusterPrices({ on: false, top: 50, good: 80, pins: { 'Large|Minion Damage': 'top', 'Huge|X': 'top', 'Small|Life': 'maybe', 'Large|Made Up" Hide': 'top' } }))
      .toEqual({ on: false, top: 50, good: 50, pins: { 'Large|Minion Damage': 'top' } })
    expect(normalizeClusterPrices(undefined).on).toBe(true)
  })
})
