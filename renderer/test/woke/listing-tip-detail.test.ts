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

  // Soul Ascension, from a real listing: the cap on Eaten Souls rolls -10 to +10.
  it('rolls a range that crosses zero, reading the number with its sign', () => {
    const souls = [{ magnitudes: [{ min: '-10', max: '10' }] }]
    const low = one(souls, '-5 to maximum number of Eaten Souls')
    expect(text(low)).toBe('-5(-10 to 10) to maximum number of Eaten Souls')
    expect(low.quality).toBe(25)
    expect(one(souls, '+7 to maximum number of Eaten Souls').quality).toBe(85)
    expect(one(souls, '+10 to maximum number of Eaten Souls').quality).toBe(100)
    expect(one(souls, '-10 to maximum number of Eaten Souls').quality).toBe(0)
  })

  it('reads the sign of a crossing range from "reduced" too', () => {
    const line = one([{ magnitudes: [{ min: '-10', max: '10' }] }], '5% reduced Attack Speed')
    expect(text(line)).toBe('5(-10 to 10)% reduced Attack Speed')
    expect(line.quality).toBe(25)
  })

  it('shows no roll for a fixed number, as in Eat a Soul every 0.5 seconds', () => {
    const line = one([{ magnitudes: [{ min: '0.5', max: '0.5' }] }], 'Eat a Soul when you Hit a Rare or Unique Enemy, no more than once every 0.5 seconds')
    expect(line.quality).toBeNull()
  })

  it('shows the plain line when two mods share a range that crosses zero', () => {
    const line = one([{ name: 'A', magnitudes: [{ min: '-10', max: '10' }] }, { name: 'B', magnitudes: [{ min: '-5', max: '5' }] }], '5% increased Damage')
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

describe('listingDetail, catalyst quality', () => {
  const belt = (quality: string, mods: ListingItem['explicitMods'], implicitMods: ListingItem['implicitMods'] = []): ListingItem => ({
    frameType: 2,
    properties: [{ name: quality, type: 6, displayMode: 0, values: [['+20%', 1]] }],
    implicitMods,
    explicitMods: mods
  })
  const dex = { description: '+51 to Dexterity', domain: 'explicit', mods: [{ name: 'of the Lynx', tier: 'S2', magnitudes: [{ min: '43', max: '50' }] }] }
  const life = { description: '+80 to maximum Life', domain: 'explicit', mods: [{ name: 'Fecund', tier: 'P2', magnitudes: [{ min: '70', max: '79' }] }] }
  const lines = (item: ListingItem) => listingDetail(item).groups.flatMap(g => g.lines)
  const byStat = (item: ListingItem) => {
    const all = lines(item)
    return [all.find(l => text(l).includes('Dexterity'))!, all.find(l => text(l).includes('Life'))!]
  }

  it('reads a raised roll against the raised range and keeps the shown range', () => {
    const [line] = lines(belt('Quality (Attribute Modifiers)', [dex]))
    expect(text(line)).toBe('+51(43-50) to Dexterity')
    // 43-50 at 20% is 51-60: 51 is the lowest roll.
    expect(line.quality).toBe(0)
  })

  it('counts the top raised roll as perfect', () => {
    const top = { ...dex, description: '+60 to Dexterity' }
    expect(lines(belt('Quality (Attribute Modifiers)', [top]))[0].quality).toBe(100)
  })

  it('leaves lines of other kinds alone', () => {
    const [dexLine, lifeLine] = byStat(belt('Quality (Attribute Modifiers)', [dex, life]))
    expect(dexLine.quality).toBe(0)
    // (80 - 70) / 9, capped
    expect(lifeLine.quality).toBe(100)
  })

  it('raises implicits too', () => {
    const imp = { description: '+30 to Strength', mods: [{ magnitudes: [{ min: '25', max: '35' }] }] }
    // 25-35 at 20% is 30-42.
    expect(listingDetail(belt('Quality (Attribute Modifiers)', [], [imp])).implicits[0].quality).toBe(0)
  })

  it('raises prefixes only by tier for prefix quality', () => {
    const [dexLine, lifeLine] = byStat(belt('Quality (Prefix Modifiers)', [dex, { ...life, description: '+84 to maximum Life' }]))
    // A suffix, not raised: 51 is past 43-50.
    expect(dexLine.quality).toBe(100)
    // 70-79 at 20% is 84-94.
    expect(lifeLine.quality).toBe(0)
  })

  it('ignores plain quality', () => {
    expect(lines(belt('Quality', [dex]))[0].quality).toBe(100)
  })

  it('raises each mod on a shared line before adding them, as the game does', () => {
    const shared = { description: '+72 to Dexterity', domain: 'explicit', mods: [
      { name: 'of the Lynx', tier: 'S2', magnitudes: [{ min: '43', max: '53' }] },
      { name: 'Hybrid', tier: 'P5', magnitudes: [{ min: '1', max: '8' }] }
    ] }
    // 53 and 8 at 20% are 63 and 9: 72 is the top.
    expect(lines(belt('Quality (Attribute Modifiers)', [shared]))[0].quality).toBe(100)
  })

  it('raises only the prefix of a line shared by a prefix and a suffix', () => {
    const shared = { description: '+60 to maximum Life', domain: 'explicit', mods: [
      { name: 'Fecund', tier: 'P2', magnitudes: [{ min: '40', max: '49' }] },
      { name: 'of Life', tier: 'S1', magnitudes: [{ min: '5', max: '10' }] }
    ] }
    // 48-58 raised plus 5-10: 53-68.
    expect(lines(belt('Quality (Prefix Modifiers)', [shared]))[0].quality).toBe(46)
  })

  it('falls back to the shown range when the raised one does not fit', () => {
    const str = { description: '+44 to Strength', domain: 'explicit', mods: [{ magnitudes: [{ min: '40', max: '55' }] }] }
    const [line] = lines(belt('Quality (Attribute Modifiers)', [str]))
    expect(text(line)).toBe('+44(40-55) to Strength')
    expect(line.quality).toBe(26)
  })

  it('leaves lines that only name the catalyst kind in passing', () => {
    const minion = { description: 'Minions have +15% to all Elemental Resistances', mods: [{ magnitudes: [{ min: '10', max: '20' }] }] }
    expect(listingDetail(belt('Quality (Resistance Modifiers)', [], [minion])).implicits[0].quality).toBe(50)
    const suppress = { description: '+10% chance to Suppress Spell Damage', domain: 'explicit', mods: [{ name: 'A', tier: 'S1', magnitudes: [{ min: '8', max: '12' }] }] }
    expect(lines(belt('Quality (Caster Modifiers)', [suppress]))[0].quality).toBe(50)
  })
})
