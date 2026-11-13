// The listing tooltip marks what the price check marks: eldritch altars and
// tiers, enchants, scourge, and mods from league mechanics or influences.
// Items trimmed from live Standard listings, 2026-11-13.
import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { loadGameData } from '../helpers/game-data'
import { listingDetail } from '@/web/woke/price-insight/listing-tip-detail'
import type { ModLine } from '@/web/woke/price-insight/listing-tip-detail'
import { eldritchMark, isCorruption } from '@/web/woke/price-insight/eldritch-listing'
import type { ListingItem } from '@/web/woke/price-insight/listing-tip'

const TABLE = JSON.parse(readFileSync(resolve(__dirname, '../../public/data/implicit-sources.json'), 'utf-8'))

const mod = (description: string, domain: string, stat: string, name?: string, tier?: string, min = '1', max = '1') =>
  ({ description, domain, hash: `stat.${domain}.stat_${stat}`, mods: [{ name, tier, level: 75, magnitudes: [{ min, max }] }] })

const ELDRITCH: ListingItem = {
  name: 'Phoenix Shell',
  typeLine: 'Conquest Lamellar',
  searing: true,
  tangled: true,
  enchantMods: [mod('8% increased Explicit Defence Modifier magnitudes', 'enchant', '3300369861', 'Enchantment Defence Modifier Effect', undefined, '8', '8')],
  implicitMods: [
    mod('11% increased maximum Energy Shield', 'implicit', '2482852589', undefined, undefined, '10', '11'),
    mod('Flasks applied to you have 11% increased Effect', 'implicit', '114734841', undefined, undefined, '10', '11')
  ]
}

const HELMET: ListingItem = {
  name: 'Blood Dome',
  typeLine: 'Royal Burgonet',
  explicitMods: [
    mod('+2 to Level of Socketed AoE Gems', 'explicit', '2551600084', 'Chosen', 'P1', '2', '2'),
    mod('Socketed Gems deal 30% more Elemental Damage', 'explicit', '3835899275', 'of the Essence', 'S0', '30', '30'),
    mod('+1 to Level of Socketed Strength Gems', 'explicit', '916797432', 'of the Underground', 'S1'),
    mod('+46% to Cold Resistance', 'explicit', '4220027924', 'of Puhuarte', 'S0', '46', '48'),
    mod('34% increased Burning Damage', 'explicit', '1175385867', 'of the Elevated Elder', 'S0', '31', '35'),
    mod('+27% to Fire Resistance', 'explicit', '3372524247', 'of the Kiln', 'S5', '24', '29')
  ],
  scourgeMods: [mod('-29 to maximum Life', 'scourge', '3299347043', undefined, 'R3', '-30', '-26')]
}

const text = (line: ModLine) => line.parts.map(p => p.text).join('')
const lines = (item: ListingItem) => { const d = listingDetail(item); return [...d.implicits, ...d.groups.flatMap(g => g.lines)] }
const find = (item: ListingItem, part: string) => lines(item).find(l => text(l).includes(part))!

describe('listing tooltip parity', () => {
  beforeAll(loadGameData)

  it('finds each eldritch implicit\'s altar and tier', () => {
    const es = find(ELDRITCH, 'maximum Energy Shield')
    expect(eldritchMark(es.eldritch!, TABLE)).toEqual({ source: 'eater', rank: 3, label: 'Grand Eater of Worlds implicit' })
    const flasks = find(ELDRITCH, 'Flasks applied')
    expect(eldritchMark(flasks.eldritch!, TABLE)).toEqual({ source: 'exarch', rank: 3, label: 'Grand Searing Exarch implicit' })
  })

  it('names the altar when the item has only one, even without the table', () => {
    const one = { ...ELDRITCH, tangled: false }
    expect(eldritchMark(find(one, 'Flasks applied').eldritch!, null)).toEqual({ source: 'exarch', rank: 0, label: 'Searing Exarch implicit' })
  })

  it('still names the altar of a roll the data lacks, by its stat', () => {
    const odd = { ...ELDRITCH, implicitMods: [mod('10% of Physical Damage from Hits taken as Chaos Damage', 'implicit', '4129825612', undefined, undefined, '10', '10')] }
    expect(eldritchMark(find(odd, 'taken as Chaos').eldritch!, TABLE)).toEqual({ source: 'eater', rank: 0, label: 'Eater of Worlds implicit' })
  })

  it('draws enchants as enchants, apart from implicits', () => {
    expect(find(ELDRITCH, 'Explicit Defence').kind).toBe('enchant')
    expect(find(ELDRITCH, 'Flasks applied').kind).toBe('')
  })

  it('marks mods from league mechanics and influences', () => {
    expect(find(HELMET, 'AoE Gems').source?.label).toBe('Veiled modifier')
    expect(find(HELMET, 'more Elemental').source?.label).toBe('Essence modifier')
    expect(find(HELMET, 'Strength Gems').source?.label).toBe('Delve modifier')
    expect(find(HELMET, 'Cold Resistance').source?.label).toBe('Incursion modifier')
    expect(find(HELMET, 'Burning Damage').source?.label).toBe('Elder modifier')
    expect(find(HELMET, 'Fire Resistance').source).toBeUndefined()
  })

  it('marks a corruption implicit by its stat and range', () => {
    const stat = Object.entries(TABLE.corrupted as Record<string, number[][]>).find(([, r]) => r.some(([a, b]) => a === 1 && b === 1))![0]
    const ring: ListingItem = { corrupted: true, implicitMods: [mod('+1 to something', 'implicit', stat)] }
    const line = listingDetail(ring).implicits[0]
    expect(isCorruption(line.corruption!, TABLE)).toBe(true)
    expect(listingDetail({ ...ring, corrupted: false }).implicits[0].corruption).toBeUndefined()
  })

  it('shows an unrevealed veiled mod as the game does', () => {
    const amulet: ListingItem = { veiled: true, veiledMods: [{ description: 'Prefix02', domain: 'veiled', hash: 'stat.veiled.mod_65000', mods: [{ name: 'Veiled', tier: 'P14' }] }] } as ListingItem
    const line = find(amulet, 'Veiled')
    expect(text(line)).toBe('Veiled Prefix')
    expect(line.source?.label).toBe('Veiled modifier')
  })

  it('draws scourge mods in their colour', () => {
    expect(find(HELMET, 'maximum Life').kind).toBe('scourge')
  })
})
