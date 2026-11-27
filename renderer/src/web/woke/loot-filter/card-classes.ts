// Divination cards on the Loot tab (Guy's picks, 2026-11-27: Cards A, folded
// by what the set turns into; D2, priced like currency plus a Collecting
// list). Cards ride the currency ladder: a pile counts its poe.ninja price ×
// the stack, capped at the card's set size. The reward and set size come
// from the tooltip data (card-facts.ts); until it's read a card sits in
// Other rewards with a set of 10.
import type { LootCategory } from './fragment-classes'

export const CARD_CATEGORIES: LootCategory[] = [
  { id: 'cardcur', name: 'Currency rewards', art: 'House of Mirrors' },
  { id: 'carduniq', name: 'Unique rewards', art: 'The Doctor' },
  { id: 'cardgem', name: 'Gem rewards', art: "The Dragon's Heart" },
  { id: 'cardgear', name: 'Gear rewards', art: 'Emperor of Purity' },
  { id: 'cardmap', name: 'Map rewards', art: 'Boundless Realms' },
  { id: 'cardother', name: 'Other rewards', art: 'The Nurse' }
]
export const CARD_IDS = new Set(CARD_CATEGORIES.map(x => x.id))

// The card blue, a shade per fold.
export const CARD_LOOK: Record<string, { text: [number, number, number], color: string, shape: string }> = {
  cardcur: { text: [120, 200, 255], color: 'Blue', shape: 'Square' },
  carduniq: { text: [235, 150, 80], color: 'Orange', shape: 'Square' },
  cardgem: { text: [60, 220, 200], color: 'Cyan', shape: 'Square' },
  cardgear: { text: [150, 175, 255], color: 'Blue', shape: 'Diamond' },
  cardmap: { text: [220, 220, 235], color: 'White', shape: 'Square' },
  cardother: { text: [14, 186, 255], color: 'Blue', shape: 'Circle' }
}

// What a set turns into, from the first line of its reward text
// ("<uniqueitem>{Headhunter}", "<size:26>{<currencyitem>{10x Divine Orb}}").
export function cardCategoryOf (lines: readonly string[]): string {
  // The size wrapper can close lines later ("<size:31>{<gemitem>{Support Gem}",
  // then the quality and corruption lines), and the data has \r\n endings.
  const first = (lines[0] ?? '').trim().replace(/^<size:\d+>\{/, '')
  const m = /^<(\w+)>\s*\{([^}]*)\}/.exec(first)
  if (!m) return 'cardother'
  const [, tag, inner] = m
  if (/\bMap$|Maps$|Invitation|Writ$|Scarab/.test(inner)) return 'cardmap'
  if (tag === 'currencyitem') return 'cardcur'
  if (tag === 'uniqueitem') return 'carduniq'
  if (tag === 'gemitem') return 'cardgem'
  if (/^(whiteitem|magicitem|rareitem|normal|magic|rare)$/.test(tag)) return 'cardgear'
  return 'cardother'
}

export interface CardFact { stack: number, cat: string }
export type CardFacts = ReadonlyMap<string, CardFact>
