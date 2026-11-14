// Guy's pick (2026-11-14): on a fractured item the fractured mod leads. No total
// takes it in, and its own row sits at the top, ticked, searching fractured.
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { loadGameData, fixture, parseItem } from '../helpers/game-data'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import { createPresets } from '@/web/price-check/filters/create-presets'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
import { fracturedIds } from '@/web/woke/price-insight/poe-kind'

// vi.mock is hoisted above the imports.
vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false }
const REF = '+#% to Cold and Chaos Resistances'
const SHIELD = 'items/rare-shield-fractured-res.txt'

function rows (text: string) {
  return initUiModFilters(parseItem(text), { searchStatRange: 10 }).filter((f): f is StatFilter => !f.group)
}

describe('fractured mod first', () => {
  beforeAll(loadGameData)

  it('lists the fractured mod once, first after the properties, ticked and fractured only', () => {
    const list = rows(fixture(SHIELD))
    const frac = list.filter(f => f.statRef === REF)
    expect(frac).toHaveLength(1)
    expect(frac[0].hidden).toBeFalsy()
    expect(frac[0].disabled).toBe(false)
    expect(frac[0].tradeId).toEqual(['fractured.stat_3393628375'])
    // PoE mode's chip is there, on, so it can switch back to any copy.
    expect(fracturedIds(frac[0])).toEqual(['fractured.stat_3393628375'])
    const firstMod = list.findIndex(f => f.tag !== 'property')
    expect(list[firstMod]).toBe(frac[0])
  })

  it('leaves it out of every total', () => {
    const list = rows(fixture(SHIELD))
    for (const f of list.filter(f => f.tag === 'pseudo')) {
      expect(f.sources.some(s => s.modifier.info.type === 'fractured')).toBe(false)
    }
    // Only the +5% all-res line is left: 5 to each of three.
    expect(list.find(f => f.statRef === '+#% total Elemental Resistance')?.roll?.value).toBe(15)
    expect(list.some(f => f.statRef === '+#% total to Chaos Resistance')).toBe(false)
  })

  it('a same-stat mod stays in the total while the fractured one leads', () => {
    const text = fixture(SHIELD).replace(
      [
        '{ Prefix Modifier "Consecrated" (Tier: 2) — Defences, Armour, Energy Shield }',
        '+155(146-220) to Armour',
        '+60(49-60) to maximum Energy Shield'
      ].join('\n'),
      [
        '{ Fractured Prefix Modifier "Rotund" (Tier: 3) — Life }',
        '+80(80-89) to maximum Life',
        '{ Prefix Modifier "Rhino\'s" (Tier: 4) — Life, Defences, Armour }',
        '+30(25-34) to Armour',
        '+20(19-23) to maximum Life'
      ].join('\n')).replace('{ Fractured Suffix Modifier "of the Order"', '{ Suffix Modifier "of the Order"')
    const list = rows(text)
    const frac = list.filter(f => f.tradeId[0]?.startsWith('fractured.'))
    expect(frac.map(f => [f.statRef, f.roll?.value])).toEqual([['+# to maximum Life', 80]])
    const life = list.find(f => f.statRef === '+# total maximum Life')
    expect(life?.roll?.value).toBe(20)
  })

  it('a corrupted fractured item leads with it too', () => {
    const list = rows(fixture(SHIELD).replace('Fractured Item', 'Fractured Item\n--------\nCorrupted'))
    const frac = list.filter(f => f.statRef === REF)
    expect(frac).toHaveLength(1)
    expect(frac[0].tradeId).toEqual(['fractured.stat_3393628375'])
  })

  it('an item without a fractured mod is untouched', () => {
    const list = rows(fixture(SHIELD).replace('Fractured Suffix Modifier', 'Suffix Modifier').replace('\n--------\nFractured Item', ''))
    expect(list.some(f => f.tradeId[0]?.startsWith('fractured.'))).toBe(false)
    expect(list.find(f => f.statRef === '+#% total to Chaos Resistance')?.roll?.value).toBe(18)
  })

  it('the search adds the fractured share back onto a total', () => {
    const item = parseItem(fixture(SHIELD))
    const presets = createPresets(item, OPTS)
    const preset = presets.presets.find(p => p.id === presets.active)!
    const total = preset.stats.find((f): f is StatFilter => !f.group && f.statRef === '+#% total Elemental Resistance')!
    expect(total.fracShare).toBe(18)
    total.disabled = false
    total.roll!.min = 15
    total.roll!.max = ''
    const body = createTradeRequest(preset.filters, preset.stats)
    const q = body.query.stats.flatMap(g => g.filters).find(f => f.id === 'pseudo.pseudo_total_elemental_resistance')
    // The site's total counts the fractured +18% too.
    expect(q?.value?.min).toBe(33)
    expect(q?.value?.max).toBeUndefined()
  })

  it('counts the fractured rows against the rare tick cap of 4', () => {
    const text = fixture(SHIELD)
      .replace(`{ Suffix Modifier "of Steel Skin" (Tier: 3) }
21(20-22)% increased Stun and Block Recovery`, `{ Suffix Modifier "of the Tempest" (Tier: 1) — Elemental, Lightning, Resistance }
+46(46-48)% to Lightning Resistance`)
      .replace(`{ Suffix Modifier "of the Crystal" (Tier: 6) — Elemental, Resistance }
+5(3-5)% to all Elemental Resistances`, `{ Suffix Modifier "of the Gorilla" (Tier: 1) — Attribute }
+50(46-50) to Strength`)
      .replace(`{ Prefix Modifier "Consecrated" (Tier: 2) — Defences, Armour, Energy Shield }
+155(146-220) to Armour
+60(49-60) to maximum Energy Shield`, `{ Prefix Modifier "Prime" (Tier: 1) — Life }
+120(120-129) to maximum Life
{ Prefix Modifier "Dictator's" (Tier: 1) — Defences }
+120(120-139)% increased Armour and Energy Shield
{ Prefix Modifier "Thaumaturgist's" (Tier: 1) — Mana }
+79(77-79) to maximum Mana`)
    const ticked = rows(text).filter(f => !f.disabled && !f.hidden && f.tag !== 'property')
    expect(ticked.length).toBeLessThanOrEqual(4)
    expect(ticked.some(f => f.statRef === REF)).toBe(true)
  })
})
