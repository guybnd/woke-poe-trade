// A trade listing's tiers, rolls and weapon stats, from real trade responses.
import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { loadGameData } from '../helpers/game-data'
import { listingDetail } from '@/web/woke/price-insight/listing-tip-detail'
import type { ModLine } from '@/web/woke/price-insight/listing-tip-detail'
import type { ListingItem } from '@/web/woke/price-insight/listing-tip'

// A fractured weapon, a crafted body armour and a unique, captured 2026-11-05.
const [SWORD, ARMOUR, UNIQUE]: ListingItem[] = JSON.parse(readFileSync(resolve(__dirname, '../../../testing/fixtures/trade/listing-tiers.json'), 'utf-8'))

beforeAll(async () => { await loadGameData() })

const text = (line: ModLine) => line.parts.map(p => p.text).join('')
const findLine = (item: ListingItem, part: string) => {
  const d = listingDetail(item)
  return [...d.implicits, ...d.groups.flatMap(g => g.lines)].find(l => text(l).includes(part))!
}

describe('listingDetail on real trade responses', () => {
  it('shows the tier and the roll inside the line', () => {
    const line = findLine(SWORD, 'increased Physical Damage')
    expect(line.tags).toEqual(['P1'])
    expect(text(line)).toBe('136(120-139)% increased Physical Damage')
    expect(line.kind).toBe('fractured')
    // (136 - 120) / 19
    expect(line.quality).toBe(84)
  })

  it('averages both numbers of an added damage line', () => {
    const added = findLine(SWORD, 'Adds')
    expect(text(added)).toBe('Adds 14(13-18) to 31(27-31) Physical Damage')
    // 20% and 100%
    expect(added.quality).toBe(60)
  })

  it('leaves a line that cannot roll without a percentage', () => {
    const line = findLine(SWORD, 'reduced Attribute')
    expect(text(line)).toBe('32% reduced Attribute Requirements')
    expect(line.quality).toBeNull()
    expect(line.tags).toEqual(['S1'])
  })

  it('adds the ranges of two mods on one line', () => {
    const line = findLine(ARMOUR, 'maximum Energy Shield')
    expect(line.tags).toEqual(['P4', 'P3'])
    expect(text(line)).toBe('+49(40-63) to maximum Energy Shield')
  })

  it('groups a mod with several lines under one heading, prefixes first', () => {
    const { groups } = listingDetail(SWORD)
    const chosen = groups.find(g => g.heading === 'Prefix "Chosen"')!
    expect(chosen.lines).toHaveLength(2)
    const headings = groups.map(g => g.heading)
    expect(headings.findIndex(h => h.startsWith('Suffix'))).toBeGreaterThan(headings.findLastIndex(h => h.startsWith('Prefix')))
  })

  it('names a crafted mod as crafted', () => {
    const { groups } = listingDetail(ARMOUR)
    const crafted = groups[groups.length - 1]
    expect(crafted.heading).toBe('Crafted "of Craft"')
    expect(crafted.lines[0].kind).toBe('crafted')
    expect(crafted.lines[0].tags).toEqual(['R3'])
  })

  it('keeps a unique in game order with no tags or headings, but still shows rolls', () => {
    const { groups } = listingDetail(UNIQUE)
    expect(groups.map(g => g.heading)).toEqual([''])
    const line = groups[0].lines[0]
    expect(line.tags).toEqual([])
    expect(line.quality).toBe(10)
    expect(groups[0].lines.find(l => text(l) === 'Your Physical Damage can Shock')?.quality).toBeNull()
  })

  it('draws weapon lines in their colours', () => {
    const { props, requires } = listingDetail(SWORD)
    expect(props[0]).toEqual([{ text: 'One Handed Sword', tone: 'label' }])
    expect(props[1][1]).toEqual({ text: '158-304', tone: 'aug' })
    expect(props[2][1]).toEqual({ text: '57-117', tone: 'cold' })
    expect(props[5].map(p => p.text).join('')).toBe('Weapon Range: 1.1 metres')
    expect(requires.map(p => p.text).join('')).toBe('Requires Level 62, 82 Str, 70 Dex')
  })

  it('has the numbers for the bottom row', () => {
    expect(listingDetail(SWORD)).toMatchObject({
      foot: [{ label: 'pDPS', value: '411' }, { label: 'eDPS', value: '129' }, { label: 'DPS', value: '539' }],
      footNote: 'at 20% quality'
    })
    expect(listingDetail(ARMOUR).foot).toEqual([
      { label: 'Armour', value: '909' }, { label: 'Energy Shield', value: '255' }, { label: 'Base', value: '42%' }
    ])
    expect(listingDetail(SWORD).tail).toEqual([{ text: 'Fractured Item', kind: 'fractured' }])
  })
})

describe('listingDetail, numbers', () => {
  it('marks every number, rolled or fixed', () => {
    const numbers = (part: string) => findLine(SWORD, part).parts.filter(p => p.number).map(p => p.text)
    expect(numbers('Adds')).toEqual(['14', '31'])
    expect(numbers('reduced Attribute')).toEqual(['32'])
  })
})

describe('listingDetail', () => {
  const one = (mods: NonNullable<Exclude<NonNullable<ListingItem['explicitMods']>[number], string>['mods']>, description: string) =>
    listingDetail({ frameType: 2, explicitMods: [{ description, domain: 'explicit', mods }] }).groups[0].lines[0]

  it('reads plain text mods, as older lists send', () => {
    const line = listingDetail({ frameType: 2, explicitMods: ['+40 to maximum Life'] }).groups[0].lines[0]
    expect(text(line)).toBe('+40 to maximum Life')
    expect(line.tags).toEqual([])
    expect(line.quality).toBeNull()
  })

  it('counts a perfect roll as 100 and only then', () => {
    const mods = (max: string) => [{ name: 'A', tier: 'P1', magnitudes: [{ min: '0', max }] }]
    expect(one(mods('100'), '100 to x').quality).toBe(100)
    expect(one(mods('1000'), '999 to x').quality).toBe(99)
  })

  it('caps a roll boosted past its range', () => {
    const line = one([{ name: 'A', tier: 'P1', magnitudes: [{ min: '155', max: '169' }] }], '179% increased Physical Damage')
    expect(line.quality).toBe(100)
    expect(text(line)).toBe('179(155-169)% increased Physical Damage')
  })

  it('reads a reduced stat sent as negative numbers', () => {
    const line = one([{ name: 'A', tier: 'S1', magnitudes: [{ min: '-20', max: '-10' }] }], '15% reduced Mana Cost of Skills')
    expect(text(line)).toBe('15(10-20)% reduced Mana Cost of Skills')
    expect(line.quality).toBe(50)
  })

  it('scores more of a downside as the worse roll', () => {
    const mags = (min: string, max: string) => [{ name: 'A', magnitudes: [{ min, max }] }]
    expect(one(mags('-20', '-10'), '-20% to all Elemental Resistances').quality).toBe(0)
    expect(one(mags('-15', '-10'), '15% reduced Movement Speed').quality).toBe(0)
    expect(one(mags('-15', '-10'), '10% reduced Movement Speed').quality).toBe(100)
  })

  it('scores a reduced stat you want as better the more it reduces', () => {
    expect(one([{ name: 'A', magnitudes: [{ min: '-40', max: '-20' }] }], '40% reduced Attribute Requirements').quality).toBe(100)
  })

  it('shows no roll when a fixed number could be mistaken for it', () => {
    const line = one([{ name: 'A', magnitudes: [{ min: '10', max: '30' }] }], '10% chance to gain 25 Life')
    expect(text(line)).toBe('10% chance to gain 25 Life')
    expect(line.quality).toBeNull()
  })

  it('reads a class requirement and a %0 template', () => {
    const d = listingDetail({
      frameType: 2,
      properties: [{ name: 'Spawns a Level %0 Monster', displayMode: 3, values: [['83', 0]] }],
      requirements: [{ name: 'Level', displayMode: 0, values: [['20', 0]] }, { name: 'Class:', displayMode: 0, values: [['Witch', 0]] }]
    })
    expect(d.props[0].map(p => p.text).join('')).toBe('Spawns a Level 83 Monster')
    expect(d.requires.map(p => p.text).join('')).toBe('Requires Level 20, Class: Witch')
  })

  it('finds the rolled number when the text has others', () => {
    const line = one([{ name: 'A', tier: 'S1', magnitudes: [{ min: '20', max: '30' }] }], '10% chance to gain 25 Life for 4 seconds')
    expect(text(line)).toBe('10% chance to gain 25(20-30) Life for 4 seconds')
  })

  it('shows the plain line when the numbers are in other units', () => {
    const line = one([{ name: 'A', tier: 'S1', magnitudes: [{ min: '60', max: '120' }] }], 'Regenerate 1.5 Life per second')
    expect(text(line)).toBe('Regenerate 1.5 Life per second')
    expect(line.quality).toBeNull()
    expect(line.tags).toEqual(['S1'])
  })

  it('shows the plain line for a range that crosses zero', () => {
    const line = one([{ name: 'A', magnitudes: [{ min: '-10', max: '10' }] }], '5% increased Damage')
    expect(line.quality).toBeNull()
  })

  it('leaves the note off once the item has its quality', () => {
    const d = listingDetail({ frameType: 3, extended: { pdps: 897.17, dps: 897.17 }, properties: [{ name: 'Quality', type: 6, values: [['+20%', 1]] }] })
    expect(d.foot).toHaveLength(2)
    expect(d.footNote).toBe('')
  })

  it('leaves the bottom row off with no numbers', () => {
    expect(listingDetail({ frameType: 2, extended: { dps: 0 } }).foot).toEqual([])
  })
})
