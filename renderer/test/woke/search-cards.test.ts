// Search palette div card set value.
import { describe, it, expect } from 'vitest'
import { cardLookup, parseReward, plainLine } from '@/web/woke/search/lookups/cards'
import type { CardInfo } from '@/web/woke/search/lookups/cards'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const CARDS = new Map<string, CardInfo>([
  ['The Doctor', { stack: 8, lines: ['<uniqueitem>{Headhunter}'] }],
  ['Abandoned Wealth', { stack: 5, lines: ['<currencyitem>{3x Exalted Orb}'] }],
  ['A Chilling Wind', { stack: 4, lines: ['<gemitem>{Level 21 Vaal Cold Snap}', '<default>{Quality:} <augmented>{+20%}', '<corrupted>{Corrupted}'] }],
  ['A Mother\'s Parting Gift', { stack: 6, lines: ['<uniqueitem>{Fertile Mind}', '<corrupted>{Corrupted}'] }]
])
const PRICES: Record<string, number> = { 'The Doctor': 1000, 'Headhunter': 9000, 'Abandoned Wealth': 20, 'Exalted Orb': 30, 'A Chilling Wind': 5, "A Mother's Parting Gift": 1 }
const ctx: LookupContext = {
  price: (n, v) => v === '21/20c' && n === 'Vaal Cold Snap' ? 50 : v ? null : PRICES[n] ?? null,
  items: [],
  tools: new Set(),
  divine: 200,
  now: 0,
  league: null
}
const lookup = cardLookup(CARDS)

describe('parseReward', () => {
  it('reads uniques, stacks of currency and gem levels', () => {
    expect(parseReward(['<uniqueitem>{Headhunter}'])).toMatchObject({ name: 'Headhunter', qty: 1, priceable: true })
    expect(parseReward(['<currencyitem>{3x Exalted Orb}'])).toMatchObject({ name: 'Exalted Orb', qty: 3, priceable: true })
    expect(parseReward(CARDS.get('A Chilling Wind')!.lines)).toMatchObject({ name: 'Vaal Cold Snap', variant: '21/20c', priceable: true })
  })
  it("won't price rewards with rolls", () => {
    expect(parseReward(CARDS.get("A Mother's Parting Gift")!.lines)!.priceable).toBe(false)
    expect(parseReward(['<rareitem>{Item}', '<default>{Item Level:} <normal>{100}'])!.priceable).toBe(false)
  })
  it('names gems as poe.ninja does', () => {
    expect(parseReward(['<gemitem>{Level 21 Vaal Summon Skeletons}', '<corrupted>{Corrupted}'])!.variant).toBe('21c')
    expect(parseReward(['<gemitem>{Level 4 Awakened Empower Support}', '<corrupted>{Corrupted}'])!.variant).toBe('4c')
  })
  it('only prices real items, not stand-ins or rolled uniques', () => {
    const known = (ns: string, name: string) => !['Jewel', 'Currency'].includes(name)
    expect(parseReward(['<uniqueitem>{Jewel}'], known)!.priceable).toBe(false)
    expect(parseReward(['<currencyitem>{Currency}'], known)!.priceable).toBe(false)
    expect(parseReward(["<uniqueitem>{Watcher's Eye}"], known)!.priceable).toBe(false)
  })
  it('reads big stacks and size wrappers', () => {
    expect(parseReward(['<currencyitem>{1,500x Vivid Crystallised Lifeforce}'])).toMatchObject({ name: 'Vivid Crystallised Lifeforce', qty: 1500 })
    expect(parseReward(['<size:26>{<uniqueitem>{Mageblood}}'])).toMatchObject({ name: 'Mageblood', priceable: true })
    expect(plainLine('<brequelmutated> {Foulborn}')).toBe('Foulborn')
  })
  it('drops tags and links from text', () => {
    expect(plainLine('<default>{Quality:} <augmented>{+20%}')).toBe('Quality: +20%')
    expect(plainLine('Area contains an [ContainsAbyss|Abyss]')).toBe('Area contains an Abyss')
  })
})

describe('cardLookup', () => {
  it('compares the set with the reward', () => {
    const [card] = lookup('the doctor', ctx)
    expect(card.name).toBe('The Doctor: turning in a set gains 5 div')
    expect(lookup('abandoned', ctx)[0].name).toBe('Abandoned Wealth: buying the reward is 10 c cheaper')
    expect(lookup('chilling', ctx)[0].name).toBe('A Chilling Wind: turning in a set gains 30 c')
  })
  it('finds the cards that turn into an item', () => {
    expect(lookup('headhunter', ctx).map(c => c.title)).toEqual(['The Doctor'])
    expect(lookup('ex', ctx)).toEqual([])
  })
  it('says when the reward has no fixed price', () => {
    const [card] = lookup('mothers parting', ctx)
    expect(card.name).toBe("A Mother's Parting Gift: no price to compare")
  })
})
