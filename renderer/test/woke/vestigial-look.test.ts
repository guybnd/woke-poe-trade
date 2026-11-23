// A Vestigial unique (Timeless Conflict variant): the game shows "Vestigial"
// before its base and its inherited implicit in light purple. The price check
// and the tooltips colour that implicit the same (Guy's pick C: no crystal icon).
import { beforeAll, describe, expect, it } from 'vitest'
import { ModifierMechanic, ModifierType } from '@/parser/modifiers'
import { initUiModFilters } from '@/web/price-check/filters/create-stat-filters'
import { FilterTag } from '@/web/price-check/filters/interfaces'
import { poeLook, poeSection } from '@/web/woke/price-insight/poe-kind'
import { listingTipItem } from '@/web/woke/price-insight/listing-tip'
import type { ListingItem } from '@/web/woke/price-insight/listing-tip'
import { listingDetail } from '@/web/woke/price-insight/listing-tip-detail'
import { saleItem } from '@/web/woke/net-worth/sale-tip'
import type { Sale } from '@/web/woke/net-worth/sales'
import { loadGameData, parseItem } from '../helpers/game-data'

beforeAll(loadGameData)

// Guy's Ctrl+Alt+C copy, 2026-11-22.
const GEOFRI = `Item Class: Helmets
Rarity: Unique
Geofri's Crest
Vestigial Great Crown
--------
Armour: 355 (augmented)
Energy Shield: 71 (augmented)
--------
Requirements:
Level: 53
Str: 59
Int: 59
--------
Sockets: W-W
--------
Item Level: 86
--------
{ Vestigial Implicit Modifier — Speed }
10% increased Movement Speed
--------
{ Unique Modifier — Defences, Armour, Energy Shield }
138(120-150)% increased Armour and Energy Shield
{ Unique Modifier — Elemental, Fire, Resistance }
+29(20-30)% to Fire Resistance
{ Unique Modifier — Elemental, Cold, Resistance }
+22(20-30)% to Cold Resistance
{ Unique Modifier — Elemental, Lightning, Resistance }
+25(20-30)% to Lightning Resistance
{ Unique Modifier — Chaos, Resistance }
+29(20-30)% to Chaos Resistance
{ Unique Modifier — Minion }
+1 to maximum number of Summoned Holy Relics
--------
In the battle for honour, Geofri won.
Not so, the battle for survival.`

// The shape the trade API sent for a Vestigial Geofri's Crest (Covens, 2026-11-22).
const LISTING: ListingItem = {
  frameType: 3,
  rarity: 'Unique',
  name: "Geofri's Crest",
  typeLine: 'Vestigial Great Crown',
  baseType: 'Great Crown',
  vestigial: true,
  ilvl: 86,
  corrupted: true,
  implicitMods: [{
    description: 'Elemental Resistances are Zero',
    flags: { vestigial: true },
    domain: 'implicit',
    hash: 'stat.implicit.stat_85576425'
  }],
  explicitMods: [{
    description: '138% increased Armour and Energy Shield',
    domain: 'explicit',
    hash: 'stat.explicit.stat_3321629045'
  }]
}

describe('Vestigial unique', () => {
  it('reads the Vestigial base and implicit from the game copy', () => {
    const item = parseItem(GEOFRI)
    expect(item.isVestigial).toBe(true)
    expect(item.info.refName).toBe("Geofri's Crest")
    expect(item.uniqueBase?.name).toBe('Great Crown')
    const vest = item.newMods.find(m => m.info.mechanic === ModifierMechanic.Vestigial)
    expect(vest?.info.type).toBe(ModifierType.Implicit)
    expect(vest?.info.tags).toContain('Speed')
  })

  it('draws the implicit row in the Vestigial look in PoE mode', () => {
    const item = parseItem(GEOFRI)
    const stats = initUiModFilters(item, { searchStatRange: 10 }).flatMap(f => 'stats' in f ? f.stats : [f])
    const row = stats.find(f => f.tag === FilterTag.Vestigial)!
    expect(row).toBeTruthy()
    expect(poeLook(row)).toEqual({ kind: 'vestigial', label: 'Vestigial implicit' })
    expect(poeSection(row)).toBe('implicit')
  })

  it('carries the Vestigial flag and implicit kind to the listing tooltip', () => {
    const tip = listingTipItem(LISTING)!
    expect(tip.vestigial).toBe(true)
    expect(tip.base).toBe('Vestigial Great Crown')
    expect(tip.implicits).toEqual(['Elemental Resistances are Zero'])
    const detail = listingDetail(LISTING)
    expect(detail.implicits[0]).toMatchObject({ kind: 'vestigial', label: 'Vestigial implicit' })
  })

  it('colours the implicit of a sold Vestigial item, which has no listing detail', () => {
    const sold = saleItem({ tip: LISTING } as unknown as Sale)!
    expect(sold.vestigial).toBe(true)
    expect(sold.implicitKinds).toEqual(['vestigial'])
  })

  it('leaves a plain unique alone', () => {
    const tip = listingTipItem({ ...LISTING, vestigial: undefined, typeLine: 'Great Crown', implicitMods: [] })!
    expect(tip.vestigial).toBeUndefined()
    expect(tip.implicitKinds).toBeUndefined()
  })
})
