// The results column for each ticked stat, on items captured from the real trade API.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { fixture, loadGameData, parseItem } from '../helpers/game-data'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import/first */
import { ItemCategory } from '@/parser'
import type { ListingItem } from '@/web/woke/price-insight/listing-tip'
import type { FilterOrGroup, StatFilter } from '@/web/price-check/filters/interfaces'
import {
  formatStatValue,
  listingStatValue,
  pickStatColumns,
  statColumnLabel,
  statColumnsThatFit,
  statTone
} from '@/web/woke/price-insight/stat-columns'
import { createPresets } from '@/web/price-check/filters/create-presets'
/* eslint-enable import/first */

const CAPTURED: ListingItem[] = JSON.parse(readFileSync(resolve(__dirname, '../../../testing/fixtures/trade/listing-items.json'), 'utf-8'))
const HELMET = ItemCategory.Helmet

function filter (over: Partial<StatFilter> & { value?: number, better?: 1 | -1 | 0, isNegated?: boolean, min?: number, max?: number }): StatFilter {
  const { value = 10, better = 1, isNegated = false, min = 5, max, ...rest } = over
  return {
    tradeId: ['explicit.stat_1'],
    statRef: 'some stat',
    text: 'some stat text',
    tag: 'explicit',
    sources: [],
    disabled: false,
    roll: { value, min, max, default: { min: 5, max: 15 }, dp: false, isNegated, better },
    ...rest
  } as StatFilter
}

function onlyColumn (f: StatFilter) {
  const [column] = pickStatColumns([f])
  expect(column).toBeDefined()
  return column
}

describe('which filters get a column', () => {
  it('only ticked number filters, in the list\'s order', () => {
    const columns = pickStatColumns([
      filter({ tradeId: ['item.energy_shield'], statRef: 'Energy Shield: #', text: 'Energy Shield: 1210', value: 1210 }),
      filter({ disabled: true }),
      filter({ tradeId: ['explicit.stat_2'], statRef: '+# to maximum Life', text: '+78 to maximum Life', value: 78 })
    ])
    expect(columns.map(c => c.label)).toEqual(['ES', 'Life'])
    expect(columns[0].yours).toBe(1210)
    expect(columns[1].title).toBe('+78 to maximum Life')
  })

  it('skips option filters, groups and what a listing can\'t answer', () => {
    const group = { group: 'not', expanded: true, meta: filter({}), stats: [filter({})] } as FilterOrGroup
    expect(pickStatColumns([
      group,
      filter({ option: { value: 1 } }),
      filter({ not: true }),
      filter({ roll: undefined }),
      filter({ tradeId: ['item.map_item_quantity'] }),
      filter({ tradeId: ['pseudo.not_a_rule'], statRef: 'not a rule' })
    ])).toEqual([])
  })

  it('skips a value every listing has to equal', () => {
    expect(pickStatColumns([filter({ better: 0, min: 10, max: 10 })])).toEqual([])
    expect(pickStatColumns([filter({ better: 0, min: 5, max: 10 })])).toHaveLength(1)
  })
})

describe('listing values on real trade responses', () => {
  beforeAll(loadGameData)

  it('reads defences at 20% quality, not the listed number', () => {
    const column = onlyColumn(filter({ tradeId: ['item.energy_shield'], statRef: 'Energy Shield: #' }))
    expect(listingStatValue(CAPTURED[0], column, HELMET)).toBe(228)
  })

  it('reads an explicit mod', () => {
    const column = onlyColumn(filter({ tradeId: ['explicit.stat_3299347043'], statRef: '+# to maximum Life' }))
    expect(listingStatValue(CAPTURED[1], column, HELMET)).toBe(5)
  })

  it('counts a fractured mod under its explicit filter', () => {
    const column = onlyColumn(filter({ tradeId: ['explicit.stat_2923486259'], statRef: '+#% to Chaos Resistance' }))
    expect(listingStatValue(CAPTURED[0], column, HELMET)).toBe(35)
  })

  it('adds a total up from its mods', () => {
    const column = onlyColumn(filter({ tradeId: ['pseudo.pseudo_total_chaos_resistance'], statRef: '+#% total to Chaos Resistance' }))
    expect(listingStatValue(CAPTURED[0], column, HELMET)).toBe(35)
  })

  it('gives null, not zero, when the listing doesn\'t have it', () => {
    const column = onlyColumn(filter({ tradeId: ['explicit.stat_9'], statRef: '#% increased Spell Damage' }))
    expect(listingStatValue(CAPTURED[0], column, HELMET)).toBeNull()
    expect(listingStatValue(undefined, column, HELMET)).toBeNull()
  })
})

describe('listing values', () => {
  beforeAll(loadGameData)

  const item = (explicitMods: ListingItem['explicitMods'], extra: Partial<ListingItem> = {}): ListingItem => ({ explicitMods, ...extra })

  it('multiplies stats that count more than once in a total', () => {
    const column = onlyColumn(filter({ tradeId: ['pseudo.pseudo_total_elemental_resistance'], statRef: '+#% total Elemental Resistance' }))
    const listing = item(['+40% to Fire Resistance', '+12% to all Elemental Resistances', '+30% to Chaos Resistance'])
    expect(listingStatValue(listing, column, HELMET)).toBe(40 + 12 * 3)
  })

  it('keeps implicit, crafted and explicit filters to their own mods', () => {
    const listing = item(['+20 to maximum Life'], { implicitMods: ['+7 to maximum Life'], craftedMods: ['+3 to maximum Life'] })
    const read = (id: string) => listingStatValue(listing, onlyColumn(filter({ tradeId: [id], statRef: '+# to maximum Life' })), HELMET)
    expect(read('explicit.stat_3299347043')).toBe(20)
    expect(read('implicit.stat_3299347043')).toBe(7)
    expect(read('crafted.stat_3299347043')).toBe(3)
  })

  it('reads a "reduced" filter in the same terms as its own number', () => {
    const column = onlyColumn(filter({ statRef: '#% increased Attack Speed', isNegated: true, value: 10, better: -1 }))
    expect(listingStatValue(item(['6% reduced Attack Speed']), column, HELMET)).toBe(6)
    expect(listingStatValue(item(['6% increased Attack Speed']), column, HELMET)).toBe(-6)
  })

  it('flips a "reduced" total, so the same mods read the same', () => {
    const column = onlyColumn(filter({ tradeId: ['pseudo.pseudo_increased_movement_speed'], statRef: '#% increased Movement Speed', isNegated: true, value: 10, better: -1 }))
    expect(listingStatValue(item(['10% reduced Movement Speed']), column, ItemCategory.Boots)).toBe(10)
  })

  it('files a mod under its list, whatever mechanic its domain names', () => {
    const column = onlyColumn(filter({ tradeId: ['implicit.stat_3299347043'], statRef: '+# to maximum Life' }))
    const listing: ListingItem = { implicitMods: [{ description: '+7 to maximum Life', domain: 'eldritch' }] }
    expect(listingStatValue(listing, column, HELMET)).toBe(7)
  })

  it('reads the same mods the same as the filter, rounding included', () => {
    const armour = parseItem(fixture('items/rare-body-armour-es.txt'))
    const { presets, active } = createPresets(armour, { league: 'x', merchantOnly: true, currency: null, collapseListings: 'api', activateStockFilter: false, searchStatRange: 10, useEn: false })
    const stats = presets.find(p => p.id === active)!.stats
    for (const f of stats) if (f.group == null) f.disabled = false
    const columns = pickStatColumns(stats)
    expect(columns.map(c => c.label)).toEqual(expect.arrayContaining(['ES', 'Res', 'Chaos', 'Life', 'Stun']))
    const listing: ListingItem = {
      extended: { es: 1210 },
      explicitMods: [
        '120% increased Energy Shield', '42% increased Energy Shield', '18% increased Stun and Block Recovery',
        '+120 to maximum Life', '+34% to Fire Resistance', '+34% to Cold Resistance', '+31% to Chaos Resistance'
      ]
    }
    for (const col of columns) {
      const value = listingStatValue(listing, col, armour.category)
      expect([col.label, statTone(value, col)]).toEqual([col.label, null])
    }
  })

  it('reads dps from extended and speed from the properties', () => {
    const listing: ListingItem = {
      extended: { dps: 208, pdps: 208, edps: 0 },
      properties: [
        { name: 'Critical Strike Chance', values: [['5.00%', 0]], type: 12 },
        { name: 'Attacks per Second', values: [['1.30', 0]], type: 13 }
      ]
    }
    const read = (id: string) => listingStatValue(listing, onlyColumn(filter({ tradeId: [id] })), ItemCategory.OneHandedAxe)
    expect(read('item.physical_dps')).toBe(208)
    expect(read('item.elemental_dps')).toBe(0)
    expect(read('item.aps')).toBe(1.3)
    expect(read('item.crit')).toBe(5)
  })
})

describe('colours', () => {
  it('says higher or lower than yours, not better or worse', () => {
    const column = onlyColumn(filter({ value: 100 }))
    expect(statTone(120, column)?.dir).toBe('higher')
    expect(statTone(80, column)?.dir).toBe('lower')
    expect(statTone(100, column)).toBeNull()
  })

  it('keeps to the number when lower is better, or neither is', () => {
    expect(statTone(120, onlyColumn(filter({ value: 100, better: -1 })))?.dir).toBe('higher')
    expect(statTone(80, onlyColumn(filter({ value: 100, better: 0, min: 5, max: 200 })))?.dir).toBe('lower')
  })

  it('builds with distance from yours, full at 5%', () => {
    const column = onlyColumn(filter({ value: 1210 }))
    expect(statTone(1203, column)?.strength).toBeCloseTo(0.12, 2)
    expect(statTone(1241, column)?.strength).toBeCloseTo(0.51, 2)
    expect(statTone(1271, column)?.strength).toBe(1)
    expect(statTone(1100, column)?.strength).toBe(1)
    expect(statTone(5, onlyColumn(filter({ value: 0, min: 0, max: 10 })))?.strength).toBe(1)
  })

  it('stays plain with no value', () => {
    expect(statTone(null, onlyColumn(filter({ value: 100 })))).toBeNull()
  })

  it('compares the numbers as shown, so equal-looking ones stay plain', () => {
    expect(statTone(100.4, onlyColumn(filter({ value: 100 })))).toBeNull()
    const decimals = { ...onlyColumn(filter({ value: 1.3 })), dp: true }
    expect(statTone(1.3, decimals)).toBeNull()
    expect(statTone(1.31, decimals)?.dir).toBe('higher')
  })
})

describe('showing them', () => {
  it('doesn\'t round yours a second time, which can change it', () => {
    // 1.15 truncates to 1.14 through float error, in the filter and here alike.
    const speed = { ...onlyColumn(filter({ value: 1.14 })), dp: true }
    expect(statTone(1.15, speed)).toBeNull()
  })

  it('formats whole numbers, decimals and missing values', () => {
    const whole = onlyColumn(filter({}))
    expect(formatStatValue(15.5, whole)).toBe('15')
    expect(formatStatValue(null, whole)).toBe('–')
    expect(formatStatValue(1.3, { ...whole, dp: true })).toBe('1.3')
  })

  it('uses short labels, with a fallback from the stat\'s own words', () => {
    expect(statColumnLabel('+#% total Elemental Resistance')).toBe('Res')
    expect(statColumnLabel('Gain #% of Physical Damage as Extra Fire Damage')).toBe('→Fire')
    expect(statColumnLabel('Regenerate # Energy Shield per second')).toBe('Regen')
    expect(statColumnLabel('#% increased effect of Non-Curse Auras from your Skills')).toBe('Aura')
    expect(statColumnLabel('#% increased Stun and Block Recovery')).toBe('Stun')
    expect(statColumnLabel('#% of Physical Damage from Hits taken as Fire Damage')).toBe('Physic')
  })

  it('fits 4 columns in the default window, fewer with less room, and never none', () => {
    expect(statColumnsThatFit(420, 200, 1)).toBe(4)
    expect(statColumnsThatFit(420, 260, 1)).toBe(3)
    expect(statColumnsThatFit(100, 200, 1)).toBe(1)
    expect(statColumnsThatFit(620, 200, 1)).toBe(8)
    expect(statColumnsThatFit(420, 200, 1.3)).toBe(2)
  })

  it('makes room for the +N column once some are hidden', () => {
    expect(statColumnsThatFit(428, 200, 1, 4)).toBe(4)
    expect(statColumnsThatFit(428, 200, 1, 6)).toBe(4)
    expect(statColumnsThatFit(420, 200, 1, 6)).toBe(3)
  })

  it('assumes the default before the table is measured', () => {
    expect(statColumnsThatFit(0, 200, 1)).toBe(4)
  })
})
