// A card tooltip's set against its reward and its likeliest maps (tooltip
// audit pick I4), on the real tooltip and card drop data.
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { cardExtraSections, cardReward } from '@/web/woke/ui/tooltip/card-tip-extras'
import { cardDropFacts } from '@/web/woke/card-drops/card-drops'
import type { TipLine } from '@/web/woke/ui/tooltip/tip-content'

const read = (f: string) => JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/data', f), 'utf8'))
const items = read('tips/items.json')
const drops = read('card-drops.json')
const text = (s: TipLine[][]) => s.flat().map(l => l.map(p => p.text).join(''))
const fmt = (c: number) => `${c}c`

describe('card reward', () => {
  it('reads a unique, a currency stack and a card', () => {
    expect(cardReward(items['The Apothecary'])).toEqual({ name: 'Mageblood', ns: 'UNIQUE', count: 1 })
    expect(cardReward(items['The Fiend'])).toEqual({ name: 'Headhunter', ns: 'UNIQUE', count: 1 })
    expect(cardReward(items['Abandoned Wealth'])).toEqual({ name: 'Exalted Orb', ns: 'ITEM', count: 3 })
    expect(cardReward(items['The Nurse'])).toEqual({ name: 'The Doctor', ns: 'DIVINATION_CARD', count: 1 })
    expect(cardReward({ d: '<currencyitem>{1,500x Vivid Crystallised Lifeforce}', n: 2 })).toEqual({ name: 'Vivid Crystallised Lifeforce', ns: 'ITEM', count: 1500 })
  })
  it('prices no gem or random item', () => {
    expect(cardReward(items['A Chilling Wind'])).toBeNull()
    expect(cardReward(items['Dark Dreams'])).toBeNull()
  })
})

describe('card tooltip extras', () => {
  it('sets the set against the reward', () => {
    const lines = text(cardExtraSections('Abandoned Wealth', items['Abandoned Wealth'], null, { card: 20, reward: () => 100, format: fmt }))
    expect(lines).toContain(`Set of ${items['Abandoned Wealth'].n}: ${20 * items['Abandoned Wealth'].n}c · reward 300c · ${Math.round((300 / (20 * items['Abandoned Wealth'].n) - 1) * 100) > 0 ? '+' : '−'}${Math.abs(Math.round((300 / (20 * items['Abandoned Wealth'].n) - 1) * 100))}%`)
  })
  it('names the maps it is likeliest in, at most three', () => {
    const card = Object.keys(drops.cards).find(c => (drops.cards[c].m?.length ?? 0) >= 4 && !drops.cards[c].x && drops.cards[c].w)!
    const lines = text(cardExtraSections(card, items[card], { data: drops, facts: cardDropFacts(drops, card)! }, { card: null, reward: () => null, format: fmt }))
    const maps = lines.find(l => l.startsWith('Likeliest in '))!
    expect(maps.split(' · ').length).toBeLessThanOrEqual(3)
    expect(maps).toMatch(/1 in /)
  })
  it('adds no price line without both prices', () => {
    expect(cardExtraSections('The Apothecary', items['The Apothecary'], null, { card: null, reward: () => 100, format: fmt })).toEqual([])
  })
})
