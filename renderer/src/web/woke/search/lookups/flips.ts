// Flips in the palette: type a flippable item ("legion thread", "fine
// delirium") for whether flipping it pays at today's price, or "flips" for the
// best one. Uses the Flips panel's own options and weights. The palette's prices
// have no volume, so these rank by profit per item, not by supply.
import { matchRank } from '../search'
import { formatAmount } from '../../ui/format'
import { DEFAULT_LIFEFORCE_PER_ITEM, FAMILIES, RANGE_NOTE, bestFlip, parseLifeforce, priceFlip, rangeOnly, shortName } from '../../scarab-flip/families'
import type { FlipFamily, FlipMethod, FlipResult } from '../../scarab-flip/families'
import type { FlipOptions } from '../../scarab-flip/calc'
import { SCARAB_FLIP_TYPE } from '../../scarab-flip/widget'
import type { ScarabFlipWidget } from '../../scarab-flip/widget'
import type { PriceItem } from '../../market/types'
import type { Lookup, LookupAction, LookupCard, LookupContext, LookupRow } from './types'
import { TATTOO_TRIBES, tattooProfitEach, tattooTribe } from '../../scarab-flip/tattoos'
import type { TribeRow } from '../../scarab-flip/tattoos'

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

// The panel's own rounding, so both read the same.
function signed (chaos: number): string {
  const text = formatAmount(Math.abs(chaos))
  return `${chaos > 0 ? '+' : chaos < 0 ? '−' : ''}${text}c`
}

function openAction (ctx: LookupContext): LookupAction[] {
  return ctx.tools.has(SCARAB_FLIP_TYPE) ? [{ label: 'Open Flips', tool: SCARAB_FLIP_TYPE }] : []
}

interface MethodLine { row: LookupRow, profit: number | null }

// One method's verdict for one item, or null when it can't be priced.
function methodLine (method: FlipMethod, name: string, flip: FlipResult | null): MethodLine | null {
  const verdict = (label: string, profit: number) =>
    ({ row: { label, value: `${signed(profit)} each${profit > 0 ? '' : ', not worth it'}` }, profit })
  if (flip?.kind === 'pool') {
    const row = flip.model.rows.find(r => r.name === name)
    return row ? verdict(method.label, row.profitEach) : null
  }
  if (flip?.kind === 'upgrade') {
    const row = flip.rows.find(r => r.from === name)
    return row ? verdict(`${method.label} to ${shortName(row.into)}`, row.profitEach) : null
  }
  if (flip?.kind === 'range') {
    // No measured odds: the worst and best a recipe can give, never an average.
    const row = flip.rows.find(r => r.name === name)
    if (!row) return null
    const value = `costs ${formatAmount(row.cost)}c, gives back ${formatAmount(row.low.chaos)}c to ${formatAmount(row.high.chaos)}c`
    return { row: { label: method.label, value }, profit: null }
  }
  if (flip?.kind === 'tribes') {
    const tribe = tattooTribe(name)
    const row = flip.rows.find(r => r.tribe === tribe)
    const own = row?.tattoos.find(t => t.name === name)
    return row && own ? verdict(method.label, tattooProfitEach(row, own.chaos)) : null
  }
  if (flip?.kind === 'no-cost') return { row: { label: method.label, value: `no ${method.lifeforce} lifeforce price yet`, dim: true }, profit: null }
  return null
}

function itemCard (family: FlipFamily, name: string, s: Settings, ctx: LookupContext): LookupCard | null {
  const lines: MethodLine[] = []
  for (const method of family.methods) {
    const flip = priceFlip(family, method, ctx.items as PriceItem[], new Map(), s.options, s.lifeforce, s.weights)
    const line = methodLine(method, name, flip)
    if (line) lines.push(line)
  }
  if (!lines.length) return null
  const rows = lines.map(l => l.row)
  // The method that pays most, when any pays.
  const best = lines.reduce<MethodLine | null>((top, l) => l.profit != null && l.profit > 0 && (top == null || l.profit > top.profit!) ? l : top, null)?.row
  const price = ctx.price(name)
  const range = rangeOnly(family, s.weights?.[family.id])
  const ranged = range ? `${rows[0].label.toLowerCase()} ${rows[0].value}` : ''
  return {
    id: `flip:${name}`,
    group: 'Flips',
    name: `Flip ${name}`,
    title: name,
    sub: best ? `${family.label}: ${best.label.toLowerCase()} ${best.value}` : ranged ? `${family.label}: ${ranged}` : `${family.label}: not worth flipping now`,
    icon: 'fas fa-recycle',
    tip: { name, type: family.ninjaType },
    sections: [
      { rows: [{ label: 'Price', item: { name, type: family.ninjaType }, chaos: price, bulk: true }] },
      { label: range ? 'One recipe' : 'Profit per item put in', rows },
      ...(range ? [{ text: [RANGE_NOTE] }] : family.lowConfidence && !(family.id === 'tattoos' && ownWeights(s, family.id)) ? [{ text: [family.lowConfidence] }] : [])
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
      ? [{
          rows: [
            { label: best.family.label, value: best.method.label },
            { label: 'Buy', item: { name: best.item, type: best.family.ninjaType }, chaos: ctx.price(best.item), bulk: true },
            { label: 'Profit per item', value: signed(best.profitEach) }
          ]
        }, { text: ['By profit per item. The Flips panel also weighs how much trades a day.'] }]
      : [{ text: ['No flip makes a profit at today\'s prices.'] }],
    actions: openAction(ctx)
  }
}

// Own weights set for the family, which the Tattoos note then doesn't warn about.
function ownWeights (s: Settings, id: string): boolean {
  return Object.values(s.weights?.[id] ?? {}).some(w => typeof w === 'number' && Number.isFinite(w) && w >= 0)
}

const TATTOO_WORDS = ['tattoo', 'tattoos', 'tattoo flip', 'tattoo tribes']

function tribeLine (r: TribeRow): LookupRow & { value: string } {
  const flip = r.profitEach == null ? 'no traded Tattoo to put in' : `3 for 1 ${signed(r.profitEach)} each`
  const guess = r.unpriced ? `, ${r.unpriced} unpriced` : ''
  return { label: r.tribe, value: `average ${formatAmount(r.average)}c, ${flip}${guess}` }
}

// Every tribe, best 3 for 1 first, or one tribe ("kitava") with its Tattoos.
function tribeCard (s: Settings, ctx: LookupContext, only?: string): LookupCard | null {
  const family = FAMILIES.find(f => f.id === 'tattoos')
  if (!family) return null
  const flip = priceFlip(family, family.methods[0], ctx.items as PriceItem[], new Map(), s.options, s.lifeforce, s.weights)
  if (flip?.kind !== 'tribes' || !flip.rows.length) return null
  const rows = only ? flip.rows.filter(r => r.tribe === only) : flip.rows
  if (!rows.length) return null
  const one = only ? rows[0] : null
  return {
    id: `flip:tattoos:${only ?? 'all'}`,
    group: 'Flips',
    name: one ? `${one.tribe} Tattoos` : 'Tattoo tribes',
    sub: one ? tribeLine(one).value : `Top: ${rows[0].tribe}, ${tribeLine(rows[0]).value}`,
    icon: 'fas fa-recycle',
    sections: [
      one
        ? { label: `${one.tribe} Tattoos`, rows: one.tattoos.map(t => t.unpriced ? { label: shortName(t.name), item: { name: t.name, type: family.ninjaType }, value: 'no price', dim: true } : { label: shortName(t.name), item: { name: t.name, type: family.ninjaType }, chaos: t.chaos, bulk: true }) }
        : { label: 'Average Tattoo and 3 for 1, per tribe', rows: rows.map(tribeLine) },
      { text: ['3 Tattoos of one tribe vendor for 1 random Tattoo of that tribe.', ownWeights(s, family.id) ? '' : family.lowConfidence ?? ''].filter(Boolean) }
    ],
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
    if (TATTOO_WORDS.includes(q)) return [tribeCard(s, ctx) ?? []].flat()
    const tribe = TATTOO_TRIBES.find(t => t.toLowerCase() === q || `${t.toLowerCase()} tattoo` === q || `${t.toLowerCase()} tattoos` === q)
    const tribeHit = tribe ? tribeCard(s, ctx, tribe) : null
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
    const cards = hits
      .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, 'en'))
      .slice(0, 3)
      .flatMap(h => itemCard(h.family, h.name, s, ctx) ?? [])
    return tribeHit ? [tribeHit, ...cards] : cards
  }
}
