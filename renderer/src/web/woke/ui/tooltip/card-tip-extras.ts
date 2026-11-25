// What a divination card's tooltip adds (Guy's pick I4 in the tooltip audit,
// 2026-11-25): the full set's cost against its reward's price, and the maps
// where it is likeliest among the map's own cards. Pure: item-tip.ts passes
// the data and prices. Loaded on the first card hover.
import { mapsByChance, oneInText } from '../../card-drops/card-drops'
import type { CardDropData, CardDropFacts } from '../../card-drops/card-drops'
import type { TipItem, TipLine, TipPart } from './tip-content'

const part = (text: string, tone: TipPart['tone']): TipPart => ({ text, tone })

export interface CardReward {
  name: string
  ns: 'UNIQUE' | 'ITEM' | 'DIVINATION_CARD'
  count: number
}

/** The one priceable thing a card gives: a unique (plain or corrupted), a
 *  stack of currency, or another card. Null for gems, random items and the rest. */
export function cardReward (item: TipItem | undefined): CardReward | null {
  if (!item?.d || !item.n) return null
  const [first, ...rest] = item.d.split(/\r?\n/)
  const m = /^<(uniqueitem|currencyitem|divination)>\{(.+)\}$/.exec(first)
  if (!m) return null
  if (m[1] === 'uniqueitem') {
    // A level, links or an influence make it something else than the plain unique.
    if (rest.some(l => !/^<corrupted>\{Corrupted\}$/.test(l))) return null
    return { name: m[2], ns: 'UNIQUE', count: 1 }
  }
  if (rest.length) return null
  if (m[1] === 'divination') return { name: m[2], ns: 'DIVINATION_CARD', count: 1 }
  const stack = /^([\d,]+)x (.+)$/.exec(m[2])
  return stack ? { name: stack[2], ns: 'ITEM', count: Number(stack[1].replace(/,/g, '')) } : { name: m[2], ns: 'ITEM', count: 1 }
}

export function cardExtraSections (
  card: string,
  item: TipItem | undefined,
  drops: { data: CardDropData, facts: CardDropFacts } | null,
  prices: { card: number | null, reward: (r: CardReward) => number | null, format: (chaos: number) => string }
): TipLine[][] {
  const out: TipLine[][] = []
  const reward = cardReward(item)
  const each = prices.card
  const worth = reward ? prices.reward(reward) : null
  if (item?.n && each != null && worth != null && worth > 0) {
    const set = each * item.n
    const total = worth * (reward!.count)
    const diff = Math.round((total / set - 1) * 100)
    out.push([[
      part(`Set of ${item.n}: `, 'label'), part(prices.format(set), 'value'),
      part(' · reward ', 'label'), part(prices.format(total), 'value'),
      part(diff === 0 ? ' · even' : ` · ${diff > 0 ? '+' : '−'}${Math.abs(diff)}%`, 'label')
    ]])
  }
  if (drops && !drops.facts.disabled) {
    const best = mapsByChance(drops.data, card, drops.facts.maps).filter(m => m.oneIn != null).slice(0, 3)
    if (best.length) {
      const line: TipLine = [part('Likeliest in ', 'label')]
      best.forEach((m, i) => {
        if (i) line.push(part(' · ', 'label'))
        line.push(part(m.label, 'value'), part(` ${oneInText(m.oneIn!)}`, 'dim'))
      })
      out.push([line])
    }
  }
  return out
}
