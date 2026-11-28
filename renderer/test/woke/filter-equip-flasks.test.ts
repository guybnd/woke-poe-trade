// Flasks on the Equipment tab (Guy's F1, 2026-11-27): base rank × quality ×
// item level, on Rare weights' line and steps.
import { describe, it, expect } from 'vitest'
import { parseFilter, serializeFilter } from '@/web/woke/loot-filter/parse'
import { matchItem } from '@/web/woke/loot-filter/match'
import type { ItemFacts } from '@/web/woke/loot-filter/item-facts'
import { validateFilter } from '@/web/woke/loot-filter/validate'
import { applyFlasks, flaskStep, flaskWeight } from '@/web/woke/loot-filter/flask-weights'
import { WEIGHT_TYPE, defaultWeights } from '@/web/woke/loot-filter/weights'
import { neverSink } from '../helpers/neversink'

const SEMI = neverSink('2-SEMI-STRICT')
const flask = (baseType: string, quality: number, itemLevel: number, areaLevel = 83): ItemFacts => ({
  name: baseType, baseType, itemClass: 'Utility Flasks', rarity: 'Magic', quality, itemLevel, areaLevel, influences: [], explicitModNames: []
} as ItemFacts)

describe('flasks on the Equipment tab', () => {
  it('scores rank × quality × item level', () => {
    const w = defaultWeights()
    expect(flaskWeight(w, 'Quicksilver Flask', 0, 70)).toBe(w.mult.r1)
    expect(flaskWeight(w, 'Quicksilver Flask', 20, 85)).toBe(w.mult.r1 * 4)
    expect(flaskWeight(w, 'Iron Flask', 26, 85)).toBe(w.mult.r3 * 8)
    w.ranks = { 'Iron Flask': 'rj' }
    expect(flaskStep(w, 'Iron Flask', 0, 70)).toBe(0)
  })

  it('writes rules the game takes, in maps only', () => {
    const w = { ...defaultWeights(), on: true }
    const doc = parseFilter(SEMI)
    expect(applyFlasks(doc, w).length).toBeGreaterThan(2)
    const hit = (f: ItemFacts) => matchItem(doc, f)
    expect(hit(flask('Quicksilver Flask', 20, 85)).final?.block.type).toBe(WEIGHT_TYPE)
    expect(hit(flask('Quicksilver Flask', 20, 85)).visibility).toBe('Show')
    expect(hit(flask('Iron Flask', 0, 70)).visibility).toBe('Hide')
    expect(hit(flask('Iron Flask', 0, 70, 40)).final?.block.type).not.toBe(WEIGHT_TYPE)
    expect(validateFilter(parseFilter(serializeFilter(doc))).map(p => p.message)).toEqual([])
    expect(applyFlasks(parseFilter(SEMI), defaultWeights())).toEqual([])
  })

  it('has its own line, so Good and Low flasks can show (Guy 2026-11-28)', () => {
    const w = defaultWeights()
    expect(w.flaskLine).toBe(8)
    // A Good Ruby Flask: 4 plain, 8 at ilvl 85, 16 at 20% and 85, 32 at 26% and 85.
    w.ranks = { 'Ruby Flask': 'r2' }
    expect(flaskStep(w, 'Ruby Flask', 0, 70)).toBe(0)
    expect(flaskStep(w, 'Ruby Flask', 0, 85)).toBe(1)
    expect(flaskStep(w, 'Ruby Flask', 20, 85)).toBe(2)
    // The rares' line doesn't move it.
    expect(flaskStep({ ...w, need: 500 } as typeof w, 'Ruby Flask', 0, 85)).toBe(1)
    expect(flaskStep({ ...w, flaskLine: 2 }, 'Ruby Flask', 0, 70)).toBe(2)
  })
})
