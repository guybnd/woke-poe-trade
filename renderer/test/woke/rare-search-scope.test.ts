// A rare's price is in its best mods. Its first search has to include them, and
// a search without any mods must not name a price.
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { fixture, loadGameData, parseItem } from '../helpers/game-data'

vi.mock('@/web/background/IPC', () => ({ Host: { proxy: async () => new Response('{}') } }))
vi.mock('@/web/Config', () => ({
  AppConfig: () => ({ apiLatencySeconds: 2, accountName: '' }),
  poeWebApi: () => 'www.pathofexile.com'
}))

/* eslint-disable import/first */
import { createPresets } from '@/web/price-check/filters/create-presets'
import { isTopTierFilter } from '@/web/price-check/filters/create-stat-filters'
import { createTradeRequest } from '@/web/price-check/trade/pathofexile-trade'
import { isBlankRareSearch, skipsTopMods } from '@/web/woke/price-insight/search-scope'
import type { ParsedItem } from '@/parser'
import type { StatFilter } from '@/web/price-check/filters/interfaces'
/* eslint-enable import/first */

const OPTS = { league: 'Mirage', merchantOnly: true, currency: null, collapseListings: 'api' as const, activateStockFilter: false, searchStatRange: 10, useEn: false }

function amulet (mods: string, footer = ''): string {
  return `Item Class: Amulets
Rarity: Rare
Gale Beads
Onyx Amulet
--------
Requirements:
Level: 70
--------
Item Level: 86
--------
{ Implicit Modifier — Attribute }
+12(10-16) to all Attributes
--------
${mods}${footer}`
}

const T1_CRIT = '{ Suffix Modifier "of Destruction" (Tier: 1) — Damage, Critical }\n+38(35-38)% to Global Critical Strike Multiplier'
const T1_SPELL = '{ Prefix Modifier "Wizard\'s" (Tier: 1) — Damage, Caster }\n26(23-26)% increased Spell Damage'
const T5_SPELL = '{ Prefix Modifier "Mage\'s" (Tier: 5) — Damage, Caster }\n12(10-13)% increased Spell Damage'

function active (item: ParsedItem) {
  const { presets, active } = createPresets(item, OPTS)
  return presets.find(p => p.id === active)!
}
const ticked = (stats: unknown[]) => (stats as StatFilter[]).filter(f => !f.disabled && !f.hidden).map(f => f.statRef)

describe('rare searches', () => {
  beforeAll(loadGameData)

  it('tick T1 and T2 mods from the start, and they reach the search', () => {
    const preset = active(parseItem(amulet(`${T1_SPELL}\n${T1_CRIT}`)))
    expect(ticked(preset.stats)).toHaveLength(2)
    const body = createTradeRequest(preset.filters, preset.stats)
    expect(body.query.stats[0].filters.filter(f => !f.disabled)).toHaveLength(2)
  })

  it('leave filler off even at T1, like reflect', () => {
    const reflect = '{ Suffix Modifier "of Thorns" (Tier: 1) }\nReflects 6(5-10) Physical Damage to Melee Attackers'
    expect(ticked(active(parseItem(amulet(`${reflect}\n${T1_CRIT}`))).stats)).toEqual(['+#% Global Critical Strike Multiplier'])
  })

  it('leave lower tier mods off', () => {
    expect(ticked(active(parseItem(amulet(T5_SPELL))).stats)).toEqual([])
  })

  it('tick no more than 4 mods, best first', () => {
    const ring = parseItem(fixture('items/rare-ring.txt'))
    expect(ticked(active(ring).stats).length).toBeLessThanOrEqual(4)
  })

  it('let top mods push out default totals', () => {
    const item = parseItem(`Item Class: Helmets
Rarity: Rare
Gale Dome
Hubris Circlet
--------
Energy Shield: 150
--------
Requirements:
Level: 69
--------
Item Level: 84
--------
{ Prefix Modifier "Rotund" (Tier: 12) — Life }
+20(15-24) to maximum Life
{ Prefix Modifier "Wizard's" (Tier: 1) — Life }
+120(120-129) to maximum Energy Shield
{ Suffix Modifier "of the Whelpling" (Tier: 7) — Elemental, Fire, Resistance }
+15(12-17)% to Fire Resistance
{ Suffix Modifier "of the Lost" (Tier: 7) — Chaos, Resistance }
+8(5-10)% to Chaos Resistance
{ Suffix Modifier "of Absorption" (Tier: 1) — Life }
Regenerate 2(1.5-2)% of Life per second`)
    const refs = ticked(active(item).stats)
    expect(refs).toContain('#% of Life Regenerated per Second')
    expect(refs.filter(r => !r.includes(':')).length).toBeLessThanOrEqual(4)
  })

  it('do not take strength for life when ticking a total', () => {
    const item = parseItem(amulet('{ Suffix Modifier "of the Titan" (Tier: 1) — Attribute }\n+55(51-55) to Strength\n{ Prefix Modifier "Plump" (Tier: 11) — Life }\n+15(10-19) to maximum Life'))
    expect(ticked(active(item).stats)).toContain('+# total to Strength')
    const life = (active(item).stats as StatFilter[]).find(f => f.statRef === '+# total maximum Life')!
    expect(isTopTierFilter(life, item)).toBe(false)
  })

  it('tick a cluster jewel\'s notables, not its filler', () => {
    const item = parseItem(`Item Class: Jewels
Rarity: Rare
Havoc Spark
Large Cluster Jewel
--------
Requirements:
Level: 54
--------
Item Level: 84
--------
Adds 8 Passive Skills (enchant)
2 Added Passive Skills are Jewel Sockets (enchant)
Added Small Passive Skills grant: 12% increased Fire Damage (enchant)
--------
{ Prefix Modifier "Blowback" (Tier: 1) }
1 Added Passive Skill is Blowback
{ Suffix Modifier "of Flames" (Tier: 1) }
Added Small Passive Skills also grant: +7(6-8) to Strength`)
    const refs = ticked(active(item).stats)
    expect(refs).toContain('1 Added Passive Skill is Blowback')
    expect(refs.some(r => r.includes('Strength'))).toBe(false)
    expect(skipsTopMods(item, active(item).stats)).toBe(false)
  })

  it('leave veiled rares alone', () => {
    const item = parseItem(amulet(T1_CRIT))
    const veiled = { ...item, isVeiled: true } as ParsedItem
    expect(ticked(active(veiled).stats)).toEqual([])
  })

  it('leave uniques alone', () => {
    const kaom = parseItem(fixture('items/unique-kaoms-heart.txt'))
    expect(isBlankRareSearch(kaom, active(kaom).filters, [])).toBe(false)
    expect(skipsTopMods(kaom, active(kaom).stats)).toBe(false)
  })
})

describe('verdict scope', () => {
  beforeAll(loadGameData)

  it('calls a rare with nothing ticked blank', () => {
    const item = parseItem(amulet(T5_SPELL))
    const preset = active(item)
    expect(isBlankRareSearch(item, preset.filters, preset.stats)).toBe(true)
  })

  it('does not call a search with a mod ticked blank', () => {
    const item = parseItem(amulet(T1_CRIT))
    const preset = active(item)
    expect(isBlankRareSearch(item, preset.filters, preset.stats)).toBe(false)
  })

  it('does not call a crafting base search blank', () => {
    const item = parseItem(amulet(T5_SPELL, '\n--------\nElder Item'))
    const { presets } = createPresets(item, OPTS)
    const base = presets.find(p => p.id === 'filters.preset_base_item')!
    expect(isBlankRareSearch(item, base.filters, base.stats.map(s => ({ ...s, disabled: true })) as never)).toBe(false)
  })

  it('does not call a rare with nothing to tick blank', () => {
    const item = parseItem(amulet(T5_SPELL))
    expect(isBlankRareSearch(item, active(item).filters, [])).toBe(false)
  })

  it('does not call a 6-link search blank', () => {
    const item = parseItem(amulet(T5_SPELL))
    const preset = active(item)
    const filters = { ...preset.filters, linkedSockets: { value: 6, disabled: false } }
    expect(isBlankRareSearch(item, filters, preset.stats)).toBe(false)
  })

  it('notices when a top mod gets unticked', () => {
    const item = parseItem(amulet(T1_CRIT))
    const preset = active(item)
    expect(skipsTopMods(item, preset.stats)).toBe(false)
    for (const s of preset.stats as StatFilter[]) s.disabled = true
    expect(skipsTopMods(item, preset.stats)).toBe(true)
    expect(isBlankRareSearch(item, preset.filters, preset.stats)).toBe(true)
  })
})
