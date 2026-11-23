// Your sales (Net worth's trade history): "sold" or "sales" for the totals and
// latest sales; an item's name for when and for how much you sold it.
import { NET_WORTH_TYPE } from '../../net-worth/widget'
import { NINJA_CURRENCY, inRange, saleChaos, saleName, searchSales, totals } from '../../net-worth/sales'
import type { Rates, Sale } from '../../net-worth/sales'
import type { Lookup, LookupCard, LookupRow } from './types'

const WORDS = ['sold', 'sales', 'my sales', 'sold items', 'trade history']

function wantsTotals (query: string): boolean {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ')
  return q.length >= 4 && WORDS.some(w => w.startsWith(q))
}

const when = (at: number, now: number) => {
  const d = new Date(at)
  const t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return d.toDateString() === new Date(now).toDateString() ? `today ${t}` : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${t}`
}

function row (s: Sale, rates: Rates, now: number): LookupRow {
  const chaos = saleChaos(s, rates)
  return chaos == null
    ? { label: saleName(s), value: `${s.price.amount} ${s.price.currency} · ${when(s.at, now)}` }
    : { label: `${saleName(s)} · ${when(s.at, now)}`, chaos }
}

// `sales`: the league's kept sales, or null with Net worth or the stash reader off.
export function salesLookup (sales: Sale[] | null): Lookup {
  return (query, ctx) => {
    if (!sales?.length) return []
    const rates: Rates = { chaos: 1 }
    if (ctx.divine) rates.divine = ctx.divine
    // The same currencies the Net worth window prices.
    for (const [id, name] of Object.entries(NINJA_CURRENCY)) {
      const c = ctx.price(name)
      if (c) rates[id] = c
    }
    const cards: LookupCard[] = []
    if (wantsTotals(query)) {
      const today = totals(inRange(sales, 'today', ctx.now), rates)
      const week = totals(inRange(sales, '7d', ctx.now), rates)
      cards.push({
        id: 'answer:sales',
        group: 'Answer',
        name: `Sold today: ${today.count} ${today.count === 1 ? 'sale' : 'sales'}`,
        sub: 'Your sales on pathofexile.com',
        icon: 'fas fa-coins',
        sections: [
          { rows: [{ label: `Today · ${today.count}`, chaos: today.chaos }, { label: `Last 7 days · ${week.count}`, chaos: week.chaos }] },
          { label: 'Latest', rows: sales.slice(0, 6).map(s => row(s, rates, ctx.now)) }
        ],
        actions: [{ label: 'Open Net worth', tool: NET_WORTH_TYPE }]
      })
    }
    if (query.trim().length >= 3) {
      const found = searchSales(sales, query, 8)
      if (found.length) {
        const first = found[0]
        cards.push({
          id: `sales:${first.name || first.typeLine}`,
          group: 'Your sales',
          name: `Sold ${saleName(first)}`,
          sub: `${found.length === 8 ? '8+' : found.length} matching ${found.length === 1 ? 'sale' : 'sales'}, last ${when(first.at, ctx.now)}`,
          icon: first.icon || 'fas fa-coins',
          sections: [{ rows: found.map(s => row(s, rates, ctx.now)) }],
          actions: [{ label: 'Open Net worth', tool: NET_WORTH_TYPE }]
        })
      }
    }
    return cards
  }
}
