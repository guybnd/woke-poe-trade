// Guy (2026-11-19): price checking a fractured item starts with only the
// fractured mod and the base ticked; every other mod, total and property is off.
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { loadGameData, fixture, parseItem } from '../helpers/game-data'
import { createPresets } from '@/web/price-check/filters/create-presets'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false }

// Guy's helmet, as copied from the game.
const CIRCLET = `Item Class: Helmets
Rarity: Magic
Unassailable Lich's Circlet of Ephij
--------
Energy Shield: 248 (augmented)
--------
Requirements:
Level: 84
Int: 224
--------
Sockets: W-B-W-W 
--------
Item Level: 85
--------
{ Fractured Prefix Modifier "Unassailable" (Tier: 1) — Defences, Energy Shield }
97(92-100)% increased Energy Shield
{ Suffix Modifier "of Ephij" (Tier: 1) — Elemental, Lightning, Resistance }
+48(46-48)% to Lightning Resistance
--------
Fractured Item`

function active (text: string) {
  const { active, presets } = createPresets(parseItem(text), OPTS)
  return presets.find(p => p.id === active)!
}
const tickedRows = (p: ReturnType<typeof active>) => p.stats.flatMap(s => s.group
  ? [...(s.meta.disabled ? [] : [s.meta]), ...s.stats.filter(f => !f.disabled)]
  : (s.disabled ? [] : [s]))

describe('fractured item ticks only its fractured mod and base', () => {
  beforeAll(loadGameData)

  it('magic helmet: the fractured ES% row and the base, nothing else', () => {
    const p = active(CIRCLET)
    expect(p.filters.searchRelaxed?.disabled).toBe(true)
    expect(p.filters.searchExact.baseType).toBe("Lich's Circlet")
    const ticked = tickedRows(p)
    expect(ticked.map(f => f.text)).toEqual(['#% increased Energy Shield'])
    expect(ticked[0].fracLead).toBe(true)
    // The resistance and the ES total are still there to tick by hand.
    expect(p.stats.some(s => !s.group && /Lightning Resistance/.test(s.text))).toBe(true)
    expect(p.stats.some(s => !s.group && s.tradeId[0] === 'item.energy_shield')).toBe(true)
  })

  it('rare: tier 1 mods beside the fractured one start unticked', () => {
    const p = active(fixture('items/rare-shield-fractured-res.txt'))
    const ticked = tickedRows(p)
    expect(ticked.length).toBeGreaterThan(0)
    expect(ticked.every(f => f.fracLead)).toBe(true)
  })

  it('an unfractured rare still gets its top mods ticked', () => {
    const text = fixture('items/rare-shield-fractured-res.txt')
      .replace(/\n-+\nFractured Item\s*$/, '\n')
      .replace(/\{ Fractured (Prefix|Suffix) Modifier/g, '{ $1 Modifier')
      .replace(/ \(fractured\)/g, '')
    expect(tickedRows(active(text)).length).toBeGreaterThan(0)
  })

  it('cluster jewel keeps its enchant and passive count beside the fractured notable', () => {
    const text = fixture('items/rare-cluster-large.txt')
      .replace('{ Prefix Modifier "Blowback"', '{ Fractured Prefix Modifier "Blowback"')
      .trimEnd() + '\n--------\nFractured Item'
    const ticked = tickedRows(active(text))
    const refs = ticked.map(f => f.statRef)
    expect(ticked.some(f => f.fracLead)).toBe(true)
    expect(refs).toContain('Adds # Passive Skills')
    expect(ticked.some(f => f.tag === 'enchant')).toBe(true)
    expect(ticked.some(f => /Strength/.test(f.statRef))).toBe(false)
  })

  // 3.30 fractured granted skills have no trade stat, so nothing leads: the
  // ring is picked like an unfractured rare instead of searching the bare base.
  it('fractured mod with no row: top mods still tick', () => {
    const text = `Item Class: Rings
Rarity: Rare
Doom Loop
Two-Stone Ring
--------
Requirements:
Level: 60
--------
Item Level: 84
--------
+14(12-16)% to Cold and Lightning Resistances (implicit)
--------
{ Fractured Prefix Modifier "of Anger" }
Grants Level 22 Anger Skill
{ Prefix Modifier "Rapturous" (Tier: 1) }
+64(60-69) to maximum Life
{ Suffix Modifier "of the Ice" (Tier: 1) }
+46(46-48)% to Lightning Resistance
--------
Fractured Item`
    const p = active(text)
    expect(p.stats.some(s => !s.group && s.fracLead)).toBe(false)
    expect(tickedRows(p).length).toBeGreaterThan(0)
  })
})
