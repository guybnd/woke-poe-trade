// Valuable exotic bases (Guy, 2026-11-28): Base ranks splits Exotic in two,
// and Rare gear gives each half its own text colour.
import { describe, it, expect } from 'vitest'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import { EXOTIC_RGB, baseRanks, defaultWeights, weightLook } from '@/web/woke/loot-filter/weights'
import type { WeightItem } from '@/web/woke/loot-filter/weights'
import { moveExotics, valuableExotics } from '@/web/woke/loot-filter/weight-rank'
import type { LootFilterStore } from '@/web/woke/loot-filter/store'
import type { LootFilterWidget } from '@/web/woke/loot-filter/widget'
import { neverSink } from '../helpers/neversink'

const doc = parseFilter(neverSink('2-SEMI-STRICT'))

describe('valuable exotic bases', () => {
  it('starts from NeverSink\'s top exotic tiers', () => {
    const ranks = baseRanks()
    const all = [...ranks.x1, ...ranks.x2]
    const hi = valuableExotics(doc, {}, all)
    expect(hi.has('Simplex Amulet')).toBe(true)
    for (const b of ranks.x2) expect(hi.has(b)).toBe(false)
  })

  it('a move between the lanes is your own x1/x2 rank, and back clears it', () => {
    const ranks = baseRanks()
    const lo = ranks.x2[0]
    const config = { presets: { weights: { ...defaultWeights(), ranks: {} } } } as unknown as LootFilterWidget
    const store = { doc: { value: doc } } as unknown as LootFilterStore
    moveExotics(store, config, [lo, 'Simplex Amulet'], 'exotichi')
    expect(config.presets.weights.ranks).toEqual({ [lo]: 'x1' })
    expect(valuableExotics(doc, config.presets.weights.ranks, [lo]).has(lo)).toBe(true)
    moveExotics(store, config, ['Simplex Amulet'], 'exotic')
    expect(config.presets.weights.ranks).toEqual({ [lo]: 'x1', 'Simplex Amulet': 'x2' })
    moveExotics(store, config, [lo, 'Simplex Amulet'], 'exotichi')
    expect(config.presets.weights.ranks).toEqual({ [lo]: 'x1' })
  })

  it('gives valuable exotics the Tink look (magenta on white, magenta edge), other exotics rose text', () => {
    const w = defaultWeights()
    const paint = (rank: 'x1' | 'x2', key: string) => {
      const it = { rank, rarity: 'Rare', tier: 3, itemLevel: 84, corruption: 'no', quality: 0, width: 1, height: 1 } as unknown as WeightItem
      return weightLook(it, w.look, 3).find(a => a.key === key)?.args.slice(0, 3).map(Number)
    }
    expect(paint('x1', 'SetTextColor')).toEqual(EXOTIC_RGB.x1)
    expect(paint('x1', 'SetBorderColor')).toEqual(EXOTIC_RGB.x1)
    expect(paint('x1', 'SetBackgroundColor')).toEqual([255, 255, 255])
    expect(paint('x2', 'SetTextColor')).toEqual(EXOTIC_RGB.x2)
    expect(paint('x2', 'SetBackgroundColor')).not.toEqual([255, 255, 255])
  })
})
