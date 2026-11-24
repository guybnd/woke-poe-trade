// What the price check's side list says an item is made from or makes: vendor
// recipes, upgrades, combines, splinters; card rewards and fragment sets.
import { describe, it, expect, beforeAll } from 'vitest'
import { ITEM_BY_REF, ITEM_DROP } from '@/assets/data'
import { cardsFor, isFragmentSet, realDrops, recipeBook, recipesOf, recipeSum, recipeTitle, resetRecipeCache, resolveParts } from '@/web/woke/related-family/recipe'
import { loadGameData } from '../helpers/game-data'

beforeAll(async () => { await loadGameData(); resetRecipeCache() })

const find = (name: string) => ITEM_BY_REF('UNIQUE', name)?.[0] ?? ITEM_BY_REF('ITEM', name)?.[0]
const book = () => recipeBook(find, ITEM_DROP)
const of = (name: string) => recipesOf(name, book())
const names = (name: string) => of(name).map(r => [recipeTitle(r), r.parts.map(p => `${p.qty > 1 ? `${p.qty} ` : ''}${p.info.refName}`)])

describe('recipes', () => {
  it('lists the Lost Unity rings for one of them', () => {
    expect(names('The Will of Uul-Netol')).toEqual([
      ['Lost Unity recipe', ['The Will of Xoph', 'The Will of Tul', 'The Will of Esh', 'The Will of Uul-Netol', 'The Sundered Will']]
    ])
  })

  it('finds a vendor recipe from what it makes, with currency parts', () => {
    expect(names('The Retch')).toEqual([['The Retch recipe', ['Faminebind', 'Feastbind', 'Orb of Fusing']]])
  })

  it('lists nothing for a part in many recipes', () => {
    expect(of('Orb of Fusing')).toEqual([])
    expect(of('Flesh of Xesht')).toEqual([])
  })

  it('leaves out recipes whose parts are not named items', () => {
    const made = book().list.map(r => r.makes.refName)
    expect(made).not.toContain('Loreweave')
    expect(made).not.toContain('The Goddess Scorned')
    expect(made).toEqual(expect.arrayContaining(['Kingmaker', 'Arborix', 'Duskdawn', 'Magna Eclipsis', 'The Taming', 'The Anima Stone', 'Reclaimed Malevolence']))
  })

  it('pairs each Breach unique with its Flesh of Xesht upgrade', () => {
    expect(names("Xoph's Inception")).toEqual([["Upgrade to Xoph's Nurture", ["Xoph's Inception", 'Flesh of Xesht']]])
    expect(names('Skin of the Lords')).toEqual([['Upgrade to Skin of the Lords', ['Skin of the Loyal', 'Flesh of Xesht']]])
    expect(names("Uul-Netol's Kiss")).toEqual([["Upgrade to Uul-Netol's Embrace", ["Uul-Netol's Kiss", 'Flesh of Xesht']]])
  })

  it('reads vial, scroll, piece and curio upgrades from the drop groups', () => {
    expect(names('Vial of Awakening')).toEqual([["Upgrade to Apep's Supremacy", ["Apep's Slumber", 'Vial of Awakening']]])
    expect(names('Transcendent Mind')).toEqual([['Upgrade to Transcendent Mind', ['Tempered Mind', 'Vial of Transcendence']]])
    // One vial, three upgrades from one group: still listed for the vial.
    expect(names('Vial of Transcendence').map(n => n[0])).toEqual(['Upgrade to Transcendent Flesh', 'Upgrade to Transcendent Spirit', 'Upgrade to Transcendent Mind'])
    // The assembled Harbinger uniques left the game in 3.28: their pieces list nothing.
    expect(of('First Piece of Time')).toEqual([])
    expect(names('Curio of Potential')).toEqual([['Combine into The Utmost', ['Curio of Absorption', 'Curio of Consumption', 'Curio of Decay', 'Curio of Potential']]])
    // Those groups are recipes, not drops.
    expect([...book().used].some(g => g.query.some(q => q.includes('Vial of Awakening')))).toBe(true)
  })

  it('combines splinters into the whole', () => {
    expect(names('Simulacrum Splinter')).toEqual([['Combine into Simulacrum', ['300 Simulacrum Splinter']]])
    expect(names('Timeless Karui Splinter').map(n => n[0])).toEqual(['Lethal Pride recipe', 'Combine into Timeless Karui Emblem'])
    expect(names("The Maven's Writ")).toEqual([["Combine into The Maven's Writ", ['10 Crescent Splinter']]])
    expect(names('Timeless Eternal Emblem')).toEqual([['Combine into Timeless Eternal Emblem', ['100 Timeless Eternal Empire Splinter']]])
  })

  it("takes any Mountain, Valley and Meadow ring for Precursor's Emblem", () => {
    const [r] = of("Putembo's Valley")
    expect(r.makes.refName).toBe("Precursor's Emblem")
    const prices: Record<string, number> = { "Ahkeli's Mountain": 9, "Uzaza's Mountain": 4, "Uzaza's Meadow": 2 }
    const parts = resolveParts(r, "Putembo's Valley", info => prices[info.refName] ?? null)
    expect(parts.map(p => [p.label, p.info.refName])).toEqual([
      ['Any Mountain ring', "Uzaza's Mountain"], ['Any Valley ring', "Putembo's Valley"], ['Any Meadow ring', "Uzaza's Meadow"]
    ])
  })

  it('sums the priced parts and counts the rest', () => {
    const [r] = of('Kingmaker')
    const prices: Record<string, number> = { 'Soul Taker': 100, 'Orb of Fusing': 0.5, 'Kingmaker': 300 }
    expect(recipeSum(r.parts, r.makes, info => prices[info.refName] ?? null)).toEqual({ parts: 100.5, missing: 1, makes: 300 })
  })
})

describe('card rewards and sets', () => {
  const tips = {
    'The Doctor': { d: '<uniqueitem>{Headhunter}', n: 8 },
    'The Fiend': { d: '<uniqueitem>{Headhunter}\r\n<corrupted>{Corrupted}', n: 11 },
    'A Chilling Wind': { d: '<gemitem>{Level 21 Vaal Cold Snap}\r\n<default>{Quality:} <augmented>{+20%}', n: 4 },
    'The Nurse': { d: '<divination>{The Doctor}', n: 8 },
    'Mirror of Kalandra': { d: 'a currency, not a card' },
    'The Encroaching Darkness': { d: '<uniqueitem>{Map}\r\n<corrupted>{Corrupted}', n: 8 },
    "Lysah's Respite": { d: '<uniqueitem>{Agate Amulet}', n: 6 },
    'House of Mirrors': { d: '<currencyitem>{Mirror of Kalandra}', n: 9 }
  }
  it('finds the cards whose reward is the item', () => {
    expect(cardsFor({ refName: 'Headhunter', namespace: 'UNIQUE' }, tips)).toEqual([
      { card: 'The Doctor', stack: 8, corrupted: false },
      { card: 'The Fiend', stack: 11, corrupted: true }
    ])
    expect(cardsFor({ refName: 'Vaal Cold Snap', namespace: 'GEM' }, tips)).toEqual([])
    expect(cardsFor({ refName: 'Mirror of Kalandra', namespace: 'ITEM' }, tips)).toEqual([{ card: 'House of Mirrors', stack: 9, corrupted: false }])
  })
  it('leaves out cards that give a random item of that kind', () => {
    // A map is checked as "Map": The Encroaching Darkness gives any unique map.
    expect(cardsFor({ refName: 'Map', namespace: 'ITEM' }, tips)).toEqual([])
    // A rare Agate Amulet isn't the unique one Lysah's Respite gives.
    expect(cardsFor({ refName: 'Agate Amulet', namespace: 'ITEM' }, tips)).toEqual([])
  })
  it('knows the fragment sets', () => {
    const sets = ITEM_DROP.filter(isFragmentSet).map(g => g.query[0])
    expect(sets).toEqual(['ITEM::Sacrifice at Dawn', 'ITEM::Mortal Ignorance', 'ITEM::Fragment of the Minotaur', 'ITEM::Fragment of Eradication', 'ITEM::Fragment of Knowledge', "ITEM::Al-Hezmin's Crest"])
  })
  it("doesn't call Harvest, oil or Eldritch groups drops", () => {
    const into = (name: string) => ITEM_DROP.filter(g => realDrops(g).includes(`ITEM::${name}`))
    // Primal lifeforce doesn't drop from corrupted essences (poedb), and
    // Delirium Orbs, fossils and oils don't drop from lifeforce.
    expect(into('Primal Crystallised Lifeforce')).toEqual([])
    for (const n of ["Diviner's Delirium Orb", 'Fractured Fossil', 'Reflective Oil', 'Lesser Eldritch Ichor', 'Lesser Eldritch Ember', 'Timeless Karui Emblem', 'Perfect Forest Tiger']) expect(into(n)).toEqual([])
    // Orb of Conflict still drops from The Maven's group.
    // The King in the Mists still drops his uniques.
    expect(into('Pragmatism').length + ITEM_DROP.filter(g => realDrops(g).some(id => id.startsWith('UNIQUE::Pragmatism'))).length).toBeGreaterThan(0)
    expect(into('Orb of Conflict').map(g => g.query[0])).toEqual(['ITEM::Crescent Splinter'])
  })
})
