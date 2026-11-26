// The price check side list's unique info: Foulborn kinds priced against a
// plain copy, the Vestigial mod, and where an item's Vestigial implicit comes
// from, on the shipped tooltip data.
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { foulKindQuery, itemLine, statMatchTexts, uniqueInfo, vestigialLines, vestigialSources } from '@/web/woke/related-family/unique-info'
import type { TipUnique } from '@/web/woke/ui/tooltip/tip-content'

const read = (f: string) => JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/data/tips', f), 'utf8'))
const uniques: Record<string, TipUnique> = { ...read('unique-extras.json'), ...read('uniques.json') }
const vestigial: Record<string, string[][]> = read('vestigial.json')
const base = { uniques, vestigial, foulPrices: [], plain: null, rawText: '', foulborn: false }

describe('unique info', () => {
  it('Carcass Jack: two Foulborn kinds, each with the mod it gives up, priced against a plain copy', () => {
    const info = uniqueInfo({ ...base, name: 'Carcass Jack', foulPrices: [{ variant: 'Aura Effect', chaos: 400 }], plain: 200 })!
    const aura = info.foulborn.find(k => k.name === 'Aura Effect')!
    expect(aura.adds).toEqual(['(15-30)% increased Effect of Non-Curse Auras from your Skills on Enemies'])
    expect(aura.replaces).toEqual(['(40-50)% increased Area Damage'])
    expect(aura.chaos).toBe(400)
    expect(aura.ratio).toBe(2)
    const intensify = info.foulborn.find(k => k.name === 'Intensify')!
    expect(intensify.replaces).toEqual(['(40-50)% increased Area of Effect'])
    expect(intensify.chaos).toBeNull()
    expect(info.vestigial).toEqual([['25% increased Area of Effect']])
    expect(info.foulborn.some(k => k.own)).toBe(false)
  })

  it('a Foulborn copy with a rolled mod marks its own kind', () => {
    expect(itemLine('22(15-30)% increased Effect of Non-Curse Auras from your Skills on Enemies')).toBe('(15-30)% increased Effect of Non-Curse Auras from your Skills on Enemies')
    const rawText = [
      'Rarity: Unique', 'Foulborn Carcass Jack', 'Varnished Coat', '--------',
      '{ Foulborn Unique Modifier }', '22(15-30)% increased Effect of Non-Curse Auras from your Skills on Enemies',
      '{ Unique Modifier }', '45(40-50)% increased Area of Effect'
    ].join('\n')
    const info = uniqueInfo({ ...base, name: 'Carcass Jack', foulborn: true, rawText })!
    expect(info.foulborn.filter(k => k.own).map(k => k.name)).toEqual(['Aura Effect'])
  })

  it('a Vestigial implicit with a keyword reminder still names its unique', () => {
    const rawText = ['{ Vestigial Implicit Modifier }', '+250 to maximum Life if there are no Life Modifiers on other Equipped Items (implicit)', '(Some reminder text)', '--------'].join('\n')
    expect(vestigialLines(rawText)).toEqual(['+250 to maximum Life if there are no Life Modifiers on other Equipped Items'])
  })

  it('a Foulborn copy marks its own kind', () => {
    const rawText = [
      'Rarity: Unique', 'Foulborn Carcass Jack', 'Varnished Coat', '--------',
      '{ Foulborn Unique Modifier }', 'Socketed Gems are Supported by Level 20 Intensify',
      '{ Unique Modifier }', '45% increased Area of Effect'
    ].join('\n')
    const info = uniqueInfo({ ...base, name: 'Carcass Jack', foulborn: true, rawText })!
    expect(info.foulborn.filter(k => k.own).map(k => k.name)).toEqual(['Intensify'])
  })

  it("an item's Vestigial implicit names the unique it comes from", () => {
    const rawText = [
      'Rarity: Unique', 'Kaom\'s Heart', 'Glorious Plate', '--------',
      '{ Vestigial Implicit Modifier — Life }', '+250 to maximum Life if there are no Life Modifiers on other Equipped Items (implicit)',
      '--------', '{ Unique Modifier }', '+1000 to maximum Life'
    ].join('\n')
    expect(vestigialLines(rawText)).toEqual(['+250 to maximum Life if there are no Life Modifiers on other Equipped Items'])
    const info = uniqueInfo({ ...base, name: "Kaom's Heart", rawText })!
    expect(info.vestigialFrom).toEqual(["Utula's Hunger"])
  })

  it('a Vestigial mod many uniques leave names none', () => {
    expect(vestigialSources(['20% to Item Rarity'], vestigial, 'X')).toEqual([])
  })

  it('a unique with nothing to add gives nothing', () => {
    expect(uniqueInfo({ ...base, name: 'Not A Unique' })).toBeNull()
  })

  it("a Foulborn kind's trade search: Foulborn copies with its mods", () => {
    expect(statMatchTexts('+(50-75)% to Damage over Time Multiplier for Bleeding')).toEqual(['#% to Damage over Time Multiplier for Bleeding', '+#% to Damage over Time Multiplier for Bleeding'])
    expect(statMatchTexts('Socketed Gems are Supported by Level 20 Intensify')).toEqual(['Socketed Gems are Supported by Level # Intensify'])
    const q = foulKindQuery({ name: 'Abyssus', type: 'Ezomyte Burgonet' }, ['A line', 'B line\nC line'], l => l === 'A line' ? 'explicit.stat_1' : l === 'C line' ? 'explicit.stat_2' : null)
    expect(q).toEqual({
      name: 'Abyssus',
      type: 'Ezomyte Burgonet',
      stats: [{ type: 'and', filters: [{ id: 'explicit.stat_1' }, { id: 'explicit.stat_2' }] }],
      filters: { misc_filters: { filters: { foulborn_item: { option: 'true' } } } }
    })
  })
})
