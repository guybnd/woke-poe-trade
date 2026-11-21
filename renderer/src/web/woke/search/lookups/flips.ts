// Flips in the palette: type a flippable item ("legion thread", "fine
// delirium") for whether flipping it pays at today's price, or "flips" for the
// best one. Uses the Flips panel's own options and weights. The palette's prices
// have no volume, so these rank by profit per item, not by supply.
import { matchRank } from '../search'
import { DEFAULT_LIFEFORCE_PER_ITEM, FAMILIES, bestFlip, parseLifeforce, priceFlip, shortName } from '../../scarab-flip/families'
import type { FlipFamily, FlipMethod, FlipResult } from '../../scarab-flip/families'
import type { FlipOptions } from '../../scarab-flip/calc'
import { SCARAB_FLIP_TYPE } from '../../scarab-flip/widget'
import type { ScarabFlipWidget } from '../../scarab-flip/widget'
import type { PriceItem } from '../../market/types'
import type { Lookup, LookupAction, LookupCard, LookupContext, LookupRow } from './types'

const WORDS = ['flip', 'flips', 'best flip', 'flipping']

interface Settings {
  options: FlipOptions
  lifeforce: number
  weights: ScarabFlipWidget['weights']
}

function settingsOf (config: ScarabFlipWidget | null): Settings {
  return {
    options: { sellDiscount: (config?.sellDiscount ?? 0) / 100, reroll: config?.reroll ?? false },
    lifeforce: parseLifeforce(config?.lifeforcePerItem ?? '') ?? DEFAULT_LIFEFORCE_PER_ITEM,
    weights: config?.weights
  }
}

function signed (chaos: number): string {
  const v = Math.abs(chaos) < 10 ? Number(chaos.toFixed(2)) : Math.round(chaos)
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}c`
}

function openAction (ctx: LookupContext): LookupAction[] {
  return ctx.tools.has(SCARAB_FLIP_TYPE) ? [{ label: 'Open Flips', tool: SCARAB_FLIP_TYPE }] : []
}

// One method's verdict for one item, or null when it can't be priced.
function methodRow (method: FlipMethod, name: string, flip: FlipResult | null): LookupRow | null {
  if (flip?.kind === 'pool') {
    const row = flip.model.rows.find(r => r.name === name)
    if (!row) return null
    return { label: method.label, value: `${signed(row.profitEach)} each${row.profitEach > 0 ? '' : ', not worth it'}` }
  }
  if (flip?.kind === 'upgrade') {
    const row = flip.rows.find(r => r.from === name)
    if (!row) return null
    return { label: `${method.label} to ${shortName(row.into)}`, value: `${signed(row.profitEach)} each${row.profitEach > 0 ? '' : ', not worth it'}` }
  }
  if (flip?.kind === 'no-cost') return { label: method.label, value: `no ${method.lifeforce} lifeforce price yet`, dim: true }
  return null
}

function itemCard (family: FlipFamily, name: string, s: Settings, ctx: LookupContext): LookupCard | null {
  const rows: LookupRow[] = []
  for (const method of family.methods) {
    const flip = priceFlip(family, method, ctx.items as PriceItem[], new Map(), s.options, s.lifeforce, s.weights)
    const row = methodRow(method, name, flip)
    if (row) rows.push(row)
  }
  if (!rows.length) return null
  const price = ctx.price(name)
  const best = rows.find(r => r.value?.startsWith('+'))
  return {
    id: `flip:${name}`,
    group: 'Flips',
    name: `Flip ${name}`,
    title: name,
    sub: best ? `${family.label}: ${best.label.toLowerCase()} ${best.value}` : `${family.label}: not worth flipping now`,
    icon: 'fas fa-recycle',
    tip: { name, type: family.ninjaType },
    sections: [
      { rows: [{ label: 'Price', item: { name, type: family.ninjaType }, chaos: price, bulk: true }] },
      { label: 'Profit per item put in', rows },
      ...(family.lowConfidence ? [{ text: [family.lowConfidence] }] : [])
    ],
    actions: openAction(ctx)
  }
}

function bestCard (s: Settings, ctx: LookupContext): LookupCard {
  const best = bestFlip(ctx.items as PriceItem[], new Map(), s.options, s.lifeforce, s.weights)
  return {
    id: 'flip:best',
    group: 'Flips',
    name: 'Best flip right now',
    sub: best ? `${best.item}: ${best.method.label.toLowerCase()}, ${signed(best.profitEach)} each` : 'Nothing is worth flipping right now',
    icon: 'fas fa-recycle',
    ...(best ? { tip: { name: best.item, type: best.family.ninjaType } } : {}),
    sections: best
      ? [{ rows: [
          { label: best.family.label, value: best.method.label },
          { label: 'Buy', item: { name: best.item, type: best.family.ninjaType }, chaos: ctx.price(best.item), bulk: true },
          { label: 'Profit per item', value: signed(best.profitEach) }
        ] }, { text: ['By profit per item. The Flips panel also weighs how much trades a day.'] }]
      : [{ text: ['No flip makes a profit at today\'s prices.'] }],
    actions: openAction(ctx)
  }
}

// `config`: the Flips panel's saved settings, or null with it switched off.
export function flipsLookup (config: ScarabFlipWidget | null): Lookup {
  return (query, ctx) => {
    if (!config || !ctx.items.length) return []
    const q = query.trim().toLowerCase()
    if (q.length < 3) return []
    const s = settingsOf(config)
    if (WORDS.includes(q)) return [bestCard(s, ctx)]
    // The best few name matches across the families' priced items.
    const hits: Array<{ family: FlipFamily, name: string, rank: number }> = []
    const seen = new Set<string>()
    for (const item of ctx.items) {
      if (seen.has(item.name)) continue
      const family = FAMILIES.find(f => f.ninjaType === item.type && f.match(item.name))
      if (!family) continue
      const rank = matchRank(item.name, query)
      if (rank < 0 || rank > 1) continue
      seen.add(item.name)
      hits.push({ family, name: item.name, rank })
    }
    return hits
      .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, 'en'))
      .slice(0, 3)
      .flatMap(h => itemCard(h.family, h.name, s, ctx) ?? [])
  }
}
