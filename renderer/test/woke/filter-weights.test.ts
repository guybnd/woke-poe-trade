// Rare weights (weights.ts): off writes nothing; on, the compiled rules give
// every unidentified endgame rare the step its weight says, on NeverSink's
// real filter, and leave other items to NeverSink.
import { describe, it, expect, beforeAll } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { WEIGHT_ROWS, WEIGHT_TYPE, MULT_STEPS, applyWeights, baseRanks, defaultWeights, filterBases, normalizeWeights, stepFor, weightLook, LOOK_KEYS, RANK_KEYS } from '@/web/woke/loot-filter/weights'
import type { WeightItem, WeightSettings, BaseRow, LookChannel, LookKey, RankKey } from '@/web/woke/loot-filter/weights'
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
  const rarity = (['Rare', 'Rare', 'Magic', 'Normal'] as const)[Math.floor(r() * 4)]
  const it: WeightItem = {
    rarity,
    rank: row.rank,
    tier: rarity === 'Normal' ? 0 : Math.floor(r() * 6),
    itemLevel: [68, 74, 75, 82, 83, 85, 86][Math.floor(r() * 7)],
    influenced: pick(0.15),
    eldritch: pick(0.15),
    quality: pick(0.15) ? [24, 25, 27, 29, 30][Math.floor(r() * 5)] : 5,
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
    rarity,
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
    eaterTier: it.eldritch && r() < 0.5 ? 2 : 0,
    unidentifiedItemTier: it.tier || undefined,
    influences: it.influenced ? ['Shaper'] : [],
    explicitModNames: []
  } as ItemFacts
  return { it, facts }
}

// Look rows dealt at random into the channels (some left out).
function randomLook (r: () => number): Record<LookChannel, LookKey[]> {
  const keys = [...LOOK_KEYS].sort(() => r() - 0.5)
  const out = { border: [], bg: [], text: [] } as Record<LookChannel, LookKey[]>
  const chs = ['border', 'bg', 'text', null] as const
  for (const k of keys) { const ch = chs[Math.floor(r() * 4)]; if (ch) out[ch].push(k) }
  return out
}

// Your own ranks for a few bases.
function randomRanks (r: () => number, bases: BaseRow[]): Record<string, RankKey> {
  const out: Record<string, RankKey> = {}
  for (let n = 0; n < 40; n++) out[bases[Math.floor(r() * bases.length)].name] = RANK_KEYS[Math.floor(r() * RANK_KEYS.length)]
  return out
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
    const ranks = baseRanks()
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
        const want = stepFor(it, w)
        expect(res.final?.block.type, JSON.stringify(it)).toBe(WEIGHT_TYPE)
        expect(res.final?.block.tier, `${facts.name} ${JSON.stringify(it)}`).toBe(`s${want}`)
        expect(res.visibility === 'Hide').toBe(want === 0)
        // Border, background and text colour as the look channels say, as the tab shows them.
        if (want > 0) {
          for (const key of ['SetBorderColor', 'SetBackgroundColor', 'SetTextColor']) {
            const col = (acts: Array<{ key: string, args: string[] }>) => JSON.stringify(acts.filter(x => x.key === key).pop()?.args ?? null)
            expect(col(res.actions), `${key} ${JSON.stringify(it)}`).toBe(col(weightLook(it, w.look, want)))
          }
        }
      }
    })
  }

  it('any saved multipliers: every rare still lands on its step, in a sane number of rules', () => {
    const r = rng(99)
    for (let round = 0; round < 6; round++) {
      const doc = parseFilter(SEMI)
      const raw = defaultWeights()
      for (const row of WEIGHT_ROWS) raw.mult[row.key] = MULT_STEPS[Math.floor(r() * MULT_STEPS.length)]
      const pins = ['x1', 'dc', 'fract', 'synth', 'l6', 'infl'] as const
      const w = normalizeWeights({ ...raw, on: true, need: [0.5, 4, 32][round % 3], always: pins.filter(() => r() < 0.4) as never, loud: [[8, 32, 128], [16, 64, 256], [4, 90, 500]][round % 3], look: randomLook(r), ranks: randomRanks(r, filterBases(doc)) })
      const bases = filterBases(doc, w.ranks).filter(b => BASE_FACTS[b.name])
      const compiled = applyWeights(doc, w)!
      // Rows ranked above the score step split the step rules (×2 or more
      // each): the tab shows the rule count.
      const over = (['bg', 'text'] as const).some(ch => w.look[ch].indexOf('score') > 0)
      expect(compiled.blocks.length).toBeLessThan(over ? 40000 : 9000)
      for (let n = 0; n < 500; n++) {
        const { it, facts } = randomRare(r, bases)
        const want = stepFor(it, w)
        const res = matchItem(doc, facts)
        expect(res.final?.block.tier, `${facts.name} ${JSON.stringify(it)} ${JSON.stringify(w.mult)}`).toBe(`s${want}`)
        if (want > 0) {
          for (const key of ['SetBorderColor', 'SetBackgroundColor', 'SetTextColor']) {
            const col = (acts: Array<{ key: string, args: string[] }>) => JSON.stringify(acts.filter(x => x.key === key).pop()?.args ?? null)
            expect(col(res.actions), `${key} ${JSON.stringify(it)} ${JSON.stringify(w.look)}`).toBe(col(weightLook(it, w.look, want)))
          }
        }
      }
    }
  })

  it("your own rank: a base you don't care about hides even at tier 5, a strong mark still shows it", () => {
    const doc = parseFilter(SEMI)
    const base = filterBases(doc).find(b => b.rank === 'r0' && b.cls === 'Gloves' && BASE_FACTS[b.name])!
    const w = on(x => { x.ranks = { [base.name]: 'rj' } })
    applyWeights(doc, w)
    const rows = filterBases(doc, w.ranks)
    const row = rows.find(b => b.name === base.name)!
    expect(row.rank).toBe('rj')
    expect(row.was).toBe('r0')
    const r = rng(3)
    const it: WeightItem = { ...randomRare(r, [row]).it, rarity: 'Rare', tier: 5, itemLevel: 86, corruption: 'no', mirrored: false, links: 0, rgb: false, influenced: false, eldritch: false, quality: 0, fractured: false, synthesised: false, fated: false, abyssal: false, strands: 0, enchanted: false, crucible: false }
    expect(stepFor(it, w)).toBe(0)
    expect(stepFor({ ...it, fractured: true }, w)).toBeGreaterThan(0)
    // A few dozen bases moved down cost few rules.
    const many = Object.fromEntries(filterBases(parseFilter(SEMI)).filter(b => b.rank === 'r0').slice(0, 40).map(b => [b.name, 'rj' as const]))
    const plain = applyWeights(parseFilter(SEMI), on())!.blocks.length
    const junked = applyWeights(parseFilter(SEMI), on(x => { x.ranks = many }))!.blocks.length
    expect(junked).toBeLessThan(plain * 1.3)
  })

  it('keeps marks at ×1 or more and drop tiers and item levels in order', () => {
    const w = normalizeWeights({ on: true, need: 4, mult: { ...defaultWeights().mult, fract: 0.25, t5: 2, i68: 3 } })
    expect(w.mult.fract).toBe(1)
    expect(w.mult.t5).toBeGreaterThanOrEqual(w.mult.t4)
    expect(w.mult.i75).toBeGreaterThanOrEqual(w.mult.i68)
  })

  it('leaves non-gear bases on NeverSink\'s exotic list alone', () => {
    const doc = parseFilter(SEMI)
    const names = filterBases(doc).map(b => b.name)
    expect(names).not.toContain('Prismatic Jewel')
    applyWeights(doc, on())
    const jewel = { name: 'Prismatic Jewel', baseType: 'Prismatic Jewel', itemClass: 'Jewels', rarity: 'Rare', identified: false, itemLevel: 86, width: 1, height: 1, influences: [], explicitModNames: [] } as unknown as ItemFacts
    expect(matchItem(doc, jewel).final?.block.type).not.toBe(WEIGHT_TYPE)
  })

  it('leaves identified rares, uniques and other items to NeverSink', () => {
    const doc = parseFilter(SEMI)
    applyWeights(doc, on())
    const { facts } = randomRare(rng(5), filterBases(doc))
    expect(matchItem(doc, { ...facts, identified: true }).final?.block.type).not.toBe(WEIGHT_TYPE)
    expect(matchItem(doc, { ...facts, rarity: 'Unique' }).final?.block.type).not.toBe(WEIGHT_TYPE)
    expect(matchItem(doc, { ...facts, itemLevel: 60 }).final?.block.type).not.toBe(WEIGHT_TYPE)
  })

  it('writes a filter the game takes, in a sensible number of rules', () => {
    for (const need of [0.25, 4, 48]) {
      const doc = parseFilter(SEMI)
      const compiled = applyWeights(doc, on(x => { x.need = need }))!
      expect(compiled.blocks.length).toBeLessThan(6000)
      const text = serializeFilter(doc)
      expect(text.length - SEMI.length).toBeLessThan(6_000_000)
      const problems = validateFilter(parseFilter(text)).map(p => p.message)
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

describe('rare weights: No rank and Large penalties (Guy, 2026-11-28)', () => {
  it('are the defaults', () => {
    const d = defaultWeights()
    expect(d.mult.r0).toBe(0.5)
    expect(d.mult.big).toBe(0.7)
  })
  it('move saved settings at 0 points once, and leave tuned ones', () => {
    const old = { ...defaultWeights(), v: 0 }
    old.mult = { ...old.mult, r0: 1, big: 1 }
    const moved = normalizeWeights(old)
    expect(moved.mult.r0).toBe(0.5)
    expect(moved.mult.big).toBe(0.7)
    expect(moved.v).toBe(1)
    const tuned = normalizeWeights({ ...old, mult: { ...old.mult, r0: 2, big: 1.2 } })
    expect(tuned.mult.r0).toBe(2)
    expect(tuned.mult.big).toBe(1.2)
    // Already moved: back at 0 by hand stays 0.
    expect(normalizeWeights({ ...moved, mult: { ...moved.mult, r0: 1 } }).mult.r0).toBe(1)
  })
})
