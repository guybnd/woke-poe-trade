import { describe, expect, it } from 'vitest'
import type { BaseType } from '@/assets/data/interfaces'
import { itemRefFromText } from '@/web/woke/ui/tooltip/item-text-ref'

const entry = (extra: Partial<BaseType> = {}) => [extra as BaseType]
const DATA: Record<string, Record<string, BaseType[]>> = {
  UNIQUE: {
    'Dying Sun': entry({ unique: { base: 'Ruby Flask' } as BaseType['unique'] }),
    "Kitava's Thirst": entry({ unique: { base: 'Zealot Helmet' } as BaseType['unique'] })
  },
  GEM: { 'Empower Support': entry() },
  DIVINATION_CARD: { 'The Doctor': entry() },
  ITEM: { 'Ruby Flask': entry(), 'Titan Greaves': entry(), 'Chaos Orb': entry(), 'Zealot Helmet': entry() }
}
const lookup = (ns: BaseType['namespace'], name: string) => DATA[ns]?.[name]
const ref = (text: string) => itemRefFromText(text, lookup)

describe('itemRefFromText', () => {
  it('reads a unique from its name and base', () => {
    expect(ref('Dying Sun Ruby Flask')).toEqual({ name: 'Dying Sun' })
    expect(ref("Foulborn Kitava's Thirst Zealot Helmet")).toEqual({ name: "Foulborn Kitava's Thirst" })
  })
  it('reads the name and base a whisper puts a comma between', () => {
    expect(ref('Dying Sun, Ruby Flask')).toEqual({ name: 'Dying Sun' })
    expect(ref("Foulborn Kitava's Thirst, Zealot Helmet")).toEqual({ name: "Foulborn Kitava's Thirst" })
    expect(ref('Doom Fang, Titan Greaves')).toEqual({ name: 'Titan Greaves' })
    expect(ref('Dying Sun, Titan Greaves')).toEqual({ name: 'Titan Greaves' })
  })
  it('reads the trade site name split over lines', () => {
    expect(ref('Dying Sun\nRuby Flask')).toEqual({ name: 'Dying Sun' })
  })
  it('reads a gem with its level and quality', () => {
    expect(ref('level 21 20% Empower Support')).toEqual({ name: 'Empower Support', type: 'SkillGem', variant: '21/20' })
    expect(ref('level 4 Empower Support')).toEqual({ name: 'Empower Support', type: 'SkillGem', variant: '4' })
  })
  it('falls back to the base of a rare', () => {
    expect(ref('Doom Fang Titan Greaves')).toEqual({ name: 'Titan Greaves' })
  })
  it("doesn't take a rare named like a unique for that unique", () => {
    expect(ref('Dying Sun Titan Greaves')).toEqual({ name: 'Titan Greaves' })
  })
  it('takes a whole name as it is', () => {
    expect(ref('Chaos Orb')).toEqual({ name: 'Chaos Orb' })
    expect(ref('The Doctor')).toEqual({ name: 'The Doctor' })
    expect(ref('Dying Sun')).toEqual({ name: 'Dying Sun' })
  })
  it('gives nothing for text that names no item', () => {
    expect(ref('')).toBeNull()
    expect(ref('Some Saved Search')).toBeNull()
  })
})
