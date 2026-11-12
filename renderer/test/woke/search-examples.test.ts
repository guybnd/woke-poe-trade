// Things to try in the search palette: Guy's picks, and each one answers.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { EXAMPLES, exampleCards } from '@/web/woke/search/lookups/examples'
import { recipeLookup } from '@/web/woke/search/lookups/recipes'
import { countdownLookup, currencyLookup } from '@/web/woke/search/lookups/answers'
import { dropLookup } from '@/web/woke/search/lookups/bosses'
import { keystoneUniques, passiveList, treeLookup } from '@/web/woke/search/lookups/tree'
import type { LookupContext } from '@/web/woke/search/lookups/types'

const ctx: LookupContext = {
  price: n => ({ 'Chaos Orb': 1, 'Divine Orb': 200, 'Mirror of Kalandra': 100000 } as Record<string, number>)[n] ?? null,
  items: [],
  tools: new Set(),
  divine: 200,
  now: Date.UTC(2026, 10, 12),
  league: null
}
const DATA = join(__dirname, '../../public/data')

describe('exampleCards', () => {
  it('turns each example into a card that searches it', () => {
    const cards = exampleCards()
    expect(cards.map(c => c.name)).toEqual(EXAMPLES.map(e => e.query))
    expect(cards[0].actions[0]).toEqual({ label: 'Search "mageblood"', search: 'mageblood' })
    expect(cards.at(-1)!.actions[0]).toEqual({ label: 'Type anything', search: '' })
  })
  it('shows the live answer where it has one', () => {
    const cards = exampleCards(q => q === '1 mirror in div' ? '1 Mirror of Kalandra = 500 Divine Orb' : null)
    expect(cards.find(c => c.name === '1 mirror in div')!.sub).toBe('1 Mirror of Kalandra = 500 Divine Orb')
    expect(cards.find(c => c.name === 'mageblood')!.sub).toBe('Price per flask count; 24h and 7d change')
  })
  it('only suggests searches that answer', () => {
    expect(currencyLookup(['Divine Orb', 'Mirror of Kalandra'])('1 mirror in div', ctx)).toHaveLength(1)
    expect(countdownLookup('lab reset', ctx)).toHaveLength(1)
    expect(dropLookup('awakened enlighten', ctx)).toHaveLength(1)
    expect(recipeLookup('rustic sash', ctx)[0].title).toBe('Weapon with 40% to 84% physical damage')
  })
})

describe('keystoneUniques', () => {
  const tree = JSON.parse(readFileSync(join(DATA, 'tree/passive-tree.json'), 'utf8'))
  const uniques = JSON.parse(readFileSync(join(DATA, 'tips/uniques.json'), 'utf8'))
  const passives = passiveList((tree.nodes as Array<[number, number, number, string, string, string[]]>).map(n => ({ kind: n[3], name: n[4], stats: n[5] })), tree.clusters.named)
  const grants = keystoneUniques(uniques, passives.filter(p => p.kind === 'Keystone').map(p => p.name))
  it('finds uniques that grant a keystone', () => {
    expect(grants.get('Resolute Technique')).toContain('Augyre')
    expect(grants.get('Pain Attunement')).toContain('Crown of Thorns')
    expect(grants.get('Iron Reflexes')).toEqual(expect.arrayContaining(['Arborix', 'Grelwood Shank']))
  })
  it('leaves out jewel radius, "cannot be used with" and minion lines', () => {
    expect(grants.get('Chaos Inoculation') ?? []).not.toContain('Midnight Bargain')
    expect(Object.values(Object.fromEntries(grants)).flat()).not.toContain('Impossible Escape')
    expect(grants.get('Avatar of Fire') ?? []).not.toContain("Earendel's Embrace")
  })
  it('puts them on the keystone card', () => {
    const [card] = treeLookup(passives, grants)('resolute technique', ctx)
    expect(card.sections[1].label).toBe('Uniques that grant it')
    expect(card.sections[1].rows!.map(r => r.label)).toContain('Augyre')
  })
})
