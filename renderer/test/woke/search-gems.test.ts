// Search palette: where to get a gem in the campaign.
import { describe, it, expect } from 'vitest'
import { classList, gemCard, gemLookup } from '@/web/woke/search/lookups/gems'
import type { GemTable } from '@/web/woke/search/lookups/gems'
import raw from '@/web/woke/pob-builds/gem-sources.json'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const table = raw as unknown as GemTable
const ctx = {} as LookupContext

describe('classList', () => {
  it('names classes, or says every class', () => {
    expect(classList('1111111')).toBe('Every class')
    expect(classList('0111111')).toBe('Every class but Duelist')
    expect(classList('0101000')).toBe('Marauder, Scion')
  })
})

describe('gemCard', () => {
  it('lists quest rewards and vendors with their classes', () => {
    const card = gemCard('Fireball', table)!
    const reward = card.sections.find(s => s.label === 'Quest reward (free)')
    expect(reward).toBeUndefined()
    const sold = card.sections.find(s => s.label === 'Sold by')!.rows!
    expect(sold[0]).toEqual({ label: 'Act 1 · Nessa, after Enemy at the Gate', value: 'Every class but Duelist and Ranger' })
    expect(gemCard('Leap Slam', table)!.sub).toBe('Reward, Act 1')
  })
  it('sends transfigured gems to the Divine Font', () => {
    const card = gemCard('Ice Nova of Frostbolts', table)!
    expect(card.sub).toBe('Transfigured gem')
    expect(card.sections[1].text![0]).toMatch(/Divine Font/)
  })
})

describe('Vaal gems', () => {
  it('say to corrupt the base gem', () => {
    expect(gemCard('Vaal Fireball', table)!.sections.at(-1)!.text![0]).toMatch(/corrupt a Fireball with a Vaal Orb/)
  })
})

describe('gemLookup', () => {
  it('needs four letters and stays off unknown names', () => {
    const lookup = gemLookup(table, ['Fireball', 'Ice Nova', 'Ice Nova of Frostbolts'])
    expect(lookup('fire', ctx).map(c => c.title)).toEqual(['Fireball'])
    expect(lookup('ice nova', ctx).map(c => c.title)).toEqual(['Ice Nova', 'Ice Nova of Frostbolts'])
    expect(lookup('ice', ctx)).toEqual([])
    expect(gemLookup(table, ['Arc', 'Arcane Surge Support'])('arc', ctx).map(c => c.title)).toEqual(['Arc'])
    expect(gemLookup(null, ['Fireball'])('fireball', ctx)).toEqual([])
  })
})
