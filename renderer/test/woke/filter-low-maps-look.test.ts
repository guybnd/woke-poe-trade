// Hide low maps: the maps it lets through keep their own rule's look, and
// "Not for me" on a stack lapses when the price doubles, as for single items.
import { describe, it, expect } from 'vitest'
import { parseFilterCopy } from '@/web/woke/loot-filter/parse'
import { applyPresetChanges, defaultPresets } from '@/web/woke/loot-filter/presets'
import { matchItem } from '@/web/woke/loot-filter/match'
import { stackNet } from '@/web/woke/loot-filter/safety'
import { neverSink } from '../helpers/neversink'

const map = (tier: number, area: number, influences: string[] = []) =>
  ({ name: 'm', baseType: `Map (Tier ${tier})`, itemClass: 'Maps', rarity: 'Normal', mapTier: tier, areaLevel: area, influences, explicitModNames: [], identified: false }) as never

describe('hide low maps', () => {
  const plain = parseFilterCopy(neverSink('1-REGULAR'))
  const doc = parseFilterCopy(neverSink('1-REGULAR'))
  const p = defaultPresets()
  p.lowMaps = { on: true, tier: 14 }
  applyPresetChanges(doc, p)

  it('hides a low map once you run higher ones', () => {
    expect(matchItem(doc, map(5, 83)).visibility).toBe('Hide')
  })

  it('an influenced map or one above your zone keeps its tier rule and look', () => {
    for (const m of [map(5, 83, ['Shaper']), map(10, 70)]) {
      const before = matchItem(plain, m)
      const after = matchItem(doc, m)
      expect(after.visibility).toBe('Show')
      expect(after.final?.block.tier).toBe(before.final?.block.tier)
      expect(after.actions).toEqual(before.actions)
    }
  })
})

describe('the net and stacks you said are not for you', () => {
  it('come back when a piece is worth twice what it was', () => {
    const doc = parseFilterCopy(neverSink('4-VERY-STRICT'))
    const seen: Array<number | undefined> = []
    stackNet(doc, (g) => g.type === 'currency' ? { chaos: 3, thin: false } : null, 20, (_g, _b, chaos) => { seen.push(chaos); return false })
    expect(seen.length).toBeGreaterThan(0)
    expect(seen.every(c => c === 3)).toBe(true)
  })
})
