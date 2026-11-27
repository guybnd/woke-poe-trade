// Rare weights (weights.ts): off writes nothing; on, the compiled rules give
// every unidentified endgame rare the step its weight says, on NeverSink's
// real filter, and leave other items to NeverSink.
import { describe, it, expect, beforeAll } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { WEIGHT_TYPE, applyWeights, baseRanks, defaultWeights, filterBases, normalizeWeights, stepOf, weightOf } from '@/web/woke/loot-filter/weights'
import type { WeightItem, WeightSettings, BaseRow } from '@/web/woke/loot-filter/weights'
import { BASE_FACTS } from '@/web/woke/loot-filter/base-facts'
import { neverSink } from '../helpers/neversink'
import { loadGameData } from '../helpers/game-data'

beforeAll(loadGameData, 60000)

const SEMI = neverSink('2-SEMI-STRICT')

function rng (seed: number) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
}

// A random rare and the facts a filter would see on it.
function randomRare (r: () => number, bases: BaseRow[]): { it: WeightItem, facts: ItemFacts } {
  const row = bases[Math.floor(r() * bases.length)]
  const corruption = (['no', 'plain', 'implicit', 'double'] as const)[Math.floor(r() * 4)]
  const pick = (p: number) => r() < p
  const links = [0, 3, 4, 5, 6][Math.floor(r() * 5)]
  const it: WeightItem = {
    rank: row.rank,
    tier: Math.floor(r() * 6),
    itemLevel: [68, 74, 75, 82, 83, 85, 86][Math.floor(r() * 7)],
    influenced: pick(0.15),
    eldritch: pick(0.15),
    quality: pick(0.15) ? 25 : 5,
    fractured: pick(0.15),
    synthesised: pick(0.1),
    fated: pick(0.1),
    mirrored: pick(0.1),
    abyssal: pick(0.1),
    strands: pick(0.1) ? 80 : 0,
    enchanted: pick(0.1),
    crucible: pick(0.1),
    links,
    rgb: links >= 3 && pick(0.3),
    corruption,
    width: row.width,
    height: row.height,
    old: row.old
  }
  const groups = links ? [(it.rgb ? 'RGB' : 'RRR') + 'R'.repeat(Math.max(0, links - 3))] : []
  if (it.abyssal) groups.push('A')
  const facts = {
    name: row.name,
    baseType: row.name,
    itemClass: row.cls ?? 'Gloves',
    rarity: 'Rare',
    itemLevel: it.itemLevel,
    dropLevel: BASE_FACTS[row.name]?.[0],
    areaLevel: 83,
    quality: it.quality,
    width: row.width,
    height: row.height,
    memoryStrands: it.strands,
    socketGroups: groups,
    identified: false,
    corrupted: corruption !== 'no',
    corruptedMods: corruption === 'double' ? 2 : corruption === 'implicit' ? 1 : 0,
    mirrored: it.mirrored,
    fractured: it.fractured,
    synthesised: it.synthesised,
    fated: it.fated,
    anyEnchantment: it.enchanted,
    crucibleTree: it.crucible,
    exarchTier: it.eldritch ? 2 : 0,
    eaterTier: 0,
    unidentifiedItemTier: it.tier || undefined,
    influences: it.influenced ? ['Shaper'] : [],
    explicitModNames: []
  } as ItemFacts
  return { it, facts }
}

function on (change: (w: WeightSettings) => void = () => {}): WeightSettings {
  const w = defaultWeights()
  w.on = true
  change(w)
  return w
}

describe('rare weights', () => {
  it('off writes nothing', () => {
    const doc = parseFilter(SEMI)
    expect(applyWeights(doc, defaultWeights())).toBeNull()
    expect(serializeFilter(doc)).toBe(serializeFilter(parseFilter(SEMI)))
  })

  it('reads NeverSink\'s base lists', () => {
    const ranks = baseRanks(parseFilter(SEMI))
    expect(ranks.x1).toContain('Simplex Amulet')
    expect(ranks.r1).toContain("Lich's Circlet")
    expect(ranks.r1.length).toBeGreaterThan(10)
    const all = [...ranks.x1, ...ranks.x2, ...ranks.r1, ...ranks.r2, ...ranks.r3]
    expect(new Set(all).size).toBe(all.length)
  })

  for (const need of [0.25, 2, 4, 16, 64]) {
    it(`every rare lands on its weight's step (line ${need})`, () => {
      const doc = parseFilter(SEMI)
      const w = on(x => { x.need = need })
      const bases = filterBases(doc).filter(b => b.cls && BASE_FACTS[b.name])
      expect(bases.length).toBeGreaterThan(500)
      applyWeights(doc, w)
      const r = rng(17 + need * 100)
      for (let n = 0; n < 1500; n++) {
        const { it, facts } = randomRare(r, bases)
        const res = matchItem(doc, facts)
        const want = stepOf(weightOf(it, w.mult), need)
        expect(res.final?.block.type, JSON.stringify(it)).toBe(WEIGHT_TYPE)
        expect(res.final?.block.tier, `${facts.name} ${JSON.stringify(it)}`).toBe(`s${want}`)
        expect(res.visibility === 'Hide').toBe(want === 0)
      }
    })
  }

  it('leaves identified rares and other items to NeverSink', () => {
    const doc = parseFilter(SEMI)
    applyWeights(doc, on())
    const { facts } = randomRare(rng(5), filterBases(doc))
    expect(matchItem(doc, { ...facts, identified: true }).final?.block.type).not.toBe(WEIGHT_TYPE)
    expect(matchItem(doc, { ...facts, rarity: 'Magic' }).final?.block.type).not.toBe(WEIGHT_TYPE)
    expect(matchItem(doc, { ...facts, itemLevel: 60 }).final?.block.type).not.toBe(WEIGHT_TYPE)
  })

  it('writes a filter the game takes, in a sensible number of rules', () => {
    for (const need of [0.25, 4, 48]) {
      const doc = parseFilter(SEMI)
      const compiled = applyWeights(doc, on(x => { x.need = need }))!
      expect(compiled.blocks.length).toBeLessThan(3000)
      const text = serializeFilter(doc)
      expect(text.length - SEMI.length).toBeLessThan(4_000_000)
      const problems = validateFilter(parseFilter(text)).filter(p => p.level === 'error')
      expect(problems).toEqual([])
    }
  })

  it('normalizes saved settings', () => {
    expect(normalizeWeights(undefined)).toEqual(defaultWeights())
    const w = normalizeWeights({ on: true, need: 9999, mult: { r1: -3, t5: 12 } as never })
    expect(w.on).toBe(true)
    expect(w.need).toBe(defaultWeights().need)
    expect(w.mult.r1).toBe(defaultWeights().mult.r1)
    expect(w.mult.t5).toBe(12)
  })
})
