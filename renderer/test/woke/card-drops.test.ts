// Where divination cards drop: the data script, the card's facts and the map
// lookup in Ctrl+Space.
import { describe, it, expect } from 'vitest'
import { cardChanceIn, cardDropFacts, cardPageUrl, cardsInMap, factLine, mapPool, mapTip, mapsByChance, mapsMatching, oneInText, rarityText, rarityWords, valuePerCardDrop } from '@/web/woke/card-drops/card-drops'
import type { CardDropData } from '@/web/woke/card-drops/card-drops'
import { mapCardsLookup } from '@/web/woke/search/lookups/card-drops'
import type { LookupContext } from '@/web/woke/search/lookups/types'
import { buildCardDrops, sourceText } from '../../scripts/build-card-drops.mjs'

const DATA: CardDropData = {
  season: '3.29',
  maps: { 'Waste Pool Map': 8, 'Burial Chambers Map': 6, 'Fields Map': 5, 'Pit of the Chimera Map': 16, 'Cortex': 0, 'The Coward\'s Trial': 0, 'Maelström of Chaos': 0 },
  cards: {
    'The Doctor': { m: ['Waste Pool Map', 'Burial Chambers Map'], l: 75, w: 120689 },
    'The Summoner': { m: ['Burial Chambers Map'], l: 68, w: 900 },
    'The Incantation': { m: ['Burial Chambers Map'], l: 68 },
    'Rain of Chaos': { m: ['Fields Map'], s: ['The Imperial Fields (Act 8)'], l: 23, w: 12 },
    'Birth of the Three': { m: ['Burial Chambers Map'], x: 1 },
    'House of Mirrors': { l: 80, w: 991491 },
    'A Dusty Memory': { m: ['Cortex'] }
  }
}
const PRICES: Record<string, number> = { 'The Doctor': 33, 'The Summoner': 2 }
const ctx: LookupContext = { price: n => PRICES[n] ?? null, items: [], tools: new Set(), divine: 200, now: 0, league: null }

describe('card drop facts', () => {
  it('lists maps by name with their tier, and the other sources', () => {
    const f = cardDropFacts(DATA, 'Rain of Chaos')!
    expect(f.maps).toEqual([{ name: 'Fields Map', label: 'Fields', tier: 5 }])
    expect(f.other).toEqual(['The Imperial Fields (Act 8)'])
    expect(factLine(f)).toBe('Area level 23+ · 1 in 12 cards')
  })
  it('says when a card no longer drops, and knows nothing of an unknown card', () => {
    expect(factLine(cardDropFacts(DATA, 'Birth of the Three')!)).toBe('No longer drops')
    expect(cardDropFacts(DATA, 'Not a card')).toBeNull()
    expect(cardDropFacts(null, 'The Doctor')).toBeNull()
  })
  it('writes rarity short', () => {
    expect(oneInText(12)).toBe('1 in 12')
    expect(oneInText(4300)).toBe('1 in 4,300')
    expect(oneInText(120689)).toBe('1 in 121k')
    expect(oneInText(1_234_000)).toBe('1 in 1.2M')
  })
  it('gives the short rarity for the price check and tooltip, none without a weight', () => {
    expect(rarityText(cardDropFacts(DATA, 'The Doctor'))).toBe('1 in 121k cards')
    expect(rarityText(cardDropFacts(DATA, 'Rain of Chaos'))).toBe('1 in 12 cards')
    expect(rarityText(cardDropFacts(DATA, 'The Incantation'))).toBeNull()
    expect(rarityText(cardDropFacts(DATA, 'Birth of the Three'))).toBeNull()
    expect(rarityText(null)).toBeNull()
    expect(rarityWords(120689)).toContain('1 in 121k of all divination cards')
  })
  it('links the card on divicards', () => {
    expect(cardPageUrl("The King's Heart")).toBe('https://divicards-site.pages.dev/card/the-king-s-heart')
  })
})

describe('cards in a map', () => {
  it('leaves out cards that no longer drop', () => {
    expect(cardsInMap(DATA, 'Burial Chambers Map').sort()).toEqual(['The Doctor', 'The Incantation', 'The Summoner'])
  })
  it('finds maps by the start of a word, not anywhere in the name', () => {
    expect(mapsMatching(DATA, 'burial')).toEqual(['Burial Chambers Map'])
    expect(mapsMatching(DATA, 'Burial Chambers Map')).toEqual(['Burial Chambers Map'])
    expect(mapsMatching(DATA, 'chimera')).toEqual(['Pit of the Chimera Map'])
    expect(mapsMatching(DATA, 'ield')).toEqual([])
    expect(mapsMatching(DATA, 'fi')).toEqual([])
  })
  it('finds a phrase from any word, without accents or a half-typed "map"', () => {
    expect(mapsMatching(DATA, "coward's trial")).toEqual(["The Coward's Trial"])
    expect(mapsMatching(DATA, 'maelstrom')).toEqual(['Maelström of Chaos'])
    expect(mapsMatching(DATA, 'waste pool ma')).toEqual(['Waste Pool Map'])
    // Short words only match a name's start: "the" isn't every "The ..." map.
    expect(mapsMatching(DATA, 'the')).toEqual(["The Coward's Trial"])
    expect(mapsMatching(DATA, 'cha')).toEqual([])
  })
  it("the map's tooltip lists its cards, dearest first", () => {
    const tip = mapTip(DATA, 'Burial Chambers Map', n => PRICES[n] ?? null, c => `${c} c`)
    expect(tip.model.base).toBe('Map Tier 6')
    expect(tip.model.sections[1].map(l => l[0].text)).toEqual(['The Doctor', 'The Summoner', 'The Incantation'])
    expect(tip.model.sections[1][0][1].text.trim()).toBe('33 c')
  })
})

describe('unique maps', () => {
  it('have no tier and a unique frame', () => {
    expect(cardDropFacts(DATA, 'A Dusty Memory')!.maps[0].tier).toBeNull()
    const tip = mapTip(DATA, 'Cortex', () => null, c => `${c}`)
    expect(tip.model.base).toBeUndefined()
    expect(tip.model.frame).toBe('unique')
  })
})

describe('Ctrl+Space map lookup', () => {
  const lookup = mapCardsLookup(DATA)
  it('lists the cards in a map by price, each as a card row', () => {
    const [card] = lookup('burial', ctx)
    expect(card.group).toBe('Div cards by map')
    expect(card.name).toBe('Burial Chambers: 3 cards')
    expect(card.sub).toBe('Best: The Doctor · 33 c · about 2.2 c per card')
    const rows = card.sections[0].rows!
    expect(rows.map(r => r.label)).toEqual(['The Doctor', 'The Summoner', 'The Incantation'])
    expect(rows[0].item).toEqual({ name: 'The Doctor', type: 'DivinationCard' })
    expect(rows[2]).toMatchObject({ value: 'No price', dim: true })
    expect(card.tip?.content?.kind).toBe('lookup')
  })
  it('says nothing for a map with no cards, or before the data loads', () => {
    expect(lookup('pit of', ctx)).toEqual([])
    expect(mapCardsLookup(null)('burial', ctx)).toEqual([])
  })
})

describe('build-card-drops', () => {
  const poeData = {
    acts: [{ id: '2_8_10', name: 'The Imperial Fields', act: 8 }],
    maps: [{ name: 'Fields Map', tier: 5 }, { name: 'Plateau Map', tier: 13 }],
    cards: {
      dict: {
        'Rain of Chaos': { name: 'Rain of Chaos', minLevel: 23, atlasMaps: ['Fields Map', 'Plateau Map', 'Gone Map'], weights: { 3.9: 1, 3.29: 120 } },
        'The Doctor': { name: 'The Doctor', minLevel: 75, weights: { 3.29: 1 }, atlasMaps: [] },
        'Old': { name: 'Old', disabled: true }
      }
    }
  }
  const records = [
    { card: 'Rain of Chaos', sources: [{ type: 'Act', id: '2_8_10', kind: 'source' }, { type: 'Map', id: 'Fields Map', kind: 'source' }] },
    { card: 'The Doctor', sources: [{ type: 'Elder Slayer', id: 'Baran, The Crusader', kind: 'source' }, { type: 'Breach monsters', id: 'Breach monsters', kind: 'category' }] },
    { card: 'Not in poeData', sources: [{ type: 'Map', id: 'X', kind: 'source' }] }
  ]
  const out = buildCardDrops(poeData, records) as CardDropData
  it('takes the latest league weights as one in N card drops', () => {
    expect(out.season).toBe('3.29')
    expect(out.cards['Rain of Chaos'].w).toBe(1)
    expect(out.cards['The Doctor'].w).toBe(121)
  })
  it('keeps known maps, highest tier first, and adds other sources once', () => {
    expect(out.cards['Rain of Chaos'].m).toEqual(['Plateau Map', 'Fields Map'])
    expect(out.cards['Rain of Chaos'].s).toEqual(['The Imperial Fields (Act 8)'])
    expect(out.cards['The Doctor'].s).toEqual(['Baran, The Crusader (Elder Slayer)', 'Breach monsters'])
    expect(out.cards.Old.x).toBe(1)
    expect(out.cards['Not in poeData']).toBeUndefined()
  })
  it('names sources plainly', () => {
    const acts = new Map([['1_4_1', { name: 'The Aqueduct', act: 4 }]])
    expect(sourceText({ type: 'Act', id: '1_4_1', kind: 'source' }, acts)).toBe('The Aqueduct (Act 4)')
    expect(sourceText({ type: 'Act', id: '9_9_9', kind: 'source' }, acts)).toBeNull()
    expect(sourceText({ type: 'Map Boss', id: 'Rose', kind: 'source' }, acts)).toBe('Rose (Map Boss)')
    expect(sourceText({ type: 'Chest', id: 'Delve chest', kind: 'source' }, acts)).toBe('Delve chest')
    expect(sourceText({ type: 'Maps Only', id: 'Omniphobia, Fear Manifest (maps only)', kind: 'source' }, acts)).toBe('Omniphobia, Fear Manifest (maps only)')
  })
})

// Guy's pick (veteran review, 2026-11-24): the chance a card drop in a map is
// the card, from drop weights, and what a card drop there is worth.
describe('card chance per map', () => {
  it('counts only the map\'s own weighted cards', () => {
    // Burial Chambers: The Doctor and The Summoner. The Incantation has no
    // weight, Birth of the Three no longer drops.
    expect(mapPool(DATA, 'Burial Chambers Map').cards.map(c => c.name).sort()).toEqual(['The Doctor', 'The Summoner'])
    // House of Mirrors is tied to no map, so it's in no map's list.
    expect(mapPool(DATA, 'Pit of the Chimera Map').cards).toEqual([])
  })
  it('gives 1 in N card drops', () => {
    // 1 + 120689 / 900 = 135.1
    expect(cardChanceIn(DATA, 'The Doctor', 'Burial Chambers Map')).toBe(135)
    expect(cardChanceIn(DATA, 'The Summoner', 'Burial Chambers Map')).toBe(1)
    expect(cardChanceIn(DATA, 'The Doctor', 'Waste Pool Map')).toBe(1)
    expect(cardChanceIn(DATA, 'The Incantation', 'Burial Chambers Map')).toBeNull()
    expect(cardChanceIn(DATA, 'The Doctor', 'Fields Map')).toBeNull()
  })
  it('ranks a card\'s maps likeliest first', () => {
    const f = cardDropFacts(DATA, 'The Doctor')!
    expect(mapsByChance(DATA, 'The Doctor', f.maps).map(m => [m.label, m.oneIn])).toEqual([['Waste Pool', 1], ['Burial Chambers', 135]])
  })
  it('prices a card drop in a map as the weighted average, unpriced cards as 0', () => {
    const v = valuePerCardDrop(DATA, 'Burial Chambers Map', n => PRICES[n] ?? null)!
    const wd = 1 / 120689
    const ws = 1 / 900
    expect(v).toBeCloseTo((33 * wd + 2 * ws) / (wd + ws), 6)
    expect(valuePerCardDrop(DATA, 'Pit of the Chimera Map', () => null)).toBeNull()
  })
  it('puts the chance and the average on the map\'s tooltip and Ctrl+Space card', () => {
    const tip = mapTip(DATA, 'Burial Chambers Map', n => PRICES[n] ?? null, c => `${c.toFixed(1)}c`)
    const text = JSON.stringify(tip)
    expect(text).toContain('1 in 135')
    expect(text).toContain('per card from this map')
    const card = mapCardsLookup(DATA)('burial chambers', ctx)[0]
    const doctor = card.sections[0].rows!.find(r => r.label === 'The Doctor')!
    expect(doctor.note).toBe('1 in 135')
    expect(card.sub).toContain('per card')
  })
})
