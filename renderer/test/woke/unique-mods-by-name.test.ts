// A unique priced by name (search, item menu): its mods come from the tooltip
// data as stat rows, so the price check can filter by them.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { loadGameData } from '../helpers/game-data'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '', language: 'en' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import/first */
import { ITEM_BY_REF } from '@/assets/data'
import { createPresets } from '@/web/price-check/filters/create-presets'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import { priceCheckInput, uniqueItemText, uniqueModLines, virtualUnique } from '@/web/woke/ui/tooltip/item-menu-logic'
import type { TipUnique } from '@/web/woke/ui/tooltip/tip-content'
/* eslint-enable import/first */

beforeAll(loadGameData)

const TIPS: Record<string, TipUnique> = JSON.parse(readFileSync('public/data/tips/uniques.json', 'utf8'))
const OPTS = { league: 'Standard', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: true }

function checkOf (name: string, variant?: string) {
  const info = ITEM_BY_REF('UNIQUE', name)![0]
  const item = virtualUnique(info, uniqueModLines(TIPS[name], variant))
  const { presets, active } = createPresets(item, OPTS)
  const preset = presets.find(p => p.id === active)!
  return { item, stats: preset.stats.filter(s => !s.group).map(s => s as Extract<typeof s, { statRef: string }>), preset }
}

describe('a unique priced by name', () => {
  it('gets its mods as stat rows, each at the bottom of its roll range and unticked', () => {
    const { item, stats, preset } = checkOf('Mortem Morsu')
    expect(item.info.refName).toBe('Mortem Morsu')
    expect(item.uniqueBase?.refName).toBe('Fright Claw')
    const phys = stats.find(s => s.text === '#% increased Physical Damage')!
    expect(phys.roll).toMatchObject({ value: 75, bounds: { min: 75, max: 100 } })
    expect(stats.find(s => s.text === '#% of Physical Damage Converted to Chaos Damage')?.roll?.bounds).toEqual({ min: 10, max: 20 })
    expect(stats.find(s => s.text === 'Grants # Life per Enemy Hit')).toBeTruthy()
    expect(stats.every(s => s.disabled)).toBe(true)
    // The first search is still the name alone.
    const query = createTradeRequest(preset.filters, preset.stats).query
    expect(query.name).toBe('Mortem Morsu')
    expect(query.type).toBe('Fright Claw')
    expect(query.stats[0].filters.every(f => f.disabled)).toBe(true)
  })

  it('reads the game text the way Ctrl+Alt+C writes it', () => {
    const text = uniqueItemText('X', 'Y', 'Claw', { base: 'Y', implicits: ['+(25-40) to maximum Life'], explicits: ['Adds (5-10) to (15-20) [Physical] Damage', 'One\nTwo', 'Gain [Phasing|Phasing] on Hit'] })
    expect(text).toBe([
      'Item Class: Claw', 'Rarity: Unique', 'X', 'Y',
      '--------', '{ Implicit Modifier }', '+25(25-40) to maximum Life',
      '--------', '{ Unique Modifier }', 'Adds 5(5-10) to 15(15-20) Physical Damage',
      '{ Unique Modifier }', 'One', 'Two',
      '{ Unique Modifier }', 'Gain Phasing on Hit'
    ].join('\n'))
  })

  it('keeps only the mods every variant has, unless the variant is known', () => {
    const tip: TipUnique = { b: 'Leather Belt', v: [{ n: 'A', e: ['Shared', 'Only A'] }, { n: 'B', e: ['Shared', 'Only B'] }] }
    expect(uniqueModLines(tip)).toEqual({ base: 'Leather Belt', implicits: [], explicits: ['Shared'] })
    expect(uniqueModLines(tip, 'B')).toEqual({ base: 'Leather Belt', implicits: [], explicits: ['Shared', 'Only B'] })
    expect(uniqueModLines(tip, 'C')).toEqual({ base: 'Leather Belt', implicits: [], explicits: ['Shared'] })
  })

  it('leaves out a pool of possible mods, and lines it cannot read', () => {
    const pool: TipUnique = { b: 'Prismatic Jewel', v: [{ e: Array.from({ length: 13 }, (_, i) => `Line ${i}`) }] }
    expect(uniqueModLines(pool)).toBeNull()
    const { item } = checkOf('Aegis Aurora')
    expect(item.unknownModifiers).toEqual([])
  })

  it('goes on without mods when none load, or the game is not in English', () => {
    const info = ITEM_BY_REF('UNIQUE', 'Mortem Morsu')![0]
    expect(virtualUnique(info).rawText).toBe('VIRTUAL_ITEM')
    const mods = uniqueModLines(TIPS['Mortem Morsu'])
    expect(priceCheckInput({ name: 'Mortem Morsu' }, 'unique', info, false, mods)!.item!.rawText).toBe('VIRTUAL_ITEM')
    expect(priceCheckInput({ name: 'Mortem Morsu' }, 'unique', info, true, mods)!.item!.newMods.length).toBeGreaterThan(0)
  })

  it('gives most uniques their mods, all unticked, none with a range across zero', () => {
    let withMods = 0
    for (const name of Object.keys(TIPS)) {
      for (const info of ITEM_BY_REF('UNIQUE', name) ?? []) {
        const item = virtualUnique(info, uniqueModLines(TIPS[name]))
        expect(item.info.refName).toBe(name)
        if (!item.newMods.some(m => m.stats.length)) continue
        withMods++
        const { presets } = createPresets(item, OPTS)
        for (const preset of presets) {
          for (const s of preset.stats) {
            expect(s.group ? s.meta.disabled : s.disabled, `${name}: ${s.group ? s.meta.text : s.text}`).toBe(true)
            const b = !s.group && s.roll?.bounds
            if (b) expect(b.min < 0 && b.max > 0, `${name}: ${(s as { text: string }).text}`).toBe(false)
          }
        }
      }
    }
    expect(withMods).toBeGreaterThan(1000)
  })

  it('takes no mods from another base of the same unique', () => {
    // The data has Cobalt Jewel's mods for Grand Spectrum.
    const viridian = ITEM_BY_REF('UNIQUE', 'Grand Spectrum')!.find(u => u.unique?.base !== TIPS['Grand Spectrum'].b)!
    expect(virtualUnique(viridian, uniqueModLines(TIPS['Grand Spectrum'])).rawText).toBe('VIRTUAL_ITEM')
  })

  it('leaves out choices the data lists in full, seeds and negative ranges', () => {
    const texts = (name: string) => checkOf(name).stats.map(s => s.text)
    // 1 or 2 abyssal sockets: never added up to 3.
    expect(texts('Command of the Pit').some(t => /Abyssal Socket/.test(t))).toBe(false)
    // Increased or reduced attack speed.
    expect(texts('Echoforge').some(t => /Attack Speed/.test(t))).toBe(false)
    // An abyss jewel's seed number.
    expect(texts('Baleful Dominion').some(t => /timeless|Kurgal/i.test(t))).toBe(false)
    expect(texts("Betrayal's Sting").some(t => /Elemental Resistances/.test(t))).toBe(false)
    // An implicit and an explicit of one stat are both kept.
    const life = checkOf('Headhunter').item.newMods.filter(m => m.stats.some(s => s.stat.ref === '+# to maximum Life'))
    expect(life).toHaveLength(2)
  })
})
