// An eldritch implicit's row gets a roll range, though the game's copy gives it none:
// its tier's range from the mod data, or every tier's span when the tier is one number.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadGameData, parseItem } from '../helpers/game-data'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { implicitTable } from '@/web/woke/price-insight/eldritch-listing'
import type { ImplicitTable } from '@/web/woke/price-insight/eldritch-listing'
import { refillEldritchRows } from '@/web/woke/price-insight/eldritch-refill'
import { modTipFor } from '@/web/woke/price-insight/mod-tip'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}'), onEvent: () => {}, sendEvent: () => {} } }))
vi.mock('@/web/Config', () => ({ AppConfig: () => ({}), saveConfig: () => {}, saveConfigQuietly: () => {}, poeWebApi: () => 'www.pathofexile.com' }))

const TABLE = JSON.parse(readFileSync(join(__dirname, '../../public/data/implicit-sources.json'), 'utf8')) as ImplicitTable

const BODY = `Item Class: Body Armours
Rarity: Rare
Doom Shell
Vaal Regalia
--------
Energy Shield: 300
--------
Item Level: 86
--------
{ Searing Exarch Implicit Modifier (Greater) }
Gain an Endurance Charge every 14 seconds
{ Eater of Worlds Implicit Modifier (Lesser) }
Melee Hits have 7% chance to Fortify
--------
{ Prefix Modifier "Rotund" (Tier: 3) — Life }
+64(60-69) to maximum Life
`

const rows = (text: string) => initUiModFilters(parseItem(text), { searchStatRange: 10 }).filter((f): f is StatFilter => !f.group)
const row = (list: StatFilter[], start: string) => list.find(f => f.text.startsWith(start))!

describe('eldritch implicit roll range', () => {
  beforeAll(loadGameData)
  beforeEach(() => { implicitTable.value = TABLE })

  it('a tier with a range spans it, like any mod', () => {
    const fortify = row(rows(BODY), 'Melee Hits have')
    expect(fortify.roll!.value).toBe(7)
    expect(fortify.roll!.bounds).toEqual({ min: 6, max: 7 })
    expect(fortify.roll!.goodness).toBe(1)
  })

  it('a tier with one number spans every tier of its altar', () => {
    const charge = row(rows(BODY), 'Gain an Endurance Charge')
    expect(charge.roll!.value).toBe(14)
    expect(charge.roll!.bounds).toEqual({ min: 10, max: 15 })
    // The search keeps to its own tier, and fewer seconds is better: at most 14.
    expect(charge.roll!.default).toEqual({ min: 14, max: 14 })
    expect(charge.roll!.min).toBeUndefined()
    expect(charge.roll!.max).toBe(14)
    expect(charge.roll!.goodness).toBeCloseTo(0.2)
  })

  it('the hover title reads as the item does', async () => {
    const boots = `Item Class: Boots
Rarity: Rare
Doom Track
Two-Toned Boots
--------
Armour: 120
--------
Item Level: 86
--------
{ Searing Exarch Implicit Modifier (Exquisite) }
6% increased Action Speed
`
    const action = row(rows(boots), '#% increased Action Speed')
    expect(action.roll!.bounds).toBeDefined()
    const tip = (await modTipFor(parseItem(boots), action))!
    expect(tip.title).toBe('6% increased Action Speed')
  })

  it('a roll the data has no tier for keeps no range', () => {
    const odd = BODY.replace('every 14 seconds', 'every 99 seconds')
    expect(row(rows(odd), 'Gain an Endurance Charge').roll!.bounds).toBeUndefined()
  })

  it('rows drawn before the data arrived get their range once it does', () => {
    implicitTable.value = null
    const fetch = vi.fn(async () => new Response(JSON.stringify(TABLE)))
    vi.stubGlobal('fetch', fetch)
    const item = parseItem(BODY)
    const list = initUiModFilters(item, { searchStatRange: 10 })
    vi.unstubAllGlobals()
    const fortify = row(list.filter((f): f is StatFilter => !f.group), 'Melee Hits have')
    expect(fortify.roll!.bounds).toBeUndefined()
    const min = fortify.roll!.min
    implicitTable.value = TABLE
    refillEldritchRows(list, item, 10)
    expect(fortify.roll!.bounds).toEqual({ min: 6, max: 7 })
    expect(fortify.roll!.min).toBe(min)
  })

  it('the hover lists its tiers, Perfect first, with the item\'s own lit', async () => {
    const item = parseItem(BODY)
    const charge = row(rows(BODY), 'Gain an Endurance Charge')
    const tip = (await modTipFor(item, charge))!
    expect(tip.sub).toBe('Searing Exarch implicit · Body Armour')
    expect(tip.steps.map(s => s.label)).toEqual(['Perfect', 'Exquisite', 'Exceptional', 'Grand', 'Greater', 'Lesser'])
    expect(tip.steps.map(s => s.min)).toEqual([10, 11, 12, 13, 14, 15])
    expect(tip.mine).toBe(2)
  })
})
