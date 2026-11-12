// Divination card sets: what a full set costs, what it turns into, and which
// is cheaper. Rewards come from the tooltip's item file, prices from poe.ninja.
import { matchRank } from '../search'
import { formatChaos } from '../../ui/format'
import type { Lookup, LookupCard, LookupContext, LookupRow } from './types'

export interface CardInfo {
  stack: number
  // The reward text, one entry per line, tags kept: "<uniqueitem>{Headhunter}".
  lines: string[]
}

export interface Reward {
  name: string
  qty: number
  // poe.ninja variant to price, e.g. "21/20c" for a gem.
  variant?: string
  // False when the reward has rolls a price can't follow (corrupted
  // implicits, item level, random uniques).
  priceable: boolean
  text: string
}

const PRICED_TAGS = new Set(['uniqueitem', 'currencyitem', 'divination', 'gemitem'])

// "<uniqueitem>{Headhunter}" -> "Headhunter"; drops the tags.
export function plainLine (line: string): string {
  return line.replace(/<\w+>\{([^}]*)\}/g, '$1').replace(/\[[^\]|]*\|([^\]]*)\]/g, '$1').trim()
}

export function parseReward (lines: string[]): Reward | null {
  const first = /^<(\w+)>\{([^}]*)\}$/.exec(lines[0]?.trim() ?? '')
  if (!first) return null
  const [, tag, inner] = first
  const text = lines.map(plainLine).filter(Boolean).join(', ')
  const qtyMatch = /^(\d+)x (.+)$/.exec(inner)
  const qty = qtyMatch ? Number(qtyMatch[1]) : 1
  let name = qtyMatch ? qtyMatch[2] : inner
  const rest = lines.slice(1).map(plainLine)
  if (tag === 'gemitem') {
    const gem = /^Level (\d+) (.+)$/.exec(name)
    if (!gem) return { name, qty, priceable: false, text }
    name = gem[2]
    const quality = rest.map(l => /^Quality: \+(\d+)%$/.exec(l)?.[1]).find(Boolean) ?? '0'
    const corrupted = rest.includes('Corrupted')
    const known = rest.every(l => /^Quality: /.test(l) || l === 'Corrupted')
    return { name, qty, variant: `${gem[1]}/${quality}${corrupted ? 'c' : ''}`, priceable: known, text }
  }
  return { name, qty, priceable: PRICED_TAGS.has(tag) && rest.length === 0, text }
}

export function cardCard (name: string, info: CardInfo, ctx: LookupContext): LookupCard {
  const each = ctx.price(name)
  const set = each == null ? null : each * info.stack
  const reward = parseReward(info.lines)
  const rewardEach = reward?.priceable ? ctx.price(reward.name, reward.variant) : null
  const rewardValue = rewardEach == null ? null : rewardEach * reward!.qty
  const rows: LookupRow[] = [
    { label: `1 card (set of ${info.stack})`, chaos: each, item: { name, type: 'DivinationCard' } },
    { label: `Full set: ${info.stack} cards`, chaos: set }
  ]
  if (reward) {
    rows.push({ label: `Reward: ${reward.text}`, ...(rewardValue != null ? { chaos: rewardValue } : { value: 'No fixed price', dim: true }), item: reward.priceable ? { name: reward.name } : undefined })
  }
  let verdict = 'No price to compare'
  if (set != null && rewardValue != null) {
    const diff = rewardValue - set
    verdict = Math.abs(diff) < Math.max(5, rewardValue * 0.03)
      ? 'About even'
      : diff > 0 ? `Turning in a set gains ${formatChaos(diff, ctx.divine)}` : `Buying the reward is ${formatChaos(-diff, ctx.divine)} cheaper`
    rows.push({ label: verdict, chaos: diff })
  }
  return {
    id: `card:${name}`,
    group: 'Div card sets',
    name: `${name}: ${verdict[0].toLowerCase()}${verdict.slice(1)}`,
    title: name,
    sub: reward ? `${info.stack} × card → ${reward.text}` : `Set of ${info.stack}`,
    icon: 'fas fa-layer-group',
    tip: { name, type: 'DivinationCard' },
    sections: [
      { rows },
      { text: ['Prices are poe.ninja\'s. Card sets sell for a little more than single cards.'] }
    ],
    actions: [
      ...(reward?.priceable ? [{ label: `Look up ${reward.name}`, search: reward.name }] : []),
      { label: 'poedb', url: `https://poedb.tw/us/${encodeURIComponent(name.replaceAll("'", '').replaceAll(' ', '_'))}` }
    ]
  }
}

// Cards by name, and the cards that turn into an item you typed.
export function cardLookup (cards: ReadonlyMap<string, CardInfo>): Lookup {
  const byReward = new Map<string, string[]>()
  for (const [name, info] of cards) {
    const r = parseReward(info.lines)
    if (!r?.priceable) continue
    const list = byReward.get(r.name) ?? []
    list.push(name)
    byReward.set(r.name, list)
  }
  return (query, ctx) => {
    const hits = new Map<string, number>()
    for (const name of cards.keys()) {
      const rank = matchRank(name, query)
      if (rank >= 0 && rank < 2) hits.set(name, rank)
    }
    for (const [reward, names] of byReward) {
      if (matchRank(reward, query) !== 0) continue
      for (const n of names) if (!hits.has(n)) hits.set(n, 2)
    }
    return [...hits]
      .filter(([name]) => ctx.price(name) != null)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 4)
      .map(([name]) => cardCard(name, cards.get(name)!, ctx))
  }
}
