// Guy's price audit (2026-11-28): Loot rows priced from poe.ninja data the
// filter used to skip (flasks by item level, Chronicles by room, the Sanctum
// relics), and an honest "no price" where there's none.
import { describe, it, expect, beforeAll } from 'vitest'
import { parseFilter } from '@/web/woke/loot-filter/parse'
import { ownBaseText } from '@/web/woke/loot-filter/own-base'
import { currencyItems } from '@/web/woke/loot-filter/currency-weights'
import { dropLookup } from '@/web/woke/loot-filter/economy'
import { RETIRED } from '@/web/woke/loot-filter/own-rules'
import { loadOwnTables, ownTables } from '@/web/woke/loot-filter/own-lists'
import type { PriceItem } from '@/web/woke/market/types'
import { uniquesOnBase } from '@/web/woke/shared/uniques-on-base'
import { loadGameData } from '../helpers/game-data'

const line = (type: string, name: string, chaos: number, variant = '', gaps = 0): PriceItem => ({ type, name, variant, chaos, gaps })
const BASE: PriceItem[] = [line('Currency', 'Divine Orb', 160), line('Currency', 'Orb of Alchemy', 0.3)]
const rows = (items: PriceItem[], withTables = false) => {
  const lookup = dropLookup([...BASE, ...items], uniquesOnBase, null)
  return currencyItems(parseFilter(ownBaseText('2-SEMI-STRICT')), lookup, {}, null, null, withTables ? ownTables.value : null)
}
const row = (items: PriceItem[], name: string, withTables = false) => rows(items, withTables).find(r => r.name === name)!

beforeAll(async () => { await loadGameData(); await loadOwnTables() })

describe('Loot price audit', () => {
  it('prices each white top flask by its cheapest solid item level line', () => {
    const items = [line('Flask', 'Divine Life Flask', 10, '82'), line('Flask', 'Divine Life Flask', 9, '84+'), line('Flask', 'Divine Life Flask', 2, '83', 6),
      line('Flask', 'Divine Mana Flask', 2, '84+'), line('Flask', 'Eternal Mana Flask', 1, '82')]
    expect(row(items, 'White Divine Life Flask, item level 82+')).toMatchObject({ chaos: 9, est: false })
    expect(row(items, 'White Divine or Eternal Mana Flask, item level 82+')).toMatchObject({ chaos: 1, est: false })
    // No line: the guess, est.
    expect(row(items, 'White Hallowed Hybrid Flask, item level 82+')).toMatchObject({ chaos: 0.1, est: true })
    // Quality rows: the cheapest base as a floor, est. with where it comes from.
    expect(row(items, 'Top life or mana flask, quality 21-29%')).toMatchObject({ chaos: 1, est: true, why: expect.stringMatching(/quality not counted/) })
    expect(row(items, 'Top life or mana flask, quality 30%').chaos).toBe(5)
    expect(row([line('Flask', 'Divine Life Flask', 12, '84+'), ...['Divine Mana Flask', 'Eternal Life Flask', 'Eternal Mana Flask', 'Hallowed Hybrid Flask'].map(n => line('Flask', n, 8, '84+'))], 'Top life or mana flask, quality 30%').chaos).toBe(8)
  })

  it('prices a Chronicle of Atzoatl by its cheapest solid temple room', () => {
    const items = [line('IncursionTemple', 'Doryani\'s Institute (Tier 3)', 250), line('IncursionTemple', 'Torture Cages (Tier 2)', 50), line('IncursionTemple', 'Vault (Tier 1)', 20, '', 6)]
    expect(row(items, 'Chronicle of Atzoatl')).toMatchObject({ chaos: 50, est: false, why: expect.stringMatching(/by room/) })
    expect(row([], 'Chronicle of Atzoatl')).toMatchObject({ chaos: 3, est: true })
  })

  it('prices a relic base from the UniqueRelic page', () => {
    const relic = uniquesOnBase('Censer Relic')[0]
    expect(relic).toBeTruthy()
    const r = row([line('UniqueRelic', relic, 250, 'Relic')], 'Censer Relic', true)
    expect(r).toMatchObject({ chaos: 250, est: false })
    // A unique's relic copy on another page still doesn't count.
    expect(row([line('UniqueArmour', relic, 999, 'Relic')], 'Censer Relic', true).chaos).not.toBe(999)
  })

  it('says "no price" for an item with no price now or last league, and retires old league items', () => {
    const all = rows([], true)
    const facetor = all.find(r => r.name === "Facetor's Lens")!
    expect(facetor).toMatchObject({ none: true, free: true, est: true })
    // Last league's price is a guess, not "no price".
    const guessed = all.find(r => ownTables.value!.guesses.has(r.name) && r.type !== 'gems')!
    expect(guessed.none).toBeUndefined()
    for (const n of ["Harbinger's Orb", 'Orb of Binding', 'Vial of Fate', 'Grand Order Artifact', 'Power Core', 'Primal Delirium Orb']) {
      expect(RETIRED.test(n), n).toBe(true)
      expect(all.some(r => r.name === n), n).toBe(false)
    }
    for (const n of ['Orb of Alchemy', 'Ancient Orb', 'Scrap Metal', 'Splinter of Xoph', 'Delirium Orb', "Xoph's Breachstone", "Facetor's Lens"]) expect(RETIRED.test(n), n).toBe(false)
  })
})
