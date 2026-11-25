// Your Faustus listings not sold yet (Net worth › Sales › Listed): "listed"
// or "pending" for the count, worth and stale ones; an item's name for how
// long it has been listed and at what price.
import { NET_WORTH_TYPE } from '../../net-worth/widget'
import { NINJA_CURRENCY, saleName } from '../../net-worth/sales'
import type { Rates, Sale } from '../../net-worth/sales'
import { ageText, pendingRows, pendingTotals, sortPending } from '../../net-worth/pending'
import type { PendingDoc, PendingRow } from '../../net-worth/pending'
import { saleLookupTip } from '../../net-worth/sale-tip'
import { checkFor, rankText } from '../../net-worth/cheapest'
import { priceLabel, targetOpen } from '../../net-worth/listed-target'
import type { CheapestDoc } from '../../net-worth/cheapest'
import type { Lookup, LookupCard, LookupRow } from './types'
import { matchRank } from '../search'

const WORDS = ['listed', 'listings', 'my listings', 'pending', 'pending sales', 'unsold', 'faustus listings']

function wantsTotals (query: string): boolean {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ')
  return q.length >= 4 && WORDS.some(w => w.startsWith(q))
}

// "4th cheapest" from your last Still cheapest? check at this price.
function rankOf (r: PendingRow, checks: CheapestDoc | null): string {
  const c = checkFor(checks, r.item)
  const t = checks?.targets?.[r.item.id]
  return `${c ? ` · ${rankText(c)} cheapest` : ''}${targetOpen(t, r.item) ? ` · set ${priceLabel(t)}` : ''}`
}

function row (r: PendingRow, checks: CheapestDoc | null): LookupRow {
  const l = r.item
  const label = `${saleName(l)} · ${ageText(r.ageMs)}${rankOf(r, checks)}`
  // The same tooltip as the Listed tab's row (gear with its own mods).
  const item = saleLookupTip(l)
  return r.chaos == null
    ? { label, value: `${l.price.amount} ${l.price.currency}`, item }
    : { label, chaos: r.chaos, item }
}

// `doc`: the league's saved listings, or null with Net worth off or never read.
// `counted`: false when Net worth leaves your listings out of its total.
// `checks`: the league's Still cheapest? checks.
// `out`: listings you left out (line-out-store.ts): out of the totals, as in Net worth.
export function listedLookup (doc: PendingDoc | null, sales: Sale[] | null, staleDays?: number, counted = true, checks: CheapestDoc | null = null, out: ReadonlySet<string> = new Set()): Lookup {
  return (query, ctx) => {
    if (!doc?.listings.length) return []
    const rates: Rates = { chaos: 1 }
    if (ctx.divine) rates.divine = ctx.divine
    for (const [id, name] of Object.entries(NINJA_CURRENCY)) {
      const c = ctx.price(name)
      if (c) rates[id] = c
    }
    const ninjaOf = (l: Sale) => { const c = ctx.price(l.name || l.typeLine); return c ? { chaos: c } : null }
    const rows = sortPending(pendingRows(doc, sales ?? [], rates, ninjaOf, ctx.now, staleDays))
    if (!rows.length) return []
    const cards: LookupCard[] = []
    if (wantsTotals(query)) {
      const t = pendingTotals(rows.filter(r => !out.has(r.item.id)))
      cards.push({
        id: 'answer:listed',
        group: 'Answer',
        name: `Listed at Faustus: ${t.count} unsold`,
        sub: `${t.stale ? `${t.stale} unsold for days` : 'Your listings not sold yet'} · ${counted ? 'counted in your net worth' : 'left out of your net worth'}`,
        icon: 'fas fa-store',
        sections: [
          { rows: [{ label: `Asking · ${t.count}`, chaos: t.askChaos }, ...(t.stale ? [{ label: `Stale · ${t.stale}`, chaos: t.staleChaos }] : [])] },
          { label: 'Longest unsold', rows: [...rows].sort((a, b) => a.firstAt - b.firstAt).slice(0, 6).map(r => row(r, checks)) }
        ],
        actions: [{ label: 'Open Net worth', tool: NET_WORTH_TYPE }]
      })
    }
    if (query.trim().length >= 3) {
      const found = rows.filter(r => matchRank(`${r.item.name} ${r.item.typeLine}`, query) >= 0).slice(0, 8)
      if (found.length) {
        const first = found[0].item
        cards.push({
          id: `listed:${first.name || first.typeLine}`,
          group: 'Your sales',
          name: `Listed ${saleName(first)}`,
          // The result and its heading are the item's: same tooltip as its row.
          tip: saleLookupTip(first),
          sub: `At Faustus ${ageText(found[0].ageMs)}, asking ${first.price.amount} ${first.price.currency}${rankOf(found[0], checks)}`,
          icon: first.icon || 'fas fa-store',
          sections: [{ rows: found.map(r => row(r, checks)) }],
          actions: [{ label: 'Open Net worth', tool: NET_WORTH_TYPE }]
        })
      }
    }
    return cards
  }
}
