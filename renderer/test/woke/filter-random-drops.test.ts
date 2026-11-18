import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { randomDropsOnBase } from '@/web/woke/loot-filter/random-drops'
import { uniquesOnBase } from '@/web/woke/shared/uniques-on-base'
import { ECONOMY_GROUPS, priceLookup, safetyLookup } from '@/web/woke/loot-filter/economy'
import type { PriceItem } from '@/web/woke/market/types'
import type { TipPack } from '@/web/woke/ui/tooltip/tip-content'
import { loadGameData } from '../helpers/game-data'

beforeAll(loadGameData)

const drops = JSON.parse(readFileSync('public/data/tips/drops.json', 'utf8')) as NonNullable<TipPack['drops']>
const group = ECONOMY_GROUPS.find(g => g.unique)!
const item = (name: string, chaos: number): PriceItem => ({ name, chaos, type: 'UniqueAccessory', variant: '', d7: chaos, d1: chaos })

describe('the filter prices a unique base by its random drops', () => {
  it('leaves out boss-only, league and recipe uniques', () => {
    const onBase = randomDropsOnBase(drops)('Topaz Ring')
    expect(uniquesOnBase('Topaz Ring')).toContain('Nimis')
    expect(onBase).not.toContain('Nimis')
    expect(onBase).not.toContain("Putembo's Mountain")
    expect(onBase).toContain('Astral Projector')
  })
  it('counts every unique until the drop data is there', () => {
    expect(randomDropsOnBase(null)('Topaz Ring')).toEqual(uniquesOnBase('Topaz Ring'))
  })
  it("doesn't let Nimis keep a Topaz Ring shown", () => {
    const items = [item('Nimis', 20000), item('Astral Projector', 3)]
    for (const lookup of [priceLookup(items, randomDropsOnBase(drops)), safetyLookup(items, randomDropsOnBase(drops))]) {
      expect(lookup(group, 'Topaz Ring')?.chaos).toBe(3)
    }
    expect(safetyLookup(items, uniquesOnBase)(group, 'Topaz Ring')?.chaos).toBe(20000)
  })
})
