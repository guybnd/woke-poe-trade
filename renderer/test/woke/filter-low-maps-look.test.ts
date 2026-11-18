// Hide low maps: the maps it lets through keep their own rule's look.
import { describe, it, expect } from 'vitest'
import { parseFilterCopy } from '@/web/woke/loot-filter/parse'
import { applyPresetChanges, defaultPresets } from '@/web/woke/loot-filter/presets'
import { matchItem } from '@/web/woke/loot-filter/match'
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
