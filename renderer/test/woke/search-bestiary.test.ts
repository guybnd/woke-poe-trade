// Search palette Blood Altar recipes, on the real table from poedb.
import { describe, it, expect } from 'vitest'
import { beastsCost, bestiaryLookup, denOf, recipeNeeds, recipeTitle, recipesMaking, recipesWith } from '@/web/woke/search/lookups/bestiary'
import type { BestiaryData } from '@/web/woke/search/lookups/bestiary'
import type { LookupContext } from '@/web/woke/search/lookups/types'
import { foldAccents } from '@/web/woke/search/search'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const data = JSON.parse(readFileSync(join(__dirname, '../../public/data/bestiary-data.json'), 'utf8')) as BestiaryData
const PRICES: Record<string, number> = {
  'Farrul, First of the Plains': 22,
  'Black Mórrigan': 140,
  'Farric Tiger Alpha': 8,
  "Farrul's Fur": 101
}
const price = (n: string) => PRICES[n] ?? null
const ctx: LookupContext = { price, items: [], tools: new Set(), divine: 55, now: 0, league: null }
const lookup = bestiaryLookup(data)
const names = (q: string) => lookup(q, ctx).map(c => c.name)

describe('bestiary data', () => {
  it('holds the altar recipes and the four dens', () => {
    expect(data.recipes.length).toBeGreaterThan(60)
    expect(Object.keys(data.dens).sort()).toEqual(['Craiceann', 'Farrul', 'Fenumus', 'Saqawal'])
    expect(data.dens.Farrul).toContain("Farrul's Fur")
    for (const r of data.recipes) expect(r.b.length + r.a + (r.red ?? 0)).toBe(4)
    // Flask mods want one red beast plus any three rare ones.
    const flask = data.recipes.filter(r => /Flask/.test(r.g))
    expect(flask).toHaveLength(11)
    for (const r of flask) expect([r.red, r.a, recipeNeeds(r)]).toEqual([1, 3, '1 red beast + 3 any rare'])
  })
})

describe('recipes', () => {
  it('lists a beast\'s recipes', () => {
    const list = recipesWith(data, 'Farrul, First of the Plains').map(recipeTitle)
    expect(list).toEqual(['Aspect of the Cat skill', 'Level 30 Aspect of the Cat skill'])
  })
  it('names results shortly', () => {
    const titles = data.recipes.map(recipeTitle)
    expect(titles).toContain('Unique Ring')
    expect(titles).toContain("Portal to Farrul's Den")
    expect(titles).toContain("4 Jeweller's Orbs")
    expect(titles).toContain('Fracture two mods on a Rare Talisman with at least 6 modifiers')
  })
  it('leads a den\'s unique back to its portal', () => {
    const [rec] = recipesMaking(data, "Farrul's Fur")
    expect(rec.b).toEqual(['Farric Tiger Alpha'])
    expect(denOf(data, rec)?.boss).toBe('Farrul')
    expect(recipesMaking(data, 'Headhunter')).toEqual([])
  })
  it('costs the named beasts only, and only when all are priced', () => {
    const lvl30 = recipesWith(data, 'Black Mórrigan').find(r => r.b.includes('Farrul, First of the Plains'))!
    expect(beastsCost(lvl30, price)).toBe(162)
    expect(recipeNeeds(lvl30, 'Black Mórrigan')).toBe('Farrul + 2 any rare')
    const lynx = data.recipes.find(r => r.b.includes('Farric Lynx Alpha'))!
    expect(beastsCost(lynx, price)).toBeNull()
  })
})

describe('bestiaryLookup', () => {
  it('finds recipes by what they make', () => {
    expect(names('unique ring')).toEqual(['Unique Ring'])
    expect(names('aspect cat')).toEqual(['Aspect of the Cat skill', 'Level 30 Aspect of the Cat skill'])
    expect(names('6 link')).toContain('Fully-linked Six-socket Rare')
    expect(names('fracture')).toHaveLength(2)
  })
  it('finds recipes by a beast, results first', () => {
    const list = names('farr')
    expect(list.length).toBeLessThanOrEqual(8)
    expect(list).toContain("Portal to Farrul's Den")
  })
  it('stays quiet on short or hint-only queries', () => {
    expect(names('fa')).toEqual([])
    expect(names('bestiary')).toEqual([])
    expect(bestiaryLookup(null)('farr', ctx)).toEqual([])
  })
  it('gives each beast a trade search, and a den its drops', () => {
    const card = lookup("portal farrul's den", ctx)[0]
    expect(card.group).toBe('Blood Altar')
    expect(card.actions[0]).toEqual({ label: 'Trade: Farric Tiger Alpha', trade: 'Farric Tiger Alpha' })
    const beasts = card.sections[1].rows!
    expect(beasts[0]).toMatchObject({ label: 'Farric Tiger Alpha', chaos: 8, action: { trade: 'Farric Tiger Alpha' } })
    expect(beasts[1]).toMatchObject({ label: '3 any rare beasts', dim: true })
    expect(card.sections[2].label).toBe('Farrul drops')
    expect(card.sections[2].rows!.find(r => r.label === "Farrul's Fur")?.chaos).toBe(101)
  })
})

describe('accents', () => {
  it('finds Black Mórrigan typed without the accent', () => {
    expect(names('black morrigan').length).toBeGreaterThan(0)
    expect(foldAccents('Black Mórrigan')).toBe('Black Morrigan')
    expect(foldAccents('Ёжик')).toBe('Ёжик')
  })
})
